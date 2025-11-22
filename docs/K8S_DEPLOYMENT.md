# Kubernetes Deployment Guide

This guide covers deploying Amicis services to Azure Kubernetes Service (AKS).

## Prerequisites

- Azure CLI installed and authenticated
- kubectl installed
- Terraform applied (AKS cluster and ACR created)
- Docker images built and pushed to ACR

## Architecture

```
┌─────────────────────────────────────────────┐
│              Internet/Mobile Apps           │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────▼────────┐
         │  Azure Ingress  │
         │  Controller     │
         └────────┬────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
┌─────▼──────┐        ┌──────▼──────┐
│  Go Route  │        │  Node Auth  │
│  Service   │        │  Service    │
│  (3 pods)  │        │  (3 pods)   │
└─────┬──────┘        └──────┬──────┘
      │                      │
      └──────────┬───────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
┌─────▼──────┐      ┌──────▼──────┐
│  Cosmos DB │      │  Redis Cache│
└────────────┘      └─────────────┘
```

## Step 1: Get AKS Credentials

```bash
az aks get-credentials \
  --resource-group rg-amicis-ikea-dev-westeurope \
  --name aks-amicis-ikea-dev \
  --overwrite-existing
```

Verify connection:
```bash
kubectl cluster-info
kubectl get nodes
```

## Step 2: Build and Push Docker Images

### Go Routing Service

```bash
cd backend/go-routing-service

# Build image
docker build -t acramicisikeadev.azurecr.io/go-routing-service:v1.0.0 .

# Login to ACR
az acr login --name acramicisikeadev

# Push image
docker push acramicisikeadev.azurecr.io/go-routing-service:v1.0.0
docker tag acramicisikeadev.azurecr.io/go-routing-service:v1.0.0 \
           acramicisikeadev.azurecr.io/go-routing-service:latest
docker push acramicisikeadev.azurecr.io/go-routing-service:latest
```

### Node Auth Service

```bash
cd backend/node-auth-service

# Build image
docker build -t acramicisikeadev.azurecr.io/node-auth-service:v1.0.0 .

# Login to ACR (if not already)
az acr login --name acramicisikeadev

# Push image
docker push acramicisikeadev.azurecr.io/node-auth-service:v1.0.0
docker tag acramicisikeadev.azurecr.io/node-auth-service:v1.0.0 \
           acramicisikeadev.azurecr.io/node-auth-service:latest
docker push acramicisikeadev.azurecr.io/node-auth-service:latest
```

## Step 3: Create Kubernetes Secrets

Get Cosmos DB connection string:
```bash
COSMOS_ENDPOINT=$(az cosmosdb show \
  --resource-group rg-amicis-ikea-dev-westeurope \
  --name cosmos-amicis-ikea-dev \
  --query documentEndpoint -o tsv)
```

Get Redis password:
```bash
REDIS_PASSWORD=$(az redis list-keys \
  --resource-group rg-amicis-ikea-dev-westeurope \
  --name redis-amicis-ikea-dev \
  --query primaryKey -o tsv)
```

Create secrets:
```bash
kubectl create namespace amicis

kubectl create secret generic cosmos-connection \
  --from-literal=endpoint="${COSMOS_ENDPOINT}" \
  --namespace=amicis

kubectl create secret generic redis-connection \
  --from-literal=password="${REDIS_PASSWORD}" \
  --namespace=amicis
```

Verify secrets:
```bash
kubectl get secrets -n amicis
```

## Step 4: Deploy Services

### Deploy Go Routing Service

```bash
kubectl apply -f backend/go-routing-service/k8s/deployment.yaml

# Watch rollout
kubectl rollout status deployment/go-routing-service -n amicis

# Verify pods
kubectl get pods -n amicis -l app=go-routing-service
```

### Deploy Node Auth Service

```bash
kubectl apply -f backend/node-auth-service/k8s/deployment.yaml

# Watch rollout
kubectl rollout status deployment/node-auth-service -n amicis

# Verify pods
kubectl get pods -n amicis -l app=node-auth-service
```

## Step 5: Install NGINX Ingress Controller

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install ingress controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

Wait for external IP:
```bash
kubectl get svc -n ingress-nginx --watch
```

## Step 6: Deploy Ingress

Update `infra/k8s/ingress.yaml` with your domain, then apply:

```bash
kubectl apply -f infra/k8s/ingress.yaml
```

Verify ingress:
```bash
kubectl get ingress -n amicis
kubectl describe ingress amicis-ingress -n amicis
```

## Step 7: Configure DNS

