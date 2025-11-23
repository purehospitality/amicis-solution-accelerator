package registry

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/amicis/go-routing-service/internal/domain/ports"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// ConnectorRegistry manages the lifecycle and resolution of connectors
// It maintains a cache of initialized connector instances per (tenantId, storeId, domain)
type ConnectorRegistry struct {
	connectorsDB      *mongo.Collection
	cache             map[string]ports.IConnector // key: "tenantId:storeId:domain"
	cacheMutex        sync.RWMutex
	factoryFuncs      map[string]ConnectorFactory
	factoryMutex      sync.RWMutex
	cacheExpiration   time.Duration
	lastAccessTimes   map[string]time.Time
	cleanupInterval   time.Duration
	stopCleanup       chan bool
}

// ConnectorFactory is a function that creates a new connector instance
type ConnectorFactory func(config ports.ConnectorConfig) (ports.IConnector, error)

// ConnectorDocument represents the MongoDB document structure
type ConnectorDocument struct {
	StoreID  string                 `bson:"storeId"`
	TenantID string                 `bson:"tenantId"`
	Domain   string                 `bson:"domain"`
	URL      string                 `bson:"url"`
	Adapter  string                 `bson:"adapter"`
	Version  string                 `bson:"version"`
	Config   map[string]interface{} `bson:"config"`
	Enabled  bool                   `bson:"enabled"`
	Timeout  int                    `bson:"timeout"` // milliseconds
	Priority int                    `bson:"priority,omitempty"`
}

// NewConnectorRegistry creates a new connector registry
func NewConnectorRegistry(connectorsDB *mongo.Collection) *ConnectorRegistry {
	registry := &ConnectorRegistry{
		connectorsDB:    connectorsDB,
		cache:           make(map[string]ports.IConnector),
		factoryFuncs:    make(map[string]ConnectorFactory),
		lastAccessTimes: make(map[string]time.Time),
		cacheExpiration: 1 * time.Hour,
		cleanupInterval: 15 * time.Minute,
		stopCleanup:     make(chan bool),
	}

	// Start background cleanup goroutine
	go registry.cleanupExpiredConnectors()

	return registry
}

// RegisterFactory registers a factory function for a specific adapter type
func (r *ConnectorRegistry) RegisterFactory(adapterType string, factory ConnectorFactory) {
	r.factoryMutex.Lock()
	defer r.factoryMutex.Unlock()
	
	r.factoryFuncs[adapterType] = factory
	log.Info().Str("adapter", adapterType).Msg("Registered connector factory")
}

// GetConnector retrieves or initializes a connector for the given context
// Returns cached instance if available, otherwise loads from DB and initializes
func (r *ConnectorRegistry) GetConnector(ctx context.Context, tenantID, storeID, domain string) (ports.IConnector, error) {
	cacheKey := r.getCacheKey(tenantID, storeID, domain)

	// Check cache first (read lock)
	r.cacheMutex.RLock()
	if connector, exists := r.cache[cacheKey]; exists {
		r.cacheMutex.RUnlock()
		
		// Update last access time (write lock)
		r.cacheMutex.Lock()
		r.lastAccessTimes[cacheKey] = time.Now()
		r.cacheMutex.Unlock()
		
		log.Debug().
			Str("tenantId", tenantID).
			Str("storeId", storeID).
			Str("domain", domain).
			Msg("Connector cache hit")
		
		return connector, nil
	}
	r.cacheMutex.RUnlock()

	// Cache miss - load from database
	log.Debug().
		Str("tenantId", tenantID).
		Str("storeId", storeID).
		Str("domain", domain).
		Msg("Connector cache miss - loading from database")

	config, err := r.loadConnectorConfig(ctx, tenantID, storeID, domain)
	if err != nil {
		return nil, fmt.Errorf("failed to load connector config: %w", err)
	}

	if !config.Enabled {
		return nil, fmt.Errorf("connector is disabled for tenantId=%s, storeId=%s, domain=%s", tenantID, storeID, domain)
	}

	// Create connector instance using factory
	connector, err := r.createConnector(ctx, *config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connector: %w", err)
	}

	// Cache the connector (write lock)
	r.cacheMutex.Lock()
	r.cache[cacheKey] = connector
	r.lastAccessTimes[cacheKey] = time.Now()
	r.cacheMutex.Unlock()

	log.Info().
		Str("tenantId", tenantID).
		Str("storeId", storeID).
		Str("domain", domain).
		Str("adapter", config.Adapter).
		Msg("Connector initialized and cached")

	return connector, nil
}

// GetConnectorMetadata retrieves metadata about a connector without initializing it
func (r *ConnectorRegistry) GetConnectorMetadata(ctx context.Context, tenantID, storeID, domain string) (*ports.ConnectorMetadata, error) {
	config, err := r.loadConnectorConfig(ctx, tenantID, storeID, domain)
	if err != nil {
		return nil, err
	}

	metadata := &ports.ConnectorMetadata{
		Domain:  config.Domain,
		Adapter: config.Adapter,
		Version: config.Version,
		URL:     config.URL,
		Enabled: config.Enabled,
	}

	// Check if connector is in cache and get health status
	cacheKey := r.getCacheKey(tenantID, storeID, domain)
	r.cacheMutex.RLock()
	if connector, exists := r.cache[cacheKey]; exists {
		metadata.Healthy = true
		if lastChecked, exists := r.lastAccessTimes[cacheKey]; exists {
			metadata.LastChecked = lastChecked.Format(time.RFC3339)
		}
		// Try health check
		if err := connector.HealthCheck(ctx); err != nil {
			metadata.Healthy = false
		}
	}
	r.cacheMutex.RUnlock()

	return metadata, nil
}

