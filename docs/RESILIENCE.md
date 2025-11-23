# Resilience and Fault Tolerance

This document describes the resilience patterns implemented in the Amicis Solution Accelerator to ensure high availability and graceful degradation under failure conditions.

## Overview

The system implements multiple resilience patterns:

- **Circuit Breakers**: Prevent cascading failures
- **Retry Logic**: Handle transient failures automatically
- **Fallback Mechanisms**: Graceful degradation
- **Health Checks**: Monitor circuit breaker states

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Node Auth Service (Port 3000)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Circuit Breaker: External Token Endpoint              │  │
│  │  - Timeout: 5s                                        │  │
│  │  - Error Threshold: 50%                               │  │
│  │  - Reset: 30s                                         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Go Routing Service (Port 8080)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Circuit Breaker: MongoDB                              │  │
│  │  - Max Requests (half-open): 3                        │  │
│  │  - Failure Rate Threshold: 50%                        │  │
│  │  - Reset Timeout: 30s                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Circuit Breaker: Redis Cache                          │  │
│  │  - Max Requests (half-open): 3                        │  │
│  │  - Failure Rate Threshold: 50%                        │  │
│  │  - Reset Timeout: 30s                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Retry Logic: Exponential Backoff                      │  │
│  │  - Max Attempts: 3                                    │  │
│  │  - Initial Delay: 100ms                               │  │
│  │  - Max Delay: 5s                                      │  │
│  │  - Backoff Factor: 2.0                                │  │
│  └───────────────────────────────────────────────────────┘  │
└────────┬─────────────────────────────────┬─────────────────┘
         │                                 │
         ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐
│  Cosmos DB       │            │  Redis Cache     │
│  (MongoDB API)   │            │                  │
└──────────────────┘            └──────────────────┘
```

## Circuit Breaker Pattern

### Implementation

#### Go Service (github.com/sony/gobreaker)

**File**: `backend/go-routing-service/circuitbreaker.go`

```go
type CircuitBreakerWrapper struct {
    MongoBreaker *gobreaker.CircuitBreaker
    RedisBreaker *gobreaker.CircuitBreaker
}

func NewDefaultCircuitBreaker(name string) *gobreaker.CircuitBreaker {
    settings := gobreaker.Settings{
        Name:        name,
        MaxRequests: 3,              // Max concurrent requests in half-open
        Interval:    10 * time.Second, // Window for failure rate calculation
        Timeout:     30 * time.Second, // Time before attempting half-open
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 5 && failureRatio >= 0.5
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            log.Info().
                Str("breaker", name).
                Str("from", from.String()).
                Str("to", to.String()).
                Msg("Circuit breaker state changed")
        },
    }
    return gobreaker.NewCircuitBreaker(settings)
}
```

**Usage Example**:
```go
result, err := app.circuitBreakers.ExecuteWithBreaker(
    app.circuitBreakers.MongoBreaker,
    func() (interface{}, error) {
        var store Store
        err := app.storesDB.FindOne(ctx, filter).Decode(&store)
        return store, err
    },
)
```

#### Node Service (opossum)

**File**: `backend/node-auth-service/src/common/circuit-breaker.service.ts`

```typescript
@Injectable()
export class CircuitBreakerService {
  private breakers = new Map<string, CircuitBreaker<any, any>>();
  
  getBreaker<T = any, A = any[]>(
    name: string,
    action: (...args: A) => Promise<T>,
    options?: Partial<Options>,
  ): CircuitBreaker<A, T> {
    if (!this.breakers.has(name)) {
      const defaultOptions: Partial<Options> = {
        timeout: 3000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name,
      };
      
      const breaker = new CircuitBreaker(action, {
        ...defaultOptions,
        ...options,
      });
      
      this.setupEventListeners(breaker);
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name);
  }
}
```

**Usage Example**:
```typescript
await this.circuitBreaker.executeWithFallback(
  `token-exchange-${tenantId}`,
  async () => await this.callTokenEndpoint(tenantId, userToken),
  (error) => {
    throw new HttpException('Token service temporarily unavailable', 503);
  },
  {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  },
);
```

### States

1. **CLOSED** (Normal Operation)
   - All requests pass through
   - Failures are counted
   - If failure rate exceeds threshold → OPEN

2. **OPEN** (Failing Fast)
   - Requests fail immediately without calling dependency
   - Returns error immediately (< 50ms)
   - After timeout period → HALF-OPEN

3. **HALF-OPEN** (Testing Recovery)
   - Limited requests allowed through (3 for Go service)
   - Success → CLOSED
   - Failure → OPEN

### Configuration

| Setting | Go Service | Node Service | Purpose |
|---------|-----------|--------------|---------|
| **Timeout** | 30s | 30s | Time before transitioning to half-open |
| **Error Threshold** | 50% of 5+ requests | 50% | Failure rate that trips circuit |
| **Max Requests (Half-Open)** | 3 | (automatic) | Concurrent requests allowed when testing |
| **Rolling Window** | 10s | 10s | Time window for failure rate calculation |

## Retry Logic with Exponential Backoff

### Implementation

**File**: `backend/go-routing-service/retry.go`

```go
type RetryConfig struct {
    MaxAttempts  int
    InitialDelay time.Duration
    MaxDelay     time.Duration
    BackoffFactor float64
}

