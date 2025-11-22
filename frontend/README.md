# Amicis Mobile Frontend

React + TypeScript + Capacitor mobile application for the Amicis retail platform.

## Features

- **Multi-tenant Authentication**: Login with tenant ID and user token
- **Store Selection**: Choose from available retail stores
- **Backend Routing**: Automatic backend service routing based on store selection
- **Mobile Ready**: Built with Capacitor for iOS and Android deployment
- **State Management**: Zustand for simple and efficient state management
- **API Integration**: Axios-based API client for backend communication

## Tech Stack

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Capacitor 5**: Native mobile wrapper
- **React Router**: Client-side routing
- **Zustand**: State management
- **Axios**: HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- For iOS: Xcode 14+
- For Android: Android Studio

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
# Run web dev server
npm run dev

# Open browser at http://localhost:3000
```

### Building

```bash
# Build for web
npm run build

# Build and sync with Capacitor
npm run build:mobile

# Open in Xcode (iOS)
npm run open:ios

# Open in Android Studio
npm run open:android
```

## Project Structure

```
frontend/
├── src/
│   ├── pages/          # Page components
│   │   ├── LoginPage.tsx
│   │   ├── StoreSelectionPage.tsx
│   │   └── HomePage.tsx
│   ├── services/       # API clients
│   │   └── api.ts
│   ├── store/          # State management
│   │   └── authStore.ts
│   ├── App.tsx         # Main app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── capacitor.config.json  # Capacitor configuration
├── vite.config.ts      # Vite configuration
└── package.json
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8080
VITE_AUTH_URL=http://localhost:3001
```

## Usage

### 1. Login

- Enter tenant ID (e.g., `ikea`)
- Enter user token (demo: `user-token-123`)
- Click Login

### 2. Select Store

- Choose from available stores
- App will fetch routing information from backend

### 3. View Store Details

- See backend URL and context
- Access store-specific information

## API Integration

The app integrates with two backend services:

1. **Auth Service** (port 3001)
   - POST `/auth/exchange` - Exchange user token for backend token

2. **Routing Service** (port 8080)
   - GET `/api/v1/route?storeId={id}` - Get store routing information

## State Management

Uses Zustand with persistence:

```typescript
const { isAuthenticated, accessToken, tenant, login, logout } = useAuthStore();
```

State is automatically persisted to localStorage.

## Mobile Deployment

### iOS

```bash
npm run build:mobile
npm run open:ios
```

Configure signing in Xcode, then build and run on device/simulator.

### Android

```bash
npm run build:mobile
npm run open:android
```

Configure gradle settings in Android Studio, then build and run.

## Security

- **JWT Validation**: All API calls include Bearer token
- **Secure Storage**: Tokens stored securely with Capacitor Preferences
- **HTTPS Only**: Production builds enforce HTTPS
- **Token Expiry**: Automatic logout on token expiration

## Development Tips

1. Use React DevTools for component inspection
2. Check Network tab for API calls
3. Test on actual devices for mobile features
4. Use Chrome DevTools for mobile debugging

## Troubleshooting

**CORS Errors**: 
- Backend services must enable CORS
- Check `vite.config.ts` proxy configuration

**Module Not Found**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build Failures**:
```bash
npm run build -- --debug
```

**Capacitor Sync Issues**:
```bash
npx cap sync
```

## Future Enhancements

- [ ] QR code scanning for store check-in
- [ ] Offline mode with local data caching
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Shopping cart integration
- [ ] Product catalog browsing
