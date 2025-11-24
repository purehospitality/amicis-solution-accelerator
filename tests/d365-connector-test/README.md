# D365 Connector Test Solution

## Overview

This test solution validates the D365 Commerce Scale Unit (CSU) connector implementation. It provides a standalone test harness for verifying OAuth2 authentication, API connectivity, and data operations without requiring the full Amicis backend deployment.

## Purpose

The D365 connector is designed to be **reusable across multiple projects**:
- ✅ IKEA Wishlist Web/Mobile
- ✅ Suite365 Hotel POS Integration
- ✅ PureKDS Manager Kitchen Display System
- ✅ Any future retail solution requiring D365 integration

This test solution ensures the connector works correctly before integrating into production systems.

## Sprint 1: Foundation (Current)

**Goal:** Establish secure, authenticated connectivity to D365 CSU.

**Deliverables:**
- ✅ OAuth2 token acquisition with Azure AD
- ✅ Thread-safe token caching and refresh
- ✅ Authenticated HTTP client wrapper
- ✅ CSU connectivity verification (ping test)

## Project Structure

```
tests/d365-connector-test/
├── go.mod                          # Go module definition
├── .env.example                    # Configuration template
├── .env                            # Your actual credentials (git-ignored)
├── README.md                       # This file
└── scenarios/
    ├── 01_auth_test.go            # OAuth2 token acquisition tests
    └── 02_ping_test.go            # CSU connectivity tests

backend/go-routing-service/adapters/d365/
├── config.go                       # D365 configuration struct
├── token_manager.go                # OAuth2 token management
├── client.go                       # Authenticated HTTP client
└── models/                         # D365 OData response models
```

## Setup

### Prerequisites

1. **D365 Commerce Tier 2 Environment** (or higher)
2. **Azure AD App Registration** with:
   - Client ID
   - Client Secret
   - Permissions: D365 Commerce APIs
3. **Go 1.21+** installed

### Configuration

1. **Copy the example environment file:**
   ```bash
   cd tests/d365-connector-test
   cp .env.example .env
   ```

2. **Edit `.env` with your actual credentials:**
   ```bash
   # D365 CSU URL (from LCS environment details)
   D365_CSU_BASE_URL=https://your-env.commerce.dynamics.com

   # Azure AD tenant ID (from Azure Portal)
   D365_TENANT_ID=12345678-1234-1234-1234-123456789012

   # App registration client ID
   D365_CLIENT_ID=87654321-4321-4321-4321-210987654321

   # App registration client secret
   D365_CLIENT_SECRET=your-secret-value-here

   # Resource (usually same as CSU Base URL)
   D365_RESOURCE=https://your-env.commerce.dynamics.com

   # Operating unit number (store ID)
   D365_OPERATING_UNIT_NUM=001
   ```

3. **Install dependencies:**
   ```bash
   go mod download
   ```

## Running Tests

### All Tests
```bash
cd tests/d365-connector-test
go test ./scenarios/... -v
```

### Authentication Tests Only
```bash
go test ./scenarios -run TestToken -v
```

### Connectivity Tests Only
```bash
go test ./scenarios -run TestCSU -v
```

## Test Scenarios

### 01_auth_test.go - OAuth2 Authentication

**Tests:**
- ✅ Configuration validation
- ✅ Token acquisition from Azure AD
- ✅ Token caching (same token reused)
- ✅ Token refresh (new token after expiry)
- ✅ Concurrent access (thread-safety)

**Expected Output:**
```
=== RUN   TestTokenAcquisition
    01_auth_test.go:89: ✅ Successfully acquired token (expires at 2025-11-24T15:30:00Z)
--- PASS: TestTokenAcquisition (1.2s)
```

### 02_ping_test.go - CSU Connectivity

**Tests:**
- ✅ Basic connectivity (Ping method)
- ✅ OData $metadata endpoint access
- ✅ Authenticated request handling
- ✅ Error handling for invalid endpoints

**Expected Output:**
```
=== RUN   TestCSUConnectivity
    02_ping_test.go:20: ✅ Successfully connected to D365 CSU at https://your-env.commerce.dynamics.com
--- PASS: TestCSUConnectivity (0.8s)
```

## How the Connector Works

### 1. Configuration (`config.go`)
```go
config, err := d365.LoadFromEnv()
// Loads D365_CSU_BASE_URL, credentials, etc.
```

### 2. Token Management (`token_manager.go`)
```go
tokenManager := d365.NewTokenManager(config)
token, err := tokenManager.GetValidBearerToken()
// Automatically refreshes if token expired
// Thread-safe with RWMutex
// 5-minute expiry buffer
```

### 3. Authenticated Requests (`client.go`)
```go
client := d365.NewClient(config)
resp, err := client.Get("/$metadata")
// Adds: Authorization, OData headers
// Handles token refresh automatically
```

## Architecture Highlights

### Thread-Safety
- Uses `sync.RWMutex` for concurrent access
- Multiple goroutines can safely request tokens
- Only one token refresh happens at a time

### Automatic Token Refresh
- Tokens cached until 5 minutes before expiry
- Refresh triggered automatically on next request
- No manual token management required

### Error Handling
- Clear error messages for missing configuration
- HTTP status code validation
- Token response parsing errors

### Extensibility
- Easily add new API methods to `client.go`
- OData models go in `models/` directory
- Configuration extends via environment variables

## Next Steps (Future Sprints)

### Sprint 2: Product API Integration
```go
// tests/d365-connector-test/scenarios/03_product_lookup_test.go
func TestProductLookup(t *testing.T) {
    client := d365.NewClient(config)
    product, err := client.GetProduct("12345678") // Article number
    // Verify product data
}
```

### Sprint 3: Pricing & Inventory
```go
// 04_pricing_test.go
func TestPricing(t *testing.T) {
    price, err := client.GetPrice("store-001", "12345678")
}

// 05_inventory_test.go
func TestInventory(t *testing.T) {
    stock, err := client.GetInventory("store-001", "12345678")
}
```

## Troubleshooting

### "Missing required D365 configuration"
- Ensure `.env` file exists in `tests/d365-connector-test/`
- All required variables must be set (see `.env.example`)

### "Token request failed with status 401"
- Verify Client ID and Client Secret are correct
- Check app registration has D365 Commerce API permissions
- Ensure secret hasn't expired

### "Failed to ping D365 CSU"
- Verify CSU Base URL is correct
- Check network connectivity to D365 environment
- Ensure CSU is running (check LCS environment status)

### Tests skipped with "Skipping test: .env file not found"
- This is expected if `.env` doesn't exist
- Copy `.env.example` to `.env` and configure

## Integration with Main Backend

Once tests pass, integrate the connector:

```go
// backend/go-routing-service/main.go
import "github.com/.../adapters/d365"

config, _ := d365.LoadFromEnv()
d365Connector := d365.NewAdapter(config)

// Register with connector framework
registry.Register("ikea", "retail", d365Connector)
```

## Support

**Documentation:** See `docs/D365_CONNECTOR_GUIDE.md` (coming in Sprint 2)  
**Issues:** GitHub Issues on `purehospitality/amicis-solution-accelerator`  
**Questions:** Contact the Amicis platform team

---

**Status:** ✅ Sprint 1 Complete - Ready for D365 Tier 2 environment testing
