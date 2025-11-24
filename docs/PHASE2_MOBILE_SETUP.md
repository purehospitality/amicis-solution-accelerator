# Phase 2: Mobile App Setup Guide

## Quick Start

Run the complete setup with one command:

```powershell
.\scripts\setup-phase2.ps1
```

This will:
1. Create Expo TypeScript project
2. Install all dependencies
3. Create folder structure
4. Generate all source files with IKEA design

## Manual Setup (Alternative)

If you prefer step-by-step:

### Step 1: Create Expo app
```powershell
.\scripts\setup-mobile-app.ps1
```

### Step 2: Generate files
```powershell
node .\scripts\generate-mobile-files.js
```

## What Gets Created

### Project Structure
```
mobile-ikea/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab navigation config
│   │   ├── index.tsx          # Home screen (yellow header)
│   │   ├── scan.tsx           # Barcode scanner
│   │   ├── wishlist.tsx       # Wishlist view
│   │   └── account.tsx        # Account settings
│   ├── _layout.tsx            # Root layout
│   └── product/
│       └── [id].tsx           # Product detail modal
├── components/                 # UI components (empty - Phase 3)
├── services/
│   └── api.ts                 # Axios backend client
├── stores/
│   ├── authStore.ts           # JWT auth + store selection
│   ├── wishlistStore.ts       # Wishlist state
│   └── checkoutStore.ts       # Checkout + QR polling
├── constants/
│   └── theme.ts               # IKEA SKAPA design tokens
├── assets/                    # Images & fonts
├── app.json                   # Expo configuration
└── README.md                  # Documentation
```

### Dependencies Installed
- **Navigation**: expo-router, react-navigation
- **Camera**: expo-camera, expo-barcode-scanner
- **QR**: react-native-qrcode-svg
- **State**: zustand, async-storage
- **HTTP**: axios
- **Icons**: @expo/vector-icons

### Configuration Files

#### app.json
- App name: "IKEA Scan & Go"
- Bundle ID: com.ikea.scanandgo
- Splash color: IKEA Yellow (#FFCC00)
- Camera permissions configured

#### theme.ts
- Colors: IKEA Yellow, Blue, grays
- Typography: Font sizes, line heights
- Spacing: 4/8/16/24/32/48px
- Border radius, shadows

#### api.ts
- Base URL: https://api.4.157.44.54.nip.io/api/v1
- JWT interceptor
- All 6 new endpoints wrapped
- Error handling with 401 redirect

## Running the App

### Development Mode
```bash
cd mobile-ikea
npx expo start
```

### Testing Options
1. **Expo Go** (recommended for quick testing)
   - Install Expo Go on iOS/Android
   - Scan QR code from terminal
   - Live reload on save

2. **iOS Simulator**
   - Press `i` in Expo dev server
   - Requires Xcode on Mac

3. **Android Emulator**
   - Press `a` in Expo dev server
   - Requires Android Studio

## Screen Previews

### Home Screen (index.tsx)
- Yellow header with store name
- Status indicator (Busy/Normal)
- Closing time
- Quick action buttons (placeholder)
- Store offers carousel (placeholder)

### Scan Screen (scan.tsx)
- Full-screen camera view (placeholder)
- Barcode scanner frame
- Article entry button

### Wishlist Screen (wishlist.tsx)
- List of scanned products
- Quantity controls
- Total calculation
- Checkout button

### Account Screen (account.tsx)
- User profile
- Settings
- Logout

## State Management

### Auth Store
```typescript
useAuthStore((state) => ({
  isAuthenticated,
  token,
  storeId,
  setAuth,
  setStore,
  logout
}))
```

### Wishlist Store
```typescript
useWishlistStore((state) => ({
  items,
  count,
  fetchWishlist,
  addItem,
  removeItem
}))
```

### Checkout Store
```typescript
useCheckoutStore((state) => ({
  sessionId,
  qrToken,
  total,
  status,
  createSession,
  pollStatus,
  startPolling
}))
```

## Next Steps (Phase 3)

After setup completes, Phase 3 will add:
1. **YellowHeader** component (store selector)
2. **ActionButton** component (circular buttons)
3. **ProductOfferCard** component (horizontal cards)
4. **ArticleEntryModal** component (numeric keypad)
5. **ProductDetailSheet** component (bottom sheet)

## Troubleshooting

### Expo won't start
```bash
npm install -g expo-cli
npx expo start --clear
```

### Dependencies failed
```bash
rm -rf node_modules package-lock.json
npm install
```

### Can't find expo-router
```bash
npm install expo-router --save
```

## Build for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

Requires EAS account: https://expo.dev/

## Resources

- Expo Docs: https://docs.expo.dev
- Expo Router: https://expo.github.io/router
- IKEA Design: https://design.ikea.com
- Backend API: https://api.4.157.44.54.nip.io/api/v1
