# Deploy Connector Framework to Azure AKS
# This script automates the deployment of the multi-domain connector framework

param(
    [Parameter(Mandatory=$false)]
    [string]$CosmosConnectionString,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDockerBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipConnectorSeed
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "`n🚀 Starting Connector Framework Deployment to Azure`n"
Write-Info "=" * 60

# Step 1: Update Ingress Configuration
Write-Info "`n📝 Step 1: Updating Ingress Configuration..."

$ingressPath = "C:\Users\GudniVilmundarson\amicis-solution-accelerator\infra\k8s\ingress-test.yaml"
$ingressContent = Get-Content $ingressPath -Raw

if ($ingressContent -notmatch "/api/v1/commerce") {
    Write-Info "Adding /api/v1/commerce route to ingress..."
    
    $newRoute = @"
      - path: /api/v1/commerce
        pathType: Prefix
        backend:
          service:
            name: go-routing-service
            port:
              number: 8080
"@
    
    # Insert after /api/v1/stores route
    $ingressContent = $ingressContent -replace (
        '(      - path: /api/v1/stores.*?number: 8080)',
        "`$1`n$newRoute"
    )
    
    Set-Content -Path $ingressPath -Value $ingressContent
    Write-Success "✅ Ingress configuration updated"
} else {
    Write-Success "✅ Commerce routes already present in ingress"
}

# Step 2: Build and Push Docker Image
if (-not $SkipDockerBuild) {
    Write-Info "`n🐳 Step 2: Building and Pushing Docker Image..."
    
    Push-Location "C:\Users\GudniVilmundarson\amicis-solution-accelerator\backend\go-routing-service"
    
    try {
        Write-Info "Building go-routing-service:v1.1.0..."
        docker build -t acramicisikeadev.azurecr.io/go-routing-service:v1.1.0 `
                     -t acramicisikeadev.azurecr.io/go-routing-service:latest . 2>&1 | Select-Object -Last 10
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        Write-Success "✅ Docker image built successfully"
        
        Write-Info "Pushing to Azure Container Registry..."
        docker push acramicisikeadev.azurecr.io/go-routing-service:v1.1.0 2>&1 | Select-Object -Last 5
        docker push acramicisikeadev.azurecr.io/go-routing-service:latest 2>&1 | Select-Object -Last 5
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker push failed"
        }
        Write-Success "✅ Images pushed to ACR"
    }
    finally {
        Pop-Location
    }
} else {
    Write-Warning "⏭️  Skipping Docker build (--SkipDockerBuild specified)"
}

# Step 3: Seed Connectors in Azure Cosmos DB
if (-not $SkipConnectorSeed) {
    Write-Info "`n📦 Step 3: Seeding Connectors in Azure Cosmos DB..."
    
    if (-not $CosmosConnectionString) {
        Write-Warning "⚠️  Cosmos DB connection string not provided"
        Write-Info "Attempting to retrieve from kubectl secrets..."
        
        try {
            $cosmosEndpoint = kubectl get secret cosmos-connection -n amicis -o jsonpath='{.data.endpoint}' 2>$null
            if ($cosmosEndpoint) {
                $CosmosConnectionString = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($cosmosEndpoint))
                Write-Success "✅ Retrieved Cosmos DB connection from Kubernetes secret"
            }
        }
        catch {
            Write-Warning "Could not retrieve from Kubernetes. Please provide connection string."
        }
    }
    
    if ($CosmosConnectionString) {
        Push-Location "C:\Users\GudniVilmundarson\amicis-solution-accelerator\scripts"
        
        try {
            $env:MONGODB_URI = $CosmosConnectionString
            Write-Info "Running seed script..."
            node seed-connectors.js
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "✅ Connectors seeded successfully"
            } else {
                Write-Error "❌ Connector seeding failed"
            }
        }
        finally {
            Pop-Location
            Remove-Item Env:\MONGODB_URI -ErrorAction SilentlyContinue
        }
    } else {
        Write-Warning "⚠️  Skipping connector seeding - no connection string available"
        Write-Info "You can seed manually later with:"
        Write-Info '  $env:MONGODB_URI="<connection-string>"; node scripts/seed-connectors.js'
    }
} else {
    Write-Warning "⏭️  Skipping connector seed (--SkipConnectorSeed specified)"
}

