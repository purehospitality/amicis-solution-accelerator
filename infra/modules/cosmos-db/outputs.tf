output "cosmos_account_id" {
  description = "The ID of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.id
}

output "cosmos_account_name" {
  description = "The name of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.name
}

output "cosmos_endpoint" {
  description = "The endpoint used to connect to the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmos_primary_key" {
  description = "The primary key for the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "cosmos_connection_strings" {
  description = "Connection strings for the Cosmos DB account"
  value       = azurerm_cosmosdb_account.main.connection_strings
  sensitive   = true
}

output "database_names" {
  description = "Names of the created databases"
  value       = [for db in azurerm_cosmosdb_mongo_database.databases : db.name]
}

output "container_names" {
  description = "Names of the created containers"
  value       = [for container in azurerm_cosmosdb_mongo_collection.containers : container.name]
}