func RetryWithBackoff(
    ctx context.Context,
    config RetryConfig,
    operation func() error,
) error {
    delay := config.InitialDelay
    
    for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
        if err := operation(); err != nil {
            if attempt >= config.MaxAttempts {
                return fmt.Errorf("max retry attempts reached: %w", err)
            }
            
            // Calculate next delay with exponential backoff
            delay = time.Duration(float64(delay) * config.BackoffFactor)
            if delay > config.MaxDelay {
                delay = config.MaxDelay
            }
            
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(delay):
                continue
            }
        }
        return nil
    }
    return nil
}
```

### Retryable Error Detection

**MongoDB Errors**:
```go
func IsRetryableMongoError(err error) bool {
    if mongo.IsTimeout(err) {
        return true
    }
    
    errMsg := err.Error()
    retryablePatterns := []string{
        "connection",
        "timeout",
        "network",
        "temporary",
    }
    
    for _, pattern := range retryablePatterns {
        if strings.Contains(strings.ToLower(errMsg), pattern) {
            return true
        }
    }
    return false
}
```

**Redis Errors**:
```go
func IsRetryableRedisError(err error) bool {
    errMsg := err.Error()
    retryablePatterns := []string{
        "connection",
        "timeout",
        "EOF",
        "broken pipe",
    }
    // ... similar pattern matching
}
```

### Configuration

| Parameter | Default | Purpose |
|-----------|---------|---------|
| **MaxAttempts** | 3 | Maximum retry attempts |
| **InitialDelay** | 100ms | First retry delay |
| **MaxDelay** | 5s | Maximum delay between retries |
| **BackoffFactor** | 2.0 | Exponential multiplier |

### Retry Schedule Example

```
Attempt 1: Execute immediately
Attempt 2: Wait 100ms  (100ms × 2^0)
Attempt 3: Wait 200ms  (100ms × 2^1)
Attempt 4: Wait 400ms  (100ms × 2^2)
Attempt 5: Wait 800ms  (100ms × 2^3)
...
Max delay: 5000ms
```

## Fallback Mechanisms

### Database Failures

**MongoDB Unavailable**:
```go
// Circuit breaker open - return service unavailable
if err != nil {
    log.Error().Err(err).Msg("Circuit breaker error accessing MongoDB")
    c.JSON(http.StatusServiceUnavailable, gin.H{
        "error": "Service temporarily unavailable",
    })
    return
}
```

**Redis Cache Unavailable**:
```go
// Circuit breaker open - skip cache, use database
redisResult, err := app.circuitBreakers.ExecuteWithBreaker(
    app.circuitBreakers.RedisBreaker,
    func() (interface{}, error) {
        return app.redisClient.Get(ctx, cacheKey).Result()
    },
)

