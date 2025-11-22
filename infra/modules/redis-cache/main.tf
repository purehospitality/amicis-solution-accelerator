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
  name_prefix = var.tenant_id != "" ? "${var.project_name}-${var.tenant_id}-${var.environment}" : "${var.project_name}-${var.environment}"
  
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

# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = "redis-${local.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  
  sku_name            = var.sku_name
  family              = var.family
  capacity            = var.capacity
  
  enable_non_ssl_port = var.enable_non_ssl_port
  minimum_tls_version = var.minimum_tls_version
  
  subnet_id           = var.sku_name == "Premium" ? var.subnet_id : null
  
  redis_configuration {
    maxmemory_reserved              = var.redis_configuration.maxmemory_reserved
    maxmemory_delta                 = var.redis_configuration.maxmemory_delta
    maxmemory_policy                = var.redis_configuration.maxmemory_policy
    notify_keyspace_events          = var.redis_configuration.notify_keyspace_events
  }

  tags = local.common_tags
}

# Redis Firewall Rules (for Standard/Premium tiers)
resource "azurerm_redis_firewall_rule" "allow_azure_services" {
  count = var.sku_name != "Basic" ? 1 : 0

  name                = "AllowAzureServices"
  redis_cache_name    = azurerm_redis_cache.main.name
  resource_group_name = var.resource_group_name
  start_ip            = "0.0.0.0"
  end_ip              = "0.0.0.0"
}
