import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, useTheme, Card, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { AdminStackParamList } from '../../navigation/AdminStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import VendorView from '../../features/admin/Vendors/VendorListScreen';
import VerificationView from '../../features/admin/Verification/VerificationScreen';
import PricingViews from '../../features/admin/PriceSettingsScreen';
import TokenManagementViews from '../../features/admin/TokenManagementScreen';

const AdminDashboard = () => {
  const { colors } = useTheme();
  const { onLogout, api, authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendors' | 'customers' | 'pricing' | 'tokens'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    pendingVendors: 0,
    pendingCustomers: 0,
    tokenRequests: 0,
    loading: true,
    recentActivities: [
      { id: 1, action: 'Vendor Created', time: '10 mins ago', status: 'completed' },
      { id: 2, action: 'Customer Verified', time: '25 mins ago', status: 'completed' },
      { id: 3, action: 'Token Sent', time: '1 hour ago', status: 'completed' },
    ]
  });

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      setRefreshing(true);
      
      // Fetch the counts from API
      const [vendorsRes, customersRes, tokensRes] = await Promise.all([
        api.get('/admin/pending-vendor-count', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } })),
        api.get('/admin/customer-verification-count', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } })),
        api.get('/admin/token-request-count', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } }))
      ]);

      // Use hardcoded recent activities
      const hardcodedActivities = [
        { id: 1, action: 'Vendor Created', time: '10 mins ago', status: 'completed' },
        { id: 2, action: 'Customer Verified', time: '25 mins ago', status: 'completed' },
        { id: 3, action: 'Token Sent', time: '1 hour ago', status: 'completed' },
      ];
  
      setDashboardData({
        pendingVendors: vendorsRes.data.count || 0,
        pendingCustomers: customersRes.data.count || 0,
        tokenRequests: tokensRes.data.count || 0,
        recentActivities: hardcodedActivities,
        loading: false
      });
  
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false
      }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => onLogout() },
      ],
      { cancelable: false }
    );
  };

  const onRefresh = () => {
    fetchDashboardData();
  };

  // Reusable components
  const StatCard = ({ title, value, icon, color }) => (
    <Card style={styles.statCard}>
      <View style={styles.statContent}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>
          {dashboardData.loading ? '...' : value}
        </Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </Card>
  );

  const QuickAction = ({ title, icon, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickActionContent}>
        <MaterialIcons name={icon} size={24} color={colors.primary} />
        <Text style={styles.quickActionText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const ActivityItem = ({ action, time, status }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityContent}>
        <MaterialIcons 
          name={status === 'completed' ? 'check-circle' : 'access-time'} 
          size={20} 
          color={status === 'completed' ? '#4CAF50' : '#FFC107'} 
        />
        <View style={styles.activityText}>
          <Text style={styles.activityAction}>{action}</Text>
          <Text style={styles.activityTime}>{time}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#9E9E9E" />
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'vendors': return <VendorView />;
      case 'customers': return <VerificationView />;
      case 'pricing': return <PricingViews />;
      case 'tokens': return <TokenManagementViews />;
      default:
        return (
          <ScrollView 
            style={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          >
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <StatCard 
                title="Pending Vendors" 
                value={dashboardData.pendingVendors} 
                icon="people-outline"
                color="#FF6B6B"
              />
              <StatCard 
                title="Customers to Verify" 
                value={dashboardData.pendingCustomers} 
                icon="person-add"
                color="#4ECDC4"
              />
              <StatCard 
                title="Token Requests" 
                value={dashboardData.tokenRequests} 
                icon="vpn-key"
                color="#FFD166"
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <QuickAction 
                title="Create Vendor"
                icon="person-add"
                onPress={() => setActiveTab('vendors')}
              />
              <QuickAction 
                title="Verify Customer"
                icon="verified-user"
                onPress={() => setActiveTab('customers')}
              />
              <QuickAction 
                title="Set Pricing"
                icon="attach-money"
                onPress={() => setActiveTab('pricing')}
              />
            </View>

            {/* Recent Activity - Using hardcoded values */}
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.activityCard}>
              {dashboardData.recentActivities.map(activity => (
                <ActivityItem 
                  key={activity.id}
                  action={activity.action}
                  time={activity.time}
                  status={activity.status}
                />
              ))}
            </Card>
          </ScrollView>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Logout Button */}
      <LinearGradient
        colors={[colors.primary, '#3a7bd5']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Image
            source={require('../../../assets/logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome Admin</Text>
            <Text style={styles.adminName}>CTKs Management</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
        <NavButton
          icon="dashboard"
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onPress={() => setActiveTab('dashboard')}
        />
        <NavButton
          icon="people-outline"
          label="Vendors"
          active={activeTab === 'vendors'}
          onPress={() => setActiveTab('vendors')}
        />
        <NavButton
          icon="verified-user"
          label="Customers"
          active={activeTab === 'customers'}
          onPress={() => setActiveTab('customers')}
        />
        <NavButton
          icon="attach-money"
          label="Pricing"
          active={activeTab === 'pricing'}
          onPress={() => setActiveTab('pricing')}
        />
        <NavButton
          icon="vpn-key"
          label="Tokens"
          active={activeTab === 'tokens'}
          onPress={() => setActiveTab('tokens')}
        />
      </View>
    </View>
  );
};

// NavButton Component
const NavButton = ({ icon, label, active, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity 
      style={[styles.navButton, active && styles.activeNavButton]} 
      onPress={onPress}
    >
      <MaterialIcons 
        name={icon} 
        size={24} 
        color={active ? colors.primary : '#757575'} 
      />
      <Text style={[styles.navLabel, active && { color: colors.primary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: 'white',
    fontSize: 14,
  },
  adminName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '30%',
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    padding: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
    color: '#424242',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickAction: {
    width: '30%',
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
  },
  quickActionContent: {
    padding: 12,
    alignItems: 'center',
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    color: '#424242',
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    marginLeft: 12,
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    color: '#424242',
  },
  activityTime: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
   bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    position: 'absolute', // Add absolute positioning
    bottom: 0,            // Position at bottom
    left: 0,              // Stretch full width
    right: 0,
    backgroundColor: 'white', // Ensure background color is set
    height: 60,          // Set a fixed height
    marginBottom: 10,    // Negative margin to move it up
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#757575',
  },
  activeNavButton: {
    borderTopWidth: 2,
    borderTopColor: '#6200ee',
  },
});

export default AdminDashboard;