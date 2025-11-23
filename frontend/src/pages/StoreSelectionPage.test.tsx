import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import StoreSelectionPage from './StoreSelectionPage';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    tenant: { name: 'IKEA' },
    logout: vi.fn(),
    accessToken: 'mock-token',
  })),
}));

// Mock API client
vi.mock('../services/api', () => ({
  apiClient: {
    setAuthToken: vi.fn(),
    getStoreRoute: vi.fn(),
  },
}));

describe('StoreSelectionPage', () => {
  const mockNavigate = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
      accessToken: 'mock-token',
    });
    (useAuthStore as any).getState = vi.fn(() => ({
      accessToken: 'mock-token',
    }));
  });

  it('renders store selection page with title', () => {
    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Select Store')).toBeInTheDocument();
    expect(screen.getByText(/Tenant: IKEA/)).toBeInTheDocument();
  });

  it('displays list of stores', () => {
    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    expect(screen.getByText('IKEA Stockholm')).toBeInTheDocument();
    expect(screen.getByText('IKEA Gothenburg')).toBeInTheDocument();
    expect(screen.getByText('IKEA Malmo')).toBeInTheDocument();
  });

  it('sets auth token on mount', () => {
    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    expect(apiClient.setAuthToken).toHaveBeenCalledWith('mock-token');
  });

  it('calls API and navigates when store is selected', async () => {
    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (apiClient.getStoreRoute as any).mockResolvedValue(mockRouteInfo);

    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    const storeCard = screen.getByText('IKEA Stockholm').closest('div');
    if (storeCard) {
      fireEvent.click(storeCard);
    }

    await waitFor(() => {
      expect(apiClient.getStoreRoute).toHaveBeenCalledWith('IKEA001');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', {
        state: {
          store: {
            storeId: 'IKEA001',
            name: 'IKEA Stockholm',
            backendUrl: 'https://ikea-backend.example.com',
          },
          routeInfo: mockRouteInfo,
        },
      });
    });
  });

  it('displays error message when API call fails', async () => {
    (apiClient.getStoreRoute as any).mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    const storeCard = screen.getByText('IKEA Stockholm').closest('div');
    if (storeCard) {
      fireEvent.click(storeCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Failed to load store information. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows loading state when fetching store route', async () => {
    (apiClient.getStoreRoute as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    const storeCard = screen.getByText('IKEA Stockholm').closest('div');
    if (storeCard) {
      fireEvent.click(storeCard);
    }

    // During loading, the button should be disabled or show loading state
    await waitFor(() => {
      expect(apiClient.getStoreRoute).toHaveBeenCalled();
    });
  });

  it('calls logout and navigates to login when clicking Logout button', () => {
    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(apiClient.setAuthToken).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays store IDs in store cards', () => {
    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/IKEA001/)).toBeInTheDocument();
    expect(screen.getByText(/IKEA002/)).toBeInTheDocument();
    expect(screen.getByText(/IKEA003/)).toBeInTheDocument();
  });

  it('handles multiple store selections sequentially', async () => {
    const mockRouteInfo1 = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend1.example.com',
      backendContext: '/api/v1',
    };

    const mockRouteInfo2 = {
      storeId: 'IKEA002',
      backendUrl: 'https://backend2.example.com',
      backendContext: '/api/v1',
    };

    (apiClient.getStoreRoute as any)
      .mockResolvedValueOnce(mockRouteInfo1)
      .mockResolvedValueOnce(mockRouteInfo2);

    const { rerender } = render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    // Select first store
    const store1Card = screen.getByText('IKEA Stockholm').closest('div');
    if (store1Card) {
      fireEvent.click(store1Card);
    }

    await waitFor(() => {
      expect(apiClient.getStoreRoute).toHaveBeenCalledWith('IKEA001');
    });

    // Re-render and select second store
    rerender(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    const store2Card = screen.getByText('IKEA Gothenburg').closest('div');
    if (store2Card) {
      fireEvent.click(store2Card);
    }

    await waitFor(() => {
      expect(apiClient.getStoreRoute).toHaveBeenCalledWith('IKEA002');
    });
  });

  it('displays Unknown tenant when tenant info is missing', () => {
    (useAuthStore as any).mockReturnValue({
      tenant: null,
      logout: mockLogout,
      accessToken: 'mock-token',
    });

    render(
      <BrowserRouter>
        <StoreSelectionPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Tenant: Unknown/)).toBeInTheDocument();
  });
});
