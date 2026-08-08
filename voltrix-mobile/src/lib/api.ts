import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Change this to your ALB URL when deployed
// For local dev use your machine's local IP (not localhost — device can't reach localhost)
const API_URL = __DEV__
  ? 'http://192.168.1.100:8090/v1'  // Replace with your local IP: run `ip addr` to find it
  : 'http://voltrix-alb-prod-1152339653.eu-west-1.elb.amazonaws.com/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('voltrix_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('voltrix_access_token');
      await SecureStore.deleteItemAsync('voltrix_refresh_token');
    }
    return Promise.reject(error);
  }
);

export default api;
