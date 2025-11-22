# IKEA Pilot - Development Environment

This directory contains the Terraform configuration for the IKEA pilot tenant's development environment.

## Overview

This deployment creates the foundational Azure infrastructure for the IKEA pilot of the Amicis Solution Accelerator platform in the development environment.

## Resources Deployed

- Resource Group: `rg-amicis-ikea-dev-eastus`
- Virtual Network: `vnet-amicis-ikea-dev`
- Default Subnet: `snet-amicis-ikea-dev-default`
- Key Vault: `kv-amicis-ikea-dev-{hash}`

## Prerequisites

1. **Azure CLI** installed and authenticated
2. **Terraform** >= 1.5.0 installed
3. Azure subscription with appropriate permissions
4. (Optional) Azure Storage Account for remote state

## Quick Start

### 1. Authenticate to Azure

```powershell
az login
az account set --subscription "<subscription-id>"
```

### 2. Initialize Terraform

```powershell
cd infra/live/ikea-pilot/dev
terraform init
```

### 3. Review the Plan

```powershell
terraform plan
```

### 4. Apply the Configuration

```powershell
terraform apply
```

### 5. View Outputs

```powershell
terraform output
```

## Configuration

### Default Values

- **Project**: amicis
- **Tenant**: ikea
- **Environment**: dev
- **Location**: eastus
- **VNet CIDR**: 10.0.0.0/16
- **Subnet CIDR**: 10.0.1.0/24

### Customization

To customize the deployment, you can:

1. **Modify variables.tf** to change default values
2. **Create terraform.tfvars** to override variables without modifying code:

```hcl
location = "westus2"
vnet_address_space = ["10.1.0.0/16"]
subnet_address_prefixes = ["10.1.1.0/24"]

tags = {
  CostCenter = "Retail Innovation"
  Owner      = "IKEA Platform Team"
}
```

3. **Use environment variables**:

```powershell
$env:TF_VAR_location = "westus2"
terraform plan
```

## Remote State Configuration

For team collaboration, configure remote state storage:

### 1. Create Storage Account (one-time setup)

```powershell
# Create resource group for Terraform state
az group create --name rg-amicis-terraform-state --location eastus

# Create storage account
az storage account create `
  --name stamicistfstate `
  --resource-group rg-amicis-terraform-state `
  --location eastus `
  --sku Standard_LRS `
  --encryption-services blob

# Create blob container
az storage container create `
  --name tfstate `
  --account-name stamicistfstate
```

### 2. Uncomment Backend Configuration

Edit `backend.tf` and uncomment the backend block, updating values as needed.

### 3. Reinitialize Terraform

```powershell
terraform init -migrate-state
```

## Outputs

After successful deployment, you can access outputs:

```powershell
# Get resource group name
terraform output resource_group_name

# Get Key Vault URI
terraform output key_vault_uri

# Get all outputs in JSON
terraform output -json
```

## Terraform Commands Reference

```powershell
# Initialize working directory
terraform init

# Validate configuration
terraform validate

# Format Terraform files
terraform fmt -recursive

# Plan changes
terraform plan

# Apply changes
terraform apply

# Apply without confirmation (use with caution)
terraform apply -auto-approve

# Destroy all resources
terraform destroy

# Show current state
terraform show

# List resources in state
terraform state list

# Import existing resource
terraform import <resource_address> <azure_resource_id>
```

## Troubleshooting

### Authentication Issues

```powershell
# Clear Azure CLI cache
az account clear
az login

# Verify subscription
az account show
```

### State Lock Issues

```powershell
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

### Resource Already Exists

If resources already exist, you can import them:

```powershell
terraform import module.foundation.azurerm_resource_group.main /subscriptions/{subscription-id}/resourceGroups/{rg-name}
```

## Next Steps

After deploying the foundation:

1. Deploy Cosmos DB for tenant configuration storage
2. Deploy Azure Cache for Redis for routing data
3. Deploy AKS cluster for microservices
4. Configure API Management gateway
5. Deploy Go routing service to AKS
6. Deploy NestJS auth service to AKS

## Security Notes

- Key Vault has network ACLs enabled (VNet access only)
- Soft delete is enabled with 7-day retention
- All resources are tagged for governance
- RBAC is enabled for Key Vault access control

## Cost Estimation

Approximate monthly costs for dev environment (as of 2025):

- Resource Group: Free
- Virtual Network: Free
- Key Vault (Standard): ~$0.03 per 10,000 operations
- Subnet: Free

**Total**: < $5/month for foundation resources

## Support

For issues or questions, contact the Platform Team.
