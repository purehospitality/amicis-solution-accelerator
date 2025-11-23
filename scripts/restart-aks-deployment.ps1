#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Instructions for manually restarting AKS deployment via Azure Portal
.DESCRIPTION
    This script provides step-by-step instructions to restart the go-routing-service
    deployment in AKS when kubectl/az CLI tools are not available.
#>

param(
    [string]$ResourceGroup = "rg-amicis-ikea-dev",
    [string]$ClusterName = "aks-amicis-ikea-dev",
    [string]$Namespace = "amicis",
    [string]$DeploymentName = "go-routing-service",
    [string]$NewImageTag = "v1.2.0"
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     AKS DEPLOYMENT RESTART - MANUAL INSTRUCTIONS           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📋 DEPLOYMENT DETAILS:" -ForegroundColor Yellow
Write-Host "  Resource Group:  $ResourceGroup" -ForegroundColor White
Write-Host "  Cluster Name:    $ClusterName" -ForegroundColor White
Write-Host "  Namespace:       $Namespace" -ForegroundColor White
Write-Host "  Deployment:      $DeploymentName" -ForegroundColor White
Write-Host "  New Image Tag:   $NewImageTag" -ForegroundColor White
Write-Host "  Image Digest:    sha256:86b5c6fbf6addd27ae8ce9b392f91c6a658cb2ab81cdb023cdbc3803dc3abaed" -ForegroundColor White

Write-Host "`n🔧 MANUAL RESTART STEPS:" -ForegroundColor Green
Write-Host "`n  OPTION 1: Azure Portal (Recommended)" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  1. Open: https://portal.azure.com" -ForegroundColor White
Write-Host "  2. Navigate to: Kubernetes services → $ClusterName" -ForegroundColor White
Write-Host "  3. Click: Workloads → Deployments" -ForegroundColor White
Write-Host "  4. Find: $DeploymentName in namespace '$Namespace'" -ForegroundColor White
Write-Host "  5. Click: Restart button (top menu)" -ForegroundColor White
Write-Host "  6. Wait: ~30-60 seconds for pods to restart" -ForegroundColor White

Write-Host "`n  OPTION 2: Azure CLI (if installed)" -ForegroundColor Cyan
Write-Host "  ───────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  az aks command invoke \" -ForegroundColor Yellow
Write-Host "    --resource-group $ResourceGroup \" -ForegroundColor Yellow
Write-Host "    --name $ClusterName \" -ForegroundColor Yellow
Write-Host "    --command 'kubectl rollout restart deployment/$DeploymentName -n $Namespace'" -ForegroundColor Yellow

Write-Host "`n  OPTION 3: Install kubelogin (for future use)" -ForegroundColor Cyan
Write-Host "  ────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  # Download from: https://aka.ms/aks/kubelogin" -ForegroundColor Yellow
Write-Host "  # Or use Chocolatey:" -ForegroundColor Yellow
Write-Host "  choco install kubelogin" -ForegroundColor Yellow
Write-Host "  # Then run:" -ForegroundColor Yellow
Write-Host "  kubectl rollout restart deployment/$DeploymentName -n $Namespace" -ForegroundColor Yellow

Write-Host "`n✅ VERIFICATION STEPS:" -ForegroundColor Green
Write-Host "  After restarting the deployment, verify it's using the new image:" -ForegroundColor White

Write-Host "`n  1. Check API endpoint:" -ForegroundColor Cyan
Write-Host @"
  `$token = (Invoke-RestMethod ``
    -Uri "https://api.4.157.44.54.nip.io/auth/exchange" ``
    -Method POST ``
    -Body (@{userToken = "ikea:test-token-123"} | ConvertTo-Json) ``
    -ContentType "application/json" ``
    -SkipCertificateCheck).accessToken

  Invoke-RestMethod ``
    -Uri "https://api.4.157.44.54.nip.io/api/v1/commerce/wishlist?storeId=ikea-seattle&customerId=test-customer-789" ``
    -Headers @{Authorization = "Bearer `$token"} ``
    -SkipCertificateCheck
"@ -ForegroundColor Yellow

Write-Host "`n  Expected Response: {items: [], count: 0}" -ForegroundColor Green
Write-Host "  (If you get 404, pods haven't restarted yet)" -ForegroundColor DarkGray

Write-Host "`n  2. Test end-to-end in browser:" -ForegroundColor Cyan
Write-Host "    • Open: http://localhost:3001" -ForegroundColor White
Write-Host "    • Login: ikea / test-token-123" -ForegroundColor White
Write-Host "    • Browse Products → Click ❤️ on any product" -ForegroundColor White
Write-Host "    • Check Wishlist page to see saved item" -ForegroundColor White

Write-Host "`n📦 WHAT'S NEW IN v1.2.0:" -ForegroundColor Magenta
Write-Host "  • GET    /api/v1/commerce/wishlist" -ForegroundColor White
Write-Host "  • POST   /api/v1/commerce/wishlist/items" -ForegroundColor White
Write-Host "  • DELETE /api/v1/commerce/wishlist/items/{itemId}" -ForegroundColor White
Write-Host "  • MongoDB integration with 'wishlists' collection" -ForegroundColor White
Write-Host "  • Product details fetched from connectors" -ForegroundColor White

Write-Host "`n─────────────────────────────────────────────────────────────`n" -ForegroundColor DarkGray

# Prompt user for action
Write-Host "Would you like to:" -ForegroundColor Yellow
Write-Host "  [1] Open Azure Portal in browser" -ForegroundColor White
Write-Host "  [2] Copy restart command to clipboard" -ForegroundColor White
Write-Host "  [3] Run verification test (after manual restart)" -ForegroundColor White
Write-Host "  [Q] Quit`n" -ForegroundColor White

$choice = Read-Host "Select option"

switch ($choice) {
    "1" {
        $portalUrl = "https://portal.azure.com/#@/resource/subscriptions/{subscriptionId}/resourceGroups/$ResourceGroup/providers/Microsoft.ContainerService/managedClusters/$ClusterName/workloads"
        Write-Host "`n🌐 Opening Azure Portal..." -ForegroundColor Green
        Start-Process $portalUrl
        Write-Host "✅ Opened! Navigate to Workloads → Deployments → $DeploymentName → Restart" -ForegroundColor Green
    }
    "2" {
        $command = "kubectl rollout restart deployment/$DeploymentName -n $Namespace"
        Set-Clipboard -Value $command
        Write-Host "`n📋 Copied to clipboard: $command" -ForegroundColor Green
        Write-Host "Paste this in Azure CLI or kubectl terminal after installing kubelogin" -ForegroundColor Yellow
    }
    "3" {
        Write-Host "`n🧪 Running verification test..." -ForegroundColor Cyan
        try {
            $token = (Invoke-RestMethod `
                -Uri "https://api.4.157.44.54.nip.io/auth/exchange" `
                -Method POST `
                -Body (@{userToken = "ikea:test-token-123"} | ConvertTo-Json) `
                -ContentType "application/json" `
                -SkipCertificateCheck).accessToken

            Write-Host "✅ Authentication successful" -ForegroundColor Green

            $result = Invoke-RestMethod `
                -Uri "https://api.4.157.44.54.nip.io/api/v1/commerce/wishlist?storeId=ikea-seattle&customerId=test-customer-789" `
                -Headers @{Authorization = "Bearer $token"} `
                -SkipCertificateCheck

            Write-Host "`n✅ SUCCESS! Wishlist API is working!" -ForegroundColor Green
            Write-Host "Response: $($result | ConvertTo-Json -Compress)" -ForegroundColor White
            Write-Host "`nDeployment v1.2.0 is active! 🎉" -ForegroundColor Green
        }
        catch {
            if ($_.Exception.Response.StatusCode -eq 404) {
                Write-Host "`n⚠️  Still getting 404 - Pods haven't restarted yet" -ForegroundColor Yellow
                Write-Host "Please complete the manual restart steps above, then run option [3] again." -ForegroundColor Yellow
            }
            else {
                Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    "Q" {
        Write-Host "`n👋 Goodbye!" -ForegroundColor Cyan
    }
    default {
        Write-Host "`n❌ Invalid option. Run the script again." -ForegroundColor Red
    }
}

Write-Host ""
