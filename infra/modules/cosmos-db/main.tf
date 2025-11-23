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

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-${local.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"

  enable_free_tier            = var.enable_free_tier
  enable_automatic_failover   = var.enable_automatic_failover
  public_network_access_enabled = true

  consistency_policy {
    consistency_level       = var.consistency_level
    max_staleness_prefix    = var.consistency_level == "BoundedStaleness" ? var.max_staleness_prefix : null
    max_interval_in_seconds = var.consistency_level == "BoundedStaleness" ? var.max_interval_in_seconds : null
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableMongo"
  }
  
  capabilities {
    name = "EnableServerless"
  }

  tags = local.common_tags
}

# Cosmos DB MongoDB Databases
resource "azurerm_cosmosdb_mongo_database" "databases" {
  for_each = var.databases

  name                = each.key
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = each.value.throughput
}

# Cosmos DB MongoDB Collections
resource "azurerm_cosmosdb_mongo_collection" "containers" {
  for_each = merge([
    for db_name, db in var.databases : {
      for container_name, container in db.containers :
      "${db_name}-${container_name}" => {
        database_name      = db_name
        container_name     = container_name
        partition_key_path = container.partition_key_path
        throughput         = container.throughput
        default_ttl        = container.default_ttl
      }
    }
  ]...)

  name                = each.value.container_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.databases[each.value.database_name].name
  throughput          = each.value.throughput
  default_ttl_seconds = each.value.default_ttl
  
  shard_key = trimprefix(each.value.partition_key_path, "/")
  
  index {
    keys   = ["_id"]
    unique = true
  }
}
