package d365

import (
	"fmt"
	"time"

	"github.com/amicis/go-routing-service/internal/domain/models"
)

// Demo mode methods - return synthetic data for development/testing

func (a *D365CommerceAdapter) getDemoProducts(filters models.ProductFilters) *models.ProductList {
	allProducts := []models.Product{
		{
			ID:          "1001",
			SKU:         "BILLY-WHITE-001",
			Name:        "BILLY Bookcase, white",
			Description: "BILLY is a modern bookcase that is both practical and stylish. With adjustable shelves, you can customize the storage space for your books and decorative items.",
			Category:    "furniture",
			Price: models.Price{
				Amount:   79.99,
				Currency: "USD",
			},
			Images: []models.ProductImage{
				{URL: "https://www.ikea.com/us/en/images/products/billy-bookcase-white__0625599_pe692385_s5.jpg", IsPrimary: true, Position: 0},
			},
			Inventory: &models.InventoryInfo{
				Available: true,
				Quantity:  45,
			},
		},
		{
			ID:          "1002",
			SKU:         "KALLAX-001",
			Name:        "KALLAX Shelf unit, white",
			Description: "KALLAX is perfect for storing and organizing your things. The simple design creates a modern and stylish expression.",
			Category:    "furniture",
			Price: models.Price{
				Amount:   59.99,
				Currency: "USD",
			},
			Images: []models.ProductImage{
				{URL: "https://www.ikea.com/us/en/images/products/kallax-shelf-unit-white__0644763_pe702939_s5.jpg", IsPrimary: true, Position: 0},
			},
			Inventory: &models.InventoryInfo{
				Available: true,
				Quantity:  28,
			},
		},
		{
			ID:          "1003",
			SKU:         "POANG-001",
			Name:        "POÄNG Armchair, birch veneer/Knisa light beige",
			Description: "The timeless bentwood frame is light and strong, with a design that's comfortable to sit in.",
			Category:    "furniture",
			Price: models.Price{
				Amount:   129.00,
				Currency: "USD",
			},
			Images: []models.ProductImage{
				{URL: "https://www.ikea.com/us/en/images/products/poang-armchair-birch-veneer-knisa-light-beige__0818698_pe773911_s5.jpg", IsPrimary: true, Position: 0},
			},
			Variants: []models.ProductVariant{
				{
					ID:   "1003-beige",
					SKU:  "POANG-001-BEIGE",
					Name: "Beige",
					Price: models.Price{Amount: 129.00, Currency: "USD"},
					Attributes: map[string]string{"color": "beige"},
					Inventory:  &models.InventoryInfo{Available: true, Quantity: 15},
				},
				{
					ID:   "1003-gray",
					SKU:  "POANG-001-GRAY",
					Name: "Gray",
					Price: models.Price{Amount: 129.00, Currency: "USD"},
					Attributes: map[string]string{"color": "gray"},
					Inventory:  &models.InventoryInfo{Available: true, Quantity: 8},
				},
			},
			Inventory: &models.InventoryInfo{
				Available: true,
				Quantity:  23,
			},
		},
		{
			ID:          "1004",
			SKU:         "LACK-COFFEE-TABLE-001",
			Name:        "LACK Coffee table, black-brown",
			Description: "Separate shelf for magazines, etc. helps you keep your things organized and the table top clear.",
			Category:    "furniture",
			Price: models.Price{
				Amount:   39.99,
				Currency: "USD",
			},
			Images: []models.ProductImage{
				{URL: "https://www.ikea.com/us/en/images/products/lack-coffee-table-black-brown__0086081_pe216434_s5.jpg", IsPrimary: true, Position: 0},
			},
			Inventory: &models.InventoryInfo{
				Available: true,
				Quantity:  52,
			},
		},
		{
			ID:          "1005",
			SKU:         "EKTORP-SOFA-001",
			Name:        "EKTORP 3-seat sofa, Lofallet beige",
			Description: "A timeless design with generous seating comfort and soft cushions that make it comfortable to relax in for a long time.",
			Category:    "furniture",
			Price: models.Price{
				Amount:   599.00,
				Currency: "USD",
			},
			Images: []models.ProductImage{
				{URL: "https://www.ikea.com/us/en/images/products/ektorp-3-seat-sofa-lofallet-beige__0818355_pe773685_s5.jpg", IsPrimary: true, Position: 0},
			},
			Inventory: &models.InventoryInfo{
				Available: false,
				Quantity:  0,
			},
		},
	}

	// Apply filters
	filteredProducts := []models.Product{}
	for _, product := range allProducts {
		if filters.Category != "" && product.Category != filters.Category {
			continue
		}
		if filters.MinPrice != nil && product.Price.Amount < *filters.MinPrice {
			continue
		}
		if filters.MaxPrice != nil && product.Price.Amount > *filters.MaxPrice {
			continue
		}
		if filters.InStock != nil && *filters.InStock && !product.Inventory.Available {
			continue
		}
		if filters.SearchTerm != "" {
			// Simple contains check
			if !contains(product.Name, filters.SearchTerm) && !contains(product.Description, filters.SearchTerm) {
				continue
			}
		}
		filteredProducts = append(filteredProducts, product)
	}

	// Apply pagination
	limit := filters.Limit
	if limit == 0 {
		limit = 10
	}
	offset := filters.Offset

	end := offset + limit
	if end > len(filteredProducts) {
		end = len(filteredProducts)
	}

	paginatedProducts := filteredProducts[offset:end]

	return &models.ProductList{
		Products: paginatedProducts,
		Total:    len(filteredProducts),
		Limit:    limit,
		Offset:   offset,
		HasMore:  end < len(filteredProducts),
	}
}

