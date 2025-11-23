package models

import "time"

// Product represents a canonical retail product across all backends
// This is the domain model that all adapters must transform to/from
type Product struct {
	ID          string                 `json:"id"`
	SKU         string                 `json:"sku"`
	Name        string                 `json:"name"`
	Description string                 `json:"description,omitempty"`
	Category    string                 `json:"category,omitempty"`
	Price       Price                  `json:"price"`
	Images      []ProductImage         `json:"images,omitempty"`
	Variants    []ProductVariant       `json:"variants,omitempty"`
	Inventory   *InventoryInfo         `json:"inventory,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"createdAt,omitempty"`
	UpdatedAt   time.Time              `json:"updatedAt,omitempty"`
}

// Price represents product pricing with currency
type Price struct {
	Amount       float64 `json:"amount"`
	Currency     string  `json:"currency"`
	CompareAtPrice *float64 `json:"compareAtPrice,omitempty"` // Original price for discounts
}

// ProductImage represents a product image
type ProductImage struct {
	URL       string `json:"url"`
	AltText   string `json:"altText,omitempty"`
	IsPrimary bool   `json:"isPrimary"`
	Position  int    `json:"position"`
}

// ProductVariant represents product variations (size, color, etc.)
type ProductVariant struct {
	ID       string                 `json:"id"`
	SKU      string                 `json:"sku"`
	Name     string                 `json:"name"`
	Price    Price                  `json:"price"`
	Attributes map[string]string    `json:"attributes"` // e.g., {"size": "Large", "color": "Blue"}
	Inventory *InventoryInfo        `json:"inventory,omitempty"`
}

// InventoryInfo represents stock availability
type InventoryInfo struct {
	Available       bool   `json:"available"`
	Quantity        int    `json:"quantity"`
	StoreID         string `json:"storeId,omitempty"`
	ReservedQuantity int   `json:"reservedQuantity,omitempty"`
}

// ProductFilters represents search/filter criteria
type ProductFilters struct {
	Category    string   `json:"category,omitempty"`
	MinPrice    *float64 `json:"minPrice,omitempty"`
	MaxPrice    *float64 `json:"maxPrice,omitempty"`
	InStock     *bool    `json:"inStock,omitempty"`
	SearchTerm  string   `json:"searchTerm,omitempty"`
	SKUs        []string `json:"skus,omitempty"`
	Limit       int      `json:"limit,omitempty"`
	Offset      int      `json:"offset,omitempty"`
}

// ProductList represents paginated product results
type ProductList struct {
	Products   []Product `json:"products"`
	Total      int       `json:"total"`
	Limit      int       `json:"limit"`
	Offset     int       `json:"offset"`
	HasMore    bool      `json:"hasMore"`
}
