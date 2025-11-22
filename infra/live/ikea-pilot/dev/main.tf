module "foundation" {
  source = "../../../modules/foundation"

  project_name = var.project_name
  environment  = var.environment
  location     = var.location
  tenant_id    = var.tenant_id

  vnet_address_space      = var.vnet_address_space
  subnet_address_prefixes = var.subnet_address_prefixes

  enable_key_vault_soft_delete = var.enable_key_vault_soft_delete
  key_vault_sku                = var.key_vault_sku

  tags = var.tags
}
