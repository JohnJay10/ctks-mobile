import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  useWindowDimensions 
} from 'react-native';
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

// Responsive scaling functions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro - 393x852)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

const scale = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Check if device is small screen
const isSmallScreen = SCREEN_WIDTH < 375;
const isLargeScreen = SCREEN_WIDTH > 414;

const VendorDashboard = () => {
  const { colors } = useTheme();
  const { onLogout, api, authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'tokens'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<VendorDashboardNavigationProp>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // Check orientation
  const isLandscape = windowWidth > windowHeight;

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
      
      console.log('🔄 Fetching vendor dashboard data...');

      const [customersRes, tokensRes, activitiesRes, pendingRes] = await Promise.all([
        api.get('/vendor/getCustomerCount').catch((error) => {
          console.error('Customer count error:', error.response?.data || error.message);
          return { data: { count: 0 } };
        }),
        api.get('/vendor/getIssuedTokenCount').catch((error) => {
          console.error('Token count error:', error.response?.data || error.message);
          return { data: { count: 0 } };
        }),
        api.get('/vendor/activities').catch((error) => {
          console.error('Activities error:', error.response?.data || error.message);
          return { data: { activities: [] } };
        }),
        api.get('/vendor/getPendingRequestCount').catch((error) => {
          console.error('Pending requests error:', error.response?.data || error.message);
          return { data: { count: 0 } };
        })
      ]);

      const activitiesData = activitiesRes.data?.activities || [];
      const formattedActivities = activitiesData.map((activity: any) => ({
        id: activity._id || activity.id || Math.random().toString(),
        action: getActivityAction(activity.type),
        time: formatTime(activity.createdAt || new Date().toISOString()),
        status: activity.status || 'pending',
        type: activity.type || 'other'
      }));

      setDashboardData({
        totalCustomers: customersRes.data?.count || 0,
        availableTokens: tokensRes.data?.count || 0,
        pendingRequests: pendingRes.data?.count || 0,
        recentActivities: formattedActivities,
        loading: false
      });

    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
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
    <Card style={[
      styles.statCard,
      isLandscape && styles.statCardLandscape,
      isSmallScreen && styles.statCardSmall
    ]}>
      <View style={styles.statContent}>
        <View style={[
          styles.statIconContainer, 
          { backgroundColor: color + '20' },
          isSmallScreen && styles.statIconContainerSmall
        ]}>
          <MaterialIcons 
            name={icon} 
            size={isSmallScreen ? scale(18) : scale(20)} 
            color={color} 
          />
        </View>
        <Text style={[
          styles.statValue,
          isSmallScreen && styles.statValueSmall,
          isLandscape && styles.statValueLandscape
        ]}>
          {dashboardData.loading ? '...' : value}
        </Text>
        <Text style={[
          styles.statTitle,
          isSmallScreen && styles.statTitleSmall,
          isLandscape && styles.statTitleLandscape
        ]}>
          {title}
        </Text>
      </View>
    </Card>
  );

  const QuickAction = ({ title, icon, onPress }: { title: string; icon: string; onPress: () => void }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.quickAction,
        isLandscape && styles.quickActionLandscape
      ]}
    >
      <View style={styles.quickActionContent}>
        <MaterialIcons 
          name={icon} 
          size={isSmallScreen ? scale(20) : scale(24)} 
          color={colors.primary} 
        />
        <Text style={[
          styles.quickActionText,
          isSmallScreen && styles.quickActionTextSmall
        ]}>
          {title}
        </Text>
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
          <MaterialIcons 
            name={iconName} 
            size={isSmallScreen ? scale(18) : scale(20)} 
            color={iconColor} 
          />
          <View style={styles.activityText}>
            <Text style={[
              styles.activityAction,
              isSmallScreen && styles.activityActionSmall
            ]}>
              {action}
            </Text>
            <Text style={[
              styles.activityTime,
              isSmallScreen && styles.activityTimeSmall
            ]}>
              {time}
            </Text>
          </View>
        </View>
        <MaterialIcons 
          name="chevron-right" 
          size={isSmallScreen ? scale(18) : scale(20)} 
          color="#9E9E9E" 
        />
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
            contentContainerStyle={[
              styles.scrollContent,
              isLandscape && styles.scrollContentLandscape
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[
              styles.statsRow,
              isLandscape && styles.statsRowLandscape
            ]}>
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

            <Text style={[
              styles.sectionTitle,
              isSmallScreen && styles.sectionTitleSmall,
              isLandscape && styles.sectionTitleLandscape
            ]}>
              Quick Actions
            </Text>
            <View style={[
              styles.quickActions,
              isLandscape && styles.quickActionsLandscape
            ]}>
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

            <Text style={[
              styles.sectionTitle,
              isSmallScreen && styles.sectionTitleSmall,
              isLandscape && styles.sectionTitleLandscape
            ]}>
              Recent Activity
            </Text>
            <Card style={styles.activityCard}>
              {dashboardData.recentActivities.length > 0 ? (
                dashboardData.recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} {...activity} />
                ))
              ) : (
                <Text style={styles.noActivitiesText}>
                  {dashboardData.loading ? 'Loading activities...' : 'No recent activities'}
                </Text>
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
        style={[
          styles.navButton, 
          active && styles.activeNavButton,
          isLandscape && styles.navButtonLandscape
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.navButtonContent}>
          <MaterialIcons 
            name={icon} 
            size={isSmallScreen ? scale(20) : scale(24)} 
            color={active ? colors.primary : '#757575'} 
          />
          <Text style={[
            styles.navLabel,
            isSmallScreen && styles.navLabelSmall,
            active && { color: colors.primary }
          ]}>
            {label}
          </Text>
        </View>
        {active && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <LinearGradient
        colors={[colors.primary, '#3a7bd5']}
        style={[
          styles.header,
          isLandscape && styles.headerLandscape
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Image
            source={require('../../../assets/logo.jpeg')}
            style={[
              styles.logo,
              isSmallScreen && styles.logoSmall
            ]}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={[
              styles.greeting,
              isSmallScreen && styles.greetingSmall
            ]}>
              Welcome Vendor
            </Text>
            <Text style={[
              styles.vendorName,
              isSmallScreen && styles.vendorNameSmall
            ]}>
              CTKs Vendor Portal
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <MaterialIcons 
              name="logout" 
              size={isSmallScreen ? scale(20) : scale(24)} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={[
        styles.contentContainer,
        isLandscape && styles.contentContainerLandscape
      ]}>
        {renderContent()}
      </View>

      {/* Responsive Bottom Navigation */}
      <View style={[
        styles.bottomNavContainer, 
        { backgroundColor: colors.surface },
        isLandscape && styles.bottomNavContainerLandscape
      ]}>
        <View style={[
          styles.bottomNav,
          isLandscape && styles.bottomNavLandscape
        ]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: scale(16),
    paddingTop: Platform.OS === 'ios' ? scale(50) : scale(16),
    paddingBottom: scale(20),
    borderBottomLeftRadius: scale(16),
    borderBottomRightRadius: scale(16),
  },
  headerLandscape: {
    paddingTop: scale(12),
    paddingBottom: scale(12),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    marginRight: scale(12),
  },
  logoSmall: {
    width: scale(35),
    height: scale(35),
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: 'white',
    fontSize: scale(14),
  },
  greetingSmall: {
    fontSize: scale(12),
  },
  vendorName: {
    color: 'white',
    fontSize: scale(18),
    fontWeight: 'bold',
  },
  vendorNameSmall: {
    fontSize: scale(16),
  },
  logoutButton: {
    padding: scale(8),
  },
  contentContainer: {
    flex: 1,
    marginBottom: verticalScale(70),
  },
  contentContainerLandscape: {
    marginBottom: verticalScale(60),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: verticalScale(20),
  },
  scrollContentLandscape: {
    padding: scale(12),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  statsRowLandscape: {
    marginBottom: verticalScale(16),
  },
  statCard: {
    width: scale(100),
    borderRadius: scale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardLandscape: {
    width: scale(90),
  },
  statCardSmall: {
    width: scale(85),
  },
  statContent: {
    padding: scale(12),
    alignItems: 'center',
  },
  statIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  statIconContainerSmall: {
    width: scale(35),
    height: scale(35),
  },
  statValue: {
    fontSize: scale(18),
    fontWeight: 'bold',
    marginBottom: scale(4),
  },
  statValueSmall: {
    fontSize: scale(16),
  },
  statValueLandscape: {
    fontSize: scale(16),
  },
  statTitle: {
    fontSize: scale(12),
    color: '#757575',
    textAlign: 'center',
  },
  statTitleSmall: {
    fontSize: scale(10),
  },
  statTitleLandscape: {
    fontSize: scale(10),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: 'bold',
    marginBottom: scale(12),
    marginTop: scale(8),
    color: '#424242',
  },
  sectionTitleSmall: {
    fontSize: scale(14),
  },
  sectionTitleLandscape: {
    fontSize: scale(14),
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  quickActionsLandscape: {
    marginBottom: verticalScale(16),
  },
  quickAction: {
    flex: 1,
    marginHorizontal: scale(4),
    borderRadius: scale(12),
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionLandscape: {
    marginHorizontal: scale(2),
  },
  quickActionContent: {
    padding: scale(16),
    alignItems: 'center',
  },
  quickActionText: {
    marginTop: scale(8),
    fontSize: scale(12),
    textAlign: 'center',
    color: '#424242',
    fontWeight: '500',
  },
  quickActionTextSmall: {
    fontSize: scale(10),
  },
  activityCard: {
    borderRadius: scale(12),
    padding: scale(16),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityText: {
    marginLeft: scale(12),
    flex: 1,
  },
  activityAction: {
    fontSize: scale(14),
    color: '#424242',
    fontWeight: '500',
  },
  activityActionSmall: {
    fontSize: scale(12),
  },
  activityTime: {
    fontSize: scale(12),
    color: '#9E9E9E',
    marginTop: scale(2),
  },
  activityTimeSmall: {
    fontSize: scale(10),
  },
  noActivitiesText: {
    textAlign: 'center',
    color: '#9E9E9E',
    paddingVertical: verticalScale(16),
    fontStyle: 'italic',
    fontSize: scale(14),
  },
  // Bottom Navigation Styles
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: Platform.OS === 'ios' ? scale(25) : scale(40),
  },
  bottomNavContainerLandscape: {
    marginBottom: Platform.OS === 'ios' ? scale(15) : scale(20),
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: verticalScale(60),
    paddingHorizontal: scale(8),
  },
  bottomNavLandscape: {
    height: verticalScale(50),
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  navButtonLandscape: {
    paddingVertical: scale(4),
  },
  navButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: scale(12),
    marginTop: scale(4),
    color: '#757575',
    fontWeight: '500',
  },
  navLabelSmall: {
    fontSize: scale(10),
  },
  activeNavButton: {
    // Active state handled by indicator
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: scale(4),
    height: scale(3),
    borderBottomLeftRadius: scale(2),
    borderBottomRightRadius: scale(2),
  },
});

export default VendorDashboard;