import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || '';

class ApiClient {
  private authApi: AxiosInstance;
  private routingApi: AxiosInstance;

  constructor() {
    this.authApi = axios.create({
      baseURL: AUTH_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.routingApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.routingApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.routingApi.defaults.headers.common['Authorization'];
    }
  }

  // Auth Service APIs
  async exchangeToken(userToken: string) {
    const response = await this.authApi.post('/auth/exchange', {
      userToken,
    });
    return response.data;
  }

  // Routing Service APIs
  async getStoreRoute(storeId: string) {
    const response = await this.routingApi.get('/api/v1/route', {
      params: { storeId },
    });
    return response.data;
  }

  async getStores() {
    const response = await this.routingApi.get('/api/v1/stores');
    return response.data;
  }

  // Health checks
  async checkAuthHealth() {
    const response = await this.authApi.get('/health');
    return response.data;
  }

  async checkRoutingHealth() {
    const response = await this.routingApi.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
