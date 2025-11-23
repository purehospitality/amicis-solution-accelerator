package d365

import (
	"fmt"
	"time"

	"github.com/amicis/go-routing-service/internal/domain/models"
)

// D365 OData response structures

// D365ProductListResponse represents the OData collection response
type D365ProductListResponse struct {
	Context  string        `json:"@odata.context"`
	Count    int           `json:"@odata.count,omitempty"`
	Value    []D365Product `json:"value"`
	NextLink string        `json:"@odata.nextLink,omitempty"`
}

// D365Product represents a product in D365 Commerce OData format
type D365Product struct {
	RecordID    int64              `json:"RecId"`
	ItemID      string             `json:"ItemId"` // SKU
	Name        string             `json:"Name"`
	Description string             `json:"Description"`
	Category    string             `json:"CategoryName"`
	Price       float64            `json:"Price"`
	Currency    string             `json:"CurrencyCode"`
	PrimaryImageURL string         `json:"PrimaryImageUrl"`
	Images      []D365ProductImage `json:"Images,omitempty"`
	Variants    []D365ProductVariant `json:"Variants,omitempty"`
	Available   bool               `json:"IsAvailable"`
	StockLevel  int                `json:"AvailableQuantity"`
}

// D365ProductImage represents a product image in D365
type D365ProductImage struct {
	URL      string `json:"Url"`
	AltText  string `json:"AltText"`
	Position int    `json:"DisplayOrder"`
}

// D365ProductVariant represents a product variant in D365
type D365ProductVariant struct {
	RecordID   int64   `json:"RecId"`
	ItemID     string  `json:"ItemId"`
	Name       string  `json:"Name"`
	Price      float64 `json:"Price"`
	ColorID    string  `json:"ColorId,omitempty"`
	SizeID     string  `json:"SizeId,omitempty"`
	StyleID    string  `json:"StyleId,omitempty"`
	ConfigID   string  `json:"ConfigId,omitempty"`
	Available  bool    `json:"IsAvailable"`
	StockLevel int     `json:"AvailableQuantity"`
}

// D365OrderListResponse represents the OData collection response for orders
type D365OrderListResponse struct {
	Context  string      `json:"@odata.context"`
	Count    int         `json:"@odata.count,omitempty"`
	Value    []D365Order `json:"value"`
	NextLink string      `json:"@odata.nextLink,omitempty"`
}

// D365Order represents an order in D365 Commerce OData format
type D365Order struct {
	RecordID          int64            `json:"RecId"`
	SalesID           string           `json:"SalesId"`
	CustomerAccountID string           `json:"CustomerAccount"`
	Status            string           `json:"SalesStatus"`
	Lines             []D365OrderLine  `json:"Lines,omitempty"`
	SubTotal          float64          `json:"SubTotal"`
	TaxTotal          float64          `json:"TaxTotal"`
	TotalAmount       float64          `json:"TotalAmount"`
	Currency          string           `json:"CurrencyCode"`
	CreatedDateTime   string           `json:"CreatedDateTime"`
	ModifiedDateTime  string           `json:"ModifiedDateTime"`
	DeliveryAddress   *D365Address     `json:"DeliveryAddress,omitempty"`
	InvoiceAddress    *D365Address     `json:"InvoiceAddress,omitempty"`
}

// D365OrderLine represents an order line item in D365
type D365OrderLine struct {
	RecordID    int64   `json:"RecId"`
	ItemID      string  `json:"ItemId"`
	ProductName string  `json:"ProductName"`
	Quantity    float64 `json:"Quantity"`
	SalesPrice  float64 `json:"SalesPrice"`
	LineAmount  float64 `json:"LineAmount"`
	ImageURL    string  `json:"ImageUrl,omitempty"`
}

// D365Address represents an address in D365
type D365Address struct {
	Name        string `json:"Name"`
	Street      string `json:"Street"`
	City        string `json:"City"`
	State       string `json:"State"`
	ZipCode     string `json:"ZipCode"`
	CountryCode string `json:"CountryRegionId"`
}

// Transformation methods: D365 → Domain models

