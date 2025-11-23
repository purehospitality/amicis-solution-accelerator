# CI/CD Setup Guide

This guide explains how to configure continuous integration and deployment (CI/CD) for the Amicis Solution Accelerator using GitHub Actions.

## Prerequisites

- GitHub repository with the Amicis codebase
- Azure subscription with appropriate permissions
- Azure CLI installed locally
- Docker Hub account (optional, for public images)

## Required GitHub Secrets

The CI/CD workflows require the following secrets to be configured in your GitHub repository:

### Azure Authentication

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `AZURE_CREDENTIALS` | Service Principal JSON for Azure authentication | See "Creating Azure Service Principal" below |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID | Run: `az account show --query id -o tsv` |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID | Run: `az account show --query tenantId -o tsv` |

### Container Registry

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `ACR_LOGIN_SERVER` | Azure Container Registry login server | `amicisdev.azurecr.io` |
| `ACR_USERNAME` | ACR username (service principal ID) | Same as in AZURE_CREDENTIALS |
| `ACR_PASSWORD` | ACR password (service principal secret) | Same as in AZURE_CREDENTIALS |

### Kubernetes

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `AKS_CLUSTER_NAME` | Name of your AKS cluster | From Terraform output or Azure Portal |
| `AKS_RESOURCE_GROUP` | Resource group containing AKS | From Terraform output |

### Optional Secrets

| Secret Name | Description | When Needed |
|-------------|-------------|-------------|
| `DOCKER_HUB_USERNAME` | Docker Hub username | If using Docker Hub for public images |
| `DOCKER_HUB_TOKEN` | Docker Hub access token | If using Docker Hub |
| `PERF_TEST_JWT` | Valid JWT token for performance tests | For automated performance testing |

## Creating Azure Service Principal

### Step 1: Create Service Principal

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "<your-subscription-id>"

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "github-actions-amicis" \
  --role Contributor \
  --scopes /subscriptions/<your-subscription-id> \
  --sdk-auth
