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
  AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Text, 
  useTheme, 
  Card, 
  Button, 
  ActivityIndicator, 
  List
} from 'react-native-paper';
import { useAuth } from '../../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Paystack } from 'react-native-paystack-webview';
import axios from 'axios';

interface Token {
  _id: string;
  meterNumber: string;
  disco: string;
  units: number;
  amount: number;
  tokenValue: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  paystackReference?: string;
  paymentDetails?: any;
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

const VendorTokenScreen = () => {
  const { colors } = useTheme();
  const { api, authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'request' | 'view'>('request');
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
  const [paystackReference, setPaystackReference] = useState('');
  const [paystackAmount, setPaystackAmount] = useState(0);
  const paystackWebViewRef = useRef<any>(null);

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

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens/fetchtoken', {
        headers: { Authorization: `Bearer ${authState.token}` }   
      });
      
      const customersResponse = await api.get('/vendor/getAllCustomers', {
        headers: { Authorization: `Bearer ${authState.token}` }   
      });
      
      const allCustomers = customersResponse.data?.data || [];
      const allTokens = response.data?.data || [];
      
      const tokensWithVerification = allTokens.map((token: Token) => {
        const customer = allCustomers.find((c: Customer) => c.meterNumber === token.meterNumber);
        return {
          ...token,
          customerVerification: customer?.verification || null
        };
      });
      
      setTokens(tokensWithVerification);
      setFilteredTokens(tokensWithVerification);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      Alert.alert('Error', 'Failed to load tokens');
      setTokens([]);
      setFilteredTokens([]);
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
      
      const [customersResponse] = await Promise.all([
        api.get('/vendor/getAllCustomers', {
          headers: { Authorization: `Bearer ${authState.token}` },
          timeout: 10000
        }),
        fetchTokens()
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
      setFilteredTokens(tokens);
      return;
    }

    const filtered = (tokens || []).filter(token => 
      token.meterNumber.includes(tokenSearchQuery) ||
      (token.tokenValue && token.tokenValue.includes(tokenSearchQuery))
    );

    setFilteredTokens(filtered);
  };

  const clearTokenSearch = () => {
    setTokenSearchQuery('');
    setFilteredTokens(tokens);
  };