func (a *D365CommerceAdapter) transformProductList(odataResp D365ProductListResponse) *models.ProductList {
	products := make([]models.Product, 0, len(odataResp.Value))
	
	for _, d365Product := range odataResp.Value {
		products = append(products, *a.transformProduct(d365Product))
	}

	return &models.ProductList{
		Products: products,
		Total:    odataResp.Count,
		Limit:    len(products),
		Offset:   0,
		HasMore:  odataResp.NextLink != "",
	}
}

func (a *D365CommerceAdapter) transformProduct(d365Product D365Product) *models.Product {
	product := &models.Product{
		ID:          fmt.Sprintf("%d", d365Product.RecordID),
		SKU:         d365Product.ItemID,
		Name:        d365Product.Name,
		Description: d365Product.Description,
		Category:    d365Product.Category,
		Price: models.Price{
			Amount:   d365Product.Price,
			Currency: d365Product.Currency,
		},
		Images:   make([]models.ProductImage, 0),
		Variants: make([]models.ProductVariant, 0),
		Metadata: make(map[string]interface{}),
	}

	// Add primary image
	if d365Product.PrimaryImageURL != "" {
		product.Images = append(product.Images, models.ProductImage{
			URL:       d365Product.PrimaryImageURL,
			IsPrimary: true,
			Position:  0,
		})
	}

	// Add additional images
	for i, img := range d365Product.Images {
		product.Images = append(product.Images, models.ProductImage{
			URL:       img.URL,
			AltText:   img.AltText,
			IsPrimary: false,
			Position:  i + 1,
		})
	}

	// Transform variants
	for _, d365Variant := range d365Product.Variants {
		variant := models.ProductVariant{
			ID:   fmt.Sprintf("%d", d365Variant.RecordID),
			SKU:  d365Variant.ItemID,
			Name: d365Variant.Name,
			Price: models.Price{
				Amount:   d365Variant.Price,
				Currency: d365Product.Currency,
			},
			Attributes: make(map[string]string),
		}

		// Add variant attributes
		if d365Variant.ColorID != "" {
			variant.Attributes["color"] = d365Variant.ColorID
		}
		if d365Variant.SizeID != "" {
			variant.Attributes["size"] = d365Variant.SizeID
		}
		if d365Variant.StyleID != "" {
			variant.Attributes["style"] = d365Variant.StyleID
		}

		// Add inventory info
		variant.Inventory = &models.InventoryInfo{
			Available: d365Variant.Available,
			Quantity:  d365Variant.StockLevel,
		}

		product.Variants = append(product.Variants, variant)
	}

	// Add main product inventory
	product.Inventory = &models.InventoryInfo{
		Available: d365Product.Available,
		Quantity:  d365Product.StockLevel,
	}

	return product
}

func (a *D365CommerceAdapter) transformOrderList(odataResp D365OrderListResponse, limit, offset int) *models.OrderList {
	orders := make([]models.Order, 0, len(odataResp.Value))
	
	for _, d365Order := range odataResp.Value {
		orders = append(orders, *a.transformOrder(d365Order))
	}

	return &models.OrderList{
		Orders:  orders,
		Total:   odataResp.Count,
		Limit:   limit,
		Offset:  offset,
		HasMore: odataResp.NextLink != "",
	}
}

