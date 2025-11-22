variable "project_name" {
  description = "The name of the project"
  type        = string
}

variable "environment" {
  description = "The environment name (e.g., 'dev', 'staging', 'prod')"
  type        = string
}

variable "location" {
  description = "The Azure region where resources will be deployed"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "tenant_id" {
  description = "The tenant identifier for multi-tenant deployments"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default     = {}
}

variable "consistency_level" {
  description = "Cosmos DB consistency level"
  type        = string
  default     = "Session"
  validation {
    condition     = contains(["Strong", "BoundedStaleness", "Session", "ConsistentPrefix", "Eventual"], var.consistency_level)
    error_message = "Consistency level must be one of: Strong, BoundedStaleness, Session, ConsistentPrefix, Eventual."
  }
}

variable "max_staleness_prefix" {
  description = "Max staleness prefix for BoundedStaleness consistency"
  type        = number
  default     = 100
}

variable "max_interval_in_seconds" {
  description = "Max interval in seconds for BoundedStaleness consistency"
  type        = number
  default     = 5
}

variable "enable_free_tier" {
  description = "Enable free tier for Cosmos DB (only one per subscription)"
  type        = bool
  default     = false
}

variable "enable_automatic_failover" {
  description = "Enable automatic failover for Cosmos DB"
  type        = bool
  default     = true
}

variable "databases" {
  description = "Map of databases to create with their throughput settings"
  type = map(object({
    throughput = number
    containers = map(object({
      partition_key_path  = string
      throughput          = number
      default_ttl         = number
      indexing_mode       = string
    }))
  }))
  default = {}
}
