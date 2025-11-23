package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// RouteResponse represents the routing information returned to clients
type RouteResponse struct {
	StoreID        string                 `json:"storeId"`
	BackendURL     string                 `json:"backendUrl"`
	BackendContext map[string]interface{} `json:"backendContext"`
}

// Store represents the store document in MongoDB
type Store struct {
	StoreID        string                 `bson:"storeId"`
	TenantID       string                 `bson:"tenantId"`
	Name           string                 `bson:"name"`
	BackendURL     string                 `bson:"backendUrl"`
	BackendContext map[string]interface{} `bson:"backendContext"`
	Location       *Location              `bson:"location,omitempty"`
}

type Location struct {
	Lat float64 `bson:"lat"`
	Lon float64 `bson:"lon"`
}

// RedisClient interface for testing
type RedisClient interface {
	Get(ctx context.Context, key string) *redis.StringCmd
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd
	Ping(ctx context.Context) *redis.StatusCmd
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status       string            `json:"status"`
	Dependencies map[string]string `json:"dependencies"`
}

// App holds the application dependencies
type App struct {
	mongoClient *mongo.Client
	redisClient RedisClient
	storesDB    *mongo.Collection
}

// Prometheus metrics
var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)
	
	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)
	
	cacheHitsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "Total number of cache hits",
		},
	)
	
	cacheMissesTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "Total number of cache misses",
		},
	)
	
	dbQueriesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"collection", "operation"},
	)
)

func init() {
	// Register Prometheus metrics
	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(httpRequestDuration)
	prometheus.MustRegister(cacheHitsTotal)
	prometheus.MustRegister(cacheMissesTotal)
	prometheus.MustRegister(dbQueriesTotal)
}

func main() {
	// Configure zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("ENV") == "development" {
		// Pretty console logging for development
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout})
	}

	ctx := context.Background()

	// Initialize MongoDB client
	mongoEndpoint := os.Getenv("COSMOS_ENDPOINT")
	if mongoEndpoint == "" {
		mongoEndpoint = "mongodb://localhost:27017"
	}

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoEndpoint))
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to MongoDB")
	}
	defer mongoClient.Disconnect(ctx)

	// Ping MongoDB
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping MongoDB")
	}
	log.Info().Msg("Connected to MongoDB successfully")

	// Initialize Redis client
	redisAddr := os.Getenv("REDIS_HOST")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")

	redisClient := redis.NewClient(&redis.Options{
		Addr:      redisAddr,
		Password:  redisPassword,
		DB:        0,
		TLSConfig: &tls.Config{},
	})

	// Ping Redis
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	log.Info().Msg("Connected to Redis successfully")

	// Get database name
	dbName := os.Getenv("COSMOS_DATABASE")
	if dbName == "" {
		dbName = "amicis"
	}

	// Create app instance with dependencies
	app := &App{
		mongoClient: mongoClient,
		redisClient: redisClient,
		storesDB:    mongoClient.Database(dbName).Collection("stores"),
	}
	
	// Initialize rate limiter (100 requests per second, burst of 200)
	rateLimiter := NewRateLimiter(100, 200)
	rateLimiter.Cleanup(5 * time.Minute)
	
	// Get port from environment variable, default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize Chi router
	r := chi.NewRouter()

	// Middleware stack
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(CORSMiddleware)           // Add CORS support
	r.Use(CorrelationIDMiddleware) // Add correlation ID first
	r.Use(prometheusMiddleware)     // Then track metrics

	// Public routes (no JWT required)
	r.Group(func(r chi.Router) {
		r.Get("/health", app.healthHandler)
		r.Handle("/metrics", promhttp.Handler())
	})

	// Protected routes (JWT required)
	r.Group(func(r chi.Router) {
		r.Use(JWTMiddleware)
		r.Use(RateLimitMiddleware(rateLimiter)) // Apply rate limiting to protected routes
		r.Route("/api/v1", func(r chi.Router) {
			r.Get("/route", app.routeHandler)
			r.Get("/stores", app.storesListHandler)
		})
	})

	// Start server
	addr := ":" + port
	log.Info().Str("address", addr).Msg("Starting Go Routing Service")
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal().Err(err).Msg("Server failed to start")
	}
}

