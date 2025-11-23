package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// BenchmarkHealthCheck measures the performance of the health check endpoint
func BenchmarkHealthCheck(b *testing.B) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		b.Fatal(err)
	}

	handler := http.HandlerFunc(healthCheckHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			b.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	}
}

// BenchmarkRouteLookup measures the performance of route lookup endpoint
func BenchmarkRouteLookup(b *testing.B) {
	// Mock route data for benchmark
	mockRoutes := map[string]Route{
		"IKEA001": {
			StoreID:        "IKEA001",
			BackendURL:     "https://backend1.example.com",
			BackendContext: "/api/v1",
		},
		"IKEA002": {
			StoreID:        "IKEA002",
			BackendURL:     "https://backend2.example.com",
			BackendContext: "/api/v1",
		},
		"IKEA003": {
			StoreID:        "IKEA003",
			BackendURL:     "https://backend3.example.com",
			BackendContext: "/api/v1",
		},
	}

	// Populate cache for realistic benchmark
	for storeID, route := range mockRoutes {
		routeCache.Store(storeID, route)
	}

	req, err := http.NewRequest("GET", "/api/v1/route?storeId=IKEA001", nil)
	if err != nil {
		b.Fatal(err)
	}

	// Add authorization header
	req.Header.Set("Authorization", "Bearer mock-jwt-token")

	handler := http.HandlerFunc(routeHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != http.StatusOK {
			b.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
		}
	}
}

// BenchmarkRouteLookupCacheMiss measures performance when route not in cache
func BenchmarkRouteLookupCacheMiss(b *testing.B) {
	// Use a store ID that's not in cache
	req, err := http.NewRequest("GET", "/api/v1/route?storeId=IKEA999", nil)
	if err != nil {
		b.Fatal(err)
	}

	req.Header.Set("Authorization", "Bearer mock-jwt-token")
	handler := http.HandlerFunc(routeHandler)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		// Note: This will return 404 since we don't have a database connection
		// In real benchmarks with DB, this would test DB lookup performance
	}
}

// BenchmarkJSONSerialization measures JSON encoding performance
func BenchmarkJSONSerialization(b *testing.B) {
	route := Route{
		StoreID:        "IKEA001",
		BackendURL:     "https://backend1.example.com",
		BackendContext: "/api/v1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(route)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkJSONDeserialization measures JSON decoding performance
func BenchmarkJSONDeserialization(b *testing.B) {
	data := []byte(`{"storeId":"IKEA001","backendUrl":"https://backend1.example.com","backendContext":"/api/v1"}`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var route Route
		err := json.Unmarshal(data, &route)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkConcurrentRouteLookup measures performance under concurrent load
func BenchmarkConcurrentRouteLookup(b *testing.B) {
	// Populate cache
	mockRoutes := map[string]Route{
		"IKEA001": {StoreID: "IKEA001", BackendURL: "https://backend1.example.com", BackendContext: "/api/v1"},
		"IKEA002": {StoreID: "IKEA002", BackendURL: "https://backend2.example.com", BackendContext: "/api/v1"},
		"IKEA003": {StoreID: "IKEA003", BackendURL: "https://backend3.example.com", BackendContext: "/api/v1"},
	}

	for storeID, route := range mockRoutes {
		routeCache.Store(storeID, route)
	}

	handler := http.HandlerFunc(routeHandler)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		req, _ := http.NewRequest("GET", "/api/v1/route?storeId=IKEA001", nil)
		req.Header.Set("Authorization", "Bearer mock-jwt-token")

		for pb.Next() {
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)
		}
	})
}

// BenchmarkMiddlewareLogging measures overhead of logging middleware
func BenchmarkMiddlewareLogging(b *testing.B) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		b.Fatal(err)
	}

	handler := loggingMiddleware(http.HandlerFunc(healthCheckHandler))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

// BenchmarkMiddlewareAuth measures overhead of JWT auth middleware
func BenchmarkMiddlewareAuth(b *testing.B) {
	req, err := http.NewRequest("GET", "/api/v1/route?storeId=IKEA001", nil)
	if err != nil {
		b.Fatal(err)
	}

	req.Header.Set("Authorization", "Bearer mock-jwt-token")
	handler := authMiddleware(http.HandlerFunc(routeHandler))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}

// BenchmarkCacheWrite measures performance of writing to sync.Map cache
func BenchmarkCacheWrite(b *testing.B) {
	route := Route{
		StoreID:        "IKEA001",
		BackendURL:     "https://backend1.example.com",
		BackendContext: "/api/v1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		routeCache.Store("IKEA001", route)
	}
}

// BenchmarkCacheRead measures performance of reading from sync.Map cache
func BenchmarkCacheRead(b *testing.B) {
	route := Route{
		StoreID:        "IKEA001",
		BackendURL:     "https://backend1.example.com",
		BackendContext: "/api/v1",
	}
	routeCache.Store("IKEA001", route)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = routeCache.Load("IKEA001")
	}
}

// BenchmarkHTTPRequestCreation measures HTTP request object creation
func BenchmarkHTTPRequestCreation(b *testing.B) {
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := http.NewRequest("GET", "/api/v1/route?storeId=IKEA001", nil)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkHTTPResponseWriter measures response writing performance
func BenchmarkHTTPResponseWriter(b *testing.B) {
	route := Route{
		StoreID:        "IKEA001",
		BackendURL:     "https://backend1.example.com",
		BackendContext: "/api/v1",
	}

	data, _ := json.Marshal(route)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		rr.WriteHeader(http.StatusOK)
		_, err := rr.Write(data)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// Example of running benchmarks:
// go test -bench=. -benchmem -benchtime=10s
// go test -bench=BenchmarkRouteLookup -benchmem -count=5
// go test -bench=. -cpuprofile=cpu.prof -memprofile=mem.prof
