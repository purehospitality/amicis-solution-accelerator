package main

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// CorrelationIDMiddleware adds correlation ID to request context and response headers
func CorrelationIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to get correlation ID from incoming request headers
		correlationID := r.Header.Get(CorrelationIDHeader)
		
		// If not present, try X-Request-ID as fallback
		if correlationID == "" {
			correlationID = r.Header.Get(RequestIDHeader)
		}
		
		// If still not present, generate a new UUID
		if correlationID == "" {
			correlationID = uuid.New().String()
		}
		
		// Add to context
		ctx := r.Context()
		ctx = WithCorrelationID(ctx, correlationID)
		
		// Add to response headers for clients to track
		w.Header().Set(CorrelationIDHeader, correlationID)
		
		// Log the request with correlation ID
		log.Info().
			Str("correlationId", correlationID).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Str("remoteAddr", r.RemoteAddr).
			Msg("Request received")
		
		// Continue with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// WithCorrelationID adds correlation ID to context
func WithCorrelationID(ctx context.Context, correlationID string) context.Context {
	return context.WithValue(ctx, CorrelationIDContextKey, correlationID)
}

// prometheusMiddleware tracks HTTP metrics with Prometheus
func prometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Get correlation ID for logging
		correlationID := GetCorrelationID(r.Context())
		
		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		
		// Process request
		next.ServeHTTP(wrapped, r)
		
		// Record metrics
		duration := time.Since(start).Seconds()
		httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
		httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, http.StatusText(wrapped.statusCode)).Inc()
		
		// Log completion
		log.Info().
			Str("correlationId", correlationID).
			Str("method", r.Method).
			Str("path", r.URL.Path).
			Int("status", wrapped.statusCode).
			Float64("durationMs", duration*1000).
			Msg("Request completed")
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
