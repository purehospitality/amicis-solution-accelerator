package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog/log"
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	Sub      string   `json:"sub"`      // Subject (user ID)
	TenantID string   `json:"tenantId"` // Tenant identifier
	Email    string   `json:"email,omitempty"`
	Roles    []string `json:"roles,omitempty"`
	jwt.RegisteredClaims
}

// contextKey type for context keys to avoid collisions
type contextKey string

const (
	UserContextKey          contextKey = "user"
	CorrelationIDContextKey contextKey = "correlationId"
)

const (
	CorrelationIDHeader = "X-Correlation-ID"
	RequestIDHeader     = "X-Request-ID"
)

// CORSMiddleware adds CORS headers to allow requests from the frontend
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-Request-ID, X-Correlation-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, X-Correlation-ID")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// JWTMiddleware validates JWT tokens on incoming requests
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get JWT secret from environment
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "development-secret-change-in-production"
			log.Warn().Msg("Using default JWT secret - set JWT_SECRET environment variable")
		}

		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Warn().Msg("Missing authorization header")
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		// Check Bearer token format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Warn().Msg("Invalid authorization header format")
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			log.Warn().Err(err).Msg("JWT validation failed")
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			log.Warn().Msg("JWT token is not valid")
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Extract claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			log.Error().Msg("Failed to extract JWT claims")
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		// Validate required fields
		if claims.Sub == "" || claims.TenantID == "" {
			log.Warn().Msg("JWT missing required fields")
			http.Error(w, "Invalid token payload", http.StatusUnauthorized)
			return
		}

		// Check expiration
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			log.Warn().Msg("JWT token expired")
			http.Error(w, "Token expired", http.StatusUnauthorized)
			return
		}

		// Add user info to request context
		ctx := context.WithValue(r.Context(), UserContextKey, claims)

		log.Debug().
			Str("user", claims.Sub).
			Str("tenant", claims.TenantID).
			Msg("JWT validated successfully")

		// Continue to next handler with updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserFromContext extracts JWT claims from request context
func GetUserFromContext(ctx context.Context) (*JWTClaims, bool) {
	user, ok := ctx.Value(UserContextKey).(*JWTClaims)
	return user, ok
}

// GetCorrelationID extracts correlation ID from request context
func GetCorrelationID(ctx context.Context) string {
	if id, ok := ctx.Value(CorrelationIDContextKey).(string); ok {
		return id
	}
	return ""
}

// PublicEndpoint marks routes that don't require authentication
func PublicEndpoint(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip JWT validation for this endpoint
		next.ServeHTTP(w, r)
	})
}
