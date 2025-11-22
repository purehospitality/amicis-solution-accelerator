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
