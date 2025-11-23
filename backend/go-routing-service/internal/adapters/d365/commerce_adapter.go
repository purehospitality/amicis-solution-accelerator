package d365

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/amicis/go-routing-service/internal/domain/models"
	"github.com/amicis/go-routing-service/internal/domain/ports"
	"github.com/rs/zerolog/log"
	"github.com/sony/gobreaker"
)

// D365CommerceAdapter implements IRetailConnector for Dynamics 365 Commerce CSU
type D365CommerceAdapter struct {
	config         ports.ConnectorConfig
	baseURL        string
	httpClient     *http.Client
	circuitBreaker *gobreaker.CircuitBreaker
	apiKey         string
	tenantID       string
	demoMode       bool
}

// NewD365CommerceAdapter creates a new D365 Commerce adapter
func NewD365CommerceAdapter(config ports.ConnectorConfig) (ports.IConnector, error) {
	adapter := &D365CommerceAdapter{
		config:   config,
		baseURL:  config.URL,
		tenantID: config.TenantID,
		httpClient: &http.Client{
			Timeout: time.Duration(config.Timeout) * time.Millisecond,
		},
		demoMode: false,
	}

	// Check for demo mode
	if demoMode, ok := config.Config["demoMode"].(bool); ok {
		adapter.demoMode = demoMode
	}

	// Extract API key from config
	if apiKey, ok := config.Config["apiKey"].(string); ok {
		adapter.apiKey = apiKey
	}

	// Initialize circuit breaker
	cbSettings := gobreaker.Settings{
		Name:        fmt.Sprintf("d365-commerce-%s", config.StoreID),
		MaxRequests: 3,
		Interval:    10 * time.Second,
		Timeout:     30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.5
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			log.Warn().
				Str("circuit_breaker", name).
				Str("from_state", from.String()).
				Str("to_state", to.String()).
				Msg("D365 Commerce circuit breaker state changed")
		},
	}
	adapter.circuitBreaker = gobreaker.NewCircuitBreaker(cbSettings)

	return adapter, nil
}

// GetDomain returns the domain this connector handles
func (a *D365CommerceAdapter) GetDomain() string {
	return "retail"
}

// GetAdapterType returns the adapter implementation type
func (a *D365CommerceAdapter) GetAdapterType() string {
	return "D365CommerceAdapter"
}

// Initialize sets up the connector with configuration
func (a *D365CommerceAdapter) Initialize(ctx context.Context, config ports.ConnectorConfig) error {
	log.Info().
		Str("storeId", config.StoreID).
		Str("url", config.URL).
		Bool("demoMode", a.demoMode).
		Msg("Initializing D365 Commerce adapter")

	// In production, validate credentials here
	if !a.demoMode && a.apiKey == "" {
		return fmt.Errorf("apiKey is required for D365 Commerce adapter (non-demo mode)")
	}

	return nil
}

// HealthCheck verifies the connector can communicate with its backend
func (a *D365CommerceAdapter) HealthCheck(ctx context.Context) error {
	if a.demoMode {
		return nil // Demo mode always healthy
	}

	// In production, make a lightweight API call to verify connectivity
	// For now, just check if baseURL is reachable
	healthURL := fmt.Sprintf("%s/api/health", a.baseURL)
	
	_, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
		if err != nil {
			return nil, err
		}
		
		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		
		if resp.StatusCode >= 500 {
			return nil, fmt.Errorf("health check failed with status %d", resp.StatusCode)
		}
		
		return resp.StatusCode, nil
	})

	return err
}

// Close gracefully shuts down the connector
func (a *D365CommerceAdapter) Close() error {
	log.Info().Str("storeId", a.config.StoreID).Msg("Closing D365 Commerce adapter")
	a.httpClient.CloseIdleConnections()
	return nil
}

