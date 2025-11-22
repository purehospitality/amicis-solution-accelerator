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
  
  # ACR names must be globally unique and alphanumeric only
  acr_name = replace("acr${local.name_prefix}", "-", "")
  
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

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = local.acr_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku
  admin_enabled       = var.admin_enabled

  # Premium features
  public_network_access_enabled = var.public_network_access_enabled
  
  dynamic "georeplications" {
    for_each = var.sku == "Premium" ? var.georeplications : []
    content {
      location                = georeplications.value.location
      zone_redundancy_enabled = georeplications.value.zone_redundancy_enabled
    }
  }

  dynamic "network_rule_set" {
    for_each = var.sku == "Premium" && var.network_rule_set != null ? [var.network_rule_set] : []
    content {
      default_action = network_rule_set.value.default_action

      dynamic "ip_rule" {
        for_each = network_rule_set.value.ip_rules
        content {
          action   = "Allow"
          ip_range = ip_rule.value
        }
      }

      dynamic "virtual_network" {
        for_each = network_rule_set.value.subnet_ids
        content {
          action    = "Allow"
          subnet_id = virtual_network.value
        }
      }
    }
  }

  # Content trust and vulnerability scanning
  trust_policy {
    enabled = var.enable_content_trust
  }

  retention_policy {
    days    = var.retention_days
    enabled = var.retention_days > 0
  }

  # Export policy (for compliance)
  export_policy_enabled = var.export_policy_enabled

  tags = local.common_tags
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "acr" {
  count = var.log_analytics_workspace_id != null ? 1 : 0

  name                       = "acr-diagnostics"
  target_resource_id         = azurerm_container_registry.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "ContainerRegistryRepositoryEvents"
  }

  enabled_log {
    category = "ContainerRegistryLoginEvents"
  }

  metric {
    category = "AllMetrics"
  }
}

# Webhook for automated builds (optional)
resource "azurerm_container_registry_webhook" "webhooks" {
  for_each = var.webhooks

  name                = each.key
  registry_name       = azurerm_container_registry.main.name
  resource_group_name = var.resource_group_name
  location            = var.location

  service_uri = each.value.service_uri
  status      = each.value.status
  scope       = each.value.scope
  actions     = each.value.actions

  custom_headers = each.value.custom_headers

  tags = local.common_tags
}
