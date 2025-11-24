package d365

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client provides authenticated HTTP communication with D365 CSU
type Client struct {
	config       *D365Config
	tokenManager *TokenManager
	httpClient   *http.Client
}

// NewClient creates a new D365 CSU client
func NewClient(config *D365Config) *Client {
	return &Client{
		config:       config,
		tokenManager: NewTokenManager(config),
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// makeCSURequest performs an authenticated HTTP request to D365 CSU
// This is the central method that all API calls should use
func (c *Client) makeCSURequest(method, path string, body []byte) (*http.Response, error) {
	// Get valid bearer token
	token, err := c.tokenManager.GetValidBearerToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get bearer token: %w", err)
	}

	// Construct full URL
	url := c.config.CSUBaseURL + path

	// Create request
	var req *http.Request
	if body != nil {
		req, err = http.NewRequest(method, url, bytes.NewReader(body))
	} else {
		req, err = http.NewRequest(method, url, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add required headers
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("OData-MaxVersion", "4.0")
	req.Header.Set("OData-Version", "4.0")
	
	if method == "POST" || method == "PUT" || method == "PATCH" {
		req.Header.Set("Content-Type", "application/json")
	}

	// Execute request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}

	return resp, nil
}

// Get performs an authenticated GET request to D365 CSU
func (c *Client) Get(path string) (*http.Response, error) {
	return c.makeCSURequest("GET", path, nil)
}

// Post performs an authenticated POST request to D365 CSU
func (c *Client) Post(path string, body []byte) (*http.Response, error) {
	return c.makeCSURequest("POST", path, body)
}

// Put performs an authenticated PUT request to D365 CSU
func (c *Client) Put(path string, body []byte) (*http.Response, error) {
	return c.makeCSURequest("PUT", path, body)
}

// Delete performs an authenticated DELETE request to D365 CSU
func (c *Client) Delete(path string) (*http.Response, error) {
	return c.makeCSURequest("DELETE", path, nil)
}

// Ping tests connectivity to D365 CSU by querying the root health endpoint
// This is useful for Sprint 1 verification
func (c *Client) Ping() error {
	resp, err := c.Get("/")
	if err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ping returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// GetTokenManager returns the underlying token manager (for testing/monitoring)
func (c *Client) GetTokenManager() *TokenManager {
	return c.tokenManager
}
