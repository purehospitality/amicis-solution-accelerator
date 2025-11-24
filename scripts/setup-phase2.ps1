#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete Phase 2 setup - Creates and configures IKEA mobile app
.DESCRIPTION
    Runs both setup-mobile-app.ps1 and generate-mobile-files.js in sequence
#>

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  IKEA Scan & Go - Phase 2 Setup      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

$scriptsDir = "C:\Users\GudniVilmundarson\amicis-solution-accelerator\scripts"

# Step 1: Run PowerShell setup script
Write-Host "🚀 Running setup-mobile-app.ps1...`n" -ForegroundColor Yellow
& "$scriptsDir\setup-mobile-app.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Setup failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Generate all source files
Write-Host "`n📝 Running generate-mobile-files.js...`n" -ForegroundColor Yellow
node "$scriptsDir\generate-mobile-files.js"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ File generation failed!" -ForegroundColor Red
    exit 1
}

# Success!
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Phase 2 Complete!                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📱 Mobile app ready at: mobile-ikea/`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd mobile-ikea" -ForegroundColor White
Write-Host "  2. npx expo start" -ForegroundColor White
Write-Host "  3. Scan QR with Expo Go app" -ForegroundColor White
Write-Host "  4. Or press 'i' for iOS simulator" -ForegroundColor White
Write-Host "  5. Or press 'a' for Android emulator`n" -ForegroundColor White

Write-Host "📚 Files created:" -ForegroundColor Cyan
Write-Host "  - app.json (Expo config)" -ForegroundColor Gray
Write-Host "  - constants/theme.ts (SKAPA design)" -ForegroundColor Gray
Write-Host "  - services/api.ts (Backend client)" -ForegroundColor Gray
Write-Host "  - stores/ (Zustand state)" -ForegroundColor Gray
Write-Host "  - app/(tabs)/ (5 screens)" -ForegroundColor Gray
Write-Host "  - README.md (Documentation)`n" -ForegroundColor Gray
