import axios from 'axios';
import { PlaceOrderPayload, PlaceOrderResponse, OrderStatusResponse } from '../types';

export const TOKEN_STORAGE_KEY = 'food_delivery_token';

// Create Axios instance pointing to Vite dev proxy (/api)
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Attach JWT token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-recover from 401 Unauthorized by clearing stale tokens & re-authenticating
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      try {
        const newToken = await ensureAuthToken();
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(error.config);
      } catch (e) {
        console.error('Failed to auto-refresh token after 401:', e);
      }
    }
    return Promise.reject(error);
  }
);

// Function to ensure dev authentication token is available
export async function ensureAuthToken(): Promise<string> {
  const existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (existingToken) {
    return existingToken;
  }

  try {
    const response = await axios.post<{ token: string }>('/api/dev/token', {
      userId: 'user-123',
    });
    const token = response.data.token;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      return token;
    }
    throw new Error('No token returned from dev token endpoint');
  } catch (error) {
    console.error('Failed to auto-fetch dev authentication token:', error);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    throw error;
  }
}

// API Methods
export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResponse> {
  await ensureAuthToken();
  const response = await apiClient.post<PlaceOrderResponse>('/orders', payload);
  return response.data;
}

export async function fetchOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  await ensureAuthToken();
  // Append timestamp query parameter to defeat browser/proxy HTTP caching
  const response = await apiClient.get<OrderStatusResponse>(`/orders/${orderId}/status?_t=${Date.now()}`);
  return response.data;
}
