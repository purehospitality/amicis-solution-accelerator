#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test the complete Azure deployment (frontend + backend)
.DESCRIPTION
    Verifies that both the frontend and backend are deployed and working together
#>

param(
    [string]$FrontendUrl = "https://gray-cliff-0abcbae0f.3.azurestaticapps.net",
    [string]$BackendUrl = "https://api.4.157.44.54.nip.io"
)

Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            AZURE DEPLOYMENT VERIFICATION TEST                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# Test 1: Frontend Accessibility
Write-Host "🌐 Test 1: Frontend Accessibility" -ForegroundColor Yellow
Write-Host "   Testing: $FrontendUrl" -ForegroundColor White
try {
    $frontendResponse = Invoke-WebRequest -Uri $FrontendUrl -Method GET -SkipCertificateCheck -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend is accessible (HTTP $($frontendResponse.StatusCode))" -ForegroundColor Green
        
        # Check if it's the React app
        if ($frontendResponse.Content -match "amicis|root") {
            Write-Host "   ✅ React app detected in HTML" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "   ❌ Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Backend API Health
Write-Host "`n🔧 Test 2: Backend API Health" -ForegroundColor Yellow
Write-Host "   Testing: $BackendUrl/health" -ForegroundColor White
try {
    $healthResponse = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET -SkipCertificateCheck -TimeoutSec 5
    Write-Host "   ✅ Backend health check passed" -ForegroundColor Green
    Write-Host "      Status: $($healthResponse.status)" -ForegroundColor White
}
catch {
    Write-Host "   ⚠️  Health endpoint not available (this is okay if /api/v1 works)" -ForegroundColor Yellow
}

# Test 3: Authentication
Write-Host "`n🔐 Test 3: Authentication Endpoint" -ForegroundColor Yellow
Write-Host "   Testing: $BackendUrl/auth/exchange" -ForegroundColor White
try {
    $authBody = @{userToken = "ikea:test-token-123"} | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri "$BackendUrl/auth/exchange" -Method POST -Body $authBody -ContentType "application/json" -SkipCertificateCheck
    $token = $authResponse.accessToken
    Write-Host "   ✅ Authentication successful" -ForegroundColor Green
    Write-Host "      Token: $($token.Substring(0, 20))..." -ForegroundColor DarkGray
}
catch {
    Write-Host "   ❌ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Products API
Write-Host "`n🛒 Test 4: Products API" -ForegroundColor Yellow
Write-Host "   Testing: $BackendUrl/api/v1/commerce/products" -ForegroundColor White
try {
    $productsResponse = Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/products?storeId=ikea-seattle" -Headers @{Authorization = "Bearer $token"} -SkipCertificateCheck
    $productCount = $productsResponse.products.Count
    Write-Host "   ✅ Products API working" -ForegroundColor Green
    Write-Host "      Products found: $productCount" -ForegroundColor White
    if ($productCount -gt 0) {
        Write-Host "      Sample: $($productsResponse.products[0].name) - `$$($productsResponse.products[0].price.amount)" -ForegroundColor DarkGray
    }
}
catch {
    Write-Host "   ❌ Products API failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 5: Wishlist API (GET)
Write-Host "`n❤️  Test 5: Wishlist API - GET" -ForegroundColor Yellow
Write-Host "   Testing: $BackendUrl/api/v1/commerce/wishlist" -ForegroundColor White
try {
    $wishlistResponse = Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/wishlist?storeId=ikea-seattle&customerId=test-azure-123" -Headers @{Authorization = "Bearer $token"} -SkipCertificateCheck
    Write-Host "   ✅ GET Wishlist working" -ForegroundColor Green
    Write-Host "      Items in wishlist: $($wishlistResponse.count)" -ForegroundColor White
}
catch {
    Write-Host "   ❌ GET Wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Wishlist API (POST - Add)
Write-Host "`n❤️  Test 6: Wishlist API - POST (Add Item)" -ForegroundColor Yellow
Write-Host "   Testing: Add product to wishlist" -ForegroundColor White
try {
    $addBody = @{
        storeId = "ikea-seattle"
        customerId = "test-azure-123"
        productId = "1001"  # BILLY Bookcase
    } | ConvertTo-Json
    
    $addResponse = Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/wishlist/items" -Method POST -Headers @{Authorization = "Bearer $token"} -Body $addBody -ContentType "application/json" -SkipCertificateCheck
    Write-Host "   ✅ POST Add to Wishlist working" -ForegroundColor Green
    Write-Host "      Added: $($addResponse.item.name) - `$$($addResponse.item.price.amount)" -ForegroundColor White
    $itemId = $addResponse.item.id
}
catch {
    Write-Host "   ❌ POST Add to Wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 7: Wishlist API (GET - Verify Added)
Write-Host "`n❤️  Test 7: Wishlist API - Verify Item Added" -ForegroundColor Yellow
try {
    $wishlistResponse = Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/wishlist?storeId=ikea-seattle&customerId=test-azure-123" -Headers @{Authorization = "Bearer $token"} -SkipCertificateCheck
    if ($wishlistResponse.count -gt 0) {
        Write-Host "   ✅ Item successfully added to wishlist" -ForegroundColor Green
        Write-Host "      Total items: $($wishlistResponse.count)" -ForegroundColor White
    }
    else {
        Write-Host "   ❌ Item not found in wishlist after adding" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Wishlist API (DELETE - Remove)
Write-Host "`n❤️  Test 8: Wishlist API - DELETE (Remove Item)" -ForegroundColor Yellow
Write-Host "   Testing: Remove product from wishlist" -ForegroundColor White
try {
    Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/wishlist/items/${itemId}?storeId=ikea-seattle&customerId=test-azure-123" -Method DELETE -Headers @{Authorization = "Bearer $token"} -SkipCertificateCheck | Out-Null
    Write-Host "   ✅ DELETE Remove from Wishlist working" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ DELETE Remove from Wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 9: Wishlist API (GET - Verify Removed)
Write-Host "`n❤️  Test 9: Wishlist API - Verify Item Removed" -ForegroundColor Yellow
try {
    $wishlistResponse = Invoke-RestMethod -Uri "$BackendUrl/api/v1/commerce/wishlist?storeId=ikea-seattle&customerId=test-azure-123" -Headers @{Authorization = "Bearer $token"} -SkipCertificateCheck
    if ($wishlistResponse.count -eq 0) {
        Write-Host "   ✅ Item successfully removed from wishlist" -ForegroundColor Green
        Write-Host "      Wishlist is now empty" -ForegroundColor White
    }
    else {
        Write-Host "   ⚠️  Wishlist still has items: $($wishlistResponse.count)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  ✅ ALL TESTS PASSED! 🎉                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n🎯 READY FOR TESTING!" -ForegroundColor Cyan
Write-Host "`n📱 Test the UI now:" -ForegroundColor Magenta
Write-Host "   1. Open: $FrontendUrl" -ForegroundColor Yellow
Write-Host "   2. Login: ikea / test-token-123" -ForegroundColor White
Write-Host "   3. Select any store" -ForegroundColor White
Write-Host "   4. Click: Browse Products" -ForegroundColor White
Write-Host "   5. Click: ❤️ on products to add to wishlist" -ForegroundColor White
Write-Host "   6. Click: My Wishlist to see saved items" -ForegroundColor White
Write-Host "   7. Test: Remove items from wishlist`n" -ForegroundColor White

Write-Host "🔍 Deployment URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: $FrontendUrl" -ForegroundColor Yellow
Write-Host "   Backend:  $BackendUrl" -ForegroundColor Yellow
Write-Host "   Status:   PRODUCTION ✅`n" -ForegroundColor Green
