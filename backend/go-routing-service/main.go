package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       0,
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

	// Public routes (no JWT required)
	r.Group(func(r chi.Router) {
		r.Get("/health", app.healthHandler)
	})

	// Protected routes (JWT required)
	r.Group(func(r chi.Router) {
		r.Use(JWTMiddleware)
		r.Route("/api/v1", func(r chi.Router) {
			r.Get("/route", app.routeHandler)
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
	
	// Get authenticated user from context
	user, ok := GetUserFromContext(ctx)
	if ok {
		log.Debug().
			Str("user", user.Sub).
			Str("tenant", user.TenantID).
			Msg("Processing route request for authenticated user")
	}
	
	// Get storeId from query parameter
	storeID := r.URL.Query().Get("storeId")
	if storeID == "" {
		log.Warn().Msg("Request missing storeId parameter")
		http.Error(w, "storeId is required", http.StatusBadRequest)
		return
	}

	// Try Redis cache first
	cacheKey := "store:" + storeID
	cachedData, err := app.redisClient.Get(ctx, cacheKey).Result()
	
	if err == nil {
		// Cache hit - return cached data
		var response RouteResponse
		if err := json.Unmarshal([]byte(cachedData), &response); err == nil {
			log.Info().Str("storeId", storeID).Msg("Cache hit")
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(response)
			return
		}
	}

	// Cache miss - query MongoDB
	log.Info().Str("storeId", storeID).Msg("Cache miss, querying database")
	
	var store Store
	filter := bson.M{"storeId": storeID}
	err = app.storesDB.FindOne(ctx, filter).Decode(&store)
	
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Warn().Str("storeId", storeID).Msg("Store not found")
			http.Error(w, "Store not found", http.StatusNotFound)
		} else {
			log.Error().Err(err).Str("storeId", storeID).Msg("Database error")
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

	log.Info().Str("storeId", storeID).Msg("Store data cached successfully")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
