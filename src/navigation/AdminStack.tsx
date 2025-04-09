import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VerificationScreen from '../features/admin/Verification/VerificationScreen';
import VendorListScreen from '../features/admin/Vendors/VendorListScreen';
import AnalyticsScreen from '../features/admin/AnalyticsScreen';
import AdminHomeScreen from '../features/admin/DashboardScreen';

export type AdminStackParamList = {
  AdminHome: undefined;
  Verification: undefined;
  VendorManagement: undefined;
  Analytics: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome" // Changed from "Verification"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#333' },
        headerTintColor: '#333',
      }}
    >
      <Stack.Screen 
        name="AdminHome" 
        component={AdminHomeScreen}
        options={{ title: 'Admin Dashboard' }}
      />

      <Stack.Screen 
        name="Verification" 
        component={VerificationScreen}
        options={{ title: 'Verification' }}
      />

      <Stack.Screen 
        name="VendorManagement" 
        component={VendorListScreen}
        options={{ title: 'Vendor Management' }}
      />

      <Stack.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics Dashboard' }}
      />
    </Stack.Navigator>
  );
}