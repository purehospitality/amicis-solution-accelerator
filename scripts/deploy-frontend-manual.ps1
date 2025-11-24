#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Manually deploy frontend to Azure Static Web Apps
.DESCRIPTION
    Deploys the built frontend to Azure Static Web Apps using SWA CLI
.PARAMETER DeploymentToken
    The Azure Static Web Apps deployment token (optional, will prompt if not provided)
#>

param(
    [string]$DeploymentToken = $env:AZURE_STATIC_WEB_APPS_API_TOKEN
)

Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          MANUAL FRONTEND DEPLOYMENT TO AZURE                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if build exists
$distPath = "C:\Users\GudniVilmundarson\amicis-solution-accelerator\frontend\dist"
if (-not (Test-Path $distPath)) {
    Write-Host "❌ Build not found at $distPath" -ForegroundColor Red
    Write-Host "   Please run: cd frontend && npm run build" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Build folder found" -ForegroundColor Green

# Get deployment token if not provided
if (-not $DeploymentToken) {
    Write-Host "`n⚠️  Deployment token required" -ForegroundColor Yellow
    Write-Host "`nTo get your deployment token:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
    Write-Host "2. Navigate to: Static Web Apps → gray-cliff-0abcbae0f" -ForegroundColor White
    Write-Host "3. Click: 'Manage deployment token'" -ForegroundColor White
    Write-Host "4. Copy the token`n" -ForegroundColor White
    
    $DeploymentToken = Read-Host "Enter deployment token (or press Enter to skip)"
    
    if (-not $DeploymentToken) {
        Write-Host "`n❌ No deployment token provided. Exiting." -ForegroundColor Red
        Write-Host "`nAlternatively, GitHub Actions will auto-deploy within 2-5 minutes." -ForegroundColor Yellow
        exit 1
    }
}

# Deploy using SWA CLI
Write-Host "`n🚀 Deploying to Azure Static Web Apps..." -ForegroundColor Cyan
Write-Host "   App: gray-cliff-0abcbae0f.3.azurestaticapps.net" -ForegroundColor Yellow
Write-Host "   Source: $distPath`n" -ForegroundColor White

Set-Location "C:\Users\GudniVilmundarson\amicis-solution-accelerator\frontend"

try {
    npx @azure/static-web-apps-cli deploy `
        --deployment-token $DeploymentToken `
        --app-location ./dist `
        --env production
    
    Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                  ✅ DEPLOYMENT SUCCESSFUL! 🎉                    ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
    Write-Host "`n🌐 Frontend URL: https://gray-cliff-0abcbae0f.3.azurestaticapps.net" -ForegroundColor Yellow
    Write-Host "`n⏳ Wait 30-60 seconds for CDN cache to clear, then test!" -ForegroundColor Cyan
}
catch {
    Write-Host "`n❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTry using GitHub Actions instead (auto-deploys from git push)" -ForegroundColor Yellow
    exit 1
}
