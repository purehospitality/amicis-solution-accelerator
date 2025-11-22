import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantInfo {
  id: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  tenant: TenantInfo | null;
  userToken: string | null;
  login: (userToken: string, accessToken: string, tenant: TenantInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      tenant: null,
      userToken: null,
      login: (userToken, accessToken, tenant) =>
        set({
          isAuthenticated: true,
          userToken,
          accessToken,
          tenant,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          tenant: null,
          userToken: null,
        }),
    }),
    {
      name: 'amicis-auth-storage',
    }
  )
);
