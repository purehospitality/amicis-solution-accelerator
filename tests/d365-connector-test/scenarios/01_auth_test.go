package scenarios

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/purehospitality/amicis-solution-accelerator/backend/go-routing-service/adapters/d365"
)

// loadTestConfig loads configuration from .env file for testing
func loadTestConfig(t *testing.T) *d365.D365Config {
	// Load .env file from test directory
	envPath := filepath.Join("..", ".env")
	if err := godotenv.Load(envPath); err != nil {
		t.Skipf("Skipping test: .env file not found at %s. Copy .env.example and configure with real credentials.", envPath)
	}

	config, err := d365.LoadFromEnv()
	require.NoError(t, err, "Failed to load D365 configuration")

	return config
}

// TestConfigValidation tests that configuration validation works correctly
func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name        string
		config      *d365.D365Config
		expectError bool
	}{
		{
			name: "valid configuration",
			config: &d365.D365Config{
				CSUBaseURL:       "https://test.commerce.dynamics.com",
				TenantID:         "test-tenant-id",
				ClientID:         "test-client-id",
				ClientSecret:     "test-secret",
				Resource:         "https://test.commerce.dynamics.com",
				OperatingUnitNum: "001",
			},
			expectError: false,
		},
		{
			name: "missing CSU base URL",
			config: &d365.D365Config{
				TenantID:         "test-tenant-id",
				ClientID:         "test-client-id",
				ClientSecret:     "test-secret",
				OperatingUnitNum: "001",
			},
			expectError: true,
		},
		{
			name: "missing tenant ID",
			config: &d365.D365Config{
				CSUBaseURL:       "https://test.commerce.dynamics.com",
				ClientID:         "test-client-id",
				ClientSecret:     "test-secret",
				OperatingUnitNum: "001",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestTokenAcquisition tests that we can successfully acquire an OAuth2 token
func TestTokenAcquisition(t *testing.T) {
	config := loadTestConfig(t)

	// Create token manager
	tokenManager := d365.NewTokenManager(config)
	require.NotNil(t, tokenManager)

	// Get token
	token, err := tokenManager.GetValidBearerToken()
	require.NoError(t, err, "Failed to acquire bearer token")
	assert.NotEmpty(t, token, "Token should not be empty")

	// Verify token expiry is set to future time
	expiry := tokenManager.GetTokenExpiry()
	assert.True(t, expiry.After(time.Now()), "Token expiry should be in the future")

	t.Logf("✅ Successfully acquired token (expires at %s)", expiry.Format(time.RFC3339))
}

// TestTokenCaching tests that token manager caches and reuses valid tokens
func TestTokenCaching(t *testing.T) {
	config := loadTestConfig(t)
	tokenManager := d365.NewTokenManager(config)

	// Get first token
	token1, err := tokenManager.GetValidBearerToken()
	require.NoError(t, err)
	expiry1 := tokenManager.GetTokenExpiry()

	// Immediately get second token - should be cached
	time.Sleep(100 * time.Millisecond)
	token2, err := tokenManager.GetValidBearerToken()
	require.NoError(t, err)
	expiry2 := tokenManager.GetTokenExpiry()

	// Verify same token was returned (cached)
	assert.Equal(t, token1, token2, "Token should be cached and reused")
	assert.Equal(t, expiry1, expiry2, "Token expiry should be unchanged")

	t.Logf("✅ Token caching working correctly")
}

// TestTokenRefresh tests that token manager can refresh expired tokens
func TestTokenRefresh(t *testing.T) {
	config := loadTestConfig(t)
	tokenManager := d365.NewTokenManager(config)

	// Get initial token
	_, err := tokenManager.GetValidBearerToken()
	require.NoError(t, err)

	// Clear token to simulate expiry
	tokenManager.ClearToken()

	// Get new token - should trigger refresh
	token2, err := tokenManager.GetValidBearerToken()
	require.NoError(t, err)
	assert.NotEmpty(t, token2)

	// Note: Tokens might be identical if Azure AD returns the same token
	// The important thing is that no error occurred
	t.Logf("✅ Token refresh successful")
}

// TestConcurrentTokenAccess tests thread-safety of token manager
func TestConcurrentTokenAccess(t *testing.T) {
	config := loadTestConfig(t)
	tokenManager := d365.NewTokenManager(config)

	// Simulate multiple concurrent requests
	const numGoroutines = 10
	done := make(chan bool, numGoroutines)
	errors := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func() {
			token, err := tokenManager.GetValidBearerToken()
			if err != nil {
				errors <- err
			} else if token == "" {
				errors <- assert.AnError
			}
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < numGoroutines; i++ {
		<-done
	}
	close(errors)

	// Check for errors
	for err := range errors {
		t.Errorf("Concurrent access failed: %v", err)
	}

	t.Logf("✅ Concurrent token access handled correctly")
}
