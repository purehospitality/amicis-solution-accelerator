# Deployment Scripts

Automation scripts for deploying and managing the Amicis Solution Accelerator.

## Scripts

### deploy.ps1

Complete deployment automation for the entire infrastructure and services.

#### Prerequisites

- Azure CLI (`az`)
- Terraform (`terraform`)
- kubectl (`kubectl`)
- Docker Desktop
- PowerShell 7+

#### Usage

```powershell
# Full deployment
.\scripts\deploy.ps1

# Deploy specific tenant/environment
.\scripts\deploy.ps1 -Environment "prod" -TenantId "ikea"

# Skip infrastructure (already deployed)
.\scripts\deploy.ps1 -SkipInfrastructure

# Skip Docker build (images already pushed)
.\scripts\deploy.ps1 -SkipBuild

# Only deploy infrastructure (no services)
.\scripts\deploy.ps1 -SkipBuild -SkipDeploy
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Environment` | string | `dev` | Target environment (dev/staging/prod) |
| `TenantId` | string | `ikea` | Tenant identifier |
| `SkipInfrastructure` | switch | false | Skip Terraform deployment |
| `SkipBuild` | switch | false | Skip Docker build/push |
| `SkipDeploy` | switch | false | Skip Kubernetes deployment |

#### What It Does

1. **Prerequisites Check**
   - Verifies all required tools are installed
   - Checks Azure authentication

2. **Infrastructure Deployment**
   - Initializes Terraform
   - Plans infrastructure changes
   - Applies changes after confirmation
   - Retrieves outputs

3. **Docker Build & Push**
   - Logs into Azure Container Registry
   - Builds Go routing service image
   - Builds Node auth service image
   - Pushes both images to ACR

4. **Kubernetes Deployment**
   - Configures kubectl with AKS credentials
   - Creates `amicis` namespace
   - Creates Kubernetes secrets (Cosmos, Redis)
   - Deploys both services
   - Waits for rollout completion

5. **Post-Deployment**
   - Displays resource information
   - Shows next steps for ingress setup
   - Provides helpful commands

#### Example Output

```
================================================
  Amicis Solution Accelerator Deployment
  Environment: dev
  Tenant: ikea
================================================

Checking prerequisites...
✓ All prerequisites found

Checking Azure authentication...
✓ Logged in as: user@example.com
  Subscription: My Subscription

================================================
  Deploying Infrastructure with Terraform
================================================

Running terraform init...
...
✓ Infrastructure deployed successfully

================================================
  Building and Pushing Docker Images
================================================

Building Go routing service...
✓ Go service image pushed

Building Node auth service...
✓ Node service image pushed

================================================
  Deploying to Kubernetes
================================================

Getting AKS credentials...
✓ Credentials configured
...
✓ All deployments ready

================================================
  Deployment Complete!
================================================

Resource Group: rg-amicis-ikea-dev
ACR: acramicisikeadev.azurecr.io
AKS Cluster: aks-amicis-ikea-dev
```

## Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. Deploy Infrastructure

```powershell
cd infra\live\ikea-pilot\dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 2. Build Docker Images

```powershell
# Get ACR name
$acrName = terraform output -raw acr_name

# Login
az acr login --name $acrName

# Build and push Go service
cd ..\..\..\backend\go-routing-service
docker build -t "$acrName.azurecr.io/go-routing-service:latest" .
docker push "$acrName.azurecr.io/go-routing-service:latest"

# Build and push Node service
cd ..\node-auth-service
docker build -t "$acrName.azurecr.io/node-auth-service:latest" .
docker push "$acrName.azurecr.io/node-auth-service:latest"
```

### 3. Deploy to Kubernetes

```powershell
# Get AKS credentials
$aksName = terraform output -raw aks_cluster_name
$rgName = terraform output -raw resource_group_name
az aks get-credentials --resource-group $rgName --name $aksName

# Create namespace
kubectl create namespace amicis

# Create secrets
$cosmosEndpoint = terraform output -raw cosmos_endpoint
$redisKey = terraform output -raw redis_primary_key
kubectl create secret generic cosmos-connection --from-literal=endpoint="$cosmosEndpoint" -n amicis
kubectl create secret generic redis-connection --from-literal=password="$redisKey" -n amicis

# Deploy services
kubectl apply -f backend\go-routing-service\k8s\deployment.yaml
kubectl apply -f backend\node-auth-service\k8s\deployment.yaml

# Wait for deployments
kubectl rollout status deployment/go-routing-service -n amicis
kubectl rollout status deployment/node-auth-service -n amicis
```

## Troubleshooting

### Authentication Issues

```powershell
# Re-login to Azure
az login

# Verify subscription
az account show

# Re-login to ACR
az acr login --name <acr-name>
```

### Terraform Issues

```powershell
# Clean state
terraform destroy
rm -rf .terraform .terraform.lock.hcl

# Re-initialize
terraform init
```

### Kubernetes Issues

```powershell
# Check pod status
kubectl get pods -n amicis

# View logs
kubectl logs -f -n amicis -l app=go-routing-service
kubectl logs -f -n amicis -l app=node-auth-service

# Describe pod for events
kubectl describe pod <pod-name> -n amicis

# Delete and redeploy
kubectl delete deployment go-routing-service -n amicis
kubectl delete deployment node-auth-service -n amicis
kubectl apply -f backend\go-routing-service\k8s\deployment.yaml
kubectl apply -f backend\node-auth-service\k8s\deployment.yaml
```

### Docker Issues

```powershell
# Check Docker is running
docker ps

# Clean up images
docker image prune -a

# Rebuild without cache
docker build --no-cache -t <image-name> .
```

## Clean Up

To delete all resources:

```powershell
# Delete Kubernetes resources
kubectl delete namespace amicis

# Destroy infrastructure
cd infra\live\ikea-pilot\dev
terraform destroy
```

## Additional Tools

### seed-mongodb.js

Seeds MongoDB with initial tenant data for local development:

```bash
npm run seed
```

See `scripts/seed-mongodb.js` for details.
