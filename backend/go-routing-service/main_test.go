package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.mongodb.org/mongo-driver/bson"
)

// MockRedisClient provides a test double for Redis
type MockRedisClient struct {
	data  map[string]string
	error error
}

func (m *MockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	cmd := redis.NewStringCmd(ctx)
	if m.error != nil {
		cmd.SetErr(m.error)
	} else if val, ok := m.data[key]; ok {
		cmd.SetVal(val)
	} else {
		cmd.SetErr(redis.Nil)
	}
	return cmd
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	cmd := redis.NewStatusCmd(ctx)
	if m.error != nil {
		cmd.SetErr(m.error)
	} else {
		m.data[key] = value.(string)
		cmd.SetVal("OK")
	}
	return cmd
}

func (m *MockRedisClient) Ping(ctx context.Context) *redis.StatusCmd {
	cmd := redis.NewStatusCmd(ctx)
	if m.error != nil {
		cmd.SetErr(m.error)
	} else {
		cmd.SetVal("PONG")
	}
	return cmd
}

// TestHealthHandler_AllHealthy tests health endpoint when all dependencies are healthy
func TestHealthHandler_AllHealthy(t *testing.T) {
	// Setup
	mockRedis := &MockRedisClient{
		data: make(map[string]string),
	}

	// Create test app (MongoDB connection optional for this test)
	app := &App{
		redisClient: mockRedis,
		// In real test, would use testcontainers or mock for MongoDB
	}

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	// Execute
	app.healthHandler(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response HealthResponse
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)
	
	assert.Equal(t, "healthy", response.Status)
	assert.Equal(t, "healthy", response.Dependencies["redis"])
}

// TestHealthHandler_RedisUnhealthy tests health endpoint when Redis is down
func TestHealthHandler_RedisUnhealthy(t *testing.T) {
	// Setup
	mockRedis := &MockRedisClient{
		data:  make(map[string]string),
		error: redis.Nil,
	}

	app := &App{
		redisClient: mockRedis,
	}

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	// Execute
	app.healthHandler(w, req)

	// Assert
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	
	var response HealthResponse
	err := json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)
	
	assert.Equal(t, "degraded", response.Status)
	assert.Equal(t, "unhealthy", response.Dependencies["redis"])
}

// TestRouteHandler_MissingStoreID tests route endpoint with missing storeId parameter
func TestRouteHandler_MissingStoreID(t *testing.T) {
	// Setup
	app := &App{
		redisClient: &MockRedisClient{data: make(map[string]string)},
	}

	// Create request without storeId
	req := httptest.NewRequest(http.MethodGet, "/api/v1/route", nil)
	w := httptest.NewRecorder()

	// Execute
	app.routeHandler(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "storeId is required")
}

// TestRouteHandler_CacheHit tests route endpoint with Redis cache hit
func TestRouteHandler_CacheHit(t *testing.T) {
	// Setup
	testStore := RouteResponse{
		StoreID:    "IKEA001",
		BackendURL: "https://ikea-backend.example.com",
		BackendContext: map[string]interface{}{
			"region": "EU",
			"apiKey": "test-key",
		},
	}
	
	cachedData, err := json.Marshal(testStore)
	require.NoError(t, err)

	mockRedis := &MockRedisClient{
		data: map[string]string{
			"store:IKEA001": string(cachedData),
		},
	}

	app := &App{
		redisClient: mockRedis,
	}

	// Create request
	req := httptest.NewRequest(http.MethodGet, "/api/v1/route?storeId=IKEA001", nil)
	w := httptest.NewRecorder()

	// Execute
	app.routeHandler(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response RouteResponse
	err = json.NewDecoder(w.Body).Decode(&response)
	require.NoError(t, err)
	
	assert.Equal(t, "IKEA001", response.StoreID)
	assert.Equal(t, "https://ikea-backend.example.com", response.BackendURL)
	assert.Equal(t, "EU", response.BackendContext["region"])
}

// TestRouteHandler_InvalidStoreID tests route endpoint with non-existent store
func TestRouteHandler_InvalidStoreID(t *testing.T) {
	// This test requires MongoDB integration test
	// Skipping for unit test - would use testcontainers in integration test
	t.Skip("Requires MongoDB integration test")
}

// TestRouterSetup tests that all routes are properly configured
func TestRouterSetup(t *testing.T) {
	app := &App{
		redisClient: &MockRedisClient{data: make(map[string]string)},
	}

	r := chi.NewRouter()
	r.Get("/health", app.healthHandler)
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/route", app.routeHandler)
	})

	// Test health route
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Test route endpoint (should fail without storeId)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/route", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestStoreResponse_JSONMarshaling tests RouteResponse JSON serialization
func TestStoreResponse_JSONMarshaling(t *testing.T) {
	response := RouteResponse{
		StoreID:    "TEST001",
		BackendURL: "https://example.com",
		BackendContext: map[string]interface{}{
			"key": "value",
			"num": 42,
		},
	}

	data, err := json.Marshal(response)
	require.NoError(t, err)

	var decoded RouteResponse
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err)

	assert.Equal(t, response.StoreID, decoded.StoreID)
	assert.Equal(t, response.BackendURL, decoded.BackendURL)
	assert.Equal(t, "value", decoded.BackendContext["key"])
}

// TestStore_BSONMarshaling tests Store BSON serialization
func TestStore_BSONMarshaling(t *testing.T) {
	store := Store{
		StoreID:    "TEST001",
		TenantID:   "ikea",
		Name:       "IKEA Test Store",
		BackendURL: "https://example.com",
		BackendContext: map[string]interface{}{
			"key": "value",
		},
		Location: &Location{
			Lat: 59.3293,
			Lon: 18.0686,
		},
	}

	data, err := bson.Marshal(store)
	require.NoError(t, err)

	var decoded Store
	err = bson.Unmarshal(data, &decoded)
	require.NoError(t, err)

	assert.Equal(t, store.StoreID, decoded.StoreID)
	assert.Equal(t, store.TenantID, decoded.TenantID)
	assert.NotNil(t, decoded.Location)
	assert.Equal(t, 59.3293, decoded.Location.Lat)
}
