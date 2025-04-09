import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios, { AxiosInstance, AxiosError } from 'axios'; 
import { Alert } from 'react-native';

interface UserData {
  id: string;
  username?: string;
  email?: string;
  // Add other user properties as needed
}

interface AuthState {
  token: string | null;
  authenticated: boolean | null;
  userType: 'admin' | 'vendor' | null;
  userData: UserData | null;
}

interface AuthProps {
  user: UserData | null;
  api: AxiosInstance;
  authState: AuthState;
  onAdminLogin: (username: string, password: string) => Promise<any>;
  onVendorLogin: (email: string, password: string) => Promise<any>;
  onLogout: () => Promise<void>;
  loading: boolean;
  initialized: boolean;
}

const TOKEN_KEY = 'auth-token';
const USER_TYPE_KEY = 'user-type';
const USER_DATA_KEY = 'user-data';

const AuthContext = createContext<AuthProps>({} as AuthProps);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    authenticated: null,
    userType: null,
    userData: null
  });

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const LOCAL_IP = '192.168.13.50';
  const api = axios.create({
    baseURL: `http://${LOCAL_IP}:3000/api`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }    
  });

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setLoading(true);
        const [token, userType, userData] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_TYPE_KEY),
          SecureStore.getItemAsync(USER_DATA_KEY)
        ]);

        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setAuthState({
            token,
            authenticated: true,
            userType: userType as 'admin' | 'vendor' | null,
            userData: userData ? JSON.parse(userData) : null
          });
        } else {
          setAuthState(prev => ({
            ...prev,
            authenticated: false
          }));
        }
      } catch (error) {
        console.error('Failed to load auth data', error);
        setAuthState(prev => ({
          ...prev,
          authenticated: false
        }));
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    loadAuthData();
  }, []);

  const AdminLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response = await api.post('/admin/login', { username, password });
      
      if (!response.data.token) {
        throw new Error('No token received');
      }

      const userData = response.data.user || {};
      const userDataString = JSON.stringify(userData);

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.data.token),
        SecureStore.setItemAsync(USER_TYPE_KEY, 'admin'),
        SecureStore.setItemAsync(USER_DATA_KEY, userDataString)
      ]);

      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setAuthState({
        token: response.data.token,
        authenticated: true,
        userType: 'admin',
        userData: userData
      });

      return userData;
    } catch (e) {
      const error = e as AxiosError;
      console.error('Admin login error:', error.response?.data || error.message);
      
      let errorMsg = 'Invalid username or password';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        errorMsg = 'Network error - please check your connection';
      }
      
      Alert.alert('Login Failed', errorMsg);
      return { error: true, msg: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const VendorLogin = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await api.post('/vendor/login', { email, password });
      
      if (!response.data.token) {
        throw new Error('No token received');
      }

      const userData = response.data.user || {};
      const userDataString = JSON.stringify(userData);

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.data.token),
        SecureStore.setItemAsync(USER_TYPE_KEY, 'vendor'),
        SecureStore.setItemAsync(USER_DATA_KEY, userDataString)
      ]);

      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setAuthState({
        token: response.data.token,
        authenticated: true,
        userType: 'vendor',
        userData: userData
      });

      return userData;
    } catch (e) {
      const error = e as AxiosError;
      console.error('Vendor login error:', error.response?.data || error.message);
      
      let errorMsg = 'Invalid email or password';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        errorMsg = 'Network error - please check your connection';
      }
      
      Alert.alert('Login Failed', errorMsg);
      return { error: true, msg: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_TYPE_KEY),
        SecureStore.deleteItemAsync(USER_DATA_KEY)
      ]);

      delete api.defaults.headers.common['Authorization'];

      setAuthState({
        token: null,
        authenticated: false,
        userType: null,
        userData: null
      });
    } catch (error) {
      console.error('Failed to logout', error);
      Alert.alert('Error', 'Failed to logout properly');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user: authState.userData,
    api,
    authState,
    onAdminLogin: AdminLogin,
    onVendorLogin: VendorLogin,
    onLogout: logout,
    loading,
    initialized
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};