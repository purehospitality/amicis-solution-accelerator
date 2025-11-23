import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      isAuthenticated: false,
      accessToken: null,
      tenant: null,
    });
    // Clear localStorage
    localStorage.clear();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.tenant).toBeNull();
  });

  it('logs in successfully and updates state', () => {
    const mockAccessToken = 'test-access-token';
    const mockTenant = { id: 'ikea', name: 'IKEA' };

    useAuthStore.getState().login(mockAccessToken, mockTenant);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(mockAccessToken);
    expect(state.tenant).toEqual(mockTenant);
  });

  it('persists auth data to localStorage on login', () => {
    const mockAccessToken = 'test-access-token';
    const mockTenant = { id: 'ikea', name: 'IKEA' };

    useAuthStore.getState().login(mockAccessToken, mockTenant);

    const stored = localStorage.getItem('amicis-auth-storage');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.state.isAuthenticated).toBe(true);
    expect(parsed.state.accessToken).toBe(mockAccessToken);
    expect(parsed.state.tenant).toEqual(mockTenant);
  });

  it('logs out and clears state', () => {
    // First log in
    useAuthStore.getState().login('token', { id: 'ikea', name: 'IKEA' });
    
    // Then log out
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.tenant).toBeNull();
  });

  it('clears localStorage on logout', () => {
    // Login first
    useAuthStore.getState().login('token', { id: 'ikea', name: 'IKEA' });
    expect(localStorage.getItem('amicis-auth-storage')).toBeTruthy();

    // Logout
    useAuthStore.getState().logout();

    const stored = localStorage.getItem('amicis-auth-storage');
    const parsed = stored ? JSON.parse(stored) : null;
    
    if (parsed) {
      expect(parsed.state.isAuthenticated).toBe(false);
      expect(parsed.state.accessToken).toBeNull();
    }
  });

  it('restores state from localStorage on initialization', () => {
    // Manually set localStorage
    const authData = {
      state: {
        isAuthenticated: true,
        accessToken: 'restored-token',
        tenant: { id: 'ikea', name: 'IKEA' },
      },
      version: 0,
    };
    localStorage.setItem('amicis-auth-storage', JSON.stringify(authData));

    // Get fresh store state (this would happen on page load)
    const state = useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('restored-token');
    expect(state.tenant).toEqual({ id: 'ikea', name: 'IKEA' });
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('amicis-auth-storage', 'invalid-json');

    // Should not throw and return initial state
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });
});
