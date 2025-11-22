# Cosmos DB Module

This Terraform module provisions Azure Cosmos DB with SQL API for the Amicis Solution Accelerator platform.

## Overview

Creates a Cosmos DB account optimized for multi-tenant retail applications with:
- Serverless capacity mode for cost-effective scaling
- Configurable consistency levels
- Support for multiple databases and containers
- Automatic failover capabilities

## Resources Created

- **Azure Cosmos DB Account**: Serverless NoSQL database
- **SQL Databases**: Logical databases for data organization
- **SQL Containers**: Collections with partition keys and indexing policies

## Usage

```hcl
module "cosmos_db" {
  source = "../../modules/cosmos-db"

  project_name        = "amicis"
  environment         = "dev"
  location            = "eastus"
  resource_group_name = module.foundation.resource_group_name
  tenant_id           = "ikea"

  consistency_level = "Session"
  enable_free_tier  = true  # Only for dev/test

  databases = {
    "tenant-config" = {
      throughput = null  # Serverless
      containers = {
        "tenants" = {
          partition_key_path = "/tenantId"
          throughput         = null
          default_ttl        = -1  # No TTL
          indexing_mode      = "consistent"
        }
        "stores" = {
          partition_key_path = "/tenantId"
          throughput         = null
          default_ttl        = -1
          indexing_mode      = "consistent"
        }
      }
    }
  }

  tags = {
    CostCenter = "Engineering"
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
| consistency_level | Consistency level | `string` | `"Session"` | no |
| enable_free_tier | Enable free tier | `bool` | `false` | no |
| enable_automatic_failover | Enable automatic failover | `bool` | `true` | no |
| databases | Database and container definitions | `map(object)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| cosmos_endpoint | Cosmos DB endpoint URL |
| cosmos_primary_key | Primary access key (sensitive) |
| database_names | List of created databases |
| container_names | List of created containers |

## Data Model

### Tenant Configuration Database

**tenants** container (partition key: `/tenantId`):
```json
{
  "id": "ikea",
  "tenantId": "ikea",
  "name": "IKEA Retail",
  "backendType": "dynamics365",
  "authConfig": {
    "tokenEndpoint": "https://ikea-backend.com/oauth/token",
    "clientId": "...",
    "scope": "retail.api"
  },
  "branding": {
    "primaryColor": "#0051BA",
    "logoUrl": "https://..."
  }
}
```

**stores** container (partition key: `/tenantId`):
```json
{
  "id": "store-123",
  "tenantId": "ikea",
  "storeId": "123",
  "name": "IKEA Brooklyn",
  "location": {
    "lat": 40.6789,
    "lon": -73.9654
  },
  "backendUrl": "https://ikea-brooklyn-api.com",
  "backendContext": {
    "channelId": "store-123",
    "storeCode": "BKN001"
  }
}
```

## Performance Considerations

- **Serverless Mode**: Automatically scales, pay-per-request pricing
- **Session Consistency**: Balance between performance and consistency
- **Partition Keys**: Always query with `/tenantId` for optimal performance
- **Indexing**: All paths indexed by default, exclude unnecessary fields

## Security

- Primary keys stored as sensitive outputs
- Network ACLs configured via separate firewall rules
- Consider using managed identities instead of keys in production

## Cost Optimization

- Free tier provides 1000 RU/s and 25 GB storage
- Serverless mode eliminates idle costs
- Set appropriate TTL values for cache data
- Monitor Request Units (RU) consumption

## Next Steps

After deploying Cosmos DB:
1. Configure private endpoints for network security
2. Store connection string in Key Vault
3. Integrate with Go routing service
4. Integrate with NestJS auth service
5. Set up monitoring and alerts
