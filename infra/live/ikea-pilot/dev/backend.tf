terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Backend configuration for remote state storage
  # Run scripts/setup-terraform-state.ps1 first to create the storage account
  # Then uncomment this block and run 'terraform init' to migrate state
  backend "azurerm" {
    resource_group_name  = "rg-amicis-terraform-state"
    storage_account_name = "stamicistfstate"  # Must be globally unique - update if needed
    container_name       = "tfstate"
    key                  = "ikea-pilot/dev/terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}
