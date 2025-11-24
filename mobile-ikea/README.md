# IKEA Scan & Go Mobile App

React Native mobile app for IKEA's in-store shopping experience with barcode scanning and QR-based checkout.

## Features

- 🏪 Store selection with real-time status
- 📷 Barcode scanner for quick product lookup
- ❤️ Wishlist management
- 💳 QR code checkout with payment polling
- 🎨 IKEA SKAPA design system

## Tech Stack

- **Framework**: Expo + React Native
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State**: Zustand
- **API**: Axios
- **Barcode**: expo-barcode-scanner
- **QR**: react-native-qrcode-svg

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Project Structure

```
mobile-ikea/
├── app/              # Expo Router screens
│   ├── (tabs)/      # Bottom tab navigation
│   └── product/     # Product detail modal
├── components/      # Reusable UI components
├── services/        # API client
├── stores/          # Zustand state management
├── constants/       # Theme & design tokens
└── assets/          # Images & fonts
```

## Backend API

Connected to: `https://api.4.157.44.54.nip.io/api/v1`

### Endpoints Used
- GET /stores/:storeId
- GET /commerce/products/by-article/:articleNumber
- GET /commerce/availability/:storeId/:articleNumber
- GET /commerce/pricing/:storeId/:articleNumber
- GET /commerce/wishlist
- POST /commerce/wishlist/items
- DELETE /commerce/wishlist/items/:itemId
- POST /commerce/checkout/sessions
- GET /commerce/checkout/sessions/:sessionId/status

## Design System

Based on IKEA SKAPA guidelines:
- **Primary Yellow**: #FFCC00
- **Primary Blue**: #0058A3
- **Typography**: System fonts (Noto IKEA planned)
- **Spacing**: 4/8/16/24/32/48px scale

## Development

Run Expo in development mode:
```bash
npx expo start
```

Scan QR code with Expo Go app for live testing.

## Build

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## License

Proprietary - IKEA Internal Use
