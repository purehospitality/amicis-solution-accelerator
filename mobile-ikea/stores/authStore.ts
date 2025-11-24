import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  user: User | null;
  tenantId: string;
  storeId: string | null;
  
  login: (email: string, password: string, name: string) => Promise<void>;
  setAuth: (token: string, userId: string) => Promise<void>;
  setStore: (storeId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

// Helper function to generate initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  userId: null,
  user: null,
  tenantId: 'ikea',
  storeId: null,

  login: async (email: string, password: string, name: string) => {
    try {
      // Mock authentication - in production, this would call the backend API
      const mockToken = `mock-jwt-token-${Date.now()}`;
      const mockUser: User = {
        id: `user-${Date.now()}`,
        email,
        name,
        initials: getInitials(name),
      };

      // Store in AsyncStorage
      await AsyncStorage.setItem('jwt_token', mockToken);
      await AsyncStorage.setItem('user_id', mockUser.id);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));

      set({
        isAuthenticated: true,
        token: mockToken,
        userId: mockUser.id,
        user: mockUser,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to login');
    }
  },

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
    await AsyncStorage.multiRemove(['jwt_token', 'user_id', 'store_id', 'user']);
    set({ isAuthenticated: false, token: null, userId: null, user: null, storeId: null });
  },

  loadAuth: async () => {
    const [token, userId, storeId, userJson] = await AsyncStorage.multiGet([
      'jwt_token',
      'user_id',
      'store_id',
      'user',
    ]);
    
    if (token[1] && userId[1]) {
      const user = userJson[1] ? JSON.parse(userJson[1]) : null;
      set({
        isAuthenticated: true,
        token: token[1],
        userId: userId[1],
        storeId: storeId[1],
        user,
      });
    }
  },
}));