if err != nil {
    // Cache miss or circuit open - fetch from MongoDB
    log.Warn().Err(err).Msg("Redis unavailable, using MongoDB")
    mongoResult, mongoErr := fetchFromMongoDB()
    // ...
}
```

### External API Failures

**Token Exchange Service Unavailable**:
```typescript
await this.circuitBreaker.executeWithFallback(
  `token-exchange-${tenantId}`,
  async () => await this.callTokenEndpoint(tenantId, userToken),
  (error) => {
    // Fallback: Return 503 with retry-after header
    throw new HttpException(
      'Token service temporarily unavailable. Please retry.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  },
);
```

## Health Checks

### Endpoints

**Go Service**: `GET /health`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "dependencies": {
    "mongodb": "connected",
    "redis": "connected"
  },
  "circuitBreakers": {
    "mongodb": {
      "state": "closed",
      "counts": {
        "requests": 1250,
        "totalSuccesses": 1240,
        "totalFailures": 10,
        "consecutiveSuccesses": 5,
        "consecutiveFailures": 0
      }
    },
    "redis": {
      "state": "closed",
      "counts": {
        "requests": 3400,
        "totalSuccesses": 3395,
        "totalFailures": 5
      }
    }
  }
}
```

**Node Service**: `GET /health`
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "circuitBreakers": {
    "token-exchange-ikea": {
      "state": "closed",
      "stats": {
        "fires": 450,
        "successes": 448,
        "failures": 2,
        "rejects": 0,
        "timeouts": 0
      }
    }
  }
}
```

## Monitoring and Observability

### Metrics

**Circuit Breaker Metrics** (exposed via /health):
- State (closed/open/half-open)
- Total requests
- Success count
- Failure count
- Consecutive failures
- Last state change timestamp

**Custom Prometheus Metrics** (future):
```
# Circuit breaker state (0=closed, 1=open, 2=half-open)
circuit_breaker_state{service="routing", breaker="mongodb"} 0

# Circuit breaker failures
circuit_breaker_failures_total{service="routing", breaker="mongodb"} 10

# Retry attempts
retry_attempts_total{service="routing", operation="mongo_find"} 45
```

### Logging

**State Changes**:
```json
{
  "level": "info",
  "breaker": "mongodb",
  "from": "closed",
  "to": "open",
  "msg": "Circuit breaker state changed",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Retry Attempts**:
```json
{
  "level": "warn",
  "operation": "mongodb_find",
  "attempt": 2,
  "error": "connection timeout",
  "nextDelay": "200ms",
  "msg": "Retrying operation",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

## Testing

See [CIRCUIT_BREAKER_TESTING.md](./CIRCUIT_BREAKER_TESTING.md) for comprehensive testing guide.

### Quick Test

```powershell
# Check circuit breaker status
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers

# Simulate MongoDB failure
kubectl scale statefulset cosmos-mongodb --replicas=0 -n amicis

# Trigger circuit breaker (make 10 requests)
1..10 | ForEach-Object {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/api/v1/stores'
    } catch {}
}

# Verify circuit opened
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers.mongodb.state  # Should be "open"
```

## Best Practices

### Circuit Breaker Configuration

✅ **DO**:
- Set reasonable timeouts based on SLA requirements
- Use 50% error threshold as starting point, adjust based on traffic
- Monitor state changes and adjust thresholds
- Implement fallbacks for critical paths

❌ **DON'T**:
- Set timeout too low (causes false positives)
- Set error threshold too high (delays failure detection)
- Ignore half-open failures (indicates persistent issues)
- Bypass circuit breakers in production

### Retry Logic

✅ **DO**:
- Retry only on transient errors
- Use exponential backoff
- Set maximum retry limit (3-5 attempts)
- Respect context cancellation
- Log retry attempts for debugging

❌ **DON'T**:
- Retry non-retryable errors (4xx responses, validation errors)
- Use fixed delays (can cause thundering herd)
- Retry indefinitely
- Ignore timeout contexts

### Fallbacks

✅ **DO**:
- Provide meaningful error messages
- Return degraded service when possible
- Include retry-after headers
- Log fallback invocations

❌ **DON'T**:
- Return success on fallback failures
- Hide errors from users
- Use fallbacks as primary path
- Cache fallback responses

## Performance Impact

### Circuit Breaker Overhead

- **Closed State**: < 1ms overhead (counter increment)
- **Open State**: < 0.1ms overhead (immediate rejection)
- **Half-Open State**: Normal latency + state management

### Retry Logic Overhead

- **No Retries**: 0ms overhead
- **1 Retry**: 100-200ms additional latency
- **2 Retries**: 300-600ms additional latency
- **3 Retries**: 700-1400ms additional latency

### Memory Usage

- **Per Circuit Breaker**: ~1KB (state + counters)
- **Total (4 breakers)**: ~4KB
- **Negligible impact** on overall service memory

## Troubleshooting

### Circuit Breaker Stuck Open

**Symptoms**: Circuit remains open despite dependency recovery

**Diagnosis**:
```powershell
# Check circuit state
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers

# Check logs for state transitions
kubectl logs -n amicis -l app=go-routing-service | Select-String "circuit"
```

**Resolution**:
1. Verify dependency is actually healthy
2. Wait for reset timeout (30s default)
3. Check if errors continue in half-open state
4. Consider manual restart if stuck

### Excessive Retries

**Symptoms**: High latency, cascading failures

**Diagnosis**:
```powershell
# Check retry logs
kubectl logs -n amicis -l app=go-routing-service | Select-String "retry"

# Monitor request latency
kubectl logs -n amicis -l app=go-routing-service | Select-String "duration"
```

**Resolution**:
1. Verify errors are actually retryable
2. Reduce max retry attempts
3. Increase timeout thresholds
4. Check if circuit breaker should trip instead

### False Positives

**Symptoms**: Circuit opens during normal load

**Diagnosis**:
- Review error threshold (too sensitive?)
- Check minimum request count
- Analyze error types (retryable vs non-retryable)

**Resolution**:
1. Increase error threshold percentage
2. Increase minimum request count before tripping
3. Improve error classification
4. Add request timeout buffer

## Future Enhancements

- [ ] Prometheus metric export
- [ ] Grafana dashboards
- [ ] Application Insights integration
- [ ] Adaptive circuit breaker thresholds
- [ ] Per-tenant circuit breakers
- [ ] Bulkhead pattern implementation
- [ ] Rate limiting per circuit state
- [ ] Automated recovery testing

## References

- [Circuit Breaker Pattern - Martin Fowler](https://martinfowler.com/bliki/CircuitBreaker.html)
- [gobreaker Documentation](https://github.com/sony/gobreaker)
- [opossum Documentation](https://github.com/nodeshift/opossum)
- [Release It! - Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Azure Architecture - Retry Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)
