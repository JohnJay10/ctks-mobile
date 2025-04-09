import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import VendorDashboardScreen from '../features/vendor/DashboardScreen';
import AddCustomerScreen from '../features/vendor/Customers/AddCustomerScreen';
import CustomerListScreen from '../features/vendor/Customers/CustomerListScreen';
import RequestTokenScreen from '../features/vendor/Tokens/RequestTokenScreen';
import VendorTokenScreen from '../features/vendor/Tokens/VendorTokenScreen';

export type VendorStackParamList = {
  VendorDashboard: undefined;
  AddCustomer: undefined;
  CustomerList: undefined;
  RequestToken: { customerId?: string };
  ViewTokens: undefined;
};

const Stack = createNativeStackNavigator<VendorStackParamList>();

export default function VendorStack() {
  return (
    <Stack.Navigator
      initialRouteName="VendorDashboard"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: 'bold', color: '#333' },
        headerTintColor: '#333',
      }}
    >
      <Stack.Screen 
        name="VendorDashboard" 
        component={VendorDashboardScreen}
        options={{ title: 'CTKs Vendor Dashboard' }}
      />

      <Stack.Screen 
        name="AddCustomer" 
        component={AddCustomerScreen}
        options={{ title: 'Add New Customer' }}
      />

      <Stack.Screen 
        name="CustomerList" 
        component={CustomerListScreen}
        options={{ title: 'My Customers' }}
      />

      <Stack.Screen 
        name="RequestToken" 
        component={RequestTokenScreen}
        options={{ title: 'Request Token' }}
      />

      <Stack.Screen 
        name="ViewTokens" 
        component={VendorTokenScreen}
        options={{ title: 'My Tokens' }}
      />
    </Stack.Navigator>
  );
}