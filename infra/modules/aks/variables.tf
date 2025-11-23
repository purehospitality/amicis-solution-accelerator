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

variable "subnet_id" {
  description = "Subnet ID for AKS nodes"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "system_node_pool_config" {
  description = "Configuration for the system node pool"
  type = object({
    node_count          = number
    vm_size             = string
    enable_auto_scaling = bool
    min_count           = number
    max_count           = number
  })
  default = {
    node_count          = 2
    vm_size             = "Standard_D2s_v3"
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 5
  }
}

variable "user_node_pools" {
  description = "Map of user node pools"
  type = map(object({
    vm_size             = string
    node_count          = number
    enable_auto_scaling = bool
    min_count           = number
    max_count           = number
  }))
  default = {}
}

variable "availability_zones" {
  description = "Availability zones for node pools (empty array for no zones)"
  type        = list(string)
  default     = []
}

variable "dns_service_ip" {
  description = "IP address for Kubernetes DNS service"
  type        = string
  default     = "10.2.0.10"
}

variable "service_cidr" {
  description = "CIDR for Kubernetes services"
  type        = string
  default     = "10.2.0.0/16"
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID for monitoring"
  type        = string
}

variable "automatic_channel_upgrade" {
  description = "Auto-upgrade channel (patch, stable, rapid, node-image)"
  type        = string
  default     = "stable"
  validation {
    condition     = contains(["patch", "stable", "rapid", "node-image", "none"], var.automatic_channel_upgrade)
    error_message = "Must be one of: patch, stable, rapid, node-image, none."
  }
}

variable "maintenance_window" {
  description = "Maintenance window configuration"
  type = object({
    day   = string
    hours = list(number)
  })
  default = null
}

variable "acr_id" {
  description = "Azure Container Registry ID for AcrPull role assignment"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional resource tags"
  type        = map(string)
  default     = {}
}
