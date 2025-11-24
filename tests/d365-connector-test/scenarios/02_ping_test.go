package scenarios

import (
	"io"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/purehospitality/amicis-solution-accelerator/backend/go-routing-service/adapters/d365"
)

// TestCSUConnectivity tests basic connectivity to D365 CSU
func TestCSUConnectivity(t *testing.T) {
	config := loadTestConfig(t)

	// Create D365 client
	client := d365.NewClient(config)
	require.NotNil(t, client)

	// Test ping (metadata endpoint)
	err := client.Ping()
	require.NoError(t, err, "Failed to ping D365 CSU")

	t.Logf("✅ Successfully connected to D365 CSU at %s", config.CSUBaseURL)
}

// TestMetadataEndpoint tests the OData $metadata endpoint
func TestMetadataEndpoint(t *testing.T) {
	config := loadTestConfig(t)
	client := d365.NewClient(config)

	// Get metadata
	resp, err := client.Get("/$metadata")
	require.NoError(t, err, "Failed to get metadata")
	defer resp.Body.Close()

	// Verify response
	assert.Equal(t, 200, resp.StatusCode, "Expected 200 OK")

	// Read body
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	assert.NotEmpty(t, body, "Metadata body should not be empty")

	// Metadata should be XML
	assert.Contains(t, string(body), "<?xml", "Metadata should be XML")
	assert.Contains(t, string(body), "Edm", "Metadata should contain EDM schema")

	t.Logf("✅ Successfully retrieved OData metadata (size: %d bytes)", len(body))
}

// TestAuthenticatedRequest tests that requests include proper authentication
func TestAuthenticatedRequest(t *testing.T) {
	config := loadTestConfig(t)
	client := d365.NewClient(config)

	// Make any authenticated request
	resp, err := client.Get("/$metadata")
	require.NoError(t, err)
	defer resp.Body.Close()

	// Verify we got a successful response (not 401 Unauthorized)
	assert.NotEqual(t, 401, resp.StatusCode, "Request should be authenticated")
	assert.Equal(t, 200, resp.StatusCode, "Request should succeed")

	t.Logf("✅ Authenticated request successful")
}

// TestInvalidEndpoint tests error handling for non-existent endpoints
func TestInvalidEndpoint(t *testing.T) {
	config := loadTestConfig(t)
	client := d365.NewClient(config)

	// Try to access non-existent endpoint
	resp, err := client.Get("/api/NonExistentEndpoint")
	require.NoError(t, err, "Request should complete (even if endpoint doesn't exist)")
	defer resp.Body.Close()

	// Should get 404 Not Found
	assert.Equal(t, 404, resp.StatusCode, "Non-existent endpoint should return 404")

	t.Logf("✅ Error handling works correctly (got expected 404)")
}
