# Performance Testing Documentation

## Overview

This document outlines the performance testing strategy, tooling, baselines, and SLAs for the Amicis Solution Accelerator.

## Performance Testing Stack

### Load Testing (k6)
- **Tool**: [Grafana k6](https://k6.io/)
- **Purpose**: HTTP load testing and performance validation
- **Location**: `scripts/load-tests/`
- **Coverage**: Auth service, Routing service

### Benchmark Testing (Go)
- **Tool**: Go's built-in `testing` package
- **Purpose**: Micro-benchmarks for critical code paths
- **Location**: `backend/go-routing-service/benchmark_test.go`
- **Coverage**: Handler functions, middleware, cache operations

## Load Testing with k6

### Test Scenarios

#### Auth Service Load Test
- **File**: `scripts/load-tests/k6-auth-service.js`
- **Load Profile**:
  - Ramp up: 0 → 10 users (30s)
  - Sustained: 10 → 50 users (1m)
  - Peak: 50 users (2m)
  - Spike: 50 → 100 users (30s)
  - Sustained spike: 100 users (1m)
  - Ramp down: 100 → 0 users (30s)
- **Endpoints**:
  - POST `/auth/token/exchange` (token validation and exchange)
  - GET `/health` (health check)
  - GET `/metrics` (Prometheus metrics)
- **Custom Metrics**:
  - `token_exchange_errors`: Failed token exchanges
  - `token_exchange_duration`: Token exchange latency

#### Routing Service Load Test
- **File**: `scripts/load-tests/k6-routing-service.js`
- **Load Profile**:
  - Ramp up: 0 → 20 users (30s)
  - Sustained: 20 → 100 users (1m)
  - Peak: 100 users (2m)
  - Spike: 100 → 200 users (30s)
  - Sustained spike: 200 users (1m)
  - Ramp down: 200 → 0 users (30s)
- **Endpoints**:
  - GET `/api/v1/route?storeId={id}` (route lookup)
  - GET `/health` (health check)
- **Custom Metrics**:
  - `route_lookup_errors`: Failed route lookups
  - `route_lookup_duration`: Route lookup latency
  - `cache_hit_rate`: Cache effectiveness

### Running Load Tests

#### Local Development
```powershell
# Start services
docker-compose up -d

# Auth service test
k6 run scripts/load-tests/k6-auth-service.js

# Routing service test (requires JWT)
$token = (curl -X POST http://localhost:3000/auth/token/exchange `
  -H "Content-Type: application/json" `
  -d '{"token":"ikea:demo-token"}' | ConvertFrom-Json).accessToken

k6 run -e JWT_TOKEN=$token scripts/load-tests/k6-routing-service.js
```

#### Azure Environment
```powershell
# Set environment variables
$env:AUTH_SERVICE_URL = "https://amicis-dev.westeurope.cloudapp.azure.com/auth"
$env:ROUTING_SERVICE_URL = "https://amicis-dev.westeurope.cloudapp.azure.com/routing"

# Run tests
k6 run -e AUTH_SERVICE_URL=$env:AUTH_SERVICE_URL scripts/load-tests/k6-auth-service.js
k6 run -e ROUTING_SERVICE_URL=$env:ROUTING_SERVICE_URL -e JWT_TOKEN=$token scripts/load-tests/k6-routing-service.js
```

## Go Benchmarks

### Running Benchmarks

```bash
cd backend/go-routing-service

# Run all benchmarks
go test -bench=. -benchmem -benchtime=10s

# Run specific benchmark
go test -bench=BenchmarkRouteLookup -benchmem -count=5

# With profiling
go test -bench=. -cpuprofile=cpu.prof -memprofile=mem.prof

# Analyze profiles
go tool pprof cpu.prof
go tool pprof mem.prof
```

### Benchmark Coverage

| Benchmark | Purpose |
|-----------|---------|
| `BenchmarkHealthCheck` | Health endpoint latency |
| `BenchmarkRouteLookup` | Route lookup with cache hit |
| `BenchmarkRouteLookupCacheMiss` | Route lookup with cache miss |
| `BenchmarkConcurrentRouteLookup` | Parallel request handling |
| `BenchmarkMiddlewareLogging` | Logging middleware overhead |
| `BenchmarkMiddlewareAuth` | JWT auth middleware overhead |
| `BenchmarkCacheWrite` | sync.Map write performance |
| `BenchmarkCacheRead` | sync.Map read performance |
| `BenchmarkJSONSerialization` | Response encoding speed |
| `BenchmarkJSONDeserialization` | Request decoding speed |

### Expected Benchmark Results

Based on commodity hardware (Intel i7, 16GB RAM):

```
BenchmarkHealthCheck-8                  500000    2500 ns/op    1024 B/op    10 allocs/op
BenchmarkRouteLookup-8                  300000    4000 ns/op    2048 B/op    15 allocs/op
BenchmarkConcurrentRouteLookup-8       1000000    1500 ns/op    1024 B/op     8 allocs/op
BenchmarkCacheRead-8                  10000000     150 ns/op       0 B/op     0 allocs/op
BenchmarkCacheWrite-8                  5000000     300 ns/op      48 B/op     2 allocs/op
```

## Performance Baselines

### Service Level Objectives (SLOs)

#### Auth Service
| Metric | Target | Critical |
|--------|--------|----------|
| P50 Latency | < 100ms | < 200ms |
| P95 Latency | < 500ms | < 1000ms |
| P99 Latency | < 1000ms | < 2000ms |
| Throughput | > 100 req/s | > 50 req/s |
| Error Rate | < 0.1% | < 1% |
| Availability | > 99.9% | > 99% |

#### Routing Service
| Metric | Target | Critical |
|--------|--------|----------|
| P50 Latency | < 50ms | < 100ms |
| P95 Latency | < 300ms | < 500ms |
| P99 Latency | < 500ms | < 1000ms |
| Throughput | > 200 req/s | > 100 req/s |
| Error Rate | < 0.1% | < 1% |
| Cache Hit Rate | > 80% | > 60% |
| Availability | > 99.9% | > 99% |

### Resource Limits

#### Kubernetes Resource Requests/Limits
```yaml
# Auth Service (Node.js)
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Routing Service (Go)
resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 250m
    memory: 256Mi
```

#### Expected Resource Usage (Steady State)
- **Auth Service**: ~150MB memory, ~0.1 CPU cores
- **Routing Service**: ~50MB memory, ~0.05 CPU cores

#### Expected Resource Usage (Peak Load)
- **Auth Service**: ~400MB memory, ~0.4 CPU cores (100 req/s)
- **Routing Service**: ~150MB memory, ~0.15 CPU cores (200 req/s)

## Performance Testing Workflow

### 1. Pre-Deployment Testing
```powershell
# Run local load tests
docker-compose up -d
k6 run scripts/load-tests/k6-auth-service.js
k6 run scripts/load-tests/k6-routing-service.js

# Run Go benchmarks
cd backend/go-routing-service
go test -bench=. -benchmem
```

### 2. Post-Deployment Validation
```powershell
# Smoke test (low load)
k6 run --vus 10 --duration 30s scripts/load-tests/k6-auth-service.js

# Load test (expected traffic)
k6 run scripts/load-tests/k6-auth-service.js

# Stress test (2x expected traffic)
k6 run --vus 200 --duration 5m scripts/load-tests/k6-routing-service.js
```

### 3. Continuous Monitoring
- Application Insights dashboards
- Prometheus metrics + Grafana
- Azure Monitor alerts
- Weekly performance regression tests

## Performance Optimization Strategies

### Caching
1. **In-Memory Cache** (sync.Map in Go)
   - TTL: 5 minutes for route lookups
   - Eviction: LRU (manual implementation)
   - Hit rate target: > 80%

2. **Redis Cache** (Auth Service)
   - TTL: 1 hour for tenant configs
   - Key pattern: `tenant:{tenantId}:config`

### Database Optimization
1. **Cosmos DB**
   - Partition key: `tenantId`
   - Indexing: Optimized for `storeId` lookups
   - Consistency: Session (balance between performance and consistency)

2. **Connection Pooling**
   - Min connections: 10
   - Max connections: 100
   - Idle timeout: 5 minutes

### Application-Level Optimizations
1. **HTTP/2 and Keep-Alive**
   - Enabled for all services
   - Connection reuse for database clients

2. **Compression**
   - Gzip compression for responses > 1KB
   - Configured in ingress controller

3. **Async Processing**
   - Non-blocking I/O for database operations
   - Worker pools for background tasks

## Troubleshooting Performance Issues

### High Latency
1. Check Application Insights for slow dependencies
2. Review cache hit rates
3. Examine database query performance
4. Check CPU/memory throttling
5. Review middleware overhead

### High Error Rates
1. Check Application Insights exceptions
2. Review service logs for error patterns
3. Verify database connectivity
4. Check rate limiting thresholds
5. Examine authentication failures

### Low Throughput
1. Verify resource limits (CPU/memory)
2. Check horizontal pod autoscaling
3. Review connection pool settings
4. Examine network latency
5. Check ingress controller capacity

### Memory Leaks
1. Run Go benchmarks with memory profiling
2. Check for unbounded cache growth
3. Review connection pool cleanup
4. Examine goroutine leaks
5. Use `pprof` for heap analysis

## Performance Testing Checklist

- [ ] Run k6 load tests locally before deployment
- [ ] Execute Go benchmarks for routing service
- [ ] Verify all SLO thresholds pass
- [ ] Check cache hit rates meet targets
- [ ] Validate resource usage within limits
- [ ] Review Application Insights for anomalies
- [ ] Test autoscaling behavior under load
- [ ] Verify performance under spike load
- [ ] Document baseline metrics for comparison
- [ ] Set up performance alerts in Azure Monitor

## CI/CD Integration

### GitHub Actions (Optional)
```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run Auth Service Load Test
        run: k6 run scripts/load-tests/k6-auth-service.js
        env:
          AUTH_SERVICE_URL: ${{ secrets.AUTH_SERVICE_URL }}
      
      - name: Run Routing Service Load Test
        run: k6 run scripts/load-tests/k6-routing-service.js
        env:
          ROUTING_SERVICE_URL: ${{ secrets.ROUTING_SERVICE_URL }}
          JWT_TOKEN: ${{ secrets.PERF_TEST_JWT }}
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: summary.json
```

## Future Enhancements

1. **Distributed Load Testing**
   - Use k6 Cloud for geographically distributed tests
   - Simulate traffic from multiple regions

2. **Chaos Engineering**
   - Integrate with Azure Chaos Studio
   - Test resilience under failures

3. **Performance Budgets**
   - Set CI/CD gates based on performance metrics
   - Fail builds if SLOs not met

4. **Real User Monitoring (RUM)**
   - Frontend performance tracking
   - Core Web Vitals monitoring

5. **Database Performance Testing**
   - Dedicated Cosmos DB load tests
   - Redis cache performance benchmarks

## References

- [k6 Documentation](https://k6.io/docs/)
- [Go Benchmark Guide](https://golang.org/pkg/testing/#hdr-Benchmarks)
- [Application Insights Performance](https://docs.microsoft.com/en-us/azure/azure-monitor/app/performance)
- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