# Step 4: Apply Ingress to Kubernetes
Write-Info "`n☸️  Step 4: Applying Ingress Configuration to AKS..."

try {
    kubectl apply -f infra/k8s/ingress-test.yaml
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Ingress configuration applied"
    } else {
        Write-Error "❌ Failed to apply ingress"
    }
}
catch {
    Write-Error "❌ Error applying ingress: $_"
}

# Step 5: Restart Deployment
Write-Info "`n🔄 Step 5: Restarting go-routing-service deployment..."

try {
    kubectl rollout restart deployment/go-routing-service -n amicis
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Deployment restart initiated"
    }
}
catch {
    Write-Error "❌ Error restarting deployment: $_"
}

# Step 6: Wait for Rollout
Write-Info "`n⏳ Step 6: Waiting for rollout to complete..."

try {
    kubectl rollout status deployment/go-routing-service -n amicis --timeout=5m
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Rollout completed successfully"
    }
}
catch {
    Write-Warning "⚠️  Rollout status check timed out or failed"
}

# Step 7: Verify Deployment
Write-Info "`n🔍 Step 7: Verifying Deployment..."

try {
    Write-Info "Checking pod status..."
    kubectl get pods -n amicis -l app=go-routing-service
    
    Write-Info "`nChecking pod logs for connector initialization..."
    $podName = kubectl get pods -n amicis -l app=go-routing-service -o jsonpath='{.items[0].metadata.name}'
    
    if ($podName) {
        Write-Info "Pod: $podName"
        kubectl logs -n amicis $podName --tail=20 | Select-String -Pattern "connector|D365|registry" -Context 0,2
        Write-Success "✅ Deployment verified"
    }
}
catch {
    Write-Warning "⚠️  Could not verify pod logs: $_"
}

# Step 8: Display Test Commands
Write-Info "`n" + "=" * 60
Write-Success "`n🎉 Deployment Complete!`n"

Write-Info "📋 Next Steps - Test Your Deployment:`n"

Write-Info "1️⃣  Get JWT Token:"
Write-Host '   $response = Invoke-RestMethod -Uri "http://api.4.157.44.54.nip.io/auth/exchange" \'
Write-Host '     -Method POST -ContentType "application/json" \'
Write-Host '     -Body ''{"userToken": "test-user"}'''
Write-Host '   $token = $response.token'

Write-Info "`n2️⃣  Test Products Endpoint (Demo Mode):"
Write-Host '   Invoke-RestMethod -Uri "http://api.4.157.44.54.nip.io/api/v1/commerce/products?storeId=ikea-seattle" \'
Write-Host '     -Headers @{Authorization = "Bearer $token"}'

Write-Info "`n3️⃣  Test Single Product:"
Write-Host '   Invoke-RestMethod -Uri "http://api.4.157.44.54.nip.io/api/v1/commerce/products/12345?storeId=ikea-seattle" \'
Write-Host '     -Headers @{Authorization = "Bearer $token"}'

Write-Info "`n4️⃣  Test Connectors Metadata:"
Write-Host '   Invoke-RestMethod -Uri "http://api.4.157.44.54.nip.io/api/v1/commerce/connectors?storeId=ikea-seattle" \'
Write-Host '     -Headers @{Authorization = "Bearer $token"}'

Write-Info "`n5️⃣  Test Create Order:"
Write-Host '   $order = @{storeId="ikea-seattle"; customerId="test"; lineItems=@(@{productId="12345"; sku="BILLY-WHITE-001"; quantity=2; unitPrice=79.99})} | ConvertTo-Json'
Write-Host '   Invoke-RestMethod -Uri "http://api.4.157.44.54.nip.io/api/v1/commerce/orders" \'
Write-Host '     -Method POST -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} -Body $order'

Write-Info "`n" + "=" * 60

Write-Info "`n📊 Deployment Summary:"
Write-Info "  • Ingress: Updated with /api/v1/commerce routes"
Write-Info "  • Docker: acramicisikeadev.azurecr.io/go-routing-service:v1.1.0"
Write-Info "  • Endpoints: http://api.4.157.44.54.nip.io/api/v1/commerce/*"
Write-Info "  • Demo Mode: 5 IKEA products available"
Write-Info "`n"
