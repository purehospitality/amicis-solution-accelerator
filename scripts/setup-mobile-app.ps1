#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup IKEA Scan & Go mobile app with Expo
.DESCRIPTION
    Creates Expo TypeScript project and scaffolds complete folder structure
#>

$ErrorActionPreference = "Stop"

Write-Host "`n🏗️  Phase 2: Mobile App Scaffolding" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$rootDir = "C:\Users\GudniVilmundarson\amicis-solution-accelerator"
$mobileDir = "$rootDir\mobile-ikea"

# Step 1: Create Expo app
Write-Host "📱 Step 1: Creating Expo TypeScript project..." -ForegroundColor Yellow
if (Test-Path $mobileDir) {
    Write-Host "⚠️  mobile-ikea folder already exists. Removing..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $mobileDir
}

Set-Location $rootDir
npx create-expo-app@latest mobile-ikea --template blank-typescript

if (-not (Test-Path $mobileDir)) {
    Write-Host "❌ Failed to create Expo app" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Expo project created`n" -ForegroundColor Green

# Step 2: Install dependencies
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Yellow
Set-Location $mobileDir

Write-Host "  - Installing Expo Router & Navigation..." -ForegroundColor Gray
npm install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

Write-Host "  - Installing React Navigation..." -ForegroundColor Gray
npm install @react-navigation/native @react-navigation/bottom-tabs

Write-Host "  - Installing Camera & Barcode Scanner..." -ForegroundColor Gray
npm install expo-camera expo-barcode-scanner

Write-Host "  - Installing QR Code..." -ForegroundColor Gray
npm install react-native-qrcode-svg react-native-svg

Write-Host "  - Installing State Management..." -ForegroundColor Gray
npm install zustand @react-native-async-storage/async-storage

Write-Host "  - Installing HTTP Client..." -ForegroundColor Gray
npm install axios

Write-Host "  - Installing Icons..." -ForegroundColor Gray
npm install @expo/vector-icons

Write-Host "✅ Dependencies installed`n" -ForegroundColor Green

# Step 3: Create folder structure
Write-Host "📁 Step 3: Creating folder structure..." -ForegroundColor Yellow

$folders = @(
    "app\(tabs)",
    "app\product",
    "components",
    "services",
    "stores",
    "constants",
    "assets\fonts"
)

foreach ($folder in $folders) {
    $path = Join-Path $mobileDir $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  ✓ Created $folder" -ForegroundColor Gray
    }
}

Write-Host "✅ Folder structure created`n" -ForegroundColor Green

Write-Host "🎉 Phase 2 scaffolding complete!" -ForegroundColor Green
Write-Host "`nNext: Run 'node scripts\generate-mobile-files.js' to create all source files" -ForegroundColor Cyan