func (a *D365CommerceAdapter) getDemoProduct(productID string) *models.Product {
	// Return a single demo product
	return &models.Product{
		ID:          productID,
		SKU:         "BILLY-WHITE-001",
		Name:        "BILLY Bookcase, white",
		Description: "BILLY is a modern bookcase that is both practical and stylish. With adjustable shelves, you can customize the storage space for your books and decorative items.",
		Category:    "furniture",
		Price: models.Price{
			Amount:   79.99,
			Currency: "USD",
		},
		Images: []models.ProductImage{
			{URL: "https://www.ikea.com/us/en/images/products/billy-bookcase-white__0625599_pe692385_s5.jpg", IsPrimary: true, Position: 0},
		},
		Inventory: &models.InventoryInfo{
			Available: true,
			Quantity:  45,
		},
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
		UpdatedAt: time.Now(),
	}
}

func (a *D365CommerceAdapter) getDemoOrder(orderReq models.OrderRequest) *models.Order {
	now := time.Now()
	orderNumber := fmt.Sprintf("ORD-%d", now.Unix())

	subtotal := 0.0
	for _, item := range orderReq.LineItems {
		subtotal += item.TotalPrice.Amount
	}

	tax := subtotal * 0.08 // 8% tax
	total := subtotal + tax

	return &models.Order{
		ID:          fmt.Sprintf("%d", now.Unix()),
		OrderNumber: orderNumber,
		CustomerID:  "demo-customer-1",
		StoreID:     orderReq.StoreID,
		Status:      models.OrderStatusPending,
		LineItems:   orderReq.LineItems,
		Subtotal: models.Price{
			Amount:   subtotal,
			Currency: "USD",
		},
		Tax: models.Price{
			Amount:   tax,
			Currency: "USD",
		},
		Total: models.Price{
			Amount:   total,
			Currency: "USD",
		},
		BillingAddress:  &orderReq.BillingAddress,
		ShippingAddress: &orderReq.ShippingAddress,
		PaymentMethod:   &orderReq.PaymentMethod,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

func (a *D365CommerceAdapter) getDemoOrderByID(orderID string) *models.Order {
	now := time.Now()

	return &models.Order{
		ID:          orderID,
		OrderNumber: fmt.Sprintf("ORD-%s", orderID),
		CustomerID:  "demo-customer-1",
		StoreID:     "ikea-seattle",
		Status:      models.OrderStatusPaid,
		LineItems: []models.OrderLineItem{
			{
				ID:        "1",
				ProductID: "1001",
				SKU:       "BILLY-WHITE-001",
				Name:      "BILLY Bookcase, white",
				Quantity:  2,
				UnitPrice: models.Price{Amount: 79.99, Currency: "USD"},
				TotalPrice: models.Price{Amount: 159.98, Currency: "USD"},
				ImageURL:  "https://www.ikea.com/us/en/images/products/billy-bookcase-white__0625599_pe692385_s5.jpg",
			},
		},
		Subtotal: models.Price{Amount: 159.98, Currency: "USD"},
		Tax:      models.Price{Amount: 12.80, Currency: "USD"},
		Total:    models.Price{Amount: 172.78, Currency: "USD"},
		BillingAddress: &models.Address{
			FirstName:  "John",
			LastName:   "Doe",
			Address1:   "123 Main St",
			City:       "Seattle",
			State:      "WA",
			PostalCode: "98101",
			Country:    "US",
		},
		ShippingAddress: &models.Address{
			FirstName:  "John",
			LastName:   "Doe",
			Address1:   "123 Main St",
			City:       "Seattle",
			State:      "WA",
			PostalCode: "98101",
			Country:    "US",
		},
		CreatedAt: now.Add(-24 * time.Hour),
		UpdatedAt: now.Add(-2 * time.Hour),
	}
}

func (a *D365CommerceAdapter) getDemoOrders(customerID string, limit, offset int) *models.OrderList {
	orders := []models.Order{
		*a.getDemoOrderByID("1001"),
		*a.getDemoOrderByID("1002"),
		*a.getDemoOrderByID("1003"),
	}

	end := offset + limit
	if end > len(orders) {
		end = len(orders)
	}

	return &models.OrderList{
		Orders:  orders[offset:end],
		Total:   len(orders),
		Limit:   limit,
		Offset:  offset,
		HasMore: end < len(orders),
	}
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || 
		(len(s) > 0 && len(substr) > 0 && s[0:len(substr)] == substr) ||
		(len(s) > len(substr) && contains(s[1:], substr)))
}