Get ingress external IP:
```bash
INGRESS_IP=$(kubectl get svc ingress-nginx-controller \
  -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Configure DNS: api.amicis.example.com -> $INGRESS_IP"
```

Create A record in your DNS provider:
- **Host**: api.amicis.example.com
- **Type**: A
- **Value**: $INGRESS_IP

## Step 8: Install Cert-Manager (Optional - for HTTPS)

```bash
# Add Helm repo
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0
```

Create ClusterIssuer:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f cert-issuer.yaml
```

## Verification

### Test Services

```bash
# Get services
kubectl get svc -n amicis

# Test Go routing service
kubectl port-forward -n amicis svc/go-routing-service 8080:8080
curl http://localhost:8080/health

# Test Node auth service
kubectl port-forward -n amicis svc/node-auth-service 3000:3000
curl http://localhost:3000/health
```

### Test via Ingress

```bash
# Health checks
curl https://api.amicis.example.com/api/v1/route?storeId=ikea-seattle
curl https://api.amicis.example.com/auth/exchange -X POST \
  -H "Content-Type: application/json" \
  -d '{"userToken":"ikea:test-token"}'
```

### View Logs

```bash
# Go service logs
kubectl logs -f -n amicis -l app=go-routing-service

# Node service logs
kubectl logs -f -n amicis -l app=node-auth-service

# All amicis pods
kubectl logs -f -n amicis --all-containers=true
```

## Monitoring

### Check Pod Status

```bash
kubectl get pods -n amicis -o wide
```

### Check HPA Status

```bash
kubectl get hpa -n amicis
kubectl describe hpa go-routing-service-hpa -n amicis
kubectl describe hpa node-auth-service-hpa -n amicis
```

### View Events

```bash
kubectl get events -n amicis --sort-by='.lastTimestamp'
```

### Resource Usage

```bash
kubectl top pods -n amicis
kubectl top nodes
```

## Scaling

### Manual Scaling

```bash
# Scale Go service
kubectl scale deployment go-routing-service -n amicis --replicas=5

# Scale Node service
kubectl scale deployment node-auth-service -n amicis --replicas=7
```

### Auto-Scaling (HPA already configured)

The HPA will automatically scale based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

Min/Max replicas:
- Go service: 3-10 pods
- Node service: 3-15 pods

## Updating Deployments

### Update Image

```bash
# Update Go service
kubectl set image deployment/go-routing-service \
  routing-service=acramicisikeadev.azurecr.io/go-routing-service:v1.1.0 \
  -n amicis

# Watch rollout
kubectl rollout status deployment/go-routing-service -n amicis
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/go-routing-service -n amicis

# Rollback to previous version
kubectl rollout undo deployment/go-routing-service -n amicis

# Rollback to specific revision
kubectl rollout undo deployment/go-routing-service --to-revision=2 -n amicis
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod <pod-name> -n amicis
kubectl logs <pod-name> -n amicis
```

### Image Pull Errors

```bash
# Verify ACR integration
kubectl describe pod <pod-name> -n amicis | grep -A 5 "Events"

# Check AcrPull role assignment
az role assignment list --assignee <kubelet-identity-object-id>
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n amicis

# Check ingress
kubectl describe ingress amicis-ingress -n amicis

# Test from within cluster
kubectl run test-pod --image=busybox -it --rm -- /bin/sh
wget -O- http://go-routing-service.amicis.svc.cluster.local:8080/health
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci-cd.yaml`) automatically:
1. Builds and tests both services
2. Builds Docker images
3. Pushes to ACR
4. Deploys to AKS

To trigger:
```bash
git push origin main
```

## Cleanup

```bash
# Delete deployments
kubectl delete -f backend/go-routing-service/k8s/deployment.yaml
kubectl delete -f backend/node-auth-service/k8s/deployment.yaml
kubectl delete -f infra/k8s/ingress.yaml

# Delete namespace
kubectl delete namespace amicis

# Uninstall ingress controller
helm uninstall ingress-nginx -n ingress-nginx

# Uninstall cert-manager
helm uninstall cert-manager -n cert-manager
```

## Production Checklist

- [ ] Configure DNS with proper domain
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Set resource limits appropriately
- [ ] Configure HPA for production load
- [ ] Set up monitoring alerts
- [ ] Configure network policies
- [ ] Enable pod security policies
- [ ] Set up backup strategy
- [ ] Configure disaster recovery
- [ ] Load test services
- [ ] Security scanning of images
- [ ] Secrets in Azure Key Vault

---

*For questions, contact Platform Team*
