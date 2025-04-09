import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../auth/AuthContext';
import { VendorStackParamList } from '../../navigation/VendorStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomerListScreen from '../../features/vendor/Customers/CustomerListScreen';
import VendorTokenScreen from '../../features/vendor/Tokens/VendorTokenScreen';

type VendorDashboardNavigationProp = NativeStackNavigationProp<VendorStackParamList, 'VendorDashboard'>;

interface Activity {
  id: string;
  action: string;
  time: string;
  status: 'completed' | 'pending';
  type: 'customer_added' | 'token_requested' | 'payment_received';
  createdAt: string;
}

interface DashboardData {
  totalCustomers: number;
  pendingRequests: number;
  availableTokens: number;
  loading: boolean;
  recentActivities: Activity[];
}

const VendorDashboard = () => {
  const { colors } = useTheme();
  const { onLogout, api, authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'tokens'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<VendorDashboardNavigationProp>();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalCustomers: 0,
    pendingRequests: 0,
    availableTokens: 0,
    loading: true,
    recentActivities: []
  });

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      setRefreshing(true);
      
      // Fetch all vendor-specific data in parallel
      const [customersRes, tokensRes, activitiesRes, pendingRes] = await Promise.all([
        api.get('/vendor/getCustomerCount', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } })),
        api.get('/tokens/issuedtokencount', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } })),
        api.get('/vendor/activities', {
          headers: { Authorization: `Bearer ${authState.token}` }   
        }).catch(() => ({ data: [] })),
        api.get('/vendor/getPendingRequestCount', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }).catch(() => ({ data: { count: 0 } }))
      ]);
  
      // Safely process activities data
      const activitiesData = Array.isArray(activitiesRes.data) ? activitiesRes.data : [];
      const formattedActivities = activitiesData.map((activity: any) => ({
        id: activity._id || activity.id || Math.random().toString(),
        action: getActivityAction(activity.type),
        time: formatTime(activity.createdAt || new Date().toISOString()),
        status: activity.status || 'pending',
        type: activity.type || 'other'
      }));
  
      setDashboardData({
        totalCustomers: customersRes.data.count || 0,
        availableTokens: tokensRes.data.count || 0,
        pendingRequests: pendingRes.data.count || 0,
        recentActivities: activitiesRes.data.activities,
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

  const getActivityAction = (type: string) => {
    switch (type) {
      case 'customer_added': return 'Customer Added';
      case 'token_requested': return 'Token Requested';
      case 'payment_received': return 'Payment Received';
      default: return 'Activity';
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
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

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
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

  const QuickAction = ({ title, icon, onPress }: { title: string; icon: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickActionContent}>
        <MaterialIcons name={icon} size={24} color={colors.primary} />
        <Text style={styles.quickActionText}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const ActivityItem = ({ action, time, status, type }: Activity) => {
    let iconName = 'info';
    let iconColor = '#9E9E9E';
    
    switch (type) {
      case 'customer_added':
        iconName = status === 'completed' ? 'person-add' : 'person-outline';
        iconColor = status === 'completed' ? '#4CAF50' : '#FFC107';
        break;
      case 'token_requested':
        iconName = status === 'completed' ? 'vpn-key' : 'hourglass-empty';
        iconColor = status === 'completed' ? '#2196F3' : '#FF9800';
        break;
      case 'payment_received':
        iconName = status === 'completed' ? 'payment' : 'attach-money';
        iconColor = status === 'completed' ? '#8BC34A' : '#CDDC39';
        break;
    }

    return (
      <View style={styles.activityItem}>
        <View style={styles.activityContent}>
          <MaterialIcons name={iconName} size={20} color={iconColor} />
          <View style={styles.activityText}>
            <Text style={styles.activityAction}>{action}</Text>
            <Text style={styles.activityTime}>{time}</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#9E9E9E" />
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'customers': 
        return <CustomerListScreen />;
      case 'tokens': 
        return <VendorTokenScreen />;
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
            <View style={styles.statsRow}>
              <StatCard 
                title="Total Customers" 
                value={dashboardData.totalCustomers} 
                icon="people-outline"
                color="#4ECDC4"
              />
              <StatCard 
                title="Pending Requests" 
                value={dashboardData.pendingRequests} 
                icon="pending-actions"
                color="#FF6B6B"
              />
              <StatCard 
                title="Available Tokens" 
                value={dashboardData.availableTokens} 
                icon="vpn-key"
                color="#FFD166"
              />
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <QuickAction 
                title="Add Customers"
                icon="person-add"
                onPress={() => setActiveTab('customers')}
              />
              <QuickAction 
                title="Request Tokens"
                icon="vpn-key"
                onPress={() => setActiveTab('tokens')}
              />
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.activityCard}>
              {dashboardData.recentActivities.length > 0 ? (
                dashboardData.recentActivities.map(activity => (
                  <ActivityItem 
                    key={activity.id}
                    action={activity.action}
                    time={activity.time}
                    status={activity.status}
                    type={activity.type}
                  />
                ))
              ) : (
                <Text style={styles.noActivitiesText}>No recent activities</Text>
              )}
            </Card>
          </ScrollView>
        );
    }
  };

  const NavButton = ({ icon, label, active, onPress }: { 
    icon: string; 
    label: string; 
    active: boolean; 
    onPress: () => void 
  }) => {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <Text style={styles.greeting}>Welcome Vendor</Text>
            <Text style={styles.vendorName}>CTKs Vendor Portal</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
        <NavButton
          icon="dashboard"
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onPress={() => setActiveTab('dashboard')}
        />
        <NavButton
          icon="people-outline"
          label="Customers"
          active={activeTab === 'customers'}
          onPress={() => setActiveTab('customers')}
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
  vendorName: {
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
    width: '48%',
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
  noActivitiesText: {
    textAlign: 'center',
    color: '#9E9E9E',
    paddingVertical: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
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

export default VendorDashboard;