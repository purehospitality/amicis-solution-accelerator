output "registry_id" {
  description = "Container Registry ID"
  value       = azurerm_container_registry.main.id
}

output "registry_name" {
  description = "Container Registry name"
  value       = azurerm_container_registry.main.name
}

output "login_server" {
  description = "Container Registry login server URL"
  value       = azurerm_container_registry.main.login_server
}

output "admin_username" {
  description = "Admin username (if admin enabled)"
  value       = var.admin_enabled ? azurerm_container_registry.main.admin_username : null
  sensitive   = true
}

output "admin_password" {
  description = "Admin password (if admin enabled)"
  value       = var.admin_enabled ? azurerm_container_registry.main.admin_password : null
  sensitive   = true
}
