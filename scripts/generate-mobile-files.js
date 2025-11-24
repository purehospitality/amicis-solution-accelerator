/**
 * Generate all mobile app source files with IKEA SKAPA design
 * Run after setup-mobile-app.ps1
 */

const fs = require('fs');
const path = require('path');

const mobileDir = path.join(__dirname, '..', 'mobile-ikea');

const files = {
  // App configuration
  'app.json': {
    content: JSON.stringify({
      expo: {
        name: "IKEA Scan & Go",
        slug: "ikea-scan-and-go",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
          image: "./assets/splash.png",
          resizeMode: "contain",
          backgroundColor: "#FFCC00"
        },
        assetBundlePatterns: ["**/*"],
        ios: {
          supportsTablet: true,
          bundleIdentifier: "com.ikea.scanandgo"
        },
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#FFCC00"
          },
          package: "com.ikea.scanandgo",
          permissions: ["CAMERA"]
        },
        web: {
          favicon: "./assets/favicon.png"
        },
        scheme: "ikea-scanandgo",
        plugins: [
          "expo-router",
          [
            "expo-camera",
            {
              cameraPermission: "Allow IKEA Scan & Go to scan product barcodes"
            }
          ],
          [
            "expo-barcode-scanner",
            {
              cameraPermission: "Allow IKEA Scan & Go to scan product barcodes"
            }
          ]
        ]
      }
    }, null, 2)
  },

  // Theme constants
  'constants/theme.ts': {
    content: `/**
 * IKEA SKAPA Design System Tokens
 * https://design.ikea.com/
 */

export const Colors = {
  // Primary IKEA Colors
  ikeaYellow: '#FFCC00',
  ikeaBlue: '#0058A3',
  
  // Grays
  black: '#111111',
  darkGray: '#1A1A1A',
  mediumGray: '#484848',
  lightGray: '#DFDFDF',
  white: '#FFFFFF',
  
  // Semantic Colors
  success: '#0B8043',
  error: '#CC0000',
  warning: '#FF6B00',
  
  // Status Colors
  inStock: '#0B8043',
  lowStock: '#FF6B00',
  outOfStock: '#CC0000',
  
  // Background
  background: '#FFFFFF',
  surface: '#F5F5F5',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Typography = {
  // Font Family (Noto IKEA - fallback to system)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
`
  },

  // API Service
  'services/api.ts': {
    content: `import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.4.157.44.54.nip.io/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add JWT token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('jwt_token');
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          await AsyncStorage.removeItem('jwt_token');
          // TODO: Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  // Store endpoints
  async getStoreDetails(storeId: string) {
    const response = await this.client.get(\`/stores/\${storeId}\`);
    return response.data;
  }

  // Product endpoints
  async getProductByArticle(articleNumber: string, storeId: string) {
    const response = await this.client.get(
      \`/commerce/products/by-article/\${articleNumber}\`,
      { params: { storeId } }
    );
    return response.data;
  }

  async getAvailability(storeId: string, articleNumber: string) {
    const response = await this.client.get(
      \`/commerce/availability/\${storeId}/\${articleNumber}\`
    );
    return response.data;
  }

  async getPricing(storeId: string, articleNumber: string) {
    const response = await this.client.get(
      \`/commerce/pricing/\${storeId}/\${articleNumber}\`
    );
    return response.data;
  }

  // Wishlist endpoints
  async getWishlist() {
    const response = await this.client.get('/commerce/wishlist');
    return response.data;
  }

  async addToWishlist(item: any) {
    const response = await this.client.post('/commerce/wishlist/items', item);
    return response.data;
  }

  async removeFromWishlist(itemId: string) {
    await this.client.delete(\`/commerce/wishlist/items/\${itemId}\`);
  }

  // Checkout endpoints
  async createCheckoutSession(data: {
    storeId: string;
    customerId: string;
    items: any[];
    discounts: any[];
  }) {
    const response = await this.client.post('/commerce/checkout/sessions', data);
    return response.data;
  }

  async getCheckoutSessionStatus(sessionId: string) {
    const response = await this.client.get(
      \`/commerce/checkout/sessions/\${sessionId}/status\`
    );
    return response.data;
  }
}

export default new ApiService();
`
  },

  // Auth Store
  'stores/authStore.ts': {
    content: `import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  tenantId: string;
  storeId: string | null;
  
  setAuth: (token: string, userId: string) => Promise<void>;
  setStore: (storeId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  userId: null,
  tenantId: 'ikea',
  storeId: null,

  setAuth: async (token: string, userId: string) => {
    await AsyncStorage.setItem('jwt_token', token);
    await AsyncStorage.setItem('user_id', userId);
    set({ isAuthenticated: true, token, userId });
  },

  setStore: async (storeId: string) => {
    await AsyncStorage.setItem('store_id', storeId);
    set({ storeId });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['jwt_token', 'user_id', 'store_id']);
    set({ isAuthenticated: false, token: null, userId: null, storeId: null });
  },

  loadAuth: async () => {
    const [token, userId, storeId] = await AsyncStorage.multiGet([
      'jwt_token',
      'user_id',
      'store_id',
    ]);
    
    if (token[1] && userId[1]) {
      set({
        isAuthenticated: true,
        token: token[1],
        userId: userId[1],
        storeId: storeId[1],
      });
    }
  },
}));
`
  },

  // Wishlist Store
  'stores/wishlistStore.ts': {
    content: `import { create } from 'zustand';
import api from '../services/api';

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  articleNumber: string;
  price: {
    amount: number;
    currency: string;
  };
  quantity: number;
  image?: string;
  variant?: string;
}

interface WishlistState {
  items: WishlistItem[];
  count: number;
  isLoading: boolean;
  
  fetchWishlist: () => Promise<void>;
  addItem: (item: Omit<WishlistItem, 'id'>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  count: 0,
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getWishlist();
      set({ items: data.items || [], count: data.count || 0 });
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    try {
      await api.addToWishlist(item);
      await get().fetchWishlist();
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.removeFromWishlist(itemId);
      set((state) => ({
        items: state.items.filter((item) => item.id !== itemId),
        count: state.count - 1,
      }));
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  },

  updateQuantity: (itemId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  },

  clearWishlist: () => {
    set({ items: [], count: 0 });
  },
}));
`
  },

  // Checkout Store
  'stores/checkoutStore.ts': {
    content: `import { create } from 'zustand';
import api from '../services/api';
import { WishlistItem } from './wishlistStore';

interface CheckoutState {
  sessionId: string | null;
  qrToken: string | null;
  total: number;
  status: 'idle' | 'pending' | 'paid' | 'expired';
  isPolling: boolean;
  
  createSession: (storeId: string, customerId: string, items: WishlistItem[], discounts: any[]) => Promise<void>;
  pollStatus: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

let pollInterval: NodeJS.Timeout | null = null;

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  sessionId: null,
  qrToken: null,
  total: 0,
  status: 'idle',
  isPolling: false,

  createSession: async (storeId, customerId, items, discounts) => {
    try {
      const data = await api.createCheckoutSession({
        storeId,
        customerId,
        items,
        discounts,
      });
      
      set({
        sessionId: data.sessionId,
        qrToken: data.qrToken,
        total: data.total,
        status: 'pending',
      });
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw error;
    }
  },

  pollStatus: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      const data = await api.getCheckoutSessionStatus(sessionId);
      set({ status: data.status });

      if (data.status === 'paid' || data.status === 'expired') {
        get().stopPolling();
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  },

  startPolling: () => {
    if (pollInterval) return;
    
    set({ isPolling: true });
    pollInterval = setInterval(() => {
      get().pollStatus();
    }, 2000); // Poll every 2 seconds
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    set({ isPolling: false });
  },

  reset: () => {
    get().stopPolling();
    set({
      sessionId: null,
      qrToken: null,
      total: 0,
      status: 'idle',
      isPolling: false,
    });
  },
}));
`
  },

  // Root Layout
  'app/_layout.tsx': {
    content: `import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="product/[id]" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
`
  },

  // Tabs Layout
  'app/(tabs)/_layout.tsx': {
    content: `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.ikeaBlue,
        tabBarInactiveTintColor: Colors.mediumGray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.lightGray,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barcode" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
`
  },

  // Home Screen (Store Landing)
  'app/(tabs)/index.tsx': {
    content: `import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Yellow Header */}
      <View style={styles.header}>
        <Text style={styles.storeText}>Atlanta, GA ˅</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>🟢 Busy</Text>
          <Text style={styles.closingText}>Closes 8:00 PM</Text>
        </View>
        <Text style={styles.welcomeText}>Your store visit starts here</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {/* TODO: Add action buttons */}
        
        <Text style={styles.sectionTitle}>Store Offers</Text>
        {/* TODO: Add product cards */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.ikeaYellow,
    padding: Spacing.lg,
    paddingTop: Spacing['2xl'] + 20,
  },
  storeText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.black,
    marginRight: Spacing.md,
  },
  closingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.black,
  },
  welcomeText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: Colors.black,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
`
  },

  // Scan Screen
  'app/(tabs)/scan.tsx': {
    content: `import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Mode</Text>
      <Text style={styles.subtitle}>Point camera at product barcode</Text>
      {/* TODO: Add camera view with barcode scanner */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.white,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.white,
    marginTop: 8,
  },
});
`
  },

  // Wishlist Screen
  'app/(tabs)/wishlist.tsx': {
    content: `import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useWishlistStore } from '../../stores/wishlistStore';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function WishlistScreen() {
  const { items, count, fetchWishlist } = useWishlistStore();

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wishlist ({count})</Text>
      
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>Scan products to add them</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>
                \${item.price.amount.toFixed(2)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingTop: Spacing['2xl'] + 20,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.xl,
    color: Colors.mediumGray,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.mediumGray,
    marginTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  itemName: {
    fontSize: Typography.fontSize.base,
    flex: 1,
  },
  itemPrice: {
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
  },
});
`
  },

  // Account Screen
  'app/(tabs)/account.tsx': {
    content: `import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

export default function AccountScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Profile settings and preferences</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    paddingTop: Spacing['2xl'] + 20,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.mediumGray,
  },
});
`
  },

  // README
  'README.md': {
    content: `# IKEA Scan & Go Mobile App

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

\`\`\`bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
\`\`\`

## Project Structure

\`\`\`
mobile-ikea/
├── app/              # Expo Router screens
│   ├── (tabs)/      # Bottom tab navigation
│   └── product/     # Product detail modal
├── components/      # Reusable UI components
├── services/        # API client
├── stores/          # Zustand state management
├── constants/       # Theme & design tokens
└── assets/          # Images & fonts
\`\`\`

## Backend API

Connected to: \`https://api.4.157.44.54.nip.io/api/v1\`

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
\`\`\`bash
npx expo start
\`\`\`

Scan QR code with Expo Go app for live testing.

## Build

\`\`\`bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
\`\`\`

## License

Proprietary - IKEA Internal Use
`
  }
};

console.log('📝 Generating mobile app files...\n');

Object.entries(files).forEach(([filePath, { content }]) => {
  const fullPath = path.join(mobileDir, filePath);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✓ Created ${filePath}`);
});

console.log('\n✅ All files generated!\n');
console.log('Next steps:');
console.log('  1. cd mobile-ikea');
console.log('  2. npx expo start');
console.log('  3. Scan QR code with Expo Go app\n');
