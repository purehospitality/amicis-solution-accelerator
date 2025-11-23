package models

import "time"

// Order represents a canonical customer order across all backends
type Order struct {
	ID            string                 `json:"id"`
	OrderNumber   string                 `json:"orderNumber"`
	CustomerID    string                 `json:"customerId,omitempty"`
	StoreID       string                 `json:"storeId"`
	Status        OrderStatus            `json:"status"`
	LineItems     []OrderLineItem        `json:"lineItems"`
	Subtotal      Price                  `json:"subtotal"`
	Tax           Price                  `json:"tax"`
	Shipping      Price                  `json:"shipping"`
	Total         Price                  `json:"total"`
	BillingAddress  *Address             `json:"billingAddress,omitempty"`
	ShippingAddress *Address             `json:"shippingAddress,omitempty"`
	PaymentMethod *PaymentMethod         `json:"paymentMethod,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt,omitempty"`
}

// OrderStatus represents the order lifecycle state
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

// OrderLineItem represents a single product in an order
type OrderLineItem struct {
	ID         string  `json:"id"`
	ProductID  string  `json:"productId"`
	VariantID  string  `json:"variantId,omitempty"`
	SKU        string  `json:"sku"`
	Name       string  `json:"name"`
	Quantity   int     `json:"quantity"`
	UnitPrice  Price   `json:"unitPrice"`
	TotalPrice Price   `json:"totalPrice"`
	ImageURL   string  `json:"imageUrl,omitempty"`
}

// Address represents a physical address
type Address struct {
	FirstName   string `json:"firstName,omitempty"`
	LastName    string `json:"lastName,omitempty"`
	Company     string `json:"company,omitempty"`
	Address1    string `json:"address1"`
	Address2    string `json:"address2,omitempty"`
	City        string `json:"city"`
	State       string `json:"state,omitempty"`
	PostalCode  string `json:"postalCode"`
	Country     string `json:"country"`
	Phone       string `json:"phone,omitempty"`
}

// PaymentMethod represents payment information (sanitized)
type PaymentMethod struct {
	Type        string `json:"type"` // "credit_card", "debit_card", "paypal", etc.
	Last4       string `json:"last4,omitempty"`
	Brand       string `json:"brand,omitempty"` // "visa", "mastercard", etc.
	ExpiryMonth int    `json:"expiryMonth,omitempty"`
	ExpiryYear  int    `json:"expiryYear,omitempty"`
}

// OrderRequest represents a request to create an order
type OrderRequest struct {
	StoreID         string          `json:"storeId"`
	LineItems       []OrderLineItem `json:"lineItems"`
	BillingAddress  Address         `json:"billingAddress"`
	ShippingAddress Address         `json:"shippingAddress"`
	PaymentMethod   PaymentMethod   `json:"paymentMethod"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// OrderList represents paginated order results
type OrderList struct {
	Orders  []Order `json:"orders"`
	Total   int     `json:"total"`
	Limit   int     `json:"limit"`
	Offset  int     `json:"offset"`
	HasMore bool    `json:"hasMore"`
}
