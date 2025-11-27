// src/services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use the same IP address as your AuthContext
const LOCAL_IP = '192.168.100.16'; // Make sure this matches your computer's IP

// Determine the correct base URL based on the environment
const getBaseUrl = () => {
  if (__DEV__) {
    /**
     * For physical devices on the same network, use your computer's IP
     * For emulators/simulators, use their specific localhost addresses
     */
    return Platform.select({
      android: __DEV__ && !Platform.isTV ? `http://${LOCAL_IP}:3000/api` : 'http://10.0.2.2:3000/api',
      ios: __DEV__ && !Platform.isTV ? `http://${LOCAL_IP}:3000/api` : 'http://localhost:3000/api',
      default: `http://${LOCAL_IP}:3000/api` // Fallback for physical devices
    });
  }
  // Production URL
  return 'https://ctks.onrender.com/api';
};

// Alternative: Environment-based configuration
const getEnvironmentBaseUrl = () => {
  // You can also use environment variables
  const environment = process.env.NODE_ENV || 'development';
  
  switch (environment) {
    case 'production':
      return 'https://ctks.onrender.com/api';
    case 'staging':
      return 'https://ctks-staging.onrender.com/api'; // If you have staging
    case 'development':
    default:
      return Platform.select({
        android: 'http://10.0.2.2:3000/api',
        ios: 'http://localhost:3000/api',
        default: `http://${LOCAL_IP}:3000/api`
      });
  }
};

const api = axios.create({
  baseURL: getBaseUrl(), // Use the main function
  timeout: 15000, // Increased timeout for mobile networks
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to inject auth token
api.interceptors.request.use(async (config) => {
  try {
    // Use the same token key as your AuthContext
    const token = await SecureStore.getItemAsync('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token added to request:', config.url);
    } else {
      console.log('🔐 No token found for request:', config.url);
    }
  } catch (error) {
    console.error('Error getting token from storage:', error);
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      console.log('Unauthorized - redirect to login');
      // You could trigger logout here if needed
    }
    
    // Handle network errors specifically
    if (error.message === 'Network Error') {
      console.log('🌐 Network error - check connection and server');
    }
    
    return Promise.reject(error);
  }
);

// Export the base URL for use in other parts of your app
export const API_BASE_URL = getBaseUrl();
export default api;