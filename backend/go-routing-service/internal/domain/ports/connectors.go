package ports

import (
	"context"
	"github.com/amicis/go-routing-service/internal/domain/models"
)

// IConnector is the base interface for all backend connectors
// All domain-specific connectors must implement this interface
type IConnector interface {
	// GetDomain returns the domain this connector handles (e.g., "retail", "kitchen", "wishlist")
	GetDomain() string
	
	// GetAdapterType returns the adapter implementation type (e.g., "D365CommerceAdapter", "MockAdapter")
	GetAdapterType() string
	
	// Initialize sets up the connector with configuration
	Initialize(ctx context.Context, config ConnectorConfig) error
	
	// HealthCheck verifies the connector can communicate with its backend
	HealthCheck(ctx context.Context) error
	
	// Close gracefully shuts down the connector
	Close() error
}

// ConnectorConfig holds configuration for initializing a connector
type ConnectorConfig struct {
	StoreID    string                 `json:"storeId"`
	TenantID   string                 `json:"tenantId"`
	Domain     string                 `json:"domain"`
	URL        string                 `json:"url"`
	Adapter    string                 `json:"adapter"`
	Version    string                 `json:"version"`
	Config     map[string]interface{} `json:"config"`
	Enabled    bool                   `json:"enabled"`
	Timeout    int                    `json:"timeout"` // in milliseconds
}

// IRetailConnector defines operations for retail/commerce backends
// Implementations: D365CommerceAdapter, SAPCommerceAdapter, ShopifyAdapter
type IRetailConnector interface {
	IConnector
	
	// GetProducts retrieves products based on filters
	GetProducts(ctx context.Context, filters models.ProductFilters) (*models.ProductList, error)
	
	// GetProduct retrieves a single product by ID
	GetProduct(ctx context.Context, productID string) (*models.Product, error)
	
	// GetProductBySKU retrieves a product by SKU
	GetProductBySKU(ctx context.Context, sku string) (*models.Product, error)
	
	// CreateOrder submits an order to the backend
	CreateOrder(ctx context.Context, orderReq models.OrderRequest) (*models.Order, error)
	
	// GetOrder retrieves an order by ID
	GetOrder(ctx context.Context, orderID string) (*models.Order, error)
	
	// GetOrders retrieves orders for a customer
	GetOrders(ctx context.Context, customerID string, limit, offset int) (*models.OrderList, error)
	
	// UpdateOrderStatus updates the order status
	UpdateOrderStatus(ctx context.Context, orderID string, status models.OrderStatus) error
}

// IWishlistConnector defines operations for wishlist backends
// Implementations: D365WishlistAdapter, CustomWishlistAdapter
type IWishlistConnector interface {
	IConnector
	
	// GetWishlists retrieves all wishlists for a customer
	GetWishlists(ctx context.Context, customerID string) (*models.WishlistList, error)
	
	// GetWishlist retrieves a specific wishlist
	GetWishlist(ctx context.Context, wishlistID string) (*models.Wishlist, error)
	
	// CreateWishlist creates a new wishlist
	CreateWishlist(ctx context.Context, customerID, name string, isPublic bool) (*models.Wishlist, error)
	
	// AddItem adds an item to a wishlist
	AddItem(ctx context.Context, wishlistID string, item models.AddWishlistItemRequest) (*models.WishlistItem, error)
	
	// RemoveItem removes an item from a wishlist
	RemoveItem(ctx context.Context, wishlistID, itemID string) error
	
	// UpdateItem updates an item in a wishlist
	UpdateItem(ctx context.Context, wishlistID, itemID string, quantity int, notes string) (*models.WishlistItem, error)
	
	// DeleteWishlist deletes a wishlist
	DeleteWishlist(ctx context.Context, wishlistID string) error
}

// IKitchenConnector defines operations for kitchen management backends
// Implementations: PureKDSAdapter, CustomKitchenAdapter
type IKitchenConnector interface {
	IConnector
	
	// SubmitOrder submits an order to the kitchen
	SubmitOrder(ctx context.Context, orderID string, items []models.OrderLineItem) error
	
	// GetOrderStatus retrieves the kitchen status of an order
	GetOrderStatus(ctx context.Context, orderID string) (string, error)
	
	// UpdateOrderStatus updates the kitchen status
	UpdateOrderStatus(ctx context.Context, orderID string, status string) error
	
	// GetActiveOrders retrieves all active orders in the kitchen
	GetActiveOrders(ctx context.Context) ([]string, error)
}

// ConnectorMetadata represents runtime information about a connector
type ConnectorMetadata struct {
	Domain      string            `json:"domain"`
	Adapter     string            `json:"adapter"`
	Version     string            `json:"version"`
	URL         string            `json:"url"`
	Enabled     bool              `json:"enabled"`
	Healthy     bool              `json:"healthy"`
	LastChecked string            `json:"lastChecked,omitempty"`
	Stats       map[string]int64  `json:"stats,omitempty"` // request count, error count, etc.
}