```

### Step 2: Save the Output

The command will output JSON credentials. **Save this entire JSON output** - you'll use it for the `AZURE_CREDENTIALS` secret.

Example output:
```json
{
  "clientId": "00000000-0000-0000-0000-000000000000",
  "clientSecret": "your-client-secret",
  "subscriptionId": "00000000-0000-0000-0000-000000000000",
  "tenantId": "00000000-0000-0000-0000-000000000000",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### Step 3: Grant Additional Permissions (if needed)

```bash
# Get the service principal object ID
SP_OBJECT_ID=$(az ad sp list --display-name "github-actions-amicis" --query "[0].id" -o tsv)

# Grant AcrPush role for container registry
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role AcrPush \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.ContainerRegistry/registries/<acr-name>

# Grant Azure Kubernetes Service Cluster User Role
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.ContainerService/managedClusters/<aks-name>
```

## Configuring GitHub Secrets

### Via GitHub Web UI

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the table above:
   - **Name**: Exact name from the table (case-sensitive)
   - **Value**: The corresponding value

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Login to GitHub
gh auth login

# Set secrets (replace values with your actual values)
gh secret set AZURE_CREDENTIALS < azure-credentials.json
gh secret set AZURE_SUBSCRIPTION_ID --body "00000000-0000-0000-0000-000000000000"
gh secret set AZURE_TENANT_ID --body "00000000-0000-0000-0000-000000000000"
gh secret set ACR_LOGIN_SERVER --body "amicisdev.azurecr.io"
gh secret set ACR_USERNAME --body "00000000-0000-0000-0000-000000000000"
gh secret set ACR_PASSWORD --body "your-client-secret"
gh secret set AKS_CLUSTER_NAME --body "amicis-aks-dev"
gh secret set AKS_RESOURCE_GROUP --body "amicis-dev-rg"
```

## Workflow Files

The repository includes two main CI/CD workflows:

### 1. Build and Test Workflow (`.github/workflows/build-test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**What it does:**
- Builds all services (Go routing service, Node auth service, frontend)
- Runs unit tests
- Runs integration tests
- Performs security scanning with Trivy
- Uploads test coverage reports

### 2. Enhanced CI/CD Workflow (`.github/workflows/ci-cd-enhanced.yaml`)

**Triggers:**
- Push to `main` branch (auto-deploy to dev)
- Manual workflow dispatch

**What it does:**
- Builds Docker images
- Scans images for vulnerabilities
- Pushes images to ACR
- Deploys to AKS cluster
- Runs smoke tests

## Verifying Setup

### 1. Check Service Principal Permissions

```bash
# Verify service principal exists
az ad sp list --display-name "github-actions-amicis" --output table

# Check role assignments
az role assignment list --assignee <service-principal-id> --output table
```

### 2. Test Azure Login

```bash
# Create a test file with your credentials
cat > test-creds.json << 'EOF'
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
EOF

# Test login
az login --service-principal \
  --username $(cat test-creds.json | jq -r '.clientId') \
  --password $(cat test-creds.json | jq -r '.clientSecret') \
  --tenant $(cat test-creds.json | jq -r '.tenantId')

# Clean up
rm test-creds.json
```

### 3. Trigger a Test Workflow

```bash
# Trigger the build workflow manually
gh workflow run build-test.yml

# Watch the workflow run
gh run list --workflow=build-test.yml
gh run watch
```

## Troubleshooting

### Common Issues

#### 1. "Error: Login failed with Error: No subscriptions found for..."

**Cause:** Service principal doesn't have access to the subscription.

**Solution:**
```bash
az role assignment create \
  --assignee <service-principal-id> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>
```

#### 2. "Error: Container registry not found"

**Cause:** ACR credentials are incorrect or service principal lacks permissions.

**Solution:**
```bash
# Verify ACR access
az acr login --name <acr-name>

# Grant AcrPush role
az role assignment create \
  --assignee <service-principal-id> \
  --role AcrPush \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.ContainerRegistry/registries/<acr-name>
```

#### 3. "Error: Failed to get credentials for cluster"

**Cause:** Service principal doesn't have AKS access.

**Solution:**
```bash
az role assignment create \
  --assignee <service-principal-id> \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.ContainerService/managedClusters/<aks-name>
```

#### 4. Workflow fails at "Build and push Docker image"

**Check:**
- ACR login server is correct (should match ACR name: `<name>.azurecr.io`)
- ACR credentials are valid
- Docker build context path is correct
- Dockerfile exists at specified path

#### 5. Trivy scanning fails or times out

**Solution:**
- Increase timeout in workflow file
- Check network connectivity
- Verify Trivy database can be downloaded

### Debugging Tips

1. **Enable debug logging:**
   ```yaml
   # In workflow file
   env:
     ACTIONS_RUNNER_DEBUG: true
     ACTIONS_STEP_DEBUG: true
   ```

2. **Check workflow logs:**
   - Go to Actions tab in GitHub
   - Click on failed workflow run
   - Expand failed step to see detailed logs

3. **Verify secrets are set:**
   ```bash
   gh secret list
   ```

4. **Test Docker build locally:**
   ```bash
   cd backend/node-auth-service
   docker build -t test-image .
   ```

5. **Test Kubernetes deployment locally:**
   ```bash
   # Get kubeconfig
   az aks get-credentials --resource-group <rg> --name <aks-name>
   
   # Test deployment
   kubectl apply -f backend/node-auth-service/k8s/deployment.yaml
   kubectl get pods
   ```

## Deployment Environments

### Development Environment

- **Branch:** `develop` or `main`
- **Namespace:** `default` or `dev`
- **Auto-deploy:** Yes (on push to main)
- **Approval:** Not required

### Staging Environment (Future)

- **Branch:** `main`
- **Namespace:** `staging`
- **Auto-deploy:** No (manual trigger)
- **Approval:** Required from team lead

### Production Environment (Future)

- **Branch:** `main` (tagged release)
- **Namespace:** `production`
- **Auto-deploy:** No (manual trigger)
- **Approval:** Required from multiple reviewers

## Workflow Customization

### Changing Build Triggers

Edit `.github/workflows/build-test.yml`:

```yaml
on:
  push:
    branches: [ "main", "develop", "feature/*" ]
  pull_request:
    branches: [ "main", "develop" ]
```

### Adding Environment Variables

```yaml
env:
  NODE_VERSION: '20.x'
  GO_VERSION: '1.21'
  DOCKER_BUILDKIT: 1
```

### Adding Notification Steps

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Security Best Practices

1. **Rotate service principal secrets regularly** (every 90 days recommended)
2. **Use least privilege principle** - grant only necessary permissions
3. **Enable secret scanning** in GitHub repository settings
4. **Review workflow runs** regularly for anomalies
5. **Use environment protection rules** for production deployments
6. **Enable branch protection** for main branch
7. **Require code reviews** before merging to protected branches

## Next Steps

1. ✅ Configure all required secrets
2. ✅ Verify service principal permissions
3. ✅ Test workflow runs
4. Set up staging environment (optional)
5. Configure production deployment workflow
6. Set up monitoring and alerting
7. Document rollback procedures

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Service Principal Docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
- [Azure Container Registry Authentication](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure Kubernetes Service CI/CD](https://docs.microsoft.com/en-us/azure/aks/kubernetes-action)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review workflow logs in GitHub Actions
3. Consult Azure documentation
4. Contact DevOps team
