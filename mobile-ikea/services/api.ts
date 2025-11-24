import axios, { AxiosInstance } from 'axios';
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
          config.headers.Authorization = `Bearer ${token}`;
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
    const response = await this.client.get(`/stores/${storeId}`);
    return response.data;
  }

  // Product endpoints
  async getProductByArticle(articleNumber: string, storeId: string) {
    const response = await this.client.get(
      `/commerce/products/by-article/${articleNumber}`,
      { params: { storeId } }
    );
    return response.data;
  }

  async getAvailability(storeId: string, articleNumber: string) {
    const response = await this.client.get(
      `/commerce/availability/${storeId}/${articleNumber}`
    );
    return response.data;
  }

  async getPricing(storeId: string, articleNumber: string) {
    const response = await this.client.get(
      `/commerce/pricing/${storeId}/${articleNumber}`
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
    await this.client.delete(`/commerce/wishlist/items/${itemId}`);
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
      `/commerce/checkout/sessions/${sessionId}/status`
    );
    return response.data;
  }
}

export default new ApiService();