// healthHandler handles GET /health requests with dependency checks
func (app *App) healthHandler(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	
	dependencies := make(map[string]string)
	status := "healthy"
	statusCode := http.StatusOK

	// Check MongoDB connection
	if app.mongoClient != nil {
		if err := app.mongoClient.Ping(ctx, nil); err != nil {
			dependencies["mongodb"] = "unhealthy"
			status = "degraded"
			statusCode = http.StatusServiceUnavailable
			log.Error().Err(err).Msg("MongoDB health check failed")
		} else {
			dependencies["mongodb"] = "healthy"
		}
	}

	// Check Redis connection
	if err := app.redisClient.Ping(ctx).Err(); err != nil {
		dependencies["redis"] = "unhealthy"
		status = "degraded"
		statusCode = http.StatusServiceUnavailable
		log.Error().Err(err).Msg("Redis health check failed")
	} else {
		dependencies["redis"] = "healthy"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := HealthResponse{
		Status:       status,
		Dependencies: dependencies,
	}
	
	json.NewEncoder(w).Encode(response)
}

// routeHandler handles GET /api/v1/route requests with Redis cache and MongoDB fallback
func (app *App) routeHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get authenticated user from context
	user, ok := GetUserFromContext(ctx)
	if ok {
		log.Debug().
			Str("correlationId", correlationID).
			Str("user", user.Sub).
			Str("tenant", user.TenantID).
			Msg("Processing route request for authenticated user")
	}
	
	// Get storeId from query parameter
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		log.Warn().Str("correlationId", correlationID).Msg("Request missing storeId parameter")
		http.Error(w, "storeId is required", http.StatusBadRequest)
		return
	}

	// Try Redis cache first
	cacheKey := "store:" + storeID
	cachedData, err := app.redisClient.Get(ctx, cacheKey).Result()
	
	if err == nil {
		// Cache hit - return cached data
		cacheHitsTotal.Inc()
		var response RouteResponse
		if err := json.Unmarshal([]byte(cachedData), &response); err == nil {
			log.Info().
				Str("correlationId", correlationID).
				Str("storeId", storeID).
				Msg("Cache hit")
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	// Cache miss - query MongoDB
	cacheMissesTotal.Inc()
	dbQueriesTotal.WithLabelValues("stores", "findOne").Inc()
	log.Info().
		Str("correlationId", correlationID).
		Str("storeId", storeID).
		Msg("Cache miss, querying database")
	
	var store Store
	filter := bson.M{"storeId": storeID}
	err = app.storesDB.FindOne(ctx, filter).Decode(&store)
	
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Warn().
				Str("correlationId", correlationID).
				Str("storeId", storeID).
				Msg("Store not found")
			http.Error(w, "Store not found", http.StatusNotFound)
		} else {
			log.Error().
				Err(err).
				Str("correlationId", correlationID).
				Str("storeId", storeID).
				Msg("Database error")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	// Build response
	response := RouteResponse{
		StoreID:        store.StoreID,
		BackendURL:     store.BackendURL,
		BackendContext: store.BackendContext,
	}

	// Cache the result in Redis (TTL: 1 hour)
	responseJSON, _ := json.Marshal(response)
	app.redisClient.Set(ctx, cacheKey, responseJSON, 1*time.Hour)

	log.Info().
		Str("correlationId", correlationID).
		Str("storeId", storeID).
		Msg("Store data cached successfully")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// StoreListItem represents a store in the list response
type StoreListItem struct {
	StoreID    string `json:"storeId"`
	Name       string `json:"name"`
	BackendURL string `json:"backendUrl"`
}

// storesListHandler returns all available stores for the authenticated tenant
func (app *App) storesListHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	correlationID := GetCorrelationID(ctx)
	
	// Get authenticated user from context
	user, ok := GetUserFromContext(ctx)
	var tenantID string
	if ok {
		tenantID = user.TenantID
		log.Debug().
			Str("correlationId", correlationID).
			Str("user", user.Sub).
			Str("tenant", tenantID).
			Msg("Fetching stores for authenticated user")
	}

	// Build filter - if tenant ID is available, filter by it
	filter := bson.M{}
	if tenantID != "" {
		filter["tenantId"] = tenantID
	}

	// Query MongoDB for stores
	dbQueriesTotal.WithLabelValues("stores", "find").Inc()
	cursor, err := app.storesDB.Find(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("correlationId", correlationID).
			Msg("Failed to query stores")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	// Decode stores
	var stores []Store
	if err := cursor.All(ctx, &stores); err != nil {
		log.Error().
			Err(err).
			Str("correlationId", correlationID).
			Msg("Failed to decode stores")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Build response with minimal data
	storeList := make([]StoreListItem, 0, len(stores))
	for _, store := range stores {
		storeList = append(storeList, StoreListItem{
			StoreID:    store.StoreID,
			Name:       store.Name,
			BackendURL: store.BackendURL,
		})
	}

	log.Info().
		Str("correlationId", correlationID).
		Int("count", len(storeList)).
		Str("tenant", tenantID).
		Msg("Retrieved stores successfully")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(storeList)
}
