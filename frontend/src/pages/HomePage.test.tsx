import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuthStore } from '../store/authStore';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock auth store
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('HomePage', () => {
  const mockNavigate = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

  it('renders no store selected message when no store in state', () => {
    (useLocation as any).mockReturnValue({ state: null });
    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('No Store Selected')).toBeInTheDocument();
    expect(screen.getByText('Select Store')).toBeInTheDocument();
  });

  it('navigates to store selection when clicking Select Store button', () => {
    (useLocation as any).mockReturnValue({ state: null });
    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const selectButton = screen.getByText('Select Store');
    fireEvent.click(selectButton);

    expect(mockNavigate).toHaveBeenCalledWith('/stores');
  });

  it('renders store information when store is selected', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome to IKEA Stockholm')).toBeInTheDocument();
    expect(screen.getByText(/Tenant: IKEA/)).toBeInTheDocument();
  });

  it('displays store ID and backend URL', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/IKEA001/)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/backend.example.com/)).toBeInTheDocument();
  });

  it('calls logout and navigates to login when clicking Logout button', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('navigates to store selection when clicking Change Store button', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const changeStoreButton = screen.getByText('Change Store');
    fireEvent.click(changeStoreButton);

    expect(mockNavigate).toHaveBeenCalledWith('/stores');
  });

  it('displays Unknown tenant when tenant info is missing', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: null,
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Tenant: Unknown/)).toBeInTheDocument();
  });

  it('displays route information including backend context', () => {
    const mockStore = {
      storeId: 'IKEA001',
      name: 'IKEA Stockholm',
      backendUrl: 'https://backend.example.com',
    };

    const mockRouteInfo = {
      storeId: 'IKEA001',
      backendUrl: 'https://backend.example.com',
      backendContext: '/api/v1',
    };

    (useLocation as any).mockReturnValue({
      state: { store: mockStore, routeInfo: mockRouteInfo },
    });

    (useAuthStore as any).mockReturnValue({
      tenant: { name: 'IKEA' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/\/api\/v1/)).toBeInTheDocument();
  });
});
