# Setup Terraform Remote State Storage
# This script creates the Azure Storage Account for Terraform state management

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-amicis-terraform-state",
    
    [Parameter(Mandatory=$false)]
    [string]$StorageAccountName = "stamicistfstate",
    
    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "tfstate"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Terraform State Storage Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged into Azure
Write-Host "Checking Azure authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "Not logged in. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "  Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Create resource group
Write-Host "Creating resource group: $ResourceGroupName..." -ForegroundColor Yellow
$rg = az group create --name $ResourceGroupName --location $Location | ConvertFrom-Json
if ($rg) {
    Write-Host "✓ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create resource group" -ForegroundColor Red
    exit 1
}

# Create storage account
Write-Host ""
Write-Host "Creating storage account: $StorageAccountName..." -ForegroundColor Yellow
Write-Host "  Note: Storage account names must be globally unique" -ForegroundColor Gray

$sa = az storage account create `
    --name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku Standard_LRS `
    --encryption-services blob `
    --min-tls-version TLS1_2 `
    --allow-blob-public-access false 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Storage account created" -ForegroundColor Green
} else {
    if ($sa -match "already exists") {
        Write-Host "⚠ Storage account already exists" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Failed to create storage account" -ForegroundColor Red
        Write-Host $sa -ForegroundColor Red
        exit 1
    }
}

# Create blob container
Write-Host ""
Write-Host "Creating blob container: $ContainerName..." -ForegroundColor Yellow

$container = az storage container create `
    --name $ContainerName `
    --account-name $StorageAccountName `
    --auth-mode login 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Blob container created" -ForegroundColor Green
} else {
    if ($container -match "already exists") {
        Write-Host "⚠ Container already exists" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Failed to create container" -ForegroundColor Red
        Write-Host $container -ForegroundColor Red
        exit 1
    }
}

# Enable versioning
Write-Host ""
Write-Host "Enabling blob versioning..." -ForegroundColor Yellow
az storage account blob-service-properties update `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --enable-versioning true | Out-Null
Write-Host "✓ Versioning enabled" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Terraform backend configuration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "terraform {" -ForegroundColor Gray
Write-Host "  backend `"azurerm`" {" -ForegroundColor Gray
Write-Host "    resource_group_name  = `"$ResourceGroupName`"" -ForegroundColor Gray
Write-Host "    storage_account_name = `"$StorageAccountName`"" -ForegroundColor Gray
Write-Host "    container_name       = `"$ContainerName`"" -ForegroundColor Gray
Write-Host "    key                  = `"ikea-pilot/dev/terraform.tfstate`"" -ForegroundColor Gray
Write-Host "  }" -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Uncomment the backend block in infra/live/ikea-pilot/dev/backend.tf" -ForegroundColor White
Write-Host "2. Update storage_account_name if you used a different name" -ForegroundColor White
Write-Host "3. Run 'terraform init' to migrate state to Azure Storage" -ForegroundColor White
Write-Host ""
