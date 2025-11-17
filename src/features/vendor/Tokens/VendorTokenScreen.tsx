import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  RefreshControl,
  Modal,
  AppState,
  Clipboard,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Text, 
  useTheme, 
  Card, 
  Button, 
  ActivityIndicator, 
  List,
  IconButton,
  DataTable
} from 'react-native-paper';
import { useAuth } from '../../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

interface Token {
  _id: string;
  txRef: string;
  meterNumber: string;
  disco: string;
  units: number;
  amount: number;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'issued' | 'rejected';
  paymentMethod: 'manual' | 'bankTransfer';
  paymentDetails?: string;
  paymentDate?: string;
  token?: string;
  createdAt: string;
  customerVerification?: {
    MTK1?: string;
    MTK2?: string;
    RTK1?: string;
    RTK2?: string;
    isVerified?: boolean;
  };
}

interface Customer {
  _id: string;
  meterNumber: string;
  disco: string;
  name?: string;
  verification: {
    isVerified: boolean;
    MTK1?: string;
    MTK2?: string;
    RTK1?: string;
    RTK2?: string;
  };
}

interface BankAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  isActive: boolean;
}

const VendorTokenScreen = () => {
  const { colors } = useTheme();
  const { api, authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'view' | 'history'>('request');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [verifiedCustomers, setVerifiedCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [discoPrices, setDiscoPrices] = useState<Record<string, number>>({});
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [currentRequest, setCurrentRequest] = useState<Token | null>(null);
  const [bankDetails, setBankDetails] = useState<BankAccount | null>(null);
  const [loadingBankDetails, setLoadingBankDetails] = useState(true);

  // Pagination state for request history
  const [requestHistory, setRequestHistory] = useState<Token[]>([]);
  const [issuedTokensHistory, setIssuedTokensHistory] = useState<Token[]>([]);
  const [historyPage, setHistoryPage] = useState(1); // Start from page 1
  const [issuedTokensPage, setIssuedTokensPage] = useState(1); // Start from page 1
  const [historyLoading, setHistoryLoading] = useState(false);
  const [issuedTokensLoading, setIssuedTokensLoading] = useState(false);
  const [totalRequestHistory, setTotalRequestHistory] = useState(0);
  const [totalIssuedTokens, setTotalIssuedTokens] = useState(0);
  const itemsPerPage = 5;
  

  // Pagination state for token search
  const [tokenSearchPage, setTokenSearchPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const [formData, setFormData] = useState({
    meterNumber: '',
    disco: '',
    units: '',
  });

  const [formErrors, setFormErrors] = useState({
    meterNumber: '',
    disco: '',
    units: '',
  });

  const fetchBankAccount = async () => {
    try {
      setLoadingBankDetails(true);
      const response = await api.get('/bank-accounts/accountno', {
        headers: { Authorization: `Bearer ${authState.token}` }
      });
      
      if (response.data.success && response.data.data) {
        setBankDetails(response.data.data);
      } else {
        Alert.alert('Error', 'No active bank account found');
        setBankDetails(null);
      }
    } catch (error) {
      console.error('Failed to fetch bank account:', error);
      Alert.alert('Error', 'Failed to load bank account details');
      setBankDetails(null);
    } finally {
      setLoadingBankDetails(false);
    }
  };
  const fetchTokens = async () => {
    try {
      // 1. First fetch all customers to verify meter numbers
      const customersResponse = await api.get('/vendor/getAllCustomers', {
        headers: { Authorization: `Bearer ${authState.token}` }   
      });
      
      const allCustomers = customersResponse.data?.data || [];
      
      // 2. Then fetch tokens with meter number filter
      const response = await api.get('/tokens/fetchtoken', {
        headers: { Authorization: `Bearer ${authState.token}` },
        params: {
          page: 1,
          limit: 1000 // Temporary high limit to debug
        }
      });
  
      const allTokens = response.data?.data || [];
      
      if (allTokens.length === 0) {
        Alert.alert('Info', 'No issued tokens found for your account');
        setTokens([]);
        setFilteredTokens([]);
        return;
      }
  
      // 3. Match tokens with customers
      const tokensWithVerification = allTokens.map((token) => {
        const customer = allCustomers.find(c => c.meterNumber === token.meterNumber);
        
        if (!customer) {
          console.warn(`No customer found for meter: ${token.meterNumber}`);
        }
        
        return {
          ...token,
          customerVerification: customer?.verification || 'unverified',
          customerName: customer?.name || 'Unknown'
        };
      });
  
      setTokens(tokensWithVerification);
      setFilteredTokens(tokensWithVerification);
  
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load tokens');
      setTokens([]);
      setFilteredTokens([]);
    }
  };

  const fetchRequestHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/tokens/requesthistory', {
        headers: { Authorization: `Bearer ${authState.token}` },
        params: {
          page: historyPage,
          limit: itemsPerPage,
          status: ['pending', 'rejected']
        }
      });
      
      setRequestHistory(response.data?.data || []);
      setTotalRequestHistory(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch request history:', error);
      Alert.alert('Error', 'Failed to load request history');
      setRequestHistory([]);
      setTotalRequestHistory(0);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchIssuedTokensHistory = async () => {
    try {
      setIssuedTokensLoading(true);
      const response = await api.get('/tokens/fetchtoken', {
        headers: { Authorization: `Bearer ${authState.token}` },
        params: {
          page: issuedTokensPage,
          limit: itemsPerPage,
          status: 'issued'
        }
      });
      
      setIssuedTokensHistory(response.data?.data || []);
      setTotalIssuedTokens(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch issued tokens history:', error);
      Alert.alert('Error', 'Failed to load issued tokens history');
      setIssuedTokensHistory([]);
      setTotalIssuedTokens(0);
    } finally {
      setIssuedTokensLoading(false);
    }
  };

  const fetchDiscoPricing = async () => {
    try {
      const pricingResponse = await api.get('/vendor/disco-pricing', {
        headers: { Authorization: `Bearer ${authState.token}` },
        timeout: 8000
      });
      
      const pricingData = pricingResponse.data?.data || pricingResponse.data;
      
      if (Array.isArray(pricingData)) {
        const pricesObject = pricingData.reduce((acc: Record<string, number>, item: any) => {
          if (item.discoName && typeof item.pricePerUnit === 'number') {
            acc[item.discoName] = Math.round(item.pricePerUnit * 100);
          }
          return acc;
        }, {});

        if (Object.keys(pricesObject).length > 0) {
          setDiscoPrices(pricesObject);
          await AsyncStorage.setItem('discoPrices', JSON.stringify(pricesObject));
        }
      }
    } catch (error) {
      console.error('Failed to fetch disco pricing:', error);
      const cachedPrices = await AsyncStorage.getItem('discoPrices');
      if (cachedPrices) {
        try {
          const parsed = JSON.parse(cachedPrices);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            setDiscoPrices(parsed);
          }
        } catch (e) {
          console.error('Failed to parse cached prices:', e);
        }
      }
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await fetchDiscoPricing();
      await fetchBankAccount();
      
      const [customersResponse] = await Promise.all([
        api.get('/vendor/getAllCustomers', {
          headers: { Authorization: `Bearer ${authState.token}` },
          timeout: 10000
        }),
        fetchTokens(),
        fetchRequestHistory(),
        fetchIssuedTokensHistory()
      ]);

      const allCustomers = customersResponse.data?.data || [];
      setCustomers(allCustomers);
      setVerifiedCustomers(allCustomers.filter(c => c.verification.isVerified));
      await AsyncStorage.setItem('customers', JSON.stringify(allCustomers));

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to load data. Please check your connection.'
      );
      setCustomers([]);
      setVerifiedCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = verifiedCustomers.filter(customer => 
      customer.meterNumber.includes(searchQuery) || 
      (customer.name && customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setSearchResults(results);
    setShowSearchResults(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      meterNumber: customer.meterNumber,
      disco: customer.disco,
      units: ''
    });
    setSearchQuery(customer.meterNumber);
    setShowSearchResults(false);
  };

  const handleTokenSearch = () => {
    if (!tokenSearchQuery.trim()) {
      setFilteredTokens(tokens); // Show all tokens when search is empty
      setHasSearched(false);
      return;
    }

    const filtered = tokens.filter(token => 
      token.meterNumber.includes(tokenSearchQuery)
    );

    setFilteredTokens(filtered);
    setTokenSearchPage(0);
    setHasSearched(true);
  };

  const clearTokenSearch = () => {
    setTokenSearchQuery('');
    setFilteredTokens([]);
    setHasSearched(false);
  };

  useEffect(() => {
    fetchData();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRequestHistory();
      fetchIssuedTokensHistory();
    }
  }, [historyPage, issuedTokensPage, activeTab]);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' && showPaymentModal) {
      setShowPaymentModal(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getPricePerUnit = (): number => {
    if (!formData.disco) return 0;
    return discoPrices[formData.disco] || 0;
  };

  const calculateTotalAmount = (): number => {
    const units = Number(formData.units) || 0;
    const pricePerUnitKobo = getPricePerUnit();
    return (units * pricePerUnitKobo) / 100;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    let valid = true;
    const newErrors = { meterNumber: '', disco: '', units: '' };
  
    const cleanedMeterNumber = formData.meterNumber.replace(/\D/g, '');
    if (!cleanedMeterNumber) {
      newErrors.meterNumber = 'Meter number is required';
      valid = false;
    } else if (cleanedMeterNumber.length < 6 || cleanedMeterNumber.length > 20) {
      newErrors.meterNumber = 'Meter number must be 6-20 digits';
      valid = false;
    }
  
    if (!formData.disco) {
      newErrors.disco = 'Disco is required';
      valid = false;
    }
  
    const unitsNum = Number(formData.units);
    if (!formData.units || isNaN(unitsNum)) {
      newErrors.units = 'Valid units are required';
      valid = false;
    } else if (unitsNum <= 0) {
      newErrors.units = 'Units must be greater than 0';
      valid = false;
    } else if (unitsNum > 1000000) {
      newErrors.units = 'Maximum 1000 units per transaction';
      valid = false;
    }
  
    setFormErrors(newErrors);
    return valid;   
  };

  const initiateManualPayment = async () => {
    if (!validateForm()) return;

    try {
      setPaymentInProgress(true);
      const cleanedMeterNumber = formData.meterNumber.replace(/\D/g, '');
      const totalAmountNGN = calculateTotalAmount();

      const response = await api.post('/tokens/request', {
        meterNumber: cleanedMeterNumber,
        units: Number(formData.units),
        disco: formData.disco,
        amount: totalAmountNGN,
        paymentMethod: 'manual'
      }, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setCurrentRequest(response.data.request);
        setShowPaymentModal(true);
        // Refresh history after new request
        fetchRequestHistory();
      } else {
        throw new Error(response.data.message || 'Token request failed');
      }
    } catch (error: any) {
      console.error('Request Error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Token request failed'
      );
    } finally {
      setPaymentInProgress(false);
    }
  };

  const confirmPayment = async () => {
    try {
      if (!currentRequest) return;

      const response = await api.post('/tokens/confirm-payment', {
        txRef: currentRequest.txRef,
        paymentDetails: `Bank transfer to ${bankDetails.accountNumber}`
      }, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        Alert.alert(
          'Success', 
          'Payment confirmation received. Your request is now pending admin approval.'
        );
        setShowPaymentModal(false);
        fetchData();
      } else {
        throw new Error(response.data.message || 'Payment confirmation failed');
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to confirm payment'
      );
    }
  };

  const cancelPayment = async () => {
    try {
      if (!currentRequest) return;
  
      const response = await api.post('/tokens/cancel-payment', {
        txRef: currentRequest.txRef
      }, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.data.success) {
        Alert.alert(
          'Success', 
          response.data.message || 'Token request cancelled successfully'
        );
        setShowPaymentModal(false);
        fetchData();
      } else {
        throw new Error(response.data.message || 'Cancellation failed');
      }
    } catch (error: any) {
      console.error('Payment cancellation error:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      Alert.alert(
        'Error',
        error.response?.data?.message || 
        error.message || 
        'Failed to cancel payment. Please try again later.'
      );
    }
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Account details copied to clipboard');
  };

  const openBankApp = () => {
    Linking.openURL('bank://').catch(() => {
      Alert.alert('Error', 'Could not open banking app');
    });
  };

  const renderTokenCard = (token: Token) => {
    const statusColor = token.status === 'issued' ? '#4CAF50' : '#FFA000';
  
    return (
      <Card key={token._id} style={[styles.tokenCard, { backgroundColor: colors.surface }]}>
        <View style={styles.tokenHeader}>
          <MaterialCommunityIcons name="flash" size={24} color={statusColor} />
          <Text style={[styles.tokenStatus, { color: statusColor }]}>
            {token.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.tokenDetails}>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Amount:</Text>
            <Text style={[styles.tokenValue, { color: colors.onSurface }]}> ₦{(token.amount).toLocaleString()}</Text>
          </View>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Disco:</Text>
            <Text style={[styles.tokenValue, { color: colors.onSurface }]}>{token.disco}</Text>
          </View>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Units:</Text>
            <Text style={[styles.tokenValue, { color: colors.onSurface }]}>{token.units}</Text>
          </View>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Meter:</Text>
            <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
              {(token.meterNumber)}
            </Text>
          </View>
          
          {/* Verification Information Section */}
          {token.customerVerification?.isVerified && (
            <View style={styles.verificationSection}>
              <Text style={[styles.verificationTitle, { color: colors.onSurface }]}>
                Verification Details
              </Text>
              
              {/* MTK1 */}
              {token.customerVerification.MTK1 && (
                <View style={styles.tokenRow}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>MTK1:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                      {token.customerVerification.MTK1}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => {
                        Clipboard.setString(token.customerVerification?.MTK1 || '');
                        Alert.alert('Copied', 'MTK1 copied to clipboard');
                      }}
                    />
                  </View>
                </View>
              )}
              
              {/* MTK2 */}
              {token.customerVerification.MTK2 && (
                <View style={styles.tokenRow}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>MTK2:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                      {token.customerVerification.MTK2}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => {
                        Clipboard.setString(token.customerVerification?.MTK2 || '');
                        Alert.alert('Copied', 'MTK2 copied to clipboard');
                      }}
                    />
                  </View>
                </View>
              )}

              {/* RTK1 */}
              {token.customerVerification.RTK1 && (
                <View style={styles.tokenRow}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>RTK1:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                      {token.customerVerification.RTK1}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => {
                        Clipboard.setString(token.customerVerification?.RTK1 || '');
                        Alert.alert('Copied', 'RTK1 copied to clipboard');
                      }}
                    />
                  </View>
                </View>
              )}

              {/* RTK2 */}
              {token.customerVerification.RTK2 && (
                <View style={styles.tokenRow}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>RTK2:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                      {token.customerVerification.RTK2}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => {
                        Clipboard.setString(token.customerVerification?.RTK2 || '');
                        Alert.alert('Copied', 'RTK2 copied to clipboard');
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
          
          {/* Token Value Section */}
          {token.tokenValue && (
                <View style={styles.tokenValueSection}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Token:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.tokenValueLarge, { color: '#6200ee', fontWeight: 'bold' }]}>
                      {token.tokenValue}
                    </Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => {
                        Clipboard.setString(token.tokenValue || '');
                        Alert.alert('Copied', 'Token copied to clipboard');
                      }}
                    />
                  </View>
                </View>
              )}
        </View>

        <Text style={[styles.tokenDate, { color: colors.onSurface }]}>
          {new Date(token.createdAt).toLocaleString()}
        </Text>
      </Card>
    );
  };

  const renderRequestHistory = () => {
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
        <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.onSurface }]}>
            Pending/Rejected Requests
          </Text>
          
          {historyLoading ? (
            <ActivityIndicator style={styles.loader} animating={true} />
          ) : requestHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>
              No pending or rejected requests found
            </Text>
          ) : (
            <>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title style={styles.tableCell}>Meter No.</DataTable.Title>
                  <DataTable.Title numeric style={styles.tableCell}>Units</DataTable.Title>
                  <DataTable.Title numeric style={styles.tableCell}>Amount</DataTable.Title>
                  <DataTable.Title style={styles.tableCell}>Status</DataTable.Title>
                </DataTable.Header>

                {requestHistory.map((request) => (
                  <DataTable.Row key={request._id}>
                    <DataTable.Cell style={styles.tableCell}>{request.meterNumber}</DataTable.Cell>
                    <DataTable.Cell numeric style={styles.tableCell}>{request.units}</DataTable.Cell>
                    <DataTable.Cell numeric style={styles.tableCell}>₦{request.amount.toLocaleString()}</DataTable.Cell>
                    <DataTable.Cell style={styles.tableCell}>
                      <Text 
                        style={{ 
                          color: request.status === 'pending' ? '#FFA000' : '#F44336',
                          fontWeight: 'bold'
                        }}
                      >
                        {request.status.toUpperCase()}
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}

                <DataTable.Pagination
                  page={historyPage}
                  numberOfPages={Math.ceil(requestHistory.length / itemsPerPage)}
                  onPageChange={(page) => setHistoryPage(page)}
                  label={`${historyPage * itemsPerPage + 1}-${Math.min(
                    (historyPage + 1) * itemsPerPage,
                    requestHistory.length
                  )} of ${requestHistory.length}`}
                  showFastPaginationControls
                  numberOfItemsPerPage={itemsPerPage}
                  selectPageDropdownLabel={'Rows per page'}
                />
              </DataTable>
            </>
          )}
        </Card>

        <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.onSurface }]}>
            Issued Tokens
          </Text>
          
          {issuedTokensLoading ? (
            <ActivityIndicator style={styles.loader} animating={true} />
          ) : issuedTokensHistory.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>
              No issued tokens found
            </Text>
          ) : (
            <>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title style={styles.tableCell}>Meter No.</DataTable.Title>
                  <DataTable.Title numeric style={styles.tableCell}>Units</DataTable.Title>
                  <DataTable.Title numeric style={styles.tableCell}>Amount</DataTable.Title>
                  <DataTable.Title style={styles.tableCell}>Token</DataTable.Title>
                </DataTable.Header>

                {issuedTokensHistory.map((token) => (
                  <DataTable.Row key={token._id}>
                    <DataTable.Cell style={styles.tableCell}>{token.meterNumber}</DataTable.Cell>
                    <DataTable.Cell numeric style={styles.tableCell}>{token.units}</DataTable.Cell>
                    <DataTable.Cell numeric style={styles.tableCell}>₦{token.amount.toLocaleString()}</DataTable.Cell>
                    <DataTable.Cell style={styles.tableCell}>
                      {token.status ? (
                        <TouchableOpacity onPress={() => {
                          Clipboard.setString(token.token || '');
                          Alert.alert('Copied', 'Token copied to clipboard');
                        }}>
                          <Text style={{ color: '#6200ee', fontWeight: 'bold' }}>
                            {token.status}
                          </Text>
                        </TouchableOpacity>
                      ) : 'N/A'}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}

                <DataTable.Pagination
                  page={issuedTokensPage}
                  numberOfPages={Math.ceil(issuedTokensHistory.length / itemsPerPage)}
                  onPageChange={(page) => setIssuedTokensPage(page)}
                  label={`${issuedTokensPage * itemsPerPage + 1}-${Math.min(
                    (issuedTokensPage + 1) * itemsPerPage,
                    issuedTokensHistory.length
                  )} of ${issuedTokensHistory.length}`}
                  showFastPaginationControls
                  numberOfItemsPerPage={itemsPerPage}
                  selectPageDropdownLabel={'Rows per page'}
                />
              </DataTable>
            </>
          )}
        </Card>
      </ScrollView>
    );
  };

  const paginatedTokens = filteredTokens.slice(
    tokenSearchPage * itemsPerPage,
    (tokenSearchPage + 1) * itemsPerPage
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'request' && styles.activeTab]}
          onPress={() => setActiveTab('request')}
        >
          <Text style={[styles.tabText, activeTab === 'request' && styles.activeTabText]}>
            Request Token
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'view' && styles.activeTab]}
          onPress={() => setActiveTab('view')}
        >
          <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
            View Tokens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Request History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'request' ? (
        <ScrollView style={styles.content}>
          <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formTitle, { color: colors.onSurface }]}>Request New Token</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Search Customer *</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={[
                    styles.searchInput,
                    { backgroundColor: colors.background, color: colors.onSurface }
                  ]}
                  placeholder="Search by meter number or name"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Button
                  mode="contained"
                  onPress={handleSearch}
                  style={styles.searchButton}
                >
                  Search
                </Button>
              </View>

              {showSearchResults && (
                <Card style={[styles.resultsCard, { backgroundColor: colors.background }]}>
                  {searchResults.length > 0 ? (
                    <List.Section>
                      {searchResults.map(customer => (
                        <List.Item
                          key={customer._id}
                          title={`${customer.meterNumber} (${customer.disco})`}
                          description={customer.name || ''}
                          onPress={() => handleCustomerSelect(customer)}
                          left={props => (
                            <MaterialCommunityIcons 
                              name="account" 
                              size={24} 
                              color={colors.onSurface} 
                              style={styles.customerIcon}
                            />
                          )}
                        />
                      ))}
                    </List.Section>
                  ) : (
                    <Text style={[styles.noResultsText, { color: colors.onSurface }]}>
                      No customers found
                    </Text>
                  )}
                </Card>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Meter Number *</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.meterNumber && styles.inputError,
                  { backgroundColor: colors.background, color: colors.onSurface }
                ]}
                placeholder="Enter meter number"
                value={formData.meterNumber}
                onChangeText={(text) => handleInputChange('meterNumber', text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={20}
                editable={!selectedCustomer}
              />
              {formErrors.meterNumber ? <Text style={styles.errorText}>{formErrors.meterNumber}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Disco *</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.disco && styles.inputError,
                  { backgroundColor: colors.background, color: colors.onSurface }
                ]}
                placeholder="Select customer first"
                value={formData.disco}
                editable={false}
              />
              {formErrors.disco ? <Text style={styles.errorText}>{formErrors.disco}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Units *</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.units && styles.inputError,
                  { backgroundColor: colors.background, color: colors.onSurface }
                ]}
                placeholder="Enter units"
                keyboardType="numeric"
                value={formData.units}
                onChangeText={(text) => handleInputChange('units', text)}
              />
              {formErrors.units ? <Text style={styles.errorText}>{formErrors.units}</Text> : null}
            </View>

            <View style={styles.priceInfo}>
              <Text style={[styles.priceLabel, { color: colors.onSurface }]}>Price per Unit:</Text>
              <Text style={[styles.priceValue, { color: colors.onSurface }]}>
                ₦{(getPricePerUnit() / 100).toFixed(2)}
              </Text>
            </View>

            <View style={styles.priceInfo}>
              <Text style={[styles.priceLabel, { color: colors.onSurface }]}>Total Amount:</Text>
              <Text style={[styles.priceValue, { color: colors.onSurface }]}>
                ₦{calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={initiateManualPayment}
              loading={paymentInProgress}
              disabled={paymentInProgress || !formData.disco}
              style={styles.submitButton}
            >
              {paymentInProgress ? 'Processing...' : 'Pay with Paystack'}
            </Button>

            <Button 
              mode="outlined" 
              onPress={fetchData}
              style={styles.refreshButton}
              icon="refresh"
            >
              Refresh Data
            </Button>
          </Card>
        </ScrollView>
      ) : activeTab === 'view' ? (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formTitle, { color: colors.onSurface }]}>Search Tokens</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Meter Number</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={[
                    styles.searchInput,
                    { backgroundColor: colors.background, color: colors.onSurface }
                  ]}
                  placeholder="Enter meter number to search"
                  value={tokenSearchQuery}
                  onChangeText={setTokenSearchQuery}
                  keyboardType="numeric"
                />
                <Button
                  mode="contained"
                  onPress={handleTokenSearch}
                  style={styles.searchButton}
                >
                  Search
                </Button>
                {tokenSearchQuery ? (
                  <Button
                    mode="outlined"
                    onPress={clearTokenSearch}
                    style={styles.clearButton}
                  >
                    Clear
                  </Button>
                ) : null}
              </View>
            </View>
          </Card>

          {loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} animating={true} />
          ) : hasSearched && filteredTokens.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>
              No issued tokens found for this meter number
            </Text>
          ) : hasSearched ? (
            <>
              <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formTitle, { color: colors.onSurface }]}>
                  Search Results ({filteredTokens.length})
                </Text>
                
                {paginatedTokens.map(token => renderTokenCard(token))}
                
                <DataTable.Pagination
                  page={tokenSearchPage}
                  numberOfPages={Math.ceil(filteredTokens.length / itemsPerPage)}
                  onPageChange={(page) => setTokenSearchPage(page)}
                  label={`${tokenSearchPage * itemsPerPage + 1}-${Math.min(
                    (tokenSearchPage + 1) * itemsPerPage,
                    filteredTokens.length
                  )} of ${filteredTokens.length}`}
                  showFastPaginationControls
                  numberOfItemsPerPage={itemsPerPage}
                  selectPageDropdownLabel={'Rows per page'}
                />
              </Card>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>
              Search for tokens by meter number
            </Text>
          )}
        </ScrollView>
      ) : (
        renderRequestHistory()
      )}

      <Modal
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
        animationType="slide"
      >
        <View style={[styles.paymentModalContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.paymentTitle, { color: colors.onSurface }]}>Manual Payment Instructions</Text>
          
          <Card style={[styles.paymentCard, { backgroundColor: colors.surface }]}>
            {loadingBankDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator animating={true} size="large" />
                <Text style={[styles.loadingText, { color: colors.onSurface }]}>
                  Loading bank details...
                </Text>
              </View>
            ) : bankDetails ? (
              <>
                <Text style={[styles.paymentText, { color: colors.onSurface }]}>
                  Please make payment to the following account details:
                </Text>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={[styles.paymentLabel, { color: colors.onSurface }]}>Bank Name:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.paymentValue, { color: colors.onSurface }]}>{bankDetails.bankName}</Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => copyToClipboard(bankDetails.bankName)}
                    />
                  </View>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={[styles.paymentLabel, { color: colors.onSurface }]}>Account Number:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.paymentValue, { color: colors.onSurface }]}>{bankDetails.accountNumber}</Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => copyToClipboard(bankDetails.accountNumber)}
                    />
                  </View>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={[styles.paymentLabel, { color: colors.onSurface }]}>Account Name:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.paymentValue, { color: colors.onSurface }]}>{bankDetails.accountName}</Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => copyToClipboard(bankDetails.accountName)}
                    />
                  </View>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={[styles.paymentLabel, { color: colors.onSurface }]}>Amount:</Text>
                  <Text style={[styles.paymentValue, { color: colors.onSurface }]}>
                    ₦{currentRequest?.amount.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={[styles.paymentLabel, { color: colors.onSurface }]}>Reference:</Text>
                  <View style={styles.copyContainer}>
                    <Text style={[styles.paymentValue, { color: colors.onSurface }]}>{currentRequest?.txRef}</Text>
                    <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => currentRequest?.txRef && copyToClipboard(currentRequest.txRef)}
                    />
                  </View>
                </View>
                
                <Text style={[styles.paymentNote, { color: colors.onSurface }]}>
                  Please input <Text style={{ fontWeight: 'bold' }}>Meter Number ({currentRequest?.meterNumber})</Text>   <IconButton 
                      icon="content-copy" 
                      size={20} 
                      onPress={() => currentRequest?.meterNumber && copyToClipboard(currentRequest.meterNumber)}
                    />  as reference when making payment.
                </Text>

                
              </>
            ) : (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons 
                  name="alert-circle" 
                  size={40} 
                  color={colors.error} 
                  style={styles.errorIcon}
                />
                <Text style={[styles.errorText, { color: colors.onSurface }]}>
                  Failed to load bank details. Please try again later.
                </Text>
                <Button
                  mode="contained"
                  onPress={fetchBankAccount}
                  style={styles.retryButton}
                >
                  Retry
                </Button>
              </View>
            )}

            {bankDetails && (
              <Text style={[styles.paymentNote, { color: colors.onSurface }]}>
                After making payment, click the button below to notify us.
                Your token will be issued after payment confirmation.
              </Text>
            )}
          </Card>

          {bankDetails && (
            <>
              <Button
                mode="contained"
                onPress={openBankApp}
                style={styles.bankAppButton}
                icon="bank"
              >
                Open Banking App
              </Button>

              <Button
                mode="contained"
                onPress={confirmPayment}
                style={styles.confirmPaymentButton}
              >
                I Have Made Payment
              </Button>
            </>
          )}
          
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert(
                'Confirm Cancellation',
                'Are you sure you want to cancel this payment request?',
                [
                  {
                    text: 'No',
                    style: 'cancel',
                  },
                  {
                    text: 'Yes',
                    onPress: cancelPayment,
                  },
                ],
                { cancelable: true }
              );
            }}
            style={styles.cancelPaymentButton}
          >
            Cancel
          </Button>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6200ee',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  formCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    marginBottom: 10,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  searchButton: {
    borderRadius: 8,
    paddingVertical: 6,
  },
  clearButton: {
    borderRadius: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },
  resultsCard: {
    marginTop: 8,
    maxHeight: 200,
    borderRadius: 8,
  },
  customerIcon: {
    marginRight: 10,
    alignSelf: 'center',
  },
  noResultsText: {
    padding: 16,
    textAlign: 'center',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 6,
  },
  refreshButton: {
    marginTop: 12,
    borderColor: '#6200ee',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tokenCard: {
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenStatus: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tokenDetails: {
    marginVertical: 8,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tokenValue: {
    fontSize: 14,
  },
  tokenDate: {
    fontSize: 12,
    marginTop: 8,
    color: '#666',
    textAlign: 'right',
  },
  verificationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tokenValueSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tokenValueLarge: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  searchResultsText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontStyle: 'italic',
  },
  closeButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    width: '80%',
    borderRadius: 8,
  },
  paymentModalContainer: {
    flex: 1,
    padding: 20,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  paymentCard: {
    padding: 20,
    marginBottom: 20
  },
  paymentText: {
    fontSize: 16,
    marginBottom: 15
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center'
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paymentLabel: {
    fontWeight: 'bold',
    fontSize: 16
  },
  paymentValue: {
    fontSize: 16,
    marginRight: 8
  },
  paymentNote: {
    marginTop: 15,
    fontStyle: 'italic',
    color: '#666'
  },
  bankAppButton: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#4CAF50'
  },
  confirmPaymentButton: {
    marginTop: 10,
    paddingVertical: 8
  },
  cancelPaymentButton: {
    marginTop: 10,
    paddingVertical: 8
  },
  tableCell: {
    flex: 1,  
    justifyContent: 'center'
  }
});

export default VendorTokenScreen;