// GetProducts retrieves products based on filters
func (a *D365CommerceAdapter) GetProducts(ctx context.Context, filters models.ProductFilters) (*models.ProductList, error) {
	if a.demoMode {
		return a.getDemoProducts(filters), nil
	}

	// Build OData query
	odataQuery := a.buildODataQuery(filters)
	endpoint := fmt.Sprintf("%s/api/commerce/v1/Products?%s", a.baseURL, odataQuery)

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var odataResp D365ProductListResponse
		if err := json.NewDecoder(resp.Body).Decode(&odataResp); err != nil {
			return nil, err
		}

		return a.transformProductList(odataResp), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get products from D365: %w", err)
	}

	return result.(*models.ProductList), nil
}

// GetProduct retrieves a single product by ID
func (a *D365CommerceAdapter) GetProduct(ctx context.Context, productID string) (*models.Product, error) {
	if a.demoMode {
		return a.getDemoProduct(productID), nil
	}

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Products('%s')?$expand=Variants,Images", a.baseURL, productID)

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("product not found: %s", productID)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var odataProduct D365Product
		if err := json.NewDecoder(resp.Body).Decode(&odataProduct); err != nil {
			return nil, err
		}

		return a.transformProduct(odataProduct), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get product from D365: %w", err)
	}

	return result.(*models.Product), nil
}

// GetProductBySKU retrieves a product by SKU
func (a *D365CommerceAdapter) GetProductBySKU(ctx context.Context, sku string) (*models.Product, error) {
	if a.demoMode {
		return a.getDemoProduct(sku), nil
	}

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Products?$filter=ItemId eq '%s'&$expand=Variants,Images", a.baseURL, sku)

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var odataResp D365ProductListResponse
		if err := json.NewDecoder(resp.Body).Decode(&odataResp); err != nil {
			return nil, err
		}

		if len(odataResp.Value) == 0 {
			return nil, fmt.Errorf("product not found with SKU: %s", sku)
		}

		return a.transformProduct(odataResp.Value[0]), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get product by SKU from D365: %w", err)
	}

	return result.(*models.Product), nil
}

// CreateOrder submits an order to the backend
func (a *D365CommerceAdapter) CreateOrder(ctx context.Context, orderReq models.OrderRequest) (*models.Order, error) {
	if a.demoMode {
		return a.getDemoOrder(orderReq), nil
	}

	// Transform domain order request to D365 format
	d365Order := a.transformOrderRequest(orderReq)

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Orders", a.baseURL)

	payload, err := json.Marshal(d365Order)
	if err != nil {
		return nil, err
	}

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(payload))
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)
		req.Header.Set("Content-Type", "application/json")

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var d365OrderResp D365Order
		if err := json.NewDecoder(resp.Body).Decode(&d365OrderResp); err != nil {
			return nil, err
		}

		return a.transformOrder(d365OrderResp), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create order in D365: %w", err)
	}

	return result.(*models.Order), nil
}

// GetOrder retrieves an order by ID
func (a *D365CommerceAdapter) GetOrder(ctx context.Context, orderID string) (*models.Order, error) {
	if a.demoMode {
		return a.getDemoOrderByID(orderID), nil
	}

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Orders('%s')?$expand=Lines", a.baseURL, orderID)

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("order not found: %s", orderID)
		}

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var d365Order D365Order
		if err := json.NewDecoder(resp.Body).Decode(&d365Order); err != nil {
			return nil, err
		}

		return a.transformOrder(d365Order), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get order from D365: %w", err)
	}

	return result.(*models.Order), nil
}

