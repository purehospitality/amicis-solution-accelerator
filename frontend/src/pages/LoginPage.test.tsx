import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { useAuthStore } from '../store/authStore';
import * as apiClient from '../services/api';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    exchangeToken: vi.fn(),
    setAuthToken: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      accessToken: null,
      tenant: null,
    });
  });

  it('renders login form with tenant ID and token inputs', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome to Amicis/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your tenant ID/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('displays demo credentials', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Demo Credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/ikea/i)).toBeInTheDocument();
    expect(screen.getByText(/demo-token/i)).toBeInTheDocument();
  });

  it('shows validation error for empty inputs', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter both tenant ID and token/i)).toBeInTheDocument();
    });
  });

  it('calls exchangeToken API on form submission', async () => {
    const mockResponse = {
      accessToken: 'test-access-token',
      tenant: {
        id: 'ikea',
        name: 'IKEA',
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    vi.mocked(apiClient.apiClient.exchangeToken).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const tenantInput = screen.getByPlaceholderText(/Enter your tenant ID/i);
    const tokenInput = screen.getByPlaceholderText(/Enter your token/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(tenantInput, { target: { value: 'ikea' } });
    fireEvent.change(tokenInput, { target: { value: 'test-token' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.apiClient.exchangeToken).toHaveBeenCalledWith('ikea:test-token');
    });
  });

  it('navigates to stores page on successful login', async () => {
    const mockResponse = {
      accessToken: 'test-access-token',
      tenant: {
        id: 'ikea',
        name: 'IKEA',
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    vi.mocked(apiClient.apiClient.exchangeToken).mockResolvedValue(mockResponse);

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const tenantInput = screen.getByPlaceholderText(/Enter your tenant ID/i);
    const tokenInput = screen.getByPlaceholderText(/Enter your token/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(tenantInput, { target: { value: 'ikea' } });
    fireEvent.change(tokenInput, { target: { value: 'test-token' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/stores');
    });
  });

  it('displays error message on API failure', async () => {
    vi.mocked(apiClient.apiClient.exchangeToken).mockRejectedValue(
      new Error('Invalid credentials')
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const tenantInput = screen.getByPlaceholderText(/Enter your tenant ID/i);
    const tokenInput = screen.getByPlaceholderText(/Enter your token/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(tenantInput, { target: { value: 'ikea' } });
    fireEvent.change(tokenInput, { target: { value: 'wrong-token' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    vi.mocked(apiClient.apiClient.exchangeToken).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const tenantInput = screen.getByPlaceholderText(/Enter your tenant ID/i);
    const tokenInput = screen.getByPlaceholderText(/Enter your token/i);
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(tenantInput, { target: { value: 'ikea' } });
    fireEvent.change(tokenInput, { target: { value: 'test-token' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
  });
});
