# Azure Infrastructure Deployment Guide

This guide walks you through deploying the Amicis solution accelerator infrastructure to Azure.

## Prerequisites

Before deploying, ensure you have:

1. **Azure CLI** installed and configured
   ```powershell
   az --version
   ```

2. **Terraform** installed (>= 1.5.0)
   ```powershell
   terraform --version
   ```

3. **Azure Subscription** with appropriate permissions
   - Contributor or Owner role on the subscription
   - Ability to create service principals

4. **Docker** installed for building and pushing container images
   ```powershell
   docker --version
   ```

## Step 1: Azure Login

Login to your Azure account:

```powershell
az login
```

Set your subscription (if you have multiple):

```powershell
# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show
```

## Step 2: Create Terraform State Storage

Run the provided script to create Azure Storage for Terraform remote state:

```powershell
cd scripts
.\setup-terraform-state.ps1
```

This creates:
- Resource Group: `rg-amicis-terraform-state`
- Storage Account: `stamicistfstate` (or custom name if it exists)
- Container: `tfstate`

**Note:** The storage account name must be globally unique. If `stamicistfstate` is taken, update `infra/live/ikea-pilot/dev/backend.tf` with your unique name.

## Step 3: Initialize Terraform

Navigate to the dev environment directory:

```powershell
cd ..\infra\live\ikea-pilot\dev
```

Initialize Terraform (downloads providers and configures backend):

```powershell
terraform init
```

Expected output:
```
Initializing the backend...
Successfully configured the backend "azurerm"!
Initializing provider plugins...
Terraform has been successfully initialized!
```

## Step 4: Review Infrastructure Plan

Create an execution plan to see what will be created:

```powershell
terraform plan -out=tfplan
```

This creates:
- **Resource Group**: `rg-amicis-ikea-dev`
- **Virtual Network**: `vnet-amicis-ikea-dev` (10.0.0.0/16)
- **Subnets**: Default, AKS, Redis
- **Key Vault**: `kv-amicis-ikea-dev`
- **Container Registry**: `acramicisikeadev`
- **Cosmos DB**: `cosmos-amicis-ikea-dev` (MongoDB API, free tier)
- **Redis Cache**: `redis-amicis-ikea-dev` (Basic C0)
- **AKS Cluster**: `aks-amicis-ikea-dev` (2 nodes, Standard_DS2_v2)
- **Log Analytics**: `log-amicis-ikea-dev`

Review the plan carefully to understand costs and resources.

## Step 5: Apply Infrastructure

Apply the Terraform plan to create resources:

```powershell
terraform apply tfplan
```

**Deployment time:** 15-20 minutes (AKS cluster takes the longest)

Type `yes` when prompted to confirm.

## Step 6: Retrieve Outputs

After successful deployment, get the output values:

```powershell
terraform output
```

Key outputs you'll need:
- `acr_login_server`: Container registry URL
- `aks_cluster_name`: Kubernetes cluster name
- `cosmos_connection_strings`: Database connection strings
- `redis_connection_string`: Redis connection string
- `key_vault_name`: Key Vault name

Save these values - you'll need them for configuration.

## Step 7: Configure kubectl

Get AKS credentials to configure kubectl:

```powershell
az aks get-credentials `
  --resource-group rg-amicis-ikea-dev `
  --name aks-amicis-ikea-dev `
  --overwrite-existing
```

Verify connectivity:

```powershell
kubectl get nodes
```

You should see 2 nodes in Ready state.

## Step 8: Store Secrets in Key Vault

Store sensitive configuration in Azure Key Vault:

```powershell
# Get Key Vault name
$kvName = terraform output -raw key_vault_name

# Store JWT secret
az keyvault secret set `
  --vault-name $kvName `
  --name "jwt-secret" `
  --value "CHANGE-THIS-TO-SECURE-RANDOM-VALUE"

# Store Cosmos DB connection string
$cosmosConnString = terraform output -raw cosmos_primary_connection_string
az keyvault secret set `
  --vault-name $kvName `
  --name "cosmos-connection-string" `
  --value $cosmosConnString

# Store Redis connection string
$redisConnString = terraform output -raw redis_connection_string
az keyvault secret set `
  --vault-name $kvName `
  --name "redis-connection-string" `
  --value $redisConnString
```

## Step 9: Create Kubernetes Secrets

Create secrets in AKS from the values stored in Key Vault:

