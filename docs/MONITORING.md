# Monitoring and Observability

This document describes the monitoring and observability features implemented in the Amicis Solution Accelerator.

## Application Insights

Application Insights provides comprehensive application performance monitoring (APM) for the Node.js authentication service.

### Features

- **Automatic Instrumentation**: Collects telemetry for HTTP requests, dependencies, exceptions, and performance counters
- **Distributed Tracing**: Correlates requests across services using W3C trace context
- **Live Metrics**: Real-time monitoring of service health and performance
- **Custom Events and Metrics**: Track business-specific metrics
- **Exception Tracking**: Automatic capture and reporting of exceptions

### Configuration

Set the following environment variables:

```bash
# Enable Application Insights
APPLICATIONINSIGHTS_ENABLED=true

# Connection string from Azure portal
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxxx;IngestionEndpoint=https://...
```

### Usage

The `ApplicationInsightsService` is globally available and can be injected into any service:

```typescript
import { ApplicationInsightsService } from './common/applicationinsights.service';

constructor(private readonly appInsights: ApplicationInsightsService) {}

// Track custom events
this.appInsights.trackEvent('UserLogin', { userId: '123', tenantId: 'ikea' });

// Track metrics
this.appInsights.trackMetric('TokenCacheHitRate', 0.95);

// Track exceptions
this.appInsights.trackException(error, { operation: 'tokenExchange' });
```

## Prometheus Metrics

Prometheus-compatible metrics are exposed at `/metrics` endpoint for scraping.

### Available Metrics

#### Default Metrics
- `process_cpu_user_seconds_total` - Process CPU time
- `process_resident_memory_bytes` - Process memory usage
- `nodejs_heap_size_total_bytes` - Node.js heap size
- `nodejs_eventloop_lag_seconds` - Event loop lag

#### Custom Application Metrics
- `http_requests_total` - Total HTTP requests (labels: method, route, status_code)
- `http_request_duration_seconds` - HTTP request duration histogram
- `active_connections` - Current active connections
- `token_exchange_total` - Total token exchanges (labels: tenant_id, status)
- `token_exchange_duration_seconds` - Token exchange duration histogram

### Configuration

Metrics endpoint is public and requires no authentication. Configure Prometheus to scrape:

```yaml
scrape_configs:
  - job_name: 'node-auth-service'
    static_configs:
      - targets: ['node-auth-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboards

Import pre-built dashboards:
- Node.js Application Metrics (ID: 11159)
- Prometheus Stats (ID: 2)

Or create custom dashboards using the exported metrics.

## Azure Key Vault Integration

Securely manage secrets and configuration using Azure Key Vault.

### Features

- **Managed Identity Support**: Uses Azure Managed Identity for authentication
- **Secret Caching**: Caches secrets with configurable TTL (default: 5 minutes)
- **Fallback to Environment Variables**: Gracefully falls back if Key Vault is unavailable
- **Automatic Rotation**: Secrets are refreshed from Key Vault when cache expires

### Configuration

```bash
# Enable Key Vault integration
KEY_VAULT_ENABLED=true

# Key Vault URL
KEY_VAULT_URL=https://kv-amicis-ikea-dev.vault.azure.net/
```

### Usage

Inject `KeyVaultService` into your services:

```typescript
import { KeyVaultService } from './common/keyvault.service';

constructor(private readonly keyVault: KeyVaultService) {}

// Get a single secret
const jwtSecret = await this.keyVault.getSecret('JWT-SECRET', 'default-secret');

// Get multiple secrets
const secrets = await this.keyVault.getSecrets([
  'JWT-SECRET',
  'REDIS-PASSWORD',
  'COSMOS-KEY'
]);
```

### Secret Naming Convention

Secrets in Key Vault should follow this naming pattern:
- Use hyphens instead of underscores: `JWT-SECRET` not `JWT_SECRET`
- Use uppercase for consistency
- Prefix with service name for shared vaults: `NODE-AUTH-JWT-SECRET`

## Health Checks

Comprehensive health checks are available at `/health` endpoint.

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "mongodb": {
      "status": "up",
      "responseTime": 15
    },
    "redis": {
      "status": "up",
      "responseTime": 5
    }
  }
}
```

### Status Codes

- `200 OK` - All dependencies healthy
- `503 Service Unavailable` - One or more dependencies degraded/down

### Kubernetes Probes

Configure liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Logging

Structured logging using Winston with support for multiple transports.

### Log Levels

- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `http` - HTTP request logs
- `debug` - Debug messages (only in development)

### Log Format

```json
{
  "level": "info",
  "message": "Token exchange successful",
  "tenantId": "ikea",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": "AuthService"
}
```

### Configuration

```bash
# Set log level
LOG_LEVEL=info

# Environment affects log format
NODE_ENV=production  # JSON format
NODE_ENV=development # Pretty console format
```

## Best Practices

### 1. Use Structured Logging

Always include context in logs:

```typescript
this.logger.log('Token exchanged', { tenantId, userId, cacheHit: true });
```

### 2. Track Business Metrics

Track meaningful business metrics, not just technical ones:

```typescript
this.appInsights.trackMetric('DailyActiveUsers', userCount);
this.appInsights.trackEvent('FeatureUsed', { feature: 'storeSelection' });
```

### 3. Set Up Alerts

Configure alerts in Application Insights for:
- High error rates
- Slow response times
- High memory/CPU usage
- Failed dependencies

### 4. Monitor Key Vault Access

Track Key Vault access patterns:
- Check for 429 (Too Many Requests)
- Monitor secret access logs
- Set up alerts for access failures

### 5. Use Distributed Tracing

Ensure correlation IDs are propagated across service calls:

```typescript
// Correlation ID is automatically added by Application Insights
// Access it in requests via headers
const correlationId = request.headers['x-correlation-id'];
```

## Troubleshooting

### Application Insights Not Receiving Data

1. Check connection string is correct
2. Verify `APPLICATIONINSIGHTS_ENABLED=true`
3. Check network connectivity to Azure
4. Review Application Insights ingestion logs

### Prometheus Metrics Not Available

1. Verify `/metrics` endpoint is accessible
2. Check Prometheus scrape configuration
3. Review Prometheus targets page for errors

### Key Vault Access Denied

1. Verify Managed Identity is enabled on the service
2. Check Key Vault access policies include the managed identity
3. Ensure secret names match (case-sensitive)
4. Review Azure AD logs for authentication failures

## Security Considerations

- **Secrets**: Never log secrets or sensitive data
- **Metrics**: Avoid including PII in metric labels
- **Access**: Restrict `/metrics` endpoint in production (use network policies)
- **Key Vault**: Use Managed Identity, never connection strings with passwords
