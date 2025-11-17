import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import api from '../services/api'; // Import your central API service

interface UserData {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  approved?: boolean;
  active?: boolean;
}

interface AuthState {
  token: string | null;
  authenticated: boolean | null;
  userType: 'admin' | 'vendor' | null;
  userData: UserData | null;
  initialized: boolean;
}

interface AuthProps {
  user: UserData | null;
  api: any; // Use the imported api instance
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
    userData: null,
    initialized: false
  });

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setLoading(true);
        const [token, userType, userData] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_TYPE_KEY),
          SecureStore.getItemAsync(USER_DATA_KEY)
        ]);

        console.log('🔐 Loading auth data:', { token: !!token, userType, userData: !!userData });

        if (token) {
          // Token will be automatically set by the API interceptor
          setAuthState({
            token,
            authenticated: true,
            userType: userType as 'admin' | 'vendor' | null,
            userData: userData ? JSON.parse(userData) : null,
            initialized: true
          });
        } else {
          setAuthState(prev => ({
            ...prev,
            authenticated: false,
            initialized: true
          }));
        }
      } catch (error) {
        console.error('Failed to load auth data', error);
        setAuthState(prev => ({
          ...prev,
          authenticated: false,
          initialized: true
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
      console.log('🔐 Admin login attempt:', username);
      
      const response = await api.post('/admin/login', { username, password });
      
      console.log('✅ Admin login response:', response.data);
      
      if (!response.data.token) {
        throw new Error('No token received');
      }

      const userData = {
        id: response.data._id,
        username: response.data.username,
        role: response.data.role,
        permissions: response.data.permissions,
        active: response.data.active
      };
      
      const userDataString = JSON.stringify(userData);

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.data.token),
        SecureStore.setItemAsync(USER_TYPE_KEY, 'admin'),
        SecureStore.setItemAsync(USER_DATA_KEY, userDataString)
      ]);

      setAuthState({
        token: response.data.token,
        authenticated: true,
        userType: 'admin',
        userData: userData,
        initialized: true
      });

      return userData;
    } catch (error: any) {
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
      console.log('🔐 Vendor login attempt:', email);
      
      const response = await api.post('/vendor/login', { email, password });
      
      console.log('✅ Vendor login response:', response.data);
      
      if (!response.data.token) {
        throw new Error('No token received');
      }

      const userData = {
        id: response.data._id,
        username: response.data.username,
        email: response.data.email,
        role: response.data.role,
        approved: response.data.approved,
        active: response.data.active
      };
      
      const userDataString = JSON.stringify(userData);

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.data.token),
        SecureStore.setItemAsync(USER_TYPE_KEY, 'vendor'),
        SecureStore.setItemAsync(USER_DATA_KEY, userDataString)
      ]);

      setAuthState({
        token: response.data.token,
        authenticated: true,
        userType: 'vendor',
        userData: userData,
        initialized: true
      });

      return userData;
    } catch (error: any) {
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

      setAuthState({
        token: null,
        authenticated: false,
        userType: null,
        userData: null,
        initialized: true
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
    api, // Use the imported api instance
    authState,
    onAdminLogin: AdminLogin,
    onVendorLogin: VendorLogin,
    onLogout: logout,
    loading,
    initialized
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};