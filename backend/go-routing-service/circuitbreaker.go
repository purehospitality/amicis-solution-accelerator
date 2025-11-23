package main

import (
	"fmt"
	"time"

	"github.com/sony/gobreaker"
	"github.com/rs/zerolog/log"
)

// CircuitBreakerConfig holds configuration for circuit breakers
type CircuitBreakerConfig struct {
	MaxRequests  uint32
	Interval     time.Duration
	Timeout      time.Duration
	ReadyToTrip  func(counts gobreaker.Counts) bool
	OnStateChange func(name string, from gobreaker.State, to gobreaker.State)
}

// NewDefaultCircuitBreaker creates a circuit breaker with sensible defaults
func NewDefaultCircuitBreaker(name string) *gobreaker.CircuitBreaker {
	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: 3, // Allow 3 requests in half-open state
		Interval:    10 * time.Second, // Reset failure count after 10 seconds
		Timeout:     30 * time.Second, // Try again after 30 seconds in open state
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			// Open circuit if failure rate > 50% and at least 5 requests
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.5
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			log.Warn().
				Str("circuit_breaker", name).
				Str("from_state", from.String()).
				Str("to_state", to.String()).
				Msg("Circuit breaker state changed")
		},
	}
	
	return gobreaker.NewCircuitBreaker(settings)
}

// NewCustomCircuitBreaker creates a circuit breaker with custom configuration
func NewCustomCircuitBreaker(name string, config CircuitBreakerConfig) *gobreaker.CircuitBreaker {
	settings := gobreaker.Settings{
		Name:          name,
		MaxRequests:   config.MaxRequests,
		Interval:      config.Interval,
		Timeout:       config.Timeout,
		ReadyToTrip:   config.ReadyToTrip,
		OnStateChange: config.OnStateChange,
	}
	
	return gobreaker.NewCircuitBreaker(settings)
}

// CircuitBreakerWrapper wraps common operations with circuit breaker
type CircuitBreakerWrapper struct {
	MongoBreaker *gobreaker.CircuitBreaker
	RedisBreaker *gobreaker.CircuitBreaker
}

// NewCircuitBreakerWrapper creates circuit breakers for all dependencies
func NewCircuitBreakerWrapper() *CircuitBreakerWrapper {
	return &CircuitBreakerWrapper{
		MongoBreaker: NewDefaultCircuitBreaker("mongodb"),
		RedisBreaker: NewDefaultCircuitBreaker("redis"),
	}
}

// ExecuteWithBreaker executes a function with circuit breaker protection
func (cbw *CircuitBreakerWrapper) ExecuteWithBreaker(
	breaker *gobreaker.CircuitBreaker,
	fn func() (interface{}, error),
) (interface{}, error) {
	result, err := breaker.Execute(fn)
	if err != nil {
		if err == gobreaker.ErrOpenState {
			log.Error().
				Str("circuit_breaker", breaker.Name()).
				Msg("Circuit breaker is OPEN - rejecting request")
			return nil, fmt.Errorf("service temporarily unavailable: %s circuit is open", breaker.Name())
		}
		if err == gobreaker.ErrTooManyRequests {
			log.Warn().
				Str("circuit_breaker", breaker.Name()).
				Msg("Circuit breaker in half-open state - too many requests")
			return nil, fmt.Errorf("service recovering: %s - too many requests", breaker.Name())
		}
		return nil, err
	}
	return result, nil
}

// GetCircuitBreakerStats returns current stats for monitoring
func (cbw *CircuitBreakerWrapper) GetCircuitBreakerStats() map[string]interface{} {
	return map[string]interface{}{
		"mongodb": map[string]interface{}{
			"state": cbw.MongoBreaker.State().String(),
			"counts": cbw.MongoBreaker.Counts(),
		},
		"redis": map[string]interface{}{
			"state": cbw.RedisBreaker.State().String(),
			"counts": cbw.RedisBreaker.Counts(),
		},
	}
}