// GetOrders retrieves orders for a customer
func (a *D365CommerceAdapter) GetOrders(ctx context.Context, customerID string, limit, offset int) (*models.OrderList, error) {
	if a.demoMode {
		return a.getDemoOrders(customerID, limit, offset), nil
	}

	query := url.Values{}
	query.Set("$filter", fmt.Sprintf("CustomerId eq '%s'", customerID))
	query.Set("$top", fmt.Sprintf("%d", limit))
	query.Set("$skip", fmt.Sprintf("%d", offset))
	query.Set("$expand", "Lines")
	query.Set("$orderby", "CreatedDateTime desc")

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Orders?%s", a.baseURL, query.Encode())

	result, err := a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		var odataResp D365OrderListResponse
		if err := json.NewDecoder(resp.Body).Decode(&odataResp); err != nil {
			return nil, err
		}

		return a.transformOrderList(odataResp, limit, offset), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get orders from D365: %w", err)
	}

	return result.(*models.OrderList), nil
}

// UpdateOrderStatus updates the order status
func (a *D365CommerceAdapter) UpdateOrderStatus(ctx context.Context, orderID string, status models.OrderStatus) error {
	if a.demoMode {
		log.Info().Str("orderId", orderID).Str("status", string(status)).Msg("Demo: Order status updated")
		return nil
	}

	// D365 uses different status values - map from domain status
	d365Status := a.mapOrderStatus(status)

	endpoint := fmt.Sprintf("%s/api/commerce/v1/Orders('%s')", a.baseURL, orderID)

	payload := map[string]interface{}{
		"Status": d365Status,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	_, err = a.circuitBreaker.Execute(func() (interface{}, error) {
		req, err := http.NewRequestWithContext(ctx, "PATCH", endpoint, bytes.NewReader(payloadBytes))
		if err != nil {
			return nil, err
		}

		a.addAuthHeaders(req)
		req.Header.Set("Content-Type", "application/json")

		resp, err := a.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("D365 API error: status=%d, body=%s", resp.StatusCode, string(body))
		}

		return nil, nil
	})

	if err != nil {
		return fmt.Errorf("failed to update order status in D365: %w", err)
	}

	return nil
}

// Private helper methods

func (a *D365CommerceAdapter) addAuthHeaders(req *http.Request) {
	if a.apiKey != "" {
		req.Header.Set("Api-Key", a.apiKey)
	}
	req.Header.Set("Accept", "application/json")
}

func (a *D365CommerceAdapter) buildODataQuery(filters models.ProductFilters) string {
	query := url.Values{}

	// Build $filter clause
	filterParts := []string{}
	
	if filters.Category != "" {
		filterParts = append(filterParts, fmt.Sprintf("Category eq '%s'", filters.Category))
	}
	
	if filters.MinPrice != nil {
		filterParts = append(filterParts, fmt.Sprintf("Price ge %f", *filters.MinPrice))
	}
	
	if filters.MaxPrice != nil {
		filterParts = append(filterParts, fmt.Sprintf("Price le %f", *filters.MaxPrice))
	}
	
	if filters.SearchTerm != "" {
		filterParts = append(filterParts, fmt.Sprintf("contains(Name, '%s')", filters.SearchTerm))
	}
	
	if len(filterParts) > 0 {
		query.Set("$filter", strings.Join(filterParts, " and "))
	}

	// Pagination
	if filters.Limit > 0 {
		query.Set("$top", fmt.Sprintf("%d", filters.Limit))
	}
	
	if filters.Offset > 0 {
		query.Set("$skip", fmt.Sprintf("%d", filters.Offset))
	}

	// Expand related entities
	query.Set("$expand", "Variants,Images")

	return query.Encode()
}

func (a *D365CommerceAdapter) mapOrderStatus(status models.OrderStatus) string {
	// Map domain status to D365 status values
	statusMap := map[models.OrderStatus]string{
		models.OrderStatusPending:    "Created",
		models.OrderStatusProcessing: "Processing",
		models.OrderStatusPaid:       "Confirmed",
		models.OrderStatusShipped:    "Shipped",
		models.OrderStatusDelivered:  "Delivered",
		models.OrderStatusCancelled:  "Cancelled",
		models.OrderStatusRefunded:   "Returned",
	}

	if d365Status, ok := statusMap[status]; ok {
		return d365Status
	}

	return "Created"
}
