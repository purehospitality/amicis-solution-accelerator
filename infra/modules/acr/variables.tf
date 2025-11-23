variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "tenant_id" {
  description = "Tenant identifier for multi-tenancy"
  type        = string
  default     = ""
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "sku" {
  description = "ACR SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium."
  }
}

variable "admin_enabled" {
  description = "Enable admin user (not recommended for production)"
  type        = bool
  default     = false
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

variable "georeplications" {
  description = "List of geo-replication locations (Premium only)"
  type = list(object({
    location                = string
    zone_redundancy_enabled = bool
  }))
  default = []
}

variable "network_rule_set" {
  description = "Network rule set configuration (Premium only)"
  type = object({
    default_action = string
    ip_rules       = list(string)
    subnet_ids     = list(string)
  })
  default = null
}

variable "enable_content_trust" {
  description = "Enable Docker Content Trust"
  type        = bool
  default     = false
}

variable "retention_days" {
  description = "Days to retain untagged manifests (0 = disabled)"
  type        = number
  default     = 7
}

variable "export_policy_enabled" {
  description = "Enable export policy"
  type        = bool
  default     = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for diagnostics"
  type        = string
  default     = null
}

variable "webhooks" {
  description = "Map of webhooks for registry events"
  type = map(object({
    service_uri    = string
    status         = string
    scope          = string
    actions        = list(string)
    custom_headers = map(string)
  }))
  default = {}
}

variable "enable_defender" {
  description = "Enable Azure Defender for Container Registries (vulnerability scanning)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}
