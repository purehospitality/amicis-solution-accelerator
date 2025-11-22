terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Local variables for consistent naming
locals {
  # Generate resource naming prefix: projectname-env or projectname-tenant-env
  name_prefix = var.tenant_id != "" ? "${var.project_name}-${var.tenant_id}-${var.environment}" : "${var.project_name}-${var.environment}"
  
  # Common tags merged with provided tags
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Tenant      = var.tenant_id != "" ? var.tenant_id : "shared"
    },
    var.tags
  )
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}-${var.location}"
  location = var.location
  tags     = local.common_tags
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-${local.name_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space
  tags                = local.common_tags
}

# Default Subnet
resource "azurerm_subnet" "default" {
  name                 = "snet-${local.name_prefix}-default"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.subnet_address_prefixes
}

# Get current Azure client configuration for Key Vault access
data "azurerm_client_config" "current" {}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.name_prefix}-${substr(md5(azurerm_resource_group.main.id), 0, 6)}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = var.key_vault_sku
  soft_delete_retention_days = var.enable_key_vault_soft_delete ? 7 : null
  purge_protection_enabled   = var.environment == "prod" ? true : false

  # Enable RBAC authorization
  enable_rbac_authorization = true

  # Network ACLs - default to deny all, allow from VNet subnet
  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    
    virtual_network_subnet_ids = [
      azurerm_subnet.default.id
    ]
  }

  tags = local.common_tags
}

# Key Vault Access Policy for current user/service principal (for initial setup)
resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get",
    "List",
    "Set",
    "Delete",
    "Recover",
    "Backup",
    "Restore",
    "Purge"
  ]

  key_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Recover",
    "Backup",
    "Restore",
    "Purge"
  ]

  certificate_permissions = [
    "Get",
    "List",
    "Create",
    "Delete",
    "Recover",
    "Backup",
    "Restore",
    "Purge"
  ]
}
