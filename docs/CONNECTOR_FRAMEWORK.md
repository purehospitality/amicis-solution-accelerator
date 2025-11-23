# Multi-Domain Connector Framework

## Overview

The Amicis Multi-Domain Connector Framework transforms the routing service from a single-socket connector into a **Multi-Domain Service Hub** capable of supporting diverse backend systems (D365 Commerce CSU, PureKDS, future systems) within a single tenant architecture.

## Architecture: Hexagonal (Ports & Adapters)

The framework implements **Hexagonal Architecture** to ensure vendor-agnostic core logic:

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer                              │
│  (commerce_handlers.go - Gateway Endpoints)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 Connector Registry                           │
│  (registry/connector_registry.go)                            │
│  - Factory pattern for adapter creation                      │
│  - Per-tenant connector caching (1hr TTL)                    │
│  - MongoDB-backed configuration                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────┐         ┌───────▼──────────┐
│  Domain Core │         │   Domain Ports    │
│  (models/)   │◄────────│  (ports/)         │
│              │         │                   │
│  - Product   │         │  - IConnector     │
│  - Order     │         │  - IRetailConn    │
│  - Wishlist  │         │  - IWishlistConn  │
└──────────────┘         │  - IKitchenConn   │
                         └───────┬───────────┘
                                 │ implements
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────▼─────────┐          ┌─────────▼──────────┐
        │  D365 Adapter    │          │  Future Adapters   │
        │  (adapters/d365) │          │  (adapters/...)    │
        │                  │          │                    │
        │  - Commerce CSU  │          │  - PureKDS         │
        │  - OData Trans.  │          │  - Others          │
        │  - Circuit Break │          │                    │
        └──────────────────┘          └────────────────────┘