```powershell
# Navigate to k8s directory
cd ..\..\..\..\infra\k8s

# Get connection strings
$cosmosConnString = az keyvault secret show `
  --vault-name $kvName `
  --name "cosmos-connection-string" `
  --query "value" -o tsv

$redisConnString = az keyvault secret show `
  --vault-name $kvName `
  --name "redis-connection-string" `
  --query "value" -o tsv

$jwtSecret = az keyvault secret show `
  --vault-name $kvName `
  --name "jwt-secret" `
  --query "value" -o tsv

# Create Kubernetes secret
kubectl create secret generic amicis-secrets `
  --from-literal=cosmos-connection-string="$cosmosConnString" `
  --from-literal=redis-connection-string="$redisConnString" `
  --from-literal=jwt-secret="$jwtSecret" `
  --namespace=default
```

## Step 10: Build and Push Docker Images

Build and push container images to ACR:

```powershell
# Get ACR login server
$acrName = terraform output -raw acr_login_server

# Login to ACR
az acr login --name $acrName

# Build and push auth service
cd ..\..\backend\node-auth-service
docker build -t "$acrName/auth-service:latest" .
docker push "$acrName/auth-service:latest"

# Build and push routing service
cd ..\go-routing-service
docker build -t "$acrName/routing-service:latest" .
docker push "$acrName/routing-service:latest"
```

## Step 11: Deploy Applications to AKS

Update the Kubernetes deployments with your ACR name:

```powershell
cd ..\..\infra\k8s

# Update deployment files with your ACR name
# (We'll create a script for this)
```

Apply the Kubernetes manifests:

```powershell
# Deploy auth service
kubectl apply -f ..\backend\node-auth-service\k8s\deployment.yaml

# Deploy routing service
kubectl apply -f ..\backend\go-routing-service\k8s\deployment.yaml

# Apply ingress and network policies
kubectl apply -f ingress.yaml
kubectl apply -f network-policy.yaml
```

## Step 12: Verify Deployment

Check pod status:

```powershell
kubectl get pods
kubectl get services
kubectl get ingress
```

View logs:

```powershell
# Auth service logs
kubectl logs -l app=auth-service --tail=50

# Routing service logs
kubectl logs -l app=routing-service --tail=50
```

## Step 13: Test the Deployment

Get the external IP of the ingress:

```powershell
kubectl get ingress amicis-ingress
```

Test the health endpoints:

```powershell
$ingressIP = kubectl get ingress amicis-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Test auth service
Invoke-WebRequest -Uri "http://$ingressIP/health" -Method GET

# Test routing service
Invoke-WebRequest -Uri "http://$ingressIP/api/v1/health" -Method GET
```

## Troubleshooting

### Terraform State Lock

If Terraform state is locked:

```powershell
terraform force-unlock LOCK_ID
```

### AKS Node Issues

Check node status:

```powershell
kubectl describe nodes
kubectl get events --sort-by='.lastTimestamp'
```

### Container Image Pull Errors

Ensure AKS has permission to pull from ACR:

```powershell
az aks update `
  --name aks-amicis-ikea-dev `
  --resource-group rg-amicis-ikea-dev `
  --attach-acr acramicisikeadev
```

### DNS Resolution Issues

Check CoreDNS pods:

```powershell
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

## Cost Optimization

**Current configuration costs (approximate monthly):**

- AKS: $140-180 (2x Standard_DS2_v2 nodes)
- Cosmos DB: FREE (free tier, 1000 RU/s)
- Redis: $15-20 (Basic C0)
- Storage: $1-5
- **Total: ~$160-210/month**

**To reduce costs:**

1. **Scale down AKS** when not in use:
   ```powershell
   az aks scale --node-count 0 --resource-group rg-amicis-ikea-dev --name aks-amicis-ikea-dev
   ```

2. **Delete non-production environments**:
   ```powershell
   terraform destroy
   ```

3. **Use spot instances** for development (edit AKS module)

## Next Steps

1. ✅ Infrastructure deployed
2. 🔄 Configure monitoring and alerts
3. 🔄 Set up CI/CD pipelines
4. 🔄 Configure custom domain and SSL
5. 🔄 Run load tests
6. 🔄 Set up disaster recovery

## Clean Up

To destroy all resources:

```powershell
cd infra\live\ikea-pilot\dev
terraform destroy
```

**Warning:** This will delete all data. Ensure you have backups!

## Support

For issues:
1. Check Terraform output: `terraform output`
2. View Azure Portal for resource status
3. Check kubectl logs: `kubectl logs -l app=SERVICE_NAME`
4. Review Application Insights for errors
