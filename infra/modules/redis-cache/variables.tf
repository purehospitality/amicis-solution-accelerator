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

variable "sku_name" {
  description = "SKU name for Redis Cache"
  type        = string
  default     = "Basic"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku_name)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "family" {
  description = "SKU family for Redis Cache"
  type        = string
  default     = "C"
  validation {
    condition     = contains(["C", "P"], var.family)
    error_message = "Family must be C (Basic/Standard) or P (Premium)."
  }
}

variable "capacity" {
  description = "Size of the Redis cache"
  type        = number
  default     = 0
  validation {
    condition     = var.capacity >= 0 && var.capacity <= 6
    error_message = "Capacity must be between 0 and 6."
  }
}

variable "enable_non_ssl_port" {
  description = "Enable non-SSL port (6379)"
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "1.2"
  validation {
    condition     = contains(["1.0", "1.1", "1.2"], var.minimum_tls_version)
    error_message = "Minimum TLS version must be 1.0, 1.1, or 1.2."
  }
}

variable "redis_configuration" {
  description = "Redis configuration settings"
  type = object({
    maxmemory_reserved              = number
    maxmemory_delta                 = number
    maxmemory_policy                = string
    notify_keyspace_events          = string
  })
  default = {
    maxmemory_reserved     = 2
    maxmemory_delta        = 2
    maxmemory_policy       = "allkeys-lru"
    notify_keyspace_events = ""
  }
}

variable "subnet_id" {
  description = "Subnet ID for Premium tier (private endpoint)"
  type        = string
  default     = null
}
