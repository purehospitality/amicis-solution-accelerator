# Circuit Breaker Resilience Testing

This guide describes how to test the circuit breaker implementation in the Amicis services.

## Overview

The system implements circuit breakers to protect against cascading failures:

- **Go Routing Service**: Circuit breakers for MongoDB and Redis
- **Node Auth Service**: Circuit breaker for external token endpoint calls

## Circuit Breaker States

1. **CLOSED** - Normal operation, requests flow through
2. **OPEN** - Too many failures detected, requests fail fast
3. **HALF-OPEN** - Testing if service recovered

## Testing Circuit Breakers

### Prerequisites

```powershell
# Ensure services are running in AKS
kubectl get pods -n amicis

# Port forward for local testing (optional)
kubectl port-forward -n amicis svc/go-routing-service 8080:8080
kubectl port-forward -n amicis svc/node-auth-service 3000:3000
```

### Test 1: MongoDB Circuit Breaker (Go Service)

**Scenario**: Simulate MongoDB failure to trigger circuit breaker

```powershell
# 1. Check initial health status
Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'

# Expected: All circuits CLOSED, mongodb healthy
# {
#   "status": "healthy",
#   "circuitBreakers": {
#     "mongodb": { "state": "closed" },
#     "redis": { "state": "closed" }
#   }
# }

# 2. Scale down MongoDB (simulate failure)
kubectl scale statefulset cosmos-mongodb --replicas=0 -n amicis

# 3. Make several requests to trigger circuit
for ($i=1; $i -le 10; $i++) {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/api/v1/stores' `
            -Headers @{'Authorization'='Bearer YOUR_TOKEN'}
    } catch {
        Write-Host "Request $i failed: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 1
}

# 4. Check circuit breaker status
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers.mongodb.state  # Should be "open"

# 5. Verify fast failures (circuit open)
Measure-Command {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/api/v1/stores' `
            -Headers @{'Authorization'='Bearer YOUR_TOKEN'}
    } catch {}
}
# Expected: Very fast response (<50ms) - circuit is open, not hitting MongoDB

# 6. Restore MongoDB
kubectl scale statefulset cosmos-mongodb --replicas=1 -n amicis

# 7. Wait for circuit to reset (30 seconds by default)
Start-Sleep -Seconds 35

# 8. Verify circuit closes
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers.mongodb.state  # Should be "closed" or "half-open"
```

### Test 2: Redis Circuit Breaker (Go Service)

**Scenario**: Simulate Redis failure

```powershell
# 1. Scale down Redis
kubectl scale deployment redis --replicas=0 -n amicis

# 2. Trigger circuit with cache requests
for ($i=1; $i -le 10; $i++) {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/api/v1/route?storeId=ikea-seattle' `
            -Headers @{'Authorization'='Bearer YOUR_TOKEN'}
    } catch {
        Write-Host "Request $i failed"
    }
}

# 3. Check circuit state
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers.redis.state

# 4. Verify service continues (degraded, no caching)
# Requests should still work, just slower (no cache)

# 5. Restore Redis
kubectl scale deployment redis --replicas=1 -n amicis
```

### Test 3: External API Circuit Breaker (Node Service)

**Scenario**: Simulate external token endpoint failure

```powershell
# 1. Check initial circuit state
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers

# 2. Make requests that will fail (assuming external endpoint down)
for ($i=1; $i -le 10; $i++) {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/auth/exchange' `
            -Method POST `
            -ContentType 'application/json' `
            -Body '{"userToken":"invalid-tenant:token"}'
    } catch {
        Write-Host "Request $i: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 1
}

# 3. Check if circuit opened for that tenant
$health = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$health.circuitBreakers  # Look for "token-exchange-invalid-tenant"

# 4. Verify fast rejection
Measure-Command {
    try {
        Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/auth/exchange' `
            -Method POST `
            -ContentType 'application/json' `
            -Body '{"userToken":"invalid-tenant:token"}'
    } catch {}
}
# Expected: Fast failure when circuit is open
```

### Test 4: Retry Logic with Exponential Backoff

**Scenario**: Test retry behavior on transient failures

```powershell
# Enable verbose logging to see retries
kubectl logs -f -n amicis -l app=go-routing-service | Select-String "retry"

# In another terminal, simulate transient network issue
# Make a request during a brief network interruption
```

## Monitoring Circuit Breakers

### View Circuit Breaker Metrics

```powershell
# Go Service Health
$goHealth = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$goHealth.circuitBreakers | ConvertTo-Json -Depth 3

# Node Service Health
$nodeHealth = Invoke-RestMethod -Uri 'https://api.4.157.44.54.nip.io/health'
$nodeHealth.circuitBreakers | ConvertTo-Json -Depth 3
```

### View Logs for Circuit Breaker Events

```powershell
# Go service logs
kubectl logs -n amicis -l app=go-routing-service --tail=100 | Select-String "circuit"

# Node service logs
kubectl logs -n amicis -l app=node-auth-service --tail=100 | Select-String "circuit"
```

## Expected Behavior

### When Circuit is CLOSED
- ✅ Normal request flow
- ✅ Full latency (includes external calls)
- ✅ Errors logged and counted

### When Circuit is OPEN
- ⚡ Fast failures (no external calls)
- ⚡ "Circuit breaker open" errors
- ⚡ < 50ms response time
- ⚡ Failures don't cascade

### When Circuit is HALF-OPEN
- 🔄 Limited test requests allowed
- 🔄 Monitoring for success
- 🔄 Either closes (success) or re-opens (failure)

## Configuration

### Go Service Circuit Breakers

Located in `circuitbreaker.go`:

```go
MaxRequests:  3,                    // Requests in half-open
Interval:     10 * time.Second,     // Reset failure count window
Timeout:      30 * time.Second,     // Time before retry
ReadyToTrip:  50% failure rate + 5 min requests
```

### Node Service Circuit Breakers

Located in `circuit-breaker.service.ts`:

```typescript
timeout: 5000,                      // 5 second timeout
errorThresholdPercentage: 50,       // 50% failures trips circuit
resetTimeout: 30000,                // 30 seconds before retry
rollingCountTimeout: 10000,         // 10 second error window
```

## Troubleshooting

### Circuit Won't Open
- Check error threshold (need 50% failure rate)
- Verify minimum request count (5 for Go, varies for Node)
- Check time window configuration

### Circuit Won't Close
- Wait for reset timeout (30 seconds default)
- Check if underlying service recovered
- Review logs for continued failures in half-open state

### Unexpected Failures
- Verify circuit breaker timeout configuration
- Check if timeout is too aggressive for slow endpoints
- Review error categorization (retryable vs non-retryable)

## Success Criteria

✅ MongoDB failure doesn't crash the service  
✅ Redis failure degrades gracefully (slower, no cache)  
✅ External API failures fail fast after threshold  
✅ Services recover automatically when dependencies recover  
✅ Circuit breaker stats visible in /health endpoint  
✅ Response times < 50ms when circuit is open  

## Next Steps

1. Set up Prometheus alerts for circuit breaker states
2. Create Grafana dashboards for circuit breaker metrics
3. Implement automated testing in CI/CD
4. Fine-tune thresholds based on production traffic
5. Add circuit breaker metrics to Application Insights

## References

- Go Circuit Breaker: https://github.com/sony/gobreaker
- Node Circuit Breaker: https://github.com/nodeshift/opossum
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
