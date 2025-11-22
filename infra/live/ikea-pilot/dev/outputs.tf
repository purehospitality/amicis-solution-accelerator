# Foundation outputs
output "resource_group_name" {
  description = "The name of the resource group"
  value       = module.foundation.resource_group_name
}

output "vnet_id" {
  description = "The ID of the virtual network"
  value       = module.foundation.vnet_id
}

output "subnet_id" {
  description = "The ID of the default subnet"
  value       = module.foundation.subnet_id
}

output "key_vault_name" {
  description = "The name of the Key Vault"
  value       = module.foundation.key_vault_name
}

output "key_vault_uri" {
  description = "The URI of the Key Vault"
  value       = module.foundation.key_vault_uri
}

# ACR outputs
output "acr_name" {
  description = "Azure Container Registry name"
  value       = module.acr.registry_name
}

output "acr_login_server" {
  description = "ACR login server URL"
  value       = module.acr.login_server
}

# Cosmos DB outputs
output "cosmos_endpoint" {
  description = "Cosmos DB endpoint"
  value       = module.cosmos_db.endpoint
}

output "cosmos_database_name" {
  description = "Cosmos DB database name"
  value       = "amicis"
}

# Redis outputs
output "redis_hostname" {
  description = "Redis hostname"
  value       = module.redis_cache.hostname
}

output "redis_port" {
  description = "Redis SSL port"
  value       = module.redis_cache.ssl_port
}

output "redis_primary_key" {
  description = "Redis primary access key"
  value       = module.redis_cache.primary_access_key
  sensitive   = true
}

# AKS outputs
output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = module.aks.cluster_name
}

output "aks_cluster_fqdn" {
  description = "AKS cluster FQDN"
  value       = module.aks.cluster_fqdn
}

output "aks_get_credentials_command" {
  description = "Command to get AKS credentials"
  value       = "az aks get-credentials --resource-group ${module.foundation.resource_group_name} --name ${module.aks.cluster_name}"
}

# Log Analytics
output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.main.id
}

# Deployment info
output "deployment_info" {
  description = "Quick reference for deployment"
  value = {
    acr_login_command = "az acr login --name ${module.acr.registry_name}"
    docker_image_go   = "${module.acr.login_server}/go-routing-service:latest"
    docker_image_node = "${module.acr.login_server}/node-auth-service:latest"
    kubectl_namespace = "amicis"
  }
}
