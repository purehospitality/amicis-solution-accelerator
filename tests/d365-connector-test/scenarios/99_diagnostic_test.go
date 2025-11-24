package scenarios

import (
	"io"
	"testing"

	"github.com/purehospitality/amicis-solution-accelerator/backend/go-routing-service/adapters/d365"
)

// TestDiagnostic attempts various D365 Commerce API endpoints to find the correct path
func TestDiagnostic(t *testing.T) {
	config := loadTestConfig(t)
	client := d365.NewClient(config)

	// Try various Commerce API endpoints
	endpoints := []string{
		"/",
		"/api",
		"/Commerce",
		"/CommerceRuntime",
		"/api/commerce",
		"/retail",
		"/RetailServer",
		"/api/RetailServer",
		"/RetailServer/Commerce",
		"/Commerce/Customers",
		"/Commerce/Products",
	}

	t.Logf("Testing CSU Base URL: %s", config.CSUBaseURL)
	t.Logf("Attempting %d endpoints...\n", len(endpoints))

	for _, endpoint := range endpoints {
		resp, err := client.Get(endpoint)
		if err != nil {
			t.Logf("❌ %s - Error: %v", endpoint, err)
			continue
		}
		
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == 200 {
			t.Logf("✅ %s - Status: %d (SUCCESS) - Body length: %d bytes", endpoint, resp.StatusCode, len(body))
			if len(body) > 0 && len(body) < 500 {
				t.Logf("   Response: %s", string(body))
			}
		} else {
			t.Logf("⚠️  %s - Status: %d", endpoint, resp.StatusCode)
			if len(body) > 0 && len(body) < 200 {
				t.Logf("   Error: %s", string(body))
			}
		}
	}
}
