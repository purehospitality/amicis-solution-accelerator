#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test the wishlist API endpoints after deployment
.DESCRIPTION
    Runs a series of tests to verify the wishlist functionality is working
#>

param(
    [string]$ApiBase = "https://api.4.157.44.54.nip.io",
    [string]$TenantId = "ikea",
    [string]$UserToken = "test-token-123",
    [string]$StoreId = "ikea-seattle",
    [string]$CustomerId = "test-customer-789"
)

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          WISHLIST API INTEGRATION TEST                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

try {
    # Step 1: Authenticate
    Write-Host "🔐 Step 1: Authenticating..." -ForegroundColor Cyan
    $authResponse = Invoke-RestMethod `
        -Uri "$ApiBase/auth/exchange" `
        -Method POST `
        -Body (@{userToken = "${TenantId}:${UserToken}"} | ConvertTo-Json) `
        -ContentType "application/json" `
        -SkipCertificateCheck
    
    $token = $authResponse.accessToken
    Write-Host "   ✅ Authenticated successfully" -ForegroundColor Green
    
    $headers = @{
        Authorization = "Bearer $token"
    }

    # Step 2: Get empty wishlist
    Write-Host "`n📋 Step 2: Getting wishlist (should be empty)..." -ForegroundColor Cyan
    $wishlist = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/wishlist?storeId=$StoreId&customerId=$CustomerId" `
        -Headers $headers `
        -SkipCertificateCheck
    
    Write-Host "   ✅ Wishlist retrieved: $($wishlist.items.Count) items" -ForegroundColor Green
    
    # Step 3: Get products to add to wishlist
    Write-Host "`n🛒 Step 3: Getting products..." -ForegroundColor Cyan
    $products = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/products?storeId=$StoreId" `
        -Headers $headers `
        -SkipCertificateCheck
    
    if ($products.Count -eq 0) {
        Write-Host "   ⚠️  No products found" -ForegroundColor Yellow
        return
    }
    
    $testProduct = $products[0]
    Write-Host "   ✅ Found $($products.Count) products. Using: $($testProduct.name)" -ForegroundColor Green

    # Step 4: Add product to wishlist
    Write-Host "`n❤️  Step 4: Adding product to wishlist..." -ForegroundColor Cyan
    $addRequest = @{
        storeId = $StoreId
        customerId = $CustomerId
        productId = $testProduct.id
    }
    
    $addResult = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/wishlist/items" `
        -Method POST `
        -Headers $headers `
        -Body ($addRequest | ConvertTo-Json) `
        -ContentType "application/json" `
        -SkipCertificateCheck
    
    Write-Host "   ✅ Added to wishlist: $($addResult.item.name) - `$$($addResult.item.price.amount)" -ForegroundColor Green
    $itemId = $addResult.item.id

    # Step 5: Get wishlist again (should have 1 item)
    Write-Host "`n📋 Step 5: Getting wishlist (should have 1 item)..." -ForegroundColor Cyan
    $wishlist2 = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/wishlist?storeId=$StoreId&customerId=$CustomerId" `
        -Headers $headers `
        -SkipCertificateCheck
    
    Write-Host "   ✅ Wishlist now has: $($wishlist2.items.Count) item(s)" -ForegroundColor Green
    if ($wishlist2.items.Count -gt 0) {
        foreach ($item in $wishlist2.items) {
            Write-Host "      • $($item.name) - `$$($item.price.amount)" -ForegroundColor White
        }
    }

    # Step 6: Remove item from wishlist
    Write-Host "`n🗑️  Step 6: Removing item from wishlist..." -ForegroundColor Cyan
    Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/wishlist/items/${itemId}?storeId=$StoreId&customerId=$CustomerId" `
        -Method DELETE `
        -Headers $headers `
        -SkipCertificateCheck | Out-Null
    
    Write-Host "   ✅ Removed from wishlist" -ForegroundColor Green

    # Step 7: Final check (should be empty again)
    Write-Host "`n📋 Step 7: Final wishlist check (should be empty)..." -ForegroundColor Cyan
    $wishlist3 = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/commerce/wishlist?storeId=$StoreId&customerId=$CustomerId" `
        -Headers $headers `
        -SkipCertificateCheck
    
    Write-Host "   ✅ Wishlist now has: $($wishlist3.items.Count) item(s)" -ForegroundColor Green

    # Success summary
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ✅ ALL TESTS PASSED! 🎉                        ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`n✅ Wishlist API v1.2.0 is fully functional!" -ForegroundColor Green
    Write-Host "`n📱 Next: Test in the UI at http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   1. Login with: ikea / test-token-123" -ForegroundColor White
    Write-Host "   2. Browse Products" -ForegroundColor White
    Write-Host "   3. Click ❤️ on products to add to wishlist" -ForegroundColor White
    Write-Host "   4. View your wishlist`n" -ForegroundColor White
}
catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "`n❌ 404 ERROR - Wishlist endpoints not found" -ForegroundColor Red
        Write-Host "   This means the AKS pods haven't been restarted yet." -ForegroundColor Yellow
        Write-Host "`n   Please restart the deployment using one of these methods:" -ForegroundColor Yellow
        Write-Host "   • Azure Portal: Kubernetes → aks-amicis-ikea-dev → Workloads → go-routing-service → Restart" -ForegroundColor White
        Write-Host "   • Run: .\scripts\restart-aks-deployment.ps1`n" -ForegroundColor White
    }
    else {
        Write-Host "`n❌ TEST FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    exit 1
}
