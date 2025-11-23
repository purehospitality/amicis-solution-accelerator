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

# Azure Kubernetes Service (AKS) Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${local.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "aks-${local.name_prefix}"
  kubernetes_version  = var.kubernetes_version

  # System node pool (required)
  default_node_pool {
    name                = "system"
    node_count          = var.system_node_pool_config.node_count
    vm_size             = var.system_node_pool_config.vm_size
    enable_auto_scaling = var.system_node_pool_config.enable_auto_scaling
    min_count           = var.system_node_pool_config.enable_auto_scaling ? var.system_node_pool_config.min_count : null
    max_count           = var.system_node_pool_config.enable_auto_scaling ? var.system_node_pool_config.max_count : null
    vnet_subnet_id      = var.subnet_id
    zones               = length(var.availability_zones) > 0 ? var.availability_zones : null
    
    upgrade_settings {
      max_surge = "10%"
    }
    
    tags = local.common_tags
  }

  # Managed identity
  identity {
    type = "SystemAssigned"
  }

  # Network profile
  network_profile {
    network_plugin      = "azure"
    network_policy      = "azure"
    load_balancer_sku   = "standard"
    dns_service_ip      = var.dns_service_ip
    service_cidr        = var.service_cidr
  }

  # Azure AD integration
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  # Monitoring
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Auto-upgrade channel
  automatic_channel_upgrade = var.automatic_channel_upgrade

  # Maintenance window
  dynamic "maintenance_window" {
    for_each = var.maintenance_window != null ? [var.maintenance_window] : []
    content {
      allowed {
        day   = maintenance_window.value.day
        hours = maintenance_window.value.hours
      }
    }
  }

  # Key Vault integration for secrets
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  tags = local.common_tags
}

# User node pool for application workloads
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  for_each = var.user_node_pools

  name                  = each.key
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = each.value.vm_size
  enable_auto_scaling   = each.value.enable_auto_scaling
  node_count            = each.value.node_count
  min_count             = each.value.enable_auto_scaling ? each.value.min_count : null
  max_count             = each.value.enable_auto_scaling ? each.value.max_count : null
  vnet_subnet_id        = var.subnet_id
  zones                 = var.availability_zones
  mode                  = "User"

  upgrade_settings {
    max_surge = "10%"
  }

  tags = local.common_tags
}

# Role assignment for ACR pull (if ACR ID provided)
resource "azurerm_role_assignment" "acr_pull" {
  count = var.acr_id != null ? 1 : 0

  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = var.acr_id
  skip_service_principal_aad_check = true
}