```

### Key Principles

1. **Core Ignorance**: Domain models (`Product`, `Order`, `Wishlist`) never reference vendor-specific APIs
2. **Interface Segregation**: Separate interfaces for retail, wishlist, and kitchen domains
3. **Dependency Inversion**: Adapters depend on domain interfaces, not vice versa
4. **Single Responsibility**: Each adapter handles one vendor's API transformation

## Domain Models

### Product (Canonical Schema)

```go
type Product struct {
    ID          string           `json:"id"`
    SKU         string           `json:"sku"`
    Name        string           `json:"name"`
    Description string           `json:"description,omitempty"`
    Category    string           `json:"category,omitempty"`
    Price       Price            `json:"price"`
    Images      []ProductImage   `json:"images,omitempty"`
    Variants    []ProductVariant `json:"variants,omitempty"`
    Inventory   *InventoryInfo   `json:"inventory,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}
```

**Design Rationale**: 
- `Metadata` map allows vendor-specific extensions without polluting core schema
- `Variants` support product families (e.g., POÄNG armchair colors)
- `InventoryInfo` enables stock availability checks

### Order (Canonical Schema)

```go
type Order struct {
    ID              string         `json:"id"`
    OrderNumber     string         `json:"orderNumber"`
    CustomerID      string         `json:"customerId"`
    Status          OrderStatus    `json:"status"`
    LineItems       []OrderLineItem `json:"lineItems"`
    Subtotal        float64        `json:"subtotal"`
    Tax             float64        `json:"tax"`
    Total           float64        `json:"total"`
    ShippingAddress *Address       `json:"shippingAddress,omitempty"`
    BillingAddress  *Address       `json:"billingAddress,omitempty"`
    CreatedAt       time.Time      `json:"createdAt"`
    UpdatedAt       time.Time      `json:"updatedAt"`
}

type OrderStatus string
const (
    OrderStatusPending    OrderStatus = "pending"
    OrderStatusProcessing OrderStatus = "processing"
    OrderStatusPaid       OrderStatus = "paid"
    OrderStatusShipped    OrderStatus = "shipped"
    OrderStatusDelivered  OrderStatus = "delivered"
    OrderStatusCancelled  OrderStatus = "cancelled"
    OrderStatusRefunded   OrderStatus = "refunded"
)
```

**Design Rationale**:
- Enum-based status lifecycle ensures type safety
- Separate shipping/billing addresses for B2B scenarios
- `OrderNumber` provides customer-facing identifier distinct from internal `ID`

## Domain Interfaces (Ports)

### IConnector (Base Interface)

```go
type IConnector interface {
    GetDomain() string           // "retail", "wishlist", "kitchen"
    GetAdapterType() string      // "D365CommerceAdapter", "PureKDSAdapter", etc.
    Initialize(ctx context.Context) error
    HealthCheck(ctx context.Context) error
    Close() error
}
```

### IRetailConnector

```go
type IRetailConnector interface {
    IConnector
    GetProducts(ctx context.Context, filters ProductFilters) (*ProductList, error)
    GetProduct(ctx context.Context, productID string) (*Product, error)
    GetProductBySKU(ctx context.Context, sku string) (*Product, error)
    CreateOrder(ctx context.Context, order OrderRequest) (*Order, error)
    GetOrder(ctx context.Context, orderID string) (*Order, error)
    GetOrders(ctx context.Context, customerID string, filters OrderFilters) ([]Order, error)
    UpdateOrderStatus(ctx context.Context, orderID string, status OrderStatus) error
}
```

### IWishlistConnector

```go
type IWishlistConnector interface {
    IConnector
    GetWishlists(ctx context.Context, customerID string) ([]Wishlist, error)
    GetWishlist(ctx context.Context, wishlistID string) (*Wishlist, error)
    CreateWishlist(ctx context.Context, customerID, name string) (*Wishlist, error)
    AddItem(ctx context.Context, wishlistID string, item WishlistItem) error
    RemoveItem(ctx context.Context, wishlistID, itemID string) error
    DeleteWishlist(ctx context.Context, wishlistID string) error
}
```

### IKitchenConnector

```go
type IKitchenConnector interface {
    IConnector
    SubmitOrder(ctx context.Context, order Order) error
    GetOrderStatus(ctx context.Context, orderID string) (string, error)
    GetActiveOrders(ctx context.Context, storeID string) ([]Order, error)
}
```

## Connector Registry

### Purpose

The `ConnectorRegistry` manages connector lifecycle with:
- **Factory Pattern**: Register adapter creation functions
- **Caching**: Per-tenant connector instances (1-hour TTL)
- **Configuration**: MongoDB-backed connector metadata
- **Cleanup**: Background goroutine removes stale connections every 15 minutes

### Usage

```go
// Register adapter factory (in main.go)
registry.RegisterFactory("D365CommerceAdapter", func(config ports.ConnectorConfig) (ports.IConnector, error) {
    return d365.NewCommerceAdapter(config)
})

// Get connector instance (in handlers)
connector, err := registry.GetConnector(ctx, tenantID, storeID, "retail")
retailConn := connector.(ports.IRetailConnector)
products, err := retailConn.GetProducts(ctx, filters)
```

### MongoDB Schema

**Collection**: `connectors`

```javascript
{
  "_id": ObjectId("..."),
  "tenantId": "ikea",
  "storeId": "ikea-seattle",
  "domain": "retail",           // "retail" | "wishlist" | "kitchen"
  "url": "https://d365-csu.ikea.com/api/v1",
  "adapter": "D365CommerceAdapter",
  "version": "v1",
  "config": {
    "demoMode": true,
    "apiKey": "encrypted-key",
    "timeout": 10000,
    "circuitBreakerThreshold": 0.5
  },
  "enabled": true,
  "timeout": 10000,
  "priority": 1
}
```

**Index**: Unique compound index on `(tenantId, storeId, domain)`

## Adding New Adapters

### Step 1: Implement Interface

Create adapter in `internal/adapters/<vendor>/`:

```go
package myvendor

import (
    "context"
    "github.com/amicis/go-routing-service/internal/domain/models"
    "github.com/amicis/go-routing-service/internal/domain/ports"
)

type MyVendorAdapter struct {
    config     ports.ConnectorConfig
    httpClient *http.Client
    // vendor-specific fields
}

func NewMyVendorAdapter(config ports.ConnectorConfig) (ports.IRetailConnector, error) {
    return &MyVendorAdapter{
        config: config,
        httpClient: &http.Client{Timeout: time.Duration(config.Timeout) * time.Millisecond},
    }, nil
}

// Implement IConnector methods
func (a *MyVendorAdapter) GetDomain() string { return "retail" }
func (a *MyVendorAdapter) GetAdapterType() string { return "MyVendorAdapter" }
func (a *MyVendorAdapter) Initialize(ctx context.Context) error { /* ... */ }
func (a *MyVendorAdapter) HealthCheck(ctx context.Context) error { /* ... */ }
func (a *MyVendorAdapter) Close() error { /* ... */ }

// Implement IRetailConnector methods
func (a *MyVendorAdapter) GetProducts(ctx context.Context, filters models.ProductFilters) (*models.ProductList, error) {
    // 1. Call vendor API
    // 2. Transform response to models.ProductList
    // 3. Return canonical data
}
```

### Step 2: Create Transformers

Implement bidirectional transformations in `transformers.go`:

```go
// Vendor → Domain
func transformVendorProduct(vendorProd VendorProduct) models.Product {
    return models.Product{
        ID:          vendorProd.ExternalID,
        SKU:         vendorProd.ItemCode,
        Name:        vendorProd.DisplayName,
        Price:       models.Price{Amount: vendorProd.ListPrice, Currency: "USD"},
        // ... map all fields
    }
}

// Domain → Vendor
func transformOrderRequest(req models.OrderRequest) VendorOrderRequest {
    return VendorOrderRequest{
        CustomerRef: req.CustomerID,
        Items:       mapLineItems(req.LineItems),
        // ... map all fields
    }
}
```

### Step 3: Register Factory

In `commerce_handlers.go`:

```go
func (app *App) initializeConnectorRegistry(dbName string) error {
    // ... existing registrations ...
    
    app.connectorRegistry.RegisterFactory("MyVendorAdapter", func(config ports.ConnectorConfig) (ports.IConnector, error) {
        return myvendor.NewMyVendorAdapter(config)
    })
    
    return nil
}
```

### Step 4: Add Configuration

Seed MongoDB with connector config:

```javascript
db.connectors.insertOne({
    tenantId: "my-tenant",
    storeId: "my-store-001",
    domain: "retail",
    url: "https://vendor-api.example.com",
    adapter: "MyVendorAdapter",
    version: "v1",
    config: {
        demoMode: false,
        apiKey: process.env.VENDOR_API_KEY,
        timeout: 15000
    },
    enabled: true,
    timeout: 15000,
    priority: 1
});
```

## D365 Commerce Adapter

### OData Transformation

The D365 adapter transforms OData v4 responses:

**D365 Product → Domain Product**:
```go
// D365 OData Response
{
  "RecordID": 12345,
  "ItemId": "BILLY-WHITE-001",
  "ProductName": "BILLY Bookcase",
  "CategoryName": "Furniture/Storage",
  "Price": 79.99,
  "Images": [{"Url": "..."}]
}

// Transformed to Domain Model
{
  "id": "12345",
  "sku": "BILLY-WHITE-001",
  "name": "BILLY Bookcase",
  "category": "Furniture/Storage",
  "price": {"amount": 79.99, "currency": "USD"},
  "images": [{"url": "...", "alt": "BILLY Bookcase"}]
}
```

### Circuit Breaker

Each D365 adapter instance includes a circuit breaker (using `gobreaker`):

```go
breaker := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        fmt.Sprintf("d365-commerce-%s", config.StoreID),
    MaxRequests: 5,
    Interval:    60 * time.Second,
    Timeout:     30 * time.Second,
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 5 && failureRatio >= 0.5
    },
})
```

**Behavior**:
- **Closed**: Normal operation
- **Open**: After 50% failure rate @ 5 requests, block calls for 30s
- **Half-Open**: Allow 5 test requests after timeout

### Demo Mode

Enable testing without live D365 instance:

```go
config := ports.ConnectorConfig{
    Config: map[string]interface{}{
        "demoMode": true,
    },
}
```

**Demo Products**:
- BILLY Bookcase ($79.99)
- KALLAX Shelf ($59.99)
- POÄNG Armchair ($129.00, 3 color variants)
- LACK Coffee Table ($39.99)
- EKTORP Sofa ($599.00, out of stock)

## API Endpoints

### GET /api/v1/commerce/products

**Query Parameters**:
- `storeId` (required): Store identifier
- `category`: Filter by category
- `minPrice`, `maxPrice`: Price range filter
- `search`: Full-text search term
- `limit`: Results per page (default: 10)
- `offset`: Pagination offset

**Response**:
```json
{
  "products": [
    {
      "id": "12345",
      "sku": "BILLY-WHITE-001",
      "name": "BILLY Bookcase",
      "price": {"amount": 79.99, "currency": "USD"},
      "images": [{"url": "...", "alt": "BILLY Bookcase"}]
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0,
  "hasMore": true
}
```

### GET /api/v1/commerce/products/{productId}

**Query Parameters**:
- `storeId` (required)

**Response**: Single `Product` object

### POST /api/v1/commerce/orders

**Request Body**:
```json
{
  "storeId": "ikea-seattle",
  "customerId": "customer-123",
  "lineItems": [
    {
      "productId": "12345",
      "sku": "BILLY-WHITE-001",
      "quantity": 2,
      "unitPrice": 79.99
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Seattle",
    "state": "WA",
    "postalCode": "98101",
    "country": "US"
  }
}
```

**Response**: Created `Order` object

### GET /api/v1/commerce/connectors

**Query Parameters**:
- `storeId` (required)

**Response**: Array of connector metadata

```json
{
  "connectors": [
    {
      "domain": "retail",
      "adapterType": "D365CommerceAdapter",
      "version": "v1",
      "enabled": true,
      "priority": 1
    }
  ]
}
```

## Frontend Integration

### TypeScript API Client

```typescript
// frontend/src/services/api.ts
async getProducts(storeId: string, filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await this.routingApi.get('/api/v1/commerce/products', {
    params: { storeId, ...filters },
  });
  return response.data;
}

async createOrder(orderRequest: {
  storeId: string;
  customerId: string;
  lineItems: Array<{
    productId: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress?: Address;
}) {
  const response = await this.routingApi.post('/api/v1/commerce/orders', orderRequest);
  return response.data;
}
```

### Example Usage

```typescript
import { apiClient } from './services/api';

// Get products for IKEA Seattle
const products = await apiClient.getProducts('ikea-seattle', {
  category: 'Furniture/Storage',
  maxPrice: 100,
  limit: 20
});

// Create order
const order = await apiClient.createOrder({
  storeId: 'ikea-seattle',
  customerId: 'user-123',
  lineItems: [
    { productId: '12345', sku: 'BILLY-WHITE-001', quantity: 2, unitPrice: 79.99 }
  ],
  shippingAddress: { /* ... */ }
});
```

## Testing

### Local Development

1. **Start MongoDB**:
   ```bash
   docker-compose up mongodb redis
   ```

2. **Seed Connectors**:
   ```bash
   cd scripts
   $env:MONGODB_URI="mongodb://admin:devpassword@localhost:27017/amicis?authSource=admin"
   node seed-connectors.js
   ```

3. **Build & Run**:
   ```bash
   cd backend/go-routing-service
   go build -o bin/routing-service.exe .
   $env:MONGODB_URI="mongodb://admin:devpassword@localhost:27017"
   $env:REDIS_URL="redis://:devpassword@localhost:6379"
   $env:JWT_SECRET="development-secret"
   .\bin\routing-service.exe
   ```

4. **Test Endpoints**:
   ```bash
   # Get demo products (requires JWT token)
   curl -H "Authorization: Bearer <token>" \
     "http://localhost:8080/api/v1/commerce/products?storeId=ikea-seattle"
   
   # Create order
   curl -X POST -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"storeId":"ikea-seattle","customerId":"test-user","lineItems":[...]}' \
     "http://localhost:8080/api/v1/commerce/orders"
   ```

### Unit Testing

Test adapters in isolation:

```go
func TestD365Adapter_GetProducts(t *testing.T) {
    config := ports.ConnectorConfig{
        StoreID: "test-store",
        Config:  map[string]interface{}{"demoMode": true},
    }
    
    adapter, err := d365.NewCommerceAdapter(config)
    assert.NoError(t, err)
    
    products, err := adapter.GetProducts(context.Background(), models.ProductFilters{
        Category: "Furniture",
        Limit:    5,
    })
    
    assert.NoError(t, err)
    assert.NotNil(t, products)
    assert.LessOrEqual(t, len(products.Products), 5)
}
```

### Integration Testing

Test full connector flow:

```go
func TestConnectorRegistry_EndToEnd(t *testing.T) {
    // Setup registry with MongoDB
    registry := registry.NewConnectorRegistry(mongoClient.Database("test"))
    registry.RegisterFactory("D365CommerceAdapter", d365.NewCommerceAdapter)
    
    // Get connector
    conn, err := registry.GetConnector(ctx, "ikea", "ikea-seattle", "retail")
    assert.NoError(t, err)
    
    // Call methods
    retailConn := conn.(ports.IRetailConnector)
    products, err := retailConn.GetProducts(ctx, models.ProductFilters{Limit: 10})
    assert.NoError(t, err)
}
```

## Performance Considerations

### Connector Caching

- **Cache Key**: `tenantId:storeId:domain`
- **TTL**: 1 hour (configurable)
- **Cleanup**: Background goroutine every 15 minutes
- **Thread Safety**: sync.RWMutex for concurrent access

### Circuit Breaker

- Prevents cascading failures to slow/failing backends
- Fail-fast behavior during outages
- Automatic recovery with half-open state

### Connection Pooling

- HTTP clients reuse connections via `http.Transport`
- MongoDB connection pool managed by driver
- Redis connection pool managed by go-redis

## Security

### JWT Authentication

All commerce endpoints require valid JWT with:
- `sub` (user ID)
- `tenantId` (tenant isolation)

### Multi-Tenancy

Connectors are isolated by `tenantId`:
- Each tenant has independent connector configurations
- Cache keys include `tenantId` to prevent cross-tenant access
- MongoDB queries filter by `tenantId`

### Secrets Management

Store API keys in connector config:
- Development: Plain text in MongoDB (demo mode only)
- Production: Use Azure Key Vault references

```javascript
config: {
  apiKey: "@Microsoft.KeyVault(SecretUri=https://...)",
  timeout: 10000
}
```

## Monitoring

### Metrics to Track

- Connector cache hit rate
- Circuit breaker state changes
- API latency per adapter
- Transformation errors
- MongoDB query performance

### Logging

All operations include correlation IDs:

```go
log.Info().
    Str("correlationId", correlationID).
    Str("tenantId", tenantID).
    Str("storeId", storeID).
    Str("adapter", connector.GetAdapterType()).
    Msg("Retrieved products from connector")
```

## Future Enhancements

### 1. Wishlist Adapter

Implement `IWishlistConnector` for D365 Commerce:

```go
type D365WishlistAdapter struct {
    config ports.ConnectorConfig
    // ...
}

func (a *D365WishlistAdapter) GetWishlists(ctx context.Context, customerID string) ([]models.Wishlist, error) {
    // Call D365 wishlist API
    // Transform to domain model
}
```

### 2. Kitchen Display System

Implement `IKitchenConnector` for PureKDS:

```go
type PureKDSAdapter struct {
    config ports.ConnectorConfig
    // ...
}

func (a *PureKDSAdapter) SubmitOrder(ctx context.Context, order models.Order) error {
    // Transform domain order to PureKDS format
    // Send to KDS via API/webhook
}
```

### 3. Event-Driven Synchronization

Add event bus for real-time updates:
- Product inventory changes
- Order status updates
- Wishlist modifications

### 4. GraphQL Federation

Federate multiple backends into single GraphQL schema:

```graphql
type Product @key(fields: "id") {
  id: ID!
  sku: String!
  name: String!
  price: Price!
  inventory: Inventory @provides(fields: "available")
}

extend type Product @key(fields: "id") {
  id: ID! @external
  reviews: [Review]! @requires(fields: "sku")
}
```

## Troubleshooting

### Connector Not Found

**Error**: `Connector not available: no connector found`

**Cause**: Missing MongoDB configuration

**Solution**:
```bash
cd scripts
node seed-connectors.js
```

### Circuit Breaker Open

**Error**: `circuit breaker is open`

**Cause**: Backend system experiencing failures

**Solution**:
1. Check backend health endpoint
2. Verify network connectivity
3. Wait 30 seconds for half-open state
4. Monitor circuit breaker metrics

### Transformation Errors

**Error**: `failed to transform product: missing required field`

**Cause**: Backend API returned unexpected schema

**Solution**:
1. Enable verbose logging in adapter
2. Inspect raw API response
3. Update transformer to handle null/missing fields
4. Add validation with helpful error messages

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [OData v4 Specification](https://www.odata.org/documentation/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [D365 Commerce API Docs](https://learn.microsoft.com/en-us/dynamics365/commerce/)