// ListConnectors lists all available connectors for a store
func (r *ConnectorRegistry) ListConnectors(ctx context.Context, tenantID, storeID string) ([]ports.ConnectorMetadata, error) {
	filter := bson.M{
		"tenantId": tenantID,
		"storeId":  storeID,
	}

	cursor, err := r.connectorsDB.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to query connectors: %w", err)
	}
	defer cursor.Close(ctx)

	var docs []ConnectorDocument
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, fmt.Errorf("failed to decode connectors: %w", err)
	}

	metadataList := make([]ports.ConnectorMetadata, 0, len(docs))
	for _, doc := range docs {
		metadata, err := r.GetConnectorMetadata(ctx, tenantID, storeID, doc.Domain)
		if err != nil {
			log.Warn().
				Err(err).
				Str("domain", doc.Domain).
				Msg("Failed to get connector metadata")
			continue
		}
		metadataList = append(metadataList, *metadata)
	}

	return metadataList, nil
}

// InvalidateCache removes a connector from the cache
func (r *ConnectorRegistry) InvalidateCache(tenantID, storeID, domain string) {
	cacheKey := r.getCacheKey(tenantID, storeID, domain)
	
	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()
	
	if connector, exists := r.cache[cacheKey]; exists {
		connector.Close()
		delete(r.cache, cacheKey)
		delete(r.lastAccessTimes, cacheKey)
		
		log.Info().
			Str("tenantId", tenantID).
			Str("storeId", storeID).
			Str("domain", domain).
			Msg("Connector cache invalidated")
	}
}

// Close shuts down the registry and all cached connectors
func (r *ConnectorRegistry) Close() {
	// Stop cleanup goroutine
	close(r.stopCleanup)
	
	r.cacheMutex.Lock()
	defer r.cacheMutex.Unlock()
	
	for key, connector := range r.cache {
		connector.Close()
		log.Info().Str("cacheKey", key).Msg("Closed connector")
	}
	
	r.cache = make(map[string]ports.IConnector)
	r.lastAccessTimes = make(map[string]time.Time)
}

// Private helper methods

func (r *ConnectorRegistry) getCacheKey(tenantID, storeID, domain string) string {
	return fmt.Sprintf("%s:%s:%s", tenantID, storeID, domain)
}

func (r *ConnectorRegistry) loadConnectorConfig(ctx context.Context, tenantID, storeID, domain string) (*ports.ConnectorConfig, error) {
	filter := bson.M{
		"tenantId": tenantID,
		"storeId":  storeID,
		"domain":   domain,
	}

	var doc ConnectorDocument
	err := r.connectorsDB.FindOne(ctx, filter).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("connector not found for tenantId=%s, storeId=%s, domain=%s", tenantID, storeID, domain)
		}
		return nil, err
	}

	config := &ports.ConnectorConfig{
		StoreID:  doc.StoreID,
		TenantID: doc.TenantID,
		Domain:   doc.Domain,
		URL:      doc.URL,
		Adapter:  doc.Adapter,
		Version:  doc.Version,
		Config:   doc.Config,
		Enabled:  doc.Enabled,
		Timeout:  doc.Timeout,
	}

	return config, nil
}

func (r *ConnectorRegistry) createConnector(ctx context.Context, config ports.ConnectorConfig) (ports.IConnector, error) {
	r.factoryMutex.RLock()
	factory, exists := r.factoryFuncs[config.Adapter]
	r.factoryMutex.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no factory registered for adapter type: %s", config.Adapter)
	}

	connector, err := factory(config)
	if err != nil {
		return nil, fmt.Errorf("factory failed to create connector: %w", err)
	}

	// Initialize the connector
	if err := connector.Initialize(ctx, config); err != nil {
		return nil, fmt.Errorf("failed to initialize connector: %w", err)
	}

	// Perform initial health check
	if err := connector.HealthCheck(ctx); err != nil {
		log.Warn().
			Err(err).
			Str("adapter", config.Adapter).
			Str("domain", config.Domain).
			Msg("Connector health check failed on initialization")
	}

	return connector, nil
}

func (r *ConnectorRegistry) cleanupExpiredConnectors() {
	ticker := time.NewTicker(r.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.performCleanup()
		case <-r.stopCleanup:
			return
		}
	}
}

func (r *ConnectorRegistry) performCleanup() {
	now := time.Now()
	expiredKeys := []string{}

	r.cacheMutex.RLock()
	for key, lastAccess := range r.lastAccessTimes {
		if now.Sub(lastAccess) > r.cacheExpiration {
			expiredKeys = append(expiredKeys, key)
		}
	}
	r.cacheMutex.RUnlock()

	if len(expiredKeys) > 0 {
		r.cacheMutex.Lock()
		for _, key := range expiredKeys {
			if connector, exists := r.cache[key]; exists {
				connector.Close()
				delete(r.cache, key)
				delete(r.lastAccessTimes, key)
				log.Info().Str("cacheKey", key).Msg("Cleaned up expired connector")
			}
		}
		r.cacheMutex.Unlock()
	}
}
