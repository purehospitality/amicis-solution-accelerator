# Foundation Module

This Terraform module provisions the foundational Azure resources for the Amicis Solution Accelerator platform.

## Resources Created

- **Azure Resource Group**: Container for all regional resources
- **Virtual Network (VNet)**: Network isolation with configurable address space
- **Subnet**: Default subnet for service deployments
- **Azure Key Vault**: Secure storage for secrets, keys, and certificates

## Features

- **Consistent Naming**: All resources follow the pattern `<resource-type>-<project>-<tenant>-<environment>-<location>`
- **Multi-Tenant Support**: Optional tenant identifier for isolated deployments
- **Network Security**: Key Vault access restricted to VNet subnet by default
- **RBAC Authorization**: Role-based access control for Key Vault
- **Environment Awareness**: Production environments have enhanced security (purge protection)
- **Tagging**: Automatic tagging for resource management and cost allocation

## Usage

```hcl
module "foundation" {
  source = "../../modules/foundation"

  project_name = "amicis"
  environment  = "dev"
  location     = "eastus"
  tenant_id    = "ikea"

  vnet_address_space       = ["10.0.0.0/16"]
  subnet_address_prefixes  = ["10.0.1.0/24"]

  tags = {
    CostCenter = "Engineering"
    Owner      = "Platform Team"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| project_name | The name of the project | `string` | n/a | yes |
| environment | Environment name (dev, staging, prod) | `string` | n/a | yes |
| location | Azure region for resources | `string` | `"eastus"` | no |
| tenant_id | Tenant identifier for multi-tenant deployments | `string` | `""` | no |
| vnet_address_space | Address space for VNet | `list(string)` | `["10.0.0.0/16"]` | no |
| subnet_address_prefixes | Address prefixes for subnet | `list(string)` | `["10.0.1.0/24"]` | no |
| enable_key_vault_soft_delete | Enable soft delete for Key Vault | `bool` | `true` | no |
| key_vault_sku | SKU for Key Vault (standard or premium) | `string` | `"standard"` | no |
| tags | Common tags for all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| resource_group_name | Name of the resource group |
| resource_group_id | ID of the resource group |
| vnet_id | ID of the virtual network |
| subnet_id | ID of the default subnet |
| key_vault_name | Name of the Key Vault |
| key_vault_id | ID of the Key Vault |
| key_vault_uri | URI of the Key Vault |
| name_prefix | Naming prefix used for resources |

## Security Considerations

- Key Vault has network ACLs enabled (deny all by default, allow from VNet)
- RBAC authorization is enabled for fine-grained access control
- Soft delete is enabled by default (7-day retention)
- Purge protection is automatically enabled for production environments
- Terraform service principal receives full access for infrastructure management

## Resource Naming Examples

**Without tenant_id:**
- Resource Group: `rg-amicis-dev-eastus`
- VNet: `vnet-amicis-dev`
- Key Vault: `kv-amicis-dev-a1b2c3` (with hash suffix for uniqueness)

**With tenant_id:**
- Resource Group: `rg-amicis-ikea-dev-eastus`
- VNet: `vnet-amicis-ikea-dev`
- Key Vault: `kv-amicis-ikea-dev-d4e5f6`

## Next Steps

After deploying this foundation module:

1. Add additional subnets for AKS, Redis, etc.
2. Deploy Cosmos DB module
3. Deploy Redis Cache module
4. Deploy AKS cluster module
5. Configure API Management gateway
