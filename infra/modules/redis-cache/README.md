# Redis Cache Module

This Terraform module provisions Azure Cache for Redis for the Amicis Solution Accelerator platform.

## Overview

Creates a Redis cache optimized for:
- High-performance routing data caching
- Session state management
- Token caching for auth services
- Multi-tenant data isolation

## Resources Created

- **Azure Cache for Redis**: In-memory data store
- **Firewall Rules**: Network security configuration (Standard/Premium tiers)

## Usage

### Basic Tier (Development)

```hcl
module "redis_cache" {
  source = "../../modules/redis-cache"

  project_name        = "amicis"
  environment         = "dev"
  location            = "eastus"
  resource_group_name = module.foundation.resource_group_name
  tenant_id           = "ikea"

  sku_name  = "Basic"
  family    = "C"
  capacity  = 0  # 250 MB

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration = {
    maxmemory_reserved     = 2
    maxmemory_delta        = 2
    maxmemory_policy       = "allkeys-lru"
    notify_keyspace_events = ""
  }

  tags = {
    CostCenter = "Engineering"
  }
}
```

### Standard Tier (Staging)

```hcl
module "redis_cache" {
  source = "../../modules/redis-cache"

  project_name        = "amicis"
  environment         = "staging"
  location            = "eastus"
  resource_group_name = module.foundation.resource_group_name

  sku_name  = "Standard"
  family    = "C"
  capacity  = 1  # 1 GB with replication

  tags = {
    CostCenter = "Engineering"
  }
}
```

### Premium Tier (Production)

```hcl
module "redis_cache" {
  source = "../../modules/redis-cache"

  project_name        = "amicis"
  environment         = "prod"
  location            = "eastus"
  resource_group_name = module.foundation.resource_group_name

  sku_name  = "Premium"
  family    = "P"
  capacity  = 1  # 6 GB with clustering support
  subnet_id = module.foundation.subnet_id

  tags = {
    CostCenter = "Production"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Project name | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| location | Azure region | `string` | n/a | yes |
| resource_group_name | Resource group name | `string` | n/a | yes |
| tenant_id | Tenant identifier | `string` | `""` | no |
| sku_name | SKU (Basic, Standard, Premium) | `string` | `"Basic"` | no |
| family | SKU family (C or P) | `string` | `"C"` | no |
| capacity | Cache size (0-6) | `number` | `0` | no |
| enable_non_ssl_port | Enable port 6379 | `bool` | `false` | no |
| minimum_tls_version | Minimum TLS version | `string` | `"1.2"` | no |
| redis_configuration | Redis config object | `object` | see below | no |
| subnet_id | Subnet for Premium tier | `string` | `null` | no |

### Redis Configuration Default

```hcl
{
  maxmemory_reserved     = 2
  maxmemory_delta        = 2
  maxmemory_policy       = "allkeys-lru"
  notify_keyspace_events = ""
}
```

## Outputs

| Name | Description |
|------|-------------|
| redis_hostname | Redis hostname |
| redis_ssl_port | SSL port (6380) |
| redis_primary_access_key | Primary access key (sensitive) |
| redis_primary_connection_string | Primary connection string (sensitive) |

## Capacity Sizing

| Capacity | Basic | Standard | Premium |
|----------|-------|----------|---------|
| 0 | 250 MB | 250 MB | 6 GB |
| 1 | 1 GB | 1 GB | 13 GB |
| 2 | 2.5 GB | 2.5 GB | 26 GB |
| 3 | 6 GB | 6 GB | 53 GB |
| 4 | 13 GB | 13 GB | 120 GB |
| 5 | 26 GB | 26 GB | 120 GB |
| 6 | 53 GB | 53 GB | 120 GB |

## SKU Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Replication | No | Yes | Yes |
| SLA | None | 99.9% | 99.95% |
| Clustering | No | No | Yes |
| Persistence | No | No | Yes |
| VNet Support | No | No | Yes |
| Geo-Replication | No | No | Yes |

## Use Cases

### Routing Data Cache

```python
# Cache store routing configuration
SET store:123:route '{"backendUrl": "...", "backendContext": {...}}'
EXPIRE store:123:route 3600  # 1 hour TTL
```

### Token Cache

```python
# Cache backend access tokens
SET token:user123 '{"accessToken": "...", "expiresIn": 3600}'
EXPIRE token:user123 3600
```

### Session State

```python
# Store user session
HSET session:abc123 userId 456 tenantId ikea storeId 123
EXPIRE session:abc123 1800  # 30 minutes
```

## Performance

- **Basic**: Up to 20,000 operations/second
- **Standard**: Up to 20,000 operations/second (with HA)
- **Premium**: Up to 1,000,000 operations/second (with clustering)

## Security

- SSL/TLS enabled by default (port 6380)
- Non-SSL port disabled by default
- Access keys stored as sensitive outputs
- Firewall rules for network isolation
- VNet integration for Premium tier

## Cost Optimization

- Use Basic tier for dev/test environments
- Standard tier provides replication with minimal cost increase
- Premium tier for production workloads requiring clustering/persistence
- Monitor memory usage and eviction metrics
- Set appropriate maxmemory-policy (allkeys-lru recommended)

## Monitoring

Key metrics to monitor:
- Cache hits vs misses
- Memory usage
- Connected clients
- Operations per second
- Evicted keys

## Next Steps

After deploying Redis:
1. Store connection string in Key Vault
2. Configure firewall rules for AKS subnet
3. Integrate with Go routing service
4. Integrate with NestJS auth service
5. Set up monitoring and alerts
6. Configure backup (Premium tier only)
