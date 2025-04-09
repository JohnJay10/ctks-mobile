import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../auth/LoginScreen';
import AdminStack from './AdminStack';
import VendorStack from './VendorStack';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { authState, loading: authLoading } = useAuth();
  const [appReady, setAppReady] = useState(false);

  // Debugging logs
  useEffect(() => {
    console.log('Auth State:', authState);
    console.log('Auth Loading:', authLoading);
  }, [authState, authLoading]);

  // App initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 1000); // Minimum splash time

    return () => clearTimeout(timer);
  }, []);

  if (!appReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {authState.authenticated === true ? (
          authState.userType === 'admin' ? (
            <Stack.Screen
              name="AdminStack"
              component={AdminStack}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="VendorStack"
              component={VendorStack}
              options={{ headerShown: false }}
            />
          )
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

type AdminStackParamList = {
  AdminDashboard: undefined;
  VendorManagement: undefined;
  CustomerVerification: undefined;
  PricingSettings: undefined;
  TokenRequests: undefined;
  Analytics: undefined;
  Settings: undefined;
};
export default AppNavigator;