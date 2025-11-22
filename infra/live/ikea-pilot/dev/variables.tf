variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "amicis"
}

variable "environment" {
  description = "The environment name"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "The Azure region where resources will be deployed"
  type        = string
  default     = "eastus"
}

variable "tenant_id" {
  description = "The tenant identifier for this deployment"
  type        = string
  default     = "ikea"
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_address_prefixes" {
  description = "Address prefixes for the default subnet"
  type        = list(string)
  default     = ["10.0.1.0/24"]
}

variable "enable_key_vault_soft_delete" {
  description = "Enable soft delete for Key Vault"
  type        = bool
  default     = true
}

variable "key_vault_sku" {
  description = "SKU for Azure Key Vault"
  type        = string
  default     = "standard"
}

variable "tags" {
  description = "Common tags to be applied to all resources"
  type        = map(string)
  default = {
    Tenant      = "IKEA"
    CostCenter  = "Engineering"
    Owner       = "Platform Team"
    Project     = "Amicis Solution Accelerator"
    Environment = "Development"
  }
}