func (a *D365CommerceAdapter) transformOrder(d365Order D365Order) *models.Order {
	order := &models.Order{
		ID:          fmt.Sprintf("%d", d365Order.RecordID),
		OrderNumber: d365Order.SalesID,
		CustomerID:  d365Order.CustomerAccountID,
		Status:      a.mapD365OrderStatus(d365Order.Status),
		LineItems:   make([]models.OrderLineItem, 0, len(d365Order.Lines)),
		Subtotal: models.Price{
			Amount:   d365Order.SubTotal,
			Currency: d365Order.Currency,
		},
		Tax: models.Price{
			Amount:   d365Order.TaxTotal,
			Currency: d365Order.Currency,
		},
		Total: models.Price{
			Amount:   d365Order.TotalAmount,
			Currency: d365Order.Currency,
		},
		Metadata: make(map[string]interface{}),
	}

	// Parse timestamps
	if createdAt, err := time.Parse(time.RFC3339, d365Order.CreatedDateTime); err == nil {
		order.CreatedAt = createdAt
	}
	if updatedAt, err := time.Parse(time.RFC3339, d365Order.ModifiedDateTime); err == nil {
		order.UpdatedAt = updatedAt
	}

	// Transform line items
	for _, d365Line := range d365Order.Lines {
		lineItem := models.OrderLineItem{
			ID:        fmt.Sprintf("%d", d365Line.RecordID),
			SKU:       d365Line.ItemID,
			Name:      d365Line.ProductName,
			Quantity:  int(d365Line.Quantity),
			UnitPrice: models.Price{
				Amount:   d365Line.SalesPrice,
				Currency: d365Order.Currency,
			},
			TotalPrice: models.Price{
				Amount:   d365Line.LineAmount,
				Currency: d365Order.Currency,
			},
			ImageURL: d365Line.ImageURL,
		}
		order.LineItems = append(order.LineItems, lineItem)
	}

	// Transform addresses
	if d365Order.DeliveryAddress != nil {
		order.ShippingAddress = a.transformAddress(*d365Order.DeliveryAddress)
	}
	if d365Order.InvoiceAddress != nil {
		order.BillingAddress = a.transformAddress(*d365Order.InvoiceAddress)
	}

	return order
}

func (a *D365CommerceAdapter) transformAddress(d365Addr D365Address) *models.Address {
	return &models.Address{
		Address1:   d365Addr.Street,
		City:       d365Addr.City,
		State:      d365Addr.State,
		PostalCode: d365Addr.ZipCode,
		Country:    d365Addr.CountryCode,
	}
}

func (a *D365CommerceAdapter) mapD365OrderStatus(d365Status string) models.OrderStatus {
	// Map D365 status to domain status
	statusMap := map[string]models.OrderStatus{
		"Created":    models.OrderStatusPending,
		"Processing": models.OrderStatusProcessing,
		"Confirmed":  models.OrderStatusPaid,
		"Shipped":    models.OrderStatusShipped,
		"Delivered":  models.OrderStatusDelivered,
		"Cancelled":  models.OrderStatusCancelled,
		"Returned":   models.OrderStatusRefunded,
	}

	if status, ok := statusMap[d365Status]; ok {
		return status
	}

	return models.OrderStatusPending
}

// Transformation methods: Domain → D365 models

func (a *D365CommerceAdapter) transformOrderRequest(orderReq models.OrderRequest) map[string]interface{} {
	// Build D365 order request
	d365Order := map[string]interface{}{
		"CustomerAccount": "", // Will be populated from JWT context
		"CurrencyCode":    "USD",
		"Lines":           a.transformOrderLines(orderReq.LineItems),
	}

	// Add delivery address
	if orderReq.ShippingAddress.Address1 != "" {
		d365Order["DeliveryAddress"] = map[string]interface{}{
			"Street":          orderReq.ShippingAddress.Address1,
			"City":            orderReq.ShippingAddress.City,
			"State":           orderReq.ShippingAddress.State,
			"ZipCode":         orderReq.ShippingAddress.PostalCode,
			"CountryRegionId": orderReq.ShippingAddress.Country,
		}
	}

	// Add invoice address
	if orderReq.BillingAddress.Address1 != "" {
		d365Order["InvoiceAddress"] = map[string]interface{}{
			"Street":          orderReq.BillingAddress.Address1,
			"City":            orderReq.BillingAddress.City,
			"State":           orderReq.BillingAddress.State,
			"ZipCode":         orderReq.BillingAddress.PostalCode,
			"CountryRegionId": orderReq.BillingAddress.Country,
		}
	}

	return d365Order
}

func (a *D365CommerceAdapter) transformOrderLines(lineItems []models.OrderLineItem) []map[string]interface{} {
	d365Lines := make([]map[string]interface{}, 0, len(lineItems))

	for _, item := range lineItems {
		d365Line := map[string]interface{}{
			"ItemId":      item.SKU,
			"ProductName": item.Name,
			"Quantity":    float64(item.Quantity),
			"SalesPrice":  item.UnitPrice.Amount,
		}
		d365Lines = append(d365Lines, d365Line)
	}

	return d365Lines
}
