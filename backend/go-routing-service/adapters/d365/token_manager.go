package d365

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// AzureADTokenResponse represents the OAuth2 token response from Azure AD
type AzureADTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   string `json:"expires_in"` // Can be string or int from Azure AD
	Resource    string `json:"resource"`
}

// TokenManager handles OAuth2 token acquisition and refresh with thread-safety
type TokenManager struct {
	config *D365Config
	
	// Thread-safe token storage
	mu          sync.RWMutex
	accessToken string
	expiresAt   time.Time
	
	// HTTP client for token requests
	httpClient *http.Client
	
	// Expiry buffer: refresh token if it expires within this duration
	expiryBuffer time.Duration
}

// NewTokenManager creates a new TokenManager instance
func NewTokenManager(config *D365Config) *TokenManager {
	return &TokenManager{
		config:       config,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
		expiryBuffer: 5 * time.Minute, // Refresh 5 minutes before actual expiry
	}
}

// GetValidBearerToken returns a valid access token, refreshing if necessary
// This is the main public method that should be called by API methods
func (tm *TokenManager) GetValidBearerToken() (string, error) {
	// Check if current token is still valid
	tm.mu.RLock()
	if tm.isTokenValid() {
		token := tm.accessToken
		tm.mu.RUnlock()
		return token, nil
	}
	tm.mu.RUnlock()

	// Token invalid or expired, acquire write lock to refresh
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Double-check after acquiring write lock (another goroutine might have refreshed)
	if tm.isTokenValid() {
		return tm.accessToken, nil
	}

	// Refresh the token
	return tm.refreshToken()
}

// isTokenValid checks if the current token is valid (must be called with lock held)
func (tm *TokenManager) isTokenValid() bool {
	if tm.accessToken == "" {
		return false
	}
	
	// Check if token expires within the buffer window
	return time.Now().Add(tm.expiryBuffer).Before(tm.expiresAt)
}

// refreshToken acquires a new token from Azure AD (must be called with write lock held)
func (tm *TokenManager) refreshToken() (string, error) {
	// Prepare token request
	formData := url.Values{}
	formData.Set("grant_type", "client_credentials")
	formData.Set("client_id", tm.config.ClientID)
	formData.Set("client_secret", tm.config.ClientSecret)
	formData.Set("resource", tm.config.Resource)

	// Create HTTP request
	req, err := http.NewRequest(
		"POST",
		tm.config.GetTokenEndpoint(),
		strings.NewReader(formData.Encode()),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Execute request
	resp, err := tm.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request token: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read token response: %w", err)
	}

	// Check HTTP status
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse token response
	var tokenResp AzureADTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}

	// Validate token response
	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("received empty access token")
	}

	// Parse expires_in (can be string or int)
	expiresIn, err := strconv.Atoi(tokenResp.ExpiresIn)
	if err != nil {
		return "", fmt.Errorf("failed to parse expires_in: %w", err)
	}

	// Store token and calculate expiry time
	tm.accessToken = tokenResp.AccessToken
	tm.expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second)

	return tm.accessToken, nil
}

// ClearToken invalidates the current token (useful for testing or manual refresh)
func (tm *TokenManager) ClearToken() {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	
	tm.accessToken = ""
	tm.expiresAt = time.Time{}
}

// GetTokenExpiry returns the current token's expiry time (for monitoring/debugging)
func (tm *TokenManager) GetTokenExpiry() time.Time {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	
	return tm.expiresAt
}
