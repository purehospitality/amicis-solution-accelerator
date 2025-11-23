package main

import (
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

// RateLimiter manages per-tenant rate limits
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit // requests per second
	burst    int        // max burst size
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(requestsPerSecond float64, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     rate.Limit(requestsPerSecond),
		burst:    burst,
	}
}

// GetLimiter returns a rate limiter for the given tenant
func (rl *RateLimiter) GetLimiter(tenantID string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[tenantID]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[tenantID] = limiter
	}

	return limiter
}

// Cleanup removes inactive limiters periodically
func (rl *RateLimiter) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			rl.mu.Lock()
			// In production, track last access time and remove stale limiters
			// For now, we keep all limiters (memory grows with unique tenants)
			rl.mu.Unlock()
		}
	}()
}

// RateLimitMiddleware enforces per-tenant rate limits
func RateLimitMiddleware(rateLimiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			correlationID := GetCorrelationID(r.Context())
			
			// Get tenant ID from JWT claims
			var tenantID string
			if user, ok := GetUserFromContext(r.Context()); ok {
				tenantID = user.TenantID
			} else {
				// For unauthenticated requests, use IP-based limiting
				tenantID = "anonymous:" + r.RemoteAddr
			}

			// Get rate limiter for this tenant
			limiter := rateLimiter.GetLimiter(tenantID)

			if !limiter.Allow() {
				log.Warn().
					Str("correlationId", correlationID).
					Str("tenantId", tenantID).
					Str("remoteAddr", r.RemoteAddr).
					Msg("Rate limit exceeded")

				w.Header().Set("X-RateLimit-Limit", "100")
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("Retry-After", "1")
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			// Add rate limit headers
			w.Header().Set("X-RateLimit-Limit", "100")
			// Note: calculating remaining would require tracking bucket state
			// For simplicity, we just indicate the limit exists

			next.ServeHTTP(w, r)
		})
	}
}
