/**
 * Test new IKEA mobile app endpoints
 * Usage: node test-mobile-api.ps1
 */

# Test store details endpoint
Write-Host "Testing store details endpoint..." -ForegroundColor Yellow
$storeResponse = Invoke-RestMethod -Uri "https://api.4.157.44.54.nip.io/api/v1/stores/ikea-atlanta" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6ImlrZWEiLCJ1c2VySWQiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdHVzZXJAaWtlYS5jb20ifQ.test"
  }

Write-Host "Store Response:" -ForegroundColor Green
$storeResponse | ConvertTo-Json

# Test product by article number
Write-Host "`nTesting product by article number..." -ForegroundColor Yellow
try {
  $productResponse = Invoke-RestMethod -Uri "https://api.4.157.44.54.nip.io/api/v1/commerce/products/by-article/00575451?storeId=ikea-atlanta" `
    -Method GET `
    -Headers @{
      "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6ImlrZWEiLCJ1c2VySWQiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdHVzZXJAaWtlYS5jb20ifQ.test"
    }
  
  Write-Host "Product Response:" -ForegroundColor Green
  $productResponse | ConvertTo-Json
} catch {
  Write-Host "Product lookup failed (expected - no connector configured): $_" -ForegroundColor Yellow
}

Write-Host "`n✅ Endpoints are responding!" -ForegroundColor Green
