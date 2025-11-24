# IKEA Mobile App - EAS Update Deployment
# This script publishes the mobile app to Expo's cloud (EAS Update)
# Your team can access it via Expo Go app without your computer running

Write-Host "`n📱 IKEA Scan & Go - EAS Update Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Navigate to mobile-ikea directory
Set-Location C:\Users\GudniVilmundarson\amicis-solution-accelerator\mobile-ikea

# Check if logged in to EAS
Write-Host "🔐 Checking EAS authentication..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to EAS. Please run: eas login" -ForegroundColor Red
    Write-Host "`nTo get started:" -ForegroundColor Yellow
    Write-Host "  1. Run: eas login" -ForegroundColor White
    Write-Host "  2. Create an Expo account at https://expo.dev if you don't have one" -ForegroundColor White
    Write-Host "  3. Once logged in, run this script again`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green

# Check if project is initialized
if (-not (Test-Path "eas.json")) {
    Write-Host "⚠️  eas.json not found. Initializing project..." -ForegroundColor Yellow
    eas build:configure
}

# Prompt for update message
$message = Read-Host "`n💬 Enter update message (e.g., 'Fixed checkout screen')"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# Ask which channel to publish to
Write-Host "`n🎯 Which channel do you want to publish to?" -ForegroundColor Yellow
Write-Host "  1. preview (for team testing)" -ForegroundColor White
Write-Host "  2. production (for wider release)" -ForegroundColor White
$channel = Read-Host "Enter choice (1 or 2)"

$branchName = if ($channel -eq "2") { "production" } else { "preview" }

# Publish update
Write-Host "`n🚀 Publishing to $branchName channel..." -ForegroundColor Cyan
Write-Host "This will upload your app to Expo's servers (independent of your computer)`n" -ForegroundColor Gray

eas update --branch $branchName --message $message

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Update published successfully!" -ForegroundColor Green
    Write-Host "`n📲 Your team can now access the app:" -ForegroundColor Cyan
    Write-Host "  1. Install Expo Go app from App Store (iOS) or Play Store (Android)" -ForegroundColor White
    Write-Host "  2. Scan the QR code shown above OR" -ForegroundColor White
    Write-Host "  3. Open the exp:// URL in Expo Go app" -ForegroundColor White
    Write-Host "`n💡 The app will work even when your computer is off!" -ForegroundColor Yellow
    Write-Host "   Updates are hosted on Expo's cloud servers.`n" -ForegroundColor Gray
    
    # Save the deployment info
    $deploymentInfo = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        channel = $branchName
        message = $message
        user = $whoami
    }
    $deploymentInfo | ConvertTo-Json | Out-File -FilePath "last-deployment.json" -Encoding UTF8
    
} else {
    Write-Host "`n❌ Update failed. Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
Write-Host "  • Make changes to your app" -ForegroundColor White
Write-Host "  • Run this script again to push updates" -ForegroundColor White
Write-Host "  • Updates will be available to testers within seconds`n" -ForegroundColor White
