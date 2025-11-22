# Amicis Solution Accelerator - Complete Deployment Script
# This script deploys the entire infrastructure and services to Azure

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$TenantId = "ikea",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Amicis Solution Accelerator Deployment" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Cyan
Write-Host "  Tenant: $TenantId" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$InfraDir = Join-Path $RootDir "infra\live\$TenantId-pilot\$Environment"
$BackendDir = Join-Path $RootDir "backend"

#region Prerequisites Check
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Azure CLI
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Azure CLI not found. Install from https://aka.ms/installazurecli" -ForegroundColor Red
    exit 1
}

# Check kubectl
if (!(Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: kubectl not found. Install from https://kubernetes.io/docs/tasks/tools/" -ForegroundColor Red
    exit 1
}

# Check Terraform
if (!(Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Terraform not found. Install from https://www.terraform.io/downloads" -ForegroundColor Red
    exit 1
}

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker not found. Install Docker Desktop" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All prerequisites found" -ForegroundColor Green
Write-Host ""
#endregion

#region Azure Authentication
Write-Host "Checking Azure authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "  Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""
#endregion

#region Terraform Deployment
if (!$SkipInfrastructure) {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Deploying Infrastructure with Terraform" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    Set-Location $InfraDir

    Write-Host "Running terraform init..." -ForegroundColor Yellow
    terraform init

    Write-Host ""
    Write-Host "Running terraform plan..." -ForegroundColor Yellow
    terraform plan -out=tfplan

    Write-Host ""
    $confirm = Read-Host "Apply this Terraform plan? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Deployment cancelled by user" -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    Write-Host "Running terraform apply..." -ForegroundColor Yellow
    terraform apply tfplan

    Write-Host "✓ Infrastructure deployed successfully" -ForegroundColor Green
    Write-Host ""

    # Get outputs
    Write-Host "Retrieving infrastructure outputs..." -ForegroundColor Yellow
    $outputs = terraform output -json | ConvertFrom-Json
    
    $acrName = $outputs.acr_name.value
    $aksName = $outputs.aks_cluster_name.value
    $resourceGroup = $outputs.resource_group_name.value
    $cosmosEndpoint = $outputs.cosmos_endpoint.value
    $redisHostname = $outputs.redis_hostname.value
    $redisPort = $outputs.redis_port.value
    
    Write-Host "✓ Outputs retrieved" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping infrastructure deployment..." -ForegroundColor Yellow
    # Need to get outputs for build/deploy
    Set-Location $InfraDir
    $outputs = terraform output -json | ConvertFrom-Json
    $acrName = $outputs.acr_name.value
    $aksName = $outputs.aks_cluster_name.value
    $resourceGroup = $outputs.resource_group_name.value
}
#endregion

#region Docker Build and Push
if (!$SkipBuild) {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Building and Pushing Docker Images" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    # Login to ACR
    Write-Host "Logging into ACR: $acrName..." -ForegroundColor Yellow
    az acr login --name $acrName

    # Build and push Go service
    Write-Host ""
    Write-Host "Building Go routing service..." -ForegroundColor Yellow
    Set-Location (Join-Path $BackendDir "go-routing-service")
    docker build -t "$acrName.azurecr.io/go-routing-service:latest" .
    docker push "$acrName.azurecr.io/go-routing-service:latest"
    Write-Host "✓ Go service image pushed" -ForegroundColor Green

    # Build and push Node service
    Write-Host ""
    Write-Host "Building Node auth service..." -ForegroundColor Yellow
    Set-Location (Join-Path $BackendDir "node-auth-service")
    docker build -t "$acrName.azurecr.io/node-auth-service:latest" .
    docker push "$acrName.azurecr.io/node-auth-service:latest"
    Write-Host "✓ Node service image pushed" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Docker build..." -ForegroundColor Yellow
}
#endregion

#region Kubernetes Deployment
if (!$SkipDeploy) {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Deploying to Kubernetes" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    # Get AKS credentials
    Write-Host "Getting AKS credentials..." -ForegroundColor Yellow
    az aks get-credentials --resource-group $resourceGroup --name $aksName --overwrite-existing
    Write-Host "✓ Credentials configured" -ForegroundColor Green

    # Create namespace
    Write-Host ""
    Write-Host "Creating namespace..." -ForegroundColor Yellow
    kubectl create namespace amicis --dry-run=client -o yaml | kubectl apply -f -

    # Get Redis key
    Write-Host ""
    Write-Host "Retrieving Redis key..." -ForegroundColor Yellow
    Set-Location $InfraDir
    $redisKey = (terraform output -raw redis_primary_key)

    # Create secrets
    Write-Host "Creating Kubernetes secrets..." -ForegroundColor Yellow
    kubectl create secret generic cosmos-connection `
        --from-literal=endpoint="$cosmosEndpoint" `
        --namespace=amicis `
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl create secret generic redis-connection `
        --from-literal=password="$redisKey" `
        --namespace=amicis `
        --dry-run=client -o yaml | kubectl apply -f -
    
    Write-Host "✓ Secrets created" -ForegroundColor Green

    # Update deployment manifests with ACR name
    Write-Host ""
    Write-Host "Deploying services..." -ForegroundColor Yellow
    
    # Deploy Go service
    Set-Location (Join-Path $BackendDir "go-routing-service\k8s")
    (Get-Content deployment.yaml -Raw) -replace 'acramicisikeadev', $acrName | kubectl apply -f -
    
    # Deploy Node service
    Set-Location (Join-Path $BackendDir "node-auth-service\k8s")
    (Get-Content deployment.yaml -Raw) -replace 'acramicisikeadev', $acrName | kubectl apply -f -

    Write-Host "✓ Services deployed" -ForegroundColor Green

    # Wait for deployments
    Write-Host ""
    Write-Host "Waiting for deployments to be ready..." -ForegroundColor Yellow
    kubectl rollout status deployment/go-routing-service -n amicis --timeout=5m
    kubectl rollout status deployment/node-auth-service -n amicis --timeout=5m

    Write-Host "✓ All deployments ready" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Skipping Kubernetes deployment..." -ForegroundColor Yellow
}
#endregion

#region Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resource Group: $resourceGroup" -ForegroundColor Cyan
Write-Host "ACR: $acrName.azurecr.io" -ForegroundColor Cyan
Write-Host "AKS Cluster: $aksName" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Deploy ingress controller:" -ForegroundColor White
Write-Host "   helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy ingress:" -ForegroundColor White
Write-Host "   kubectl apply -f $RootDir\infra\k8s\ingress.yaml" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check pod status:" -ForegroundColor White
Write-Host "   kubectl get pods -n amicis" -ForegroundColor Gray
Write-Host ""
Write-Host "4. View logs:" -ForegroundColor White
Write-Host "   kubectl logs -f -n amicis -l app=go-routing-service" -ForegroundColor Gray
Write-Host "   kubectl logs -f -n amicis -l app=node-auth-service" -ForegroundColor Gray
Write-Host ""
#endregion
