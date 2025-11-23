# Foundation: Resource Group, VNet, Key Vault
module "foundation" {
  source = "../../../modules/foundation"

  project_name = var.project_name
  environment  = var.environment
  location     = var.location
  tenant_id    = var.tenant_id

  vnet_address_space      = var.vnet_address_space
  subnet_address_prefixes = var.subnet_address_prefixes

  enable_key_vault_soft_delete = var.enable_key_vault_soft_delete
  key_vault_sku                = var.key_vault_sku

  tags = var.tags
}

# Additional subnets for AKS and Redis
resource "azurerm_subnet" "aks" {
  name                 = "snet-aks-${var.project_name}-${var.tenant_id}-${var.environment}"
  resource_group_name  = module.foundation.resource_group_name
  virtual_network_name = module.foundation.vnet_name
  address_prefixes     = ["10.0.2.0/24"]
}

resource "azurerm_subnet" "redis" {
  name                 = "snet-redis-${var.project_name}-${var.tenant_id}-${var.environment}"
  resource_group_name  = module.foundation.resource_group_name
  virtual_network_name = module.foundation.vnet_name
  address_prefixes     = ["10.0.3.0/24"]
}

# Log Analytics Workspace for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.project_name}-${var.tenant_id}-${var.environment}"
  location            = var.location
  resource_group_name = module.foundation.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Azure Container Registry
module "acr" {
  source = "../../../modules/acr"

  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = var.tenant_id
  location            = var.location
  resource_group_name = module.foundation.resource_group_name

  sku                           = "Standard"
  admin_enabled                 = false
  public_network_access_enabled = true
  retention_days                = 7
  log_analytics_workspace_id    = azurerm_log_analytics_workspace.main.id

  tags = var.tags
}

# Cosmos DB for tenant and store data
module "cosmos_db" {
  source = "../../../modules/cosmos-db"

  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = var.tenant_id
  location            = var.location
  resource_group_name = module.foundation.resource_group_name

  enable_free_tier          = true
  enable_automatic_failover = false
  consistency_level         = "Session"

  databases = {
    amicis = {
      throughput = null  # Serverless
      containers = {
        tenants = {
          partition_key_path = "/tenantId"
          throughput         = null
          default_ttl        = -1
          indexing_mode      = "consistent"
        }
        stores = {
          partition_key_path = "/tenantId"
          throughput         = null
          default_ttl        = -1
          indexing_mode      = "consistent"
        }
      }
    }
  }

  tags = var.tags
}

# Redis Cache for routing data
module "redis_cache" {
  source = "../../../modules/redis-cache"

  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = var.tenant_id
  location            = var.location
  resource_group_name = module.foundation.resource_group_name

  sku_name            = "Basic"
  family              = "C"
  capacity            = 0
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration = {
    maxmemory_reserved     = 2
    maxmemory_delta        = 2
    maxmemory_policy       = "allkeys-lru"
    notify_keyspace_events = ""
  }

  tags = var.tags
}

# Azure Kubernetes Service
module "aks" {
  source = "../../../modules/aks"

  project_name        = var.project_name
  environment         = var.environment
  tenant_id           = var.tenant_id
  location            = var.location
  resource_group_name = module.foundation.resource_group_name
  subnet_id           = azurerm_subnet.aks.id

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  acr_id                     = module.acr.registry_id

  kubernetes_version = "1.31"

  # Scaled up for running multiple services
  system_node_pool_config = {
    node_count          = 2
    vm_size             = "Standard_DS2_v2"  # 2 vCPU, 7 GB RAM - better for production workloads
    enable_auto_scaling = false
    min_count           = 2
    max_count           = 3
  }

  # No user node pools for dev - run everything on system pool
  user_node_pools = {}

  automatic_channel_upgrade = "stable"

  tags = var.tags
}