  useEffect(() => {
    fetchData();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

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

  const initiatePaystackPayment = async () => {
    if (!validateForm()) return;
  
    try {
      setPaymentInProgress(true);
      const cleanedMeterNumber = formData.meterNumber.replace(/\D/g, '');
      const totalAmountNGN = calculateTotalAmount();
      const totalAmountKobo = Math.round(totalAmountNGN );

      const response = await api.post('/tokens/request', {
        meterNumber: cleanedMeterNumber,
        units: Number(formData.units),
        disco: formData.disco,
        amount: totalAmountNGN,
        email: authState.user?.email || 'customer@example.com'
      }, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
  
      if (response.data.success) {
        setPaystackReference(response.data.reference);
        setPaystackAmount(totalAmountKobo);
        setShowPaymentModal(true);
      } else {
        throw new Error(response.data.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      Alert.alert(
        'Payment Error',
        error.response?.data?.message || error.message || 'Payment initialization failed'
      );
    } finally {
      setPaymentInProgress(false);
    }
  };

const handlePaymentSuccess = async (response: any) => {
  try {
    setShowPaymentModal(false);
    
    // Verify payment
    const verificationResponse = await api.get(`/tokens/verify?txRef=${paystackReference}`, {
      headers: { Authorization: `Bearer ${authState.token}` }
    });

    if (verificationResponse.data.success) {
      Alert.alert(
        'Success', 
        'Payment verified! Your token request is now pending admin approval.'
      );
      fetchData(); // Refresh the token list
    } else {
      throw new Error(verificationResponse.data.message || 'Payment verification failed');
    }
  } catch (error: any) {
    console.error('Payment verification error:', error);
    Alert.alert(
      'Error',
      error.response?.data?.message || error.message || 'Failed to verify payment'
    );
  }
};

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    Alert.alert('Info', 'Payment was not completed');
  };

  const renderTokenSection = (title: string, tokens: Token[], status: string) => {
    if (!tokens || tokens.length === 0) return null;
  
    const statusColor = status === 'completed' ? '#4CAF50' : 
                       status === 'failed' ? '#F44336' : '#FFA000';
  
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          {title} ({tokens.length})
        </Text>
        {tokens.map(token => (
          <Card key={token._id} style={[styles.tokenCard, { backgroundColor: colors.surface }]}>
            <View style={styles.tokenHeader}>
              <MaterialCommunityIcons name="flash" size={24} color={statusColor} />
              <Text style={[styles.tokenStatus, { color: statusColor }]}>
                {status.toUpperCase()}
              </Text>
            </View>
  
            <View style={styles.tokenDetails}>
              <View style={styles.tokenRow}>
                <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Meter:</Text>
                <Text style={[styles.tokenValue, { color: colors.onSurface }]}>{token.meterNumber}</Text>
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
                <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Amount:</Text>
                <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                  ₦{(token.amount).toLocaleString()}
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
                      <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                        {token.customerVerification.MTK1}
                      </Text>
                    </View>
                  )}
                  
                  {/* MTK2 */}
                  {token.customerVerification.MTK2 && (
                    <View style={styles.tokenRow}>
                      <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>MTK2:</Text>
                      <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                        {token.customerVerification.MTK2}
                      </Text>
                    </View>
                  )}


{token.customerVerification.RTK1 && (
                    <View style={styles.tokenRow}>
                      <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>RTK1:</Text>
                      <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                        {token.customerVerification.RTK1}
                      </Text>
                    </View>
                  )}


{token.customerVerification.RTK2 && (
                    <View style={styles.tokenRow}>
                      <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>RTK2:</Text>
                      <Text style={[styles.tokenValue, { color: colors.onSurface }]}>
                        {token.customerVerification.RTK2}
                      </Text>
                    </View>
                  )}

                  
                </View>
              )}
              
              {/* Token Value Section */}
              {token.tokenValue && (
                <View style={styles.tokenValueSection}>
                  <Text style={[styles.tokenLabel, { color: colors.onSurface }]}>Token:</Text>
                  <Text style={[styles.tokenValueLarge, { color: '#6200ee', fontWeight: 'bold' }]}>
                    {token.tokenValue}
                  </Text>
                </View>
              )}
            </View>
  
            <Text style={[styles.tokenDate, { color: colors.onSurface }]}>
              {new Date(token.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))}
      </View>
    );
  };
  const issuedTokens = filteredTokens.filter(t => t.status === 'issued');
  const usedTokens = filteredTokens.filter(t => t.status === 'used');
  const expiredTokens = filteredTokens.filter(t => t.status === 'expired');
  const pendingTokens = filteredTokens.filter(t => t.status === 'pending');

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
              onPress={initiatePaystackPayment}
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
      ) : (
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
          ) : filteredTokens.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurface }]}>
              {tokenSearchQuery ? 'No tokens found for this meter number' : 'No tokens found'}
            </Text>
          ) : (
            <>
              {tokenSearchQuery && (
                <Text style={[styles.searchResultsText, { color: colors.onSurface }]}>
                  Showing latest 5 tokens for: {tokenSearchQuery}
                </Text>
              )}
              {renderTokenSection('Issued Tokens', issuedTokens, 'issued')}
              {renderTokenSection('Pending Tokens', pendingTokens, 'pending')}
              {renderTokenSection('Used Tokens', usedTokens, 'used')}
              {renderTokenSection('Expired Tokens', expiredTokens, 'expired')}
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showPaymentModal}
        onRequestClose={handlePaymentClose}
        animationType="slide"
        transparent={false}
      >
        <View style={{ flex: 1 }}>
          <Paystack
            paystackKey={process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_a6f3b0e8c22139d28b055058d5226cd202b09fd1'}
            billingEmail={authState.userData?.email || 'customer@example.com'}
            amount={paystackAmount}
            currency="NGN"
            channels={['card', 'bank', 'ussd', 'qr', 'mobile_money']}
            refNumber={paystackReference}
            onCancel={handlePaymentClose}
            onSuccess={handlePaymentSuccess}
            autoStart={true}
            ref={paystackWebViewRef}
            style={{ flex: 1 }}
          />
          <Button 
            mode="contained" 
            onPress={handlePaymentClose}
            style={styles.closeButton}
          >
            Close Payment
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
});

export default VendorTokenScreen;