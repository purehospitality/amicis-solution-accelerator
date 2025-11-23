# Prerequisites Installation Guide

Before deploying to Azure, you need to install the required tools.

## Required Tools

1. **Azure CLI** - To interact with Azure
2. **Terraform** - To provision infrastructure
3. **kubectl** - To manage Kubernetes cluster
4. **Docker** - Already installed ✓

## Installation Steps

### 1. Install Azure CLI

**Option A: Using WinGet (Recommended)**
```powershell
winget install -e --id Microsoft.AzureCLI
```

**Option B: Using MSI Installer**
1. Download from: https://aka.ms/installazurecliwindows
2. Run the installer
3. Restart your terminal

**Verify Installation:**
```powershell
az --version
```

### 2. Install Terraform

**Option A: Using Chocolatey**
```powershell
choco install terraform
```

**Option B: Manual Installation**
1. Download from: https://www.terraform.io/downloads
2. Extract the executable to a folder (e.g., `C:\terraform`)
3. Add to PATH:
   ```powershell
   $env:Path += ";C:\terraform"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, "Machine")
   ```

**Verify Installation:**
```powershell
terraform --version
```

### 3. Install kubectl

**Automatically with Azure CLI:**
```powershell
az aks install-cli
```

**Or using Chocolatey:**
```powershell
choco install kubernetes-cli
```

**Verify Installation:**
```powershell
kubectl version --client
```

## Post-Installation Setup

After installing the tools:

### 1. Login to Azure
```powershell
az login
```

This will open a browser for authentication.

### 2. Set Your Subscription
```powershell
# List available subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_NAME_OR_ID"

# Verify
az account show
```

### 3. Check Your Permissions

You need at least **Contributor** role on the subscription:

```powershell
az role assignment list --assignee YOUR_EMAIL --output table
```

## Next Steps

Once all tools are installed:

1. Follow `docs/AZURE_DEPLOYMENT.md` for infrastructure deployment
2. Or use `scripts/deploy.ps1` for automated deployment

## Quick Test

Run this command to verify everything is set up:

```powershell
# Test Azure connection
az account show

# Test Terraform
terraform version

# Test kubectl
kubectl version --client

# Test Docker
docker version
```

If all commands succeed, you're ready to deploy!
