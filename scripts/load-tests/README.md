# Performance Testing with k6

This directory contains k6 load testing scripts for the Amicis Solution Accelerator services.

## Prerequisites

Install k6:

### Windows (using Chocolatey)
```powershell
choco install k6
```

### Windows (using winget)
```powershell
winget install k6 --source winget
```

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Local Development

1. **Start services locally** (using Docker Compose):
```powershell
docker-compose up -d
```

2. **Run auth service load test**:
```powershell
k6 run k6-auth-service.js
```

3. **Run routing service load test** (requires JWT token):
```powershell
# Get a JWT token first
$token = (curl -X POST http://localhost:3000/auth/token/exchange `
  -H "Content-Type: application/json" `
  -d '{"token":"ikea:demo-token"}' | ConvertFrom-Json).accessToken

# Run the test
k6 run -e JWT_TOKEN=$token k6-routing-service.js
```

### Against Azure Environment

```powershell
# Auth service
k6 run -e AUTH_SERVICE_URL=https://amicis-dev.westeurope.cloudapp.azure.com/auth k6-auth-service.js

# Routing service
k6 run -e ROUTING_SERVICE_URL=https://amicis-dev.westeurope.cloudapp.azure.com/routing `
  -e JWT_TOKEN=<your-token> `
  k6-routing-service.js
```

## Test Scenarios

### Auth Service (`k6-auth-service.js`)
- **Load profile**: 10 → 50 → 100 users over 5 minutes
- **Endpoints tested**:
  - POST /auth/token/exchange (token exchange)
  - GET /health (health check)
  - GET /metrics (prometheus metrics)
- **Success criteria**:
  - 95% of requests < 500ms
  - 99% of requests < 1000ms
  - Error rate < 1%

### Routing Service (`k6-routing-service.js`)
- **Load profile**: 20 → 100 → 200 users over 5 minutes
- **Endpoints tested**:
  - GET /api/v1/route?storeId=XXX (route lookup)
  - GET /health (health check)
- **Success criteria**:
  - 95% of requests < 300ms
  - 99% of requests < 500ms
  - Error rate < 1%
  - Cache hit rate tracking

## Custom Metrics

### Auth Service
- `token_exchange_errors`: Count of failed token exchanges
- `token_exchange_duration`: Duration trend for token exchanges

### Routing Service
- `route_lookup_errors`: Count of failed route lookups
- `route_lookup_duration`: Duration trend for route lookups
- `cache_hit_rate`: Count of cache hits (responses < 50ms)

## Test Stages

Both tests use similar progressive load patterns:

1. **Ramp up**: Gradually increase load
2. **Sustained load**: Maintain constant user count
3. **Spike test**: Sudden increase to test resilience
4. **Sustained spike**: Maintain high load
5. **Ramp down**: Graceful decrease

## Interpreting Results

### Good Performance Indicators
- ✅ All thresholds pass (green in k6 output)
- ✅ P95 response times within targets
- ✅ Error rate < 1%
- ✅ Cache hit rate > 60% for routing service
- ✅ No significant performance degradation during spike

### Warning Signs
- ⚠️ P95 approaching threshold limits
- ⚠️ Error rate between 1-5%
- ⚠️ Cache hit rate < 40%
- ⚠️ Response times increasing during sustained load

### Critical Issues
- ❌ Thresholds failing
- ❌ Error rate > 5%
- ❌ P95 > 2x target
- ❌ Service becomes unresponsive during spike

## Advanced Usage

### Custom Test Duration
```powershell
k6 run --duration 10m --vus 50 k6-auth-service.js
```

### Output to InfluxDB
```powershell
k6 run --out influxdb=http://localhost:8086/k6 k6-auth-service.js
```

### Output to JSON
```powershell
k6 run --out json=test-results.json k6-auth-service.js
```

### Cloud Execution (k6 Cloud)
```powershell
k6 cloud k6-auth-service.js
```

## CI/CD Integration

Add to GitHub Actions (`.github/workflows/performance-tests.yml`):

```yaml
- name: Run k6 tests
  run: |
    k6 run --out json=results.json scripts/load-tests/k6-auth-service.js
    k6 run --out json=results.json scripts/load-tests/k6-routing-service.js
```

## Troubleshooting

### "Service not available" error
- Ensure services are running
- Check service URLs are correct
- Verify network connectivity

### Authentication failures
- Ensure JWT_TOKEN is valid and not expired
- Check token format (should be Bearer token)
- Verify tenant ID matches

### High error rates
- Check service logs for errors
- Verify database/Redis connectivity
- Check resource limits (CPU/memory)
- Review Application Insights for exceptions

## Performance Baselines

Expected performance (based on test configuration):

| Metric | Auth Service | Routing Service |
|--------|--------------|-----------------|
| P50 Response Time | < 100ms | < 50ms |
| P95 Response Time | < 500ms | < 300ms |
| P99 Response Time | < 1000ms | < 500ms |
| Throughput | > 100 req/s | > 200 req/s |
| Error Rate | < 1% | < 1% |
| Cache Hit Rate | N/A | > 60% |

## Next Steps

1. Establish baseline performance metrics
2. Run tests before/after code changes
3. Add performance regression tests to CI/CD
4. Monitor trends over time
5. Set up alerts for performance degradation
