package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/amicis/go-routing-service/internal/adapters/d365"
	"github.com/amicis/go-routing-service/internal/domain/models"
	"github.com/amicis/go-routing-service/internal/domain/ports"
	"github.com/amicis/go-routing-service/internal/registry"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Commerce handlers - implements the connector gateway pattern

// commerceProductsHandler handles GET /api/v1/commerce/products
func (app *App) commerceProductsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get storeId from query params
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		http.Error(w, "storeId query parameter is required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", storeID).
		Msg("Commerce products request")

	// Get connector from registry
	connector, err := app.connectorRegistry.GetConnector(ctx, claims.TenantID, storeID, "retail")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get retail connector")
		http.Error(w, fmt.Sprintf("Connector not available: %v", err), http.StatusServiceUnavailable)
		return
	}

	// Cast to retail connector
	retailConnector, ok := connector.(ports.IRetailConnector)
	if !ok {
		log.Error().Msg("Connector does not implement IRetailConnector")
		http.Error(w, "Invalid connector type", http.StatusInternalServerError)
		return
	}

	// Build filters from query params
	filters := models.ProductFilters{}
	
	if category := r.URL.Query().Get("category"); category != "" {
		filters.Category = category
	}
	
	if minPrice := r.URL.Query().Get("minPrice"); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filters.MinPrice = &price
		}
	}
	
	if maxPrice := r.URL.Query().Get("maxPrice"); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filters.MaxPrice = &price
		}
	}
	
	if searchTerm := r.URL.Query().Get("search"); searchTerm != "" {
		filters.SearchTerm = searchTerm
	}
	
	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			filters.Limit = l
		}
	} else {
		filters.Limit = 10 // Default limit
	}
	
	if offset := r.URL.Query().Get("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil {
			filters.Offset = o
		}
	}

	// Call connector
	products, err := retailConnector.GetProducts(ctx, filters)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get products from connector")
		http.Error(w, fmt.Sprintf("Failed to get products: %v", err), http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	json.NewEncoder(w).Encode(products)
	
	log.Info().
		Str("correlationId", correlationID).
		Int("productCount", len(products.Products)).
		Msg("Commerce products response sent")
}

// commerceProductHandler handles GET /api/v1/commerce/products/{productId}
func (app *App) commerceProductHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get productId from URL
	productID := chi.URLParam(r, "productId")
	if productID == "" {
		http.Error(w, "productId is required", http.StatusBadRequest)
		return
	}

	// Get storeId from query params
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		http.Error(w, "storeId query parameter is required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", storeID).
		Str("productId", productID).
		Msg("Commerce product request")

	// Get connector from registry
	connector, err := app.connectorRegistry.GetConnector(ctx, claims.TenantID, storeID, "retail")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get retail connector")
		http.Error(w, fmt.Sprintf("Connector not available: %v", err), http.StatusServiceUnavailable)
		return
	}

	retailConnector, ok := connector.(ports.IRetailConnector)
	if !ok {
		log.Error().Msg("Connector does not implement IRetailConnector")
		http.Error(w, "Invalid connector type", http.StatusInternalServerError)
		return
	}

	// Call connector
	product, err := retailConnector.GetProduct(ctx, productID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get product from connector")
		http.Error(w, fmt.Sprintf("Failed to get product: %v", err), http.StatusNotFound)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	json.NewEncoder(w).Encode(product)
	
	log.Info().
		Str("correlationId", correlationID).
		Str("productId", product.ID).
		Msg("Commerce product response sent")
}

