package d365

import (
	"fmt"
	"os"
	"strings"
)

// D365Config holds all configuration needed to connect to D365 Commerce Scale Unit
type D365Config struct {
	// CSU Base URL (e.g., "https://my-env.commerce.dynamics.com")
	CSUBaseURL string

	// Azure AD OAuth2 Configuration
	TenantID     string // Azure AD tenant ID
	ClientID     string // App registration client ID
	ClientSecret string // App registration client secret
	Resource     string // Usually same as CSUBaseURL or specific AAD resource ID

	// Operating Unit (Store) Configuration
	OperatingUnitNum string // e.g., "001" for a specific store location
}

// LoadFromEnv loads D365 configuration from environment variables
func LoadFromEnv() (*D365Config, error) {
	config := &D365Config{
		CSUBaseURL:       os.Getenv("D365_CSU_BASE_URL"),
		TenantID:         os.Getenv("D365_TENANT_ID"),
		ClientID:         os.Getenv("D365_CLIENT_ID"),
		ClientSecret:     os.Getenv("D365_CLIENT_SECRET"),
		Resource:         os.Getenv("D365_RESOURCE"),
		OperatingUnitNum: os.Getenv("D365_OPERATING_UNIT_NUM"),
	}

	// Validate required fields
	if err := config.Validate(); err != nil {
		return nil, err
	}

	// Default Resource to CSUBaseURL if not specified
	if config.Resource == "" {
		config.Resource = config.CSUBaseURL
	}

	return config, nil
}

// Validate ensures all required configuration fields are present
func (c *D365Config) Validate() error {
	var missing []string

	if c.CSUBaseURL == "" {
		missing = append(missing, "D365_CSU_BASE_URL")
	}
	if c.TenantID == "" {
		missing = append(missing, "D365_TENANT_ID")
	}
	if c.ClientID == "" {
		missing = append(missing, "D365_CLIENT_ID")
	}
	if c.ClientSecret == "" {
		missing = append(missing, "D365_CLIENT_SECRET")
	}
	if c.OperatingUnitNum == "" {
		missing = append(missing, "D365_OPERATING_UNIT_NUM")
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required D365 configuration: %s", strings.Join(missing, ", "))
	}

	return nil
}

// GetTokenEndpoint returns the Azure AD OAuth2 token endpoint URL
func (c *D365Config) GetTokenEndpoint() string {
	return fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/token", c.TenantID)
}
