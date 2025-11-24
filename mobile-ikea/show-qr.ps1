# Display QR Code for IKEA Scan & Go App
# Team members scan this with Expo Go app

Write-Host "`n📱 IKEA Scan & Go - Team Access QR Code" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Scan this QR code with Expo Go app:`n" -ForegroundColor Yellow

# Generate QR code for the preview channel
qrcode-terminal "exp://u.expo.dev/f3026af3-b3a0-4f30-b1f0-063ce86efaff?channel-name=preview"

Write-Host "`n📲 Instructions for team members:" -ForegroundColor Cyan
Write-Host "  1. Install Expo Go (App Store or Play Store)" -ForegroundColor White
Write-Host "  2. Open Expo Go app" -ForegroundColor White
Write-Host "  3. Scan the QR code above" -ForegroundColor White
Write-Host "  4. App will load automatically!`n" -ForegroundColor White

Write-Host "💡 Alternative:" -ForegroundColor Yellow
Write-Host "   Direct link: https://expo.dev/accounts/gudniv/projects/ikea-scan-and-go`n" -ForegroundColor Gray