// commerceOrdersHandler handles POST /api/v1/commerce/orders
func (app *App) commerceOrdersHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var orderReq models.OrderRequest
	if err := json.NewDecoder(r.Body).Decode(&orderReq); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request body: %v", err), http.StatusBadRequest)
		return
	}

	if orderReq.StoreID == "" {
		http.Error(w, "storeId is required in request body", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", orderReq.StoreID).
		Int("lineItemCount", len(orderReq.LineItems)).
		Msg("Commerce create order request")

	// Get connector from registry
	connector, err := app.connectorRegistry.GetConnector(ctx, claims.TenantID, orderReq.StoreID, "retail")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get retail connector")
		http.Error(w, fmt.Sprintf("Connector not available: %v", err), http.StatusServiceUnavailable)
		return
	}

	retailConnector, ok := connector.(ports.IRetailConnector)
	if !ok {
		log.Error().Msg("Connector does not implement IRetailConnector")
		http.Error(w, "Invalid connector type", http.StatusInternalServerError)
		return
	}

	// Call connector to create order
	order, err := retailConnector.CreateOrder(ctx, orderReq)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create order via connector")
		http.Error(w, fmt.Sprintf("Failed to create order: %v", err), http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(order)
	
	log.Info().
		Str("correlationId", correlationID).
		Str("orderId", order.ID).
		Str("orderNumber", order.OrderNumber).
		Msg("Commerce order created successfully")
}

// commerceConnectorsHandler handles GET /api/v1/commerce/connectors
func (app *App) commerceConnectorsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get storeId from query params
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		http.Error(w, "storeId query parameter is required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", storeID).
		Msg("Commerce connectors list request")

	// List all connectors for the store
	connectors, err := app.connectorRegistry.ListConnectors(ctx, claims.TenantID, storeID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list connectors")
		http.Error(w, fmt.Sprintf("Failed to list connectors: %v", err), http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"connectors": connectors,
		"count":      len(connectors),
	})
	
	log.Info().
		Str("correlationId", correlationID).
		Int("connectorCount", len(connectors)).
		Msg("Commerce connectors list response sent")
}

// initializeConnectorRegistry sets up the connector registry and registers adapters
func (app *App) initializeConnectorRegistry(dbName string) error {
	// Create connectors collection
	connectorsDB := app.mongoClient.Database(dbName).Collection("connectors")
	
	// Initialize registry
	app.connectorRegistry = registry.NewConnectorRegistry(connectorsDB)
	
	// Register adapter factories
	app.connectorRegistry.RegisterFactory("D365CommerceAdapter", func(config ports.ConnectorConfig) (ports.IConnector, error) {
		return d365.NewD365CommerceAdapter(config)
	})
	
	// Register more adapters here in the future:
	// app.connectorRegistry.RegisterFactory("SAP CommerceAdapter", ...)
	// app.connectorRegistry.RegisterFactory("ShopifyAdapter", ...)
	
	log.Info().Msg("Connector registry initialized with adapters")
	
	return nil
}

// Wishlist handlers - using MongoDB for storage

// commerceWishlistHandler handles GET /api/v1/commerce/wishlist
func (app *App) commerceWishlistHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get query params
	storeID := r.URL.Query().Get("storeId")
	customerID := r.URL.Query().Get("customerId")
	
	if storeID == "" || customerID == "" {
		http.Error(w, "storeId and customerId query parameters are required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", storeID).
		Str("customerId", customerID).
		Msg("Get wishlist request")

	// Get wishlist from MongoDB
	wishlistCollection := app.mongoClient.Database("amicis").Collection("wishlists")
	
	var wishlist models.Wishlist
	err := wishlistCollection.FindOne(ctx, map[string]interface{}{
		"tenantId":   claims.TenantID,
		"storeId":    storeID,
		"customerId": customerID,
	}).Decode(&wishlist)
	
	if err != nil {
		// Wishlist doesn't exist yet, return empty
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Correlation-ID", correlationID)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"items": []interface{}{},
			"count": 0,
		})
		return
	}

	// Return wishlist
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": wishlist.Items,
		"count": len(wishlist.Items),
	})
}

