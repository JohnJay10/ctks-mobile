// src/services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Determine the correct base URL based on the platform
import { Platform } from 'react-native';

// Determine the correct base URL based on the platform
const getBaseUrl = () => {
  if (__DEV__) { // Only for development
    /**
     * Android Emulator: Use 10.0.2.2 to connect to localhost
     * iOS Simulator: Use localhost
     * Physical Device: Use your computer's local IP
     */
    return Platform.select({
      android: 'http://10.0.2.2:3000', // Default Node.js port
      ios: 'http://localhost:3000',
      default: 'http://192.168.1.100:3000' // Replace with your actual local IP
    });
  }
  return 'https://your-production-api.com'; // For production
};


const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to inject auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
    }
    return Promise.reject(error);
  }
);

export default api;