package main

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/rs/zerolog/log"
)

// RetryConfig holds configuration for retry logic
type RetryConfig struct {
	MaxAttempts     int
	InitialDelay    time.Duration
	MaxDelay        time.Duration
	BackoffFactor   float64
	RetryableErrors func(error) bool
}

// DefaultRetryConfig returns a retry config with sensible defaults
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts:   3,
		InitialDelay:  100 * time.Millisecond,
		MaxDelay:      5 * time.Second,
		BackoffFactor: 2.0,
		RetryableErrors: func(err error) bool {
			// By default, retry on all errors
			return true
		},
	}
}

// RetryWithBackoff executes a function with exponential backoff retry logic
func RetryWithBackoff(ctx context.Context, config RetryConfig, operation func() error) error {
	var lastErr error
	
	for attempt := 0; attempt < config.MaxAttempts; attempt++ {
		// Try the operation
		err := operation()
		
		if err == nil {
			// Success!
			if attempt > 0 {
				log.Info().
					Int("attempts", attempt+1).
					Msg("Operation succeeded after retry")
			}
			return nil
		}
		
		lastErr = err
		
		// Check if error is retryable
		if !config.RetryableErrors(err) {
			log.Debug().
				Err(err).
				Msg("Error is not retryable, giving up")
			return err
		}
		
		// Don't retry if this was the last attempt
		if attempt == config.MaxAttempts-1 {
			break
		}
		
		// Calculate backoff delay
		delay := calculateBackoff(attempt, config.InitialDelay, config.MaxDelay, config.BackoffFactor)
		
		log.Warn().
			Err(err).
			Int("attempt", attempt+1).
			Int("max_attempts", config.MaxAttempts).
			Dur("retry_after", delay).
			Msg("Operation failed, retrying")
		
		// Wait with context cancellation support
		select {
		case <-time.After(delay):
			// Continue to next attempt
		case <-ctx.Done():
			return fmt.Errorf("retry cancelled: %w", ctx.Err())
		}
	}
	
	log.Error().
		Err(lastErr).
		Int("attempts", config.MaxAttempts).
		Msg("Operation failed after all retry attempts")
	
	return fmt.Errorf("max retry attempts (%d) exceeded: %w", config.MaxAttempts, lastErr)
}

// calculateBackoff calculates the delay for exponential backoff
func calculateBackoff(attempt int, initialDelay, maxDelay time.Duration, backoffFactor float64) time.Duration {
	delay := float64(initialDelay) * math.Pow(backoffFactor, float64(attempt))
	
	// Cap at max delay
	if delay > float64(maxDelay) {
		delay = float64(maxDelay)
	}
	
	return time.Duration(delay)
}

// RetryableOperation wraps an operation that returns a value and an error
func RetryableOperation[T any](ctx context.Context, config RetryConfig, operation func() (T, error)) (T, error) {
	var result T
	var lastErr error
	
	for attempt := 0; attempt < config.MaxAttempts; attempt++ {
		// Try the operation
		res, err := operation()
		
		if err == nil {
			// Success!
			if attempt > 0 {
				log.Info().
					Int("attempts", attempt+1).
					Msg("Operation succeeded after retry")
			}
			return res, nil
		}
		
		lastErr = err
		
		// Check if error is retryable
		if !config.RetryableErrors(err) {
			log.Debug().
				Err(err).
				Msg("Error is not retryable, giving up")
			return result, err
		}
		
		// Don't retry if this was the last attempt
		if attempt == config.MaxAttempts-1 {
			break
		}
		
		// Calculate backoff delay
		delay := calculateBackoff(attempt, config.InitialDelay, config.MaxDelay, config.BackoffFactor)
		
		log.Warn().
			Err(err).
			Int("attempt", attempt+1).
			Int("max_attempts", config.MaxAttempts).
			Dur("retry_after", delay).
			Msg("Operation failed, retrying")
		
		// Wait with context cancellation support
		select {
		case <-time.After(delay):
			// Continue to next attempt
		case <-ctx.Done():
			return result, fmt.Errorf("retry cancelled: %w", ctx.Err())
		}
	}
	
	log.Error().
		Err(lastErr).
		Int("attempts", config.MaxAttempts).
		Msg("Operation failed after all retry attempts")
	
	return result, fmt.Errorf("max retry attempts (%d) exceeded: %w", config.MaxAttempts, lastErr)
}

// IsRetryableMongoError determines if a MongoDB error should be retried
func IsRetryableMongoError(err error) bool {
	if err == nil {
		return false
	}
	
	// Add specific MongoDB error checks here
	errMsg := err.Error()
	
	// Retry on network errors, timeouts, etc.
	retryablePatterns := []string{
		"connection",
		"timeout",
		"network",
		"temporary",
		"unavailable",
	}
	
	for _, pattern := range retryablePatterns {
		if contains(errMsg, pattern) {
			return true
		}
	}
	
	return false
}

// IsRetryableRedisError determines if a Redis error should be retried
func IsRetryableRedisError(err error) bool {
	if err == nil {
		return false
	}
	
	// Redis nil response is not an error, don't retry
	if err.Error() == "redis: nil" {
		return false
	}
	
	errMsg := err.Error()
	
	// Retry on network errors, timeouts, etc.
	retryablePatterns := []string{
		"connection",
		"timeout",
		"network",
		"broken pipe",
		"EOF",
	}
	
	for _, pattern := range retryablePatterns {
		if contains(errMsg, pattern) {
			return true
		}
	}
	
	return false
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && 
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
		findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