// commerceAddToWishlistHandler handles POST /api/v1/commerce/wishlist/items
func (app *App) commerceAddToWishlistHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req struct {
		StoreID    string `json:"storeId"`
		CustomerID string `json:"customerId"`
		ProductID  string `json:"productId"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.StoreID == "" || req.CustomerID == "" || req.ProductID == "" {
		http.Error(w, "storeId, customerId, and productId are required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", req.StoreID).
		Str("customerId", req.CustomerID).
		Str("productId", req.ProductID).
		Msg("Add to wishlist request")

	// Get product details from commerce API
	connector, err := app.connectorRegistry.GetConnector(ctx, claims.TenantID, req.StoreID, "retail")
	if err != nil {
		log.Error().Err(err).Msg("Failed to get retail connector")
		http.Error(w, fmt.Sprintf("Connector not available: %v", err), http.StatusServiceUnavailable)
		return
	}

	retailConnector, ok := connector.(ports.IRetailConnector)
	if !ok {
		log.Error().Msg("Connector does not implement IRetailConnector")
		http.Error(w, "Invalid connector type", http.StatusInternalServerError)
		return
	}

	product, err := retailConnector.GetProduct(ctx, req.ProductID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get product")
		http.Error(w, fmt.Sprintf("Product not found: %v", err), http.StatusNotFound)
		return
	}

	// Create wishlist item
	item := models.WishlistItem{
		ID:        fmt.Sprintf("wishlist-item-%s-%d", req.ProductID, time.Now().Unix()),
		ProductID: req.ProductID,
		SKU:       product.SKU,
		Name:      product.Name,
		Price:     product.Price,
		AddedAt:   time.Now(),
	}

	// Update wishlist in MongoDB
	wishlistCollection := app.mongoClient.Database("amicis").Collection("wishlists")
	
	opts := options.Update().SetUpsert(true)
	_, err = wishlistCollection.UpdateOne(
		ctx,
		map[string]interface{}{
			"tenantId":   claims.TenantID,
			"storeId":    req.StoreID,
			"customerId": req.CustomerID,
		},
		map[string]interface{}{
			"$push": map[string]interface{}{"items": item},
			"$set": map[string]interface{}{
				"tenantId":   claims.TenantID,
				"storeId":    req.StoreID,
				"customerId": req.CustomerID,
				"updatedAt":  time.Now(),
			},
			"$setOnInsert": map[string]interface{}{
				"createdAt": time.Now(),
			},
		},
		opts,
	)
	
	if err != nil {
		log.Error().Err(err).Msg("Failed to add item to wishlist")
		http.Error(w, "Failed to add to wishlist", http.StatusInternalServerError)
		return
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"item": item,
	})
}

// commerceRemoveFromWishlistHandler handles DELETE /api/v1/commerce/wishlist/items/{itemId}
func (app *App) commerceRemoveFromWishlistHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get JWT claims
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get path params and query params
	itemID := chi.URLParam(r, "itemId")
	storeID := r.URL.Query().Get("storeId")
	customerID := r.URL.Query().Get("customerId")
	
	if itemID == "" || storeID == "" || customerID == "" {
		http.Error(w, "itemId, storeId, and customerId are required", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("correlationId", correlationID).
		Str("tenantId", claims.TenantID).
		Str("storeId", storeID).
		Str("customerId", customerID).
		Str("itemId", itemID).
		Msg("Remove from wishlist request")

	// Remove item from wishlist in MongoDB
	wishlistCollection := app.mongoClient.Database("amicis").Collection("wishlists")
	
	_, err := wishlistCollection.UpdateOne(
		ctx,
		map[string]interface{}{
			"tenantId":   claims.TenantID,
			"storeId":    storeID,
			"customerId": customerID,
		},
		map[string]interface{}{
			"$pull": map[string]interface{}{
				"items": map[string]interface{}{"id": itemID},
			},
			"$set": map[string]interface{}{
				"updatedAt": time.Now(),
			},
		},
	)
	
	if err != nil {
		log.Error().Err(err).Msg("Failed to remove item from wishlist")
		http.Error(w, "Failed to remove from wishlist", http.StatusInternalServerError)
		return
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Correlation-ID", correlationID)
	w.WriteHeader(http.StatusNoContent)
}

