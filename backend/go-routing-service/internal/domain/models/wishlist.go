package models

import "time"

// Wishlist represents a customer's saved items
type Wishlist struct {
	ID         string         `json:"id"`
	CustomerID string         `json:"customerId"`
	TenantID   string         `json:"tenantId"`
	StoreID    string         `json:"storeId,omitempty"`
	Name       string         `json:"name"`
	Items      []WishlistItem `json:"items"`
	IsPublic   bool           `json:"isPublic"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
}

// WishlistItem represents a single item in a wishlist
type WishlistItem struct {
	ID         string                 `json:"id"`
	ProductID  string                 `json:"productId"`
	VariantID  string                 `json:"variantId,omitempty"`
	SKU        string                 `json:"sku"`
	Name       string                 `json:"name"`
	Price      Price                  `json:"price"`
	ImageURL   string                 `json:"imageUrl,omitempty"`
	Notes      string                 `json:"notes,omitempty"`
	Quantity   int                    `json:"quantity"`
	AddedAt    time.Time              `json:"addedAt"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
}

// AddWishlistItemRequest represents a request to add an item
type AddWishlistItemRequest struct {
	ProductID string `json:"productId"`
	VariantID string `json:"variantId,omitempty"`
	Quantity  int    `json:"quantity"`
	Notes     string `json:"notes,omitempty"`
}

// WishlistList represents paginated wishlist results
type WishlistList struct {
	Wishlists []Wishlist `json:"wishlists"`
	Total     int        `json:"total"`
	Limit     int        `json:"limit"`
	Offset    int        `json:"offset"`
	HasMore   bool       `json:"hasMore"`
}
