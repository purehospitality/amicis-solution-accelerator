# Azure Container Registry (ACR) Module

This Terraform module creates an Azure Container Registry for storing and managing Docker container images.

## Features

- **SKU tiers**: Support for Basic, Standard, and Premium SKUs
- **Geo-replication**: Multi-region replication (Premium only)
- **Network security**: Private endpoints and firewall rules (Premium)
- **Content trust**: Docker Content Trust for image signing
- **Retention policies**: Automatic cleanup of untagged images
- **Monitoring**: Integrated diagnostics and logging
- **Webhooks**: Event-driven integrations
- **Vulnerability scanning**: Azure Defender integration

## Usage

### Basic Configuration

```hcl
module "acr" {
  source = "../../modules/acr"

  project_name        = "amicis"
  environment         = "dev"
  tenant_id           = "ikea"
  location            = "westeurope"
  resource_group_name = module.foundation.resource_group_name

  sku = "Standard"

  tags = {
    Owner = "Platform Team"
  }
}
```

### Premium with Geo-Replication

```hcl
module "acr" {
  source = "../../modules/acr"

  project_name        = "amicis"
  environment         = "prod"
  location            = "westeurope"
  resource_group_name = module.foundation.resource_group_name

  sku                   = "Premium"
  enable_content_trust  = true
  retention_days        = 30

  georeplications = [
    {
      location                = "eastus"
      zone_redundancy_enabled = true
    },
    {
      location                = "southeastasia"
      zone_redundancy_enabled = true
    }
  ]

  network_rule_set = {
    default_action = "Deny"
    ip_rules       = ["203.0.113.0/24"]  # Your office IP
    subnet_ids     = [module.foundation.default_subnet_id]
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}
```

### With CI/CD Webhooks

```hcl
module "acr" {
  source = "../../modules/acr"

  project_name        = "amicis"
  environment         = "dev"
  location            = "westeurope"
  resource_group_name = module.foundation.resource_group_name

  webhooks = {
    ci_trigger = {
      service_uri    = "https://ci.example.com/webhook"
      status         = "enabled"
      scope          = "amicis/*:latest"
      actions        = ["push"]
      custom_headers = {
        "X-Custom-Header" = "AzureACR"
      }
    }
  }
}
```

## SKU Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Storage | 10 GB | 100 GB | 500 GB |
| Throughput | Low | Medium | High |
| Geo-replication | ❌ | ❌ | ✅ |
| Private Link | ❌ | ❌ | ✅ |
| Customer-managed keys | ❌ | ❌ | ✅ |
| Availability zones | ❌ | ❌ | ✅ |
| Content Trust | ❌ | ✅ | ✅ |
| Webhooks | 2 | 10 | 500 |

## Security Best Practices

1. **Disable admin user**: Use Azure AD authentication instead
2. **Network isolation**: Use private endpoints (Premium)
3. **Content trust**: Enable for production registries
4. **RBAC**: Assign specific roles (AcrPull, AcrPush)
5. **Vulnerability scanning**: Enable Azure Defender for Containers
6. **Retention policies**: Clean up old images automatically

## Image Management

### Push Images

```bash
# Login to ACR
az acr login --name <acr-name>

# Tag image
docker tag myapp:latest <acr-name>.azurecr.io/myapp:latest

# Push image
docker push <acr-name>.azurecr.io/myapp:latest
```

### Pull Images from AKS

The AKS module automatically configures AcrPull permissions:
```hcl
module "aks" {
  source = "../../modules/aks"
  # ... other config ...
  acr_id = module.acr.registry_id
}
```

## Webhooks

Webhooks trigger on registry events:
- `push`: Image pushed to registry
- `delete`: Image deleted from registry
- `chart_push`: Helm chart pushed
- `chart_delete`: Helm chart deleted

## Monitoring

When connected to Log Analytics:
- **Repository events**: Image push/pull/delete
- **Login events**: Authentication attempts
- **Metrics**: Storage usage, request count, latency

## Geo-Replication

Premium SKU supports multi-region replication:
- Improves pull performance globally
- Automatic image synchronization
- Zone redundancy for high availability
- Regional failover capability

## Retention Policy

Automatically clean up untagged images:
```hcl
retention_days = 30  # Keep untagged images for 30 days
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| azurerm | ~> 3.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | Project name for resource naming | string | - | yes |
| environment | Environment (dev/staging/prod) | string | - | yes |
| location | Azure region | string | - | yes |
| resource_group_name | Resource group name | string | - | yes |
| sku | ACR SKU (Basic/Standard/Premium) | string | "Standard" | no |
| admin_enabled | Enable admin user | bool | false | no |
| georeplications | Geo-replication locations | list(object) | [] | no |
| enable_content_trust | Enable Docker Content Trust | bool | false | no |
| retention_days | Untagged image retention days | number | 7 | no |

## Outputs

| Name | Description |
|------|-------------|
| registry_id | ACR resource ID |
| registry_name | ACR name |
| login_server | ACR login server URL |
| admin_username | Admin username (sensitive) |
| admin_password | Admin password (sensitive) |

## Integration with AKS

The ACR integrates seamlessly with AKS:
1. AKS uses managed identity
2. Automatic AcrPull role assignment
3. Pods can pull images without credentials

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: acramicisikeadev.azurecr.io/myapp:latest
```

## Cost Optimization

- Use Basic SKU for dev/test
- Use Standard SKU for production (single region)
- Use Premium only when geo-replication needed
- Configure retention policies to limit storage
- Delete unused images regularly

## Troubleshooting

**Cannot push images:**
- Check RBAC permissions (need AcrPush role)
- Verify network rules allow your IP
- Ensure `az acr login` was successful

**AKS cannot pull images:**
- Verify AcrPull role assignment exists
- Check ACR network rules allow AKS subnet
- Ensure image name/tag is correct

---

*Module version: 1.0.0*
