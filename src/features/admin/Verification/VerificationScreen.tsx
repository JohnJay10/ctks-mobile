import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Card, Button, Title, ActivityIndicator, TextInput, Text, Divider } from 'react-native-paper';
import { useAuth } from '../../../auth/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { MaterialIcons } from '@expo/vector-icons';

interface Customer {
  _id: string;
  meterNumber: string;
  disco: string;
  lastToken:string;
  name?: string;
  address?: string;
  phone?: string;
  verification: {
    isVerified: boolean;
    KRN?: string;
    SGC?: string;
    TI?: string;
    MSN?: string;
    MTK1?: string;
    MTK2?: string;
    RTK1?: string;
    RTK2?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
}

export default function VerificationScreen() {
  const { api, authState } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<Partial<Customer['verification']>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'pending' | 'verified' | null>(null);

  // Load customers from API
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/customers', {
        headers: { Authorization: `Bearer ${authState.token}` }
      });
      
      setCustomers(response.data.data || response.data);
    } catch (err) {
      const error = err as AxiosError;
      console.error('API Error:', error);
      
      let errorMessage = 'Failed to load customers';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Check your network connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, authState.token]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers();
  }, [loadCustomers]);

  // Verify customer function - updated to require all fields
  const verifyCustomer = useCallback(async (customerId: string) => {
    try {
      setLoading(true);
      
      // Validate ALL fields are required
      const requiredFields = ['KRN', 'SGC', 'TI', 'MSN', 'MTK1', 'MTK2', 'RTK1', 'RTK2'];
      const missingFields = requiredFields.filter(
        field => !verificationData[field as keyof typeof verificationData]?.toString().trim()
      );

      if (missingFields.length > 0) {
        throw new Error(`All verification fields are required. Missing: ${missingFields.join(', ')}`);
      }

      // Prepare payload with all required fields
      const payload = {
        KRN: verificationData.KRN?.trim(),
        SGC: verificationData.SGC?.trim(),
        TI: verificationData.TI?.trim(),
        MSN: verificationData.MSN?.trim(),
        MTK1: verificationData.MTK1?.trim(),
        MTK2: verificationData.MTK2?.trim(),
        RTK1: verificationData.RTK1?.trim(),
        RTK2: verificationData.RTK2?.trim()
      };

      console.log('Sending verification payload:', payload);

      const response = await api.put(
        `/admin/customers/${customerId}/verify`,
        payload,
        {
          headers: { 
            Authorization: `Bearer ${authState.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Verification response:', response.data);

      // Reset form and update UI
      setVerificationData({});
      setSelectedCustomer(null);
      await loadCustomers();
      
      Alert.alert(
        'Verification Successful',
        `Customer ${response.data.meterNumber} has been verified`,
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      const error = err as AxiosError;
      console.error('Verification Error:', {
        message: error.message,
        response: error.response?.data,
        config: error.config
      });

      let errorMessage = 'Verification failed';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        'Verification Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [api, verificationData, authState.token, loadCustomers]);

  // Handle input changes for verification form
  const handleInputChange = (field: keyof Customer['verification'], value: string) => {
    setVerificationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Initial load
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter customers by verification status
  const pendingCustomers = customers.filter(c => !c.verification.isVerified);
  const verifiedCustomers = customers.filter(c => c.verification.isVerified);

  // Toggle section expansion
  const toggleSection = (section: 'pending' | 'verified') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Check if ALL required fields are filled
  const canVerify = ['KRN', 'SGC', 'TI', 'MSN', 'MTK1', 'MTK2', 'RTK1', 'RTK2'].every(
    field => verificationData[field as keyof typeof verificationData]?.toString().trim()
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadCustomers}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Title style={styles.title}>Customer Verification</Title>

      {/* Pending Verification Section */}
      <Card style={styles.sectionCard}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('pending')}
        >
          <View style={styles.sectionHeaderContent}>
            <MaterialIcons 
              name={expandedSection === 'pending' ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} 
              size={24} 
              color="#333"
            />
            <Text style={styles.sectionTitle}>Pending Verification ({pendingCustomers.length})</Text>
          </View>
        </TouchableOpacity>

        {expandedSection === 'pending' && (
          <View style={styles.sectionContent}>
            {pendingCustomers.length > 0 ? (
              pendingCustomers.map(customer => (
                <View key={customer._id}>
                  <Card style={styles.customerCard}>
                    <Card.Content>
                      <View style={styles.customerHeader}>
                        <MaterialIcons name="person" size={20} color="#666" />
                        <Text style={styles.customerName}>
                          {customer.name || 'Unnamed Customer'}
                        </Text>
                        <Text style={styles.customerStatusPending}>Pending</Text>
                      </View>

                      <View style={styles.customerDetails}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="speed" size={16} color="#666" />
                          <Text style={styles.detailText}>Meter: {customer.meterNumber}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="bolt" size={16} color="#666" />
                          <Text style={styles.detailText}>Disco: {customer.disco}</Text>
                        </View>
                        <View style={styles.detailRow}>
                        <MaterialIcons name="vpn-key" size={16} color="#666" />
                        <Text style={styles.detailText}>LastToken: {customer.lastToken}</Text>
                      </View>
                        {customer.address && (
                          <View style={styles.detailRow}>
                            <MaterialIcons name="location-on" size={16} color="#666" />
                            <Text style={styles.detailText}>{customer.address}</Text>
                          </View>
                        )}
                      </View>

                      {selectedCustomer === customer._id && (
                        <View style={styles.verificationForm}>
                          <Text style={styles.formTitle}>Verification Details (All fields required)</Text>
                          
                          {/* Required Fields */}
                          {Object.entries({
                            KRN: 'Key Revision Number (KRN) *',
                            SGC: 'Supply Group Code (SGC) *',
                            TI: 'Tariff Index (TI) *',
                            MSN: 'Meter Serial Number (MSN) *',
                            MTK1: 'Master Token Key 1 (MTK1) *',
                            MTK2: 'Master Token Key 2 (MTK2) *',
                            RTK1: 'Restricted Token Key 1 (RTK1) *',
                            RTK2: 'Restricted Token Key 2 (RTK2) *'
                          }).map(([field, label]) => (
                            <TextInput
                              key={field}
                              label={label}
                              value={verificationData[field as keyof typeof verificationData] || ''}
                              onChangeText={(text) => handleInputChange(field as keyof Customer['verification'], text)}
                              style={styles.input}
                              mode="outlined"
                              disabled={loading}
                              autoComplete="off"
                              autoCorrect={false}
                              autoCapitalize="none"
                              spellCheck={false}
                              returnKeyType="next"
                              blurOnSubmit={false}
                              importantForAutofill="no"
                            />
                          ))}
                        </View>
                      )}
                    </Card.Content>
                    <Card.Actions style={styles.cardActions}>
                      {selectedCustomer === customer._id ? (
                        <>
                          <Button 
                            onPress={() => setSelectedCustomer(null)}
                            disabled={loading}
                            textColor="#666"
                          >
                            Cancel
                          </Button>
                          <Button 
                            mode="contained"
                            onPress={() => verifyCustomer(customer._id)}
                            disabled={!canVerify || loading}
                            loading={loading}
                            style={styles.verifyButton}
                          >
                            Confirm Verification
                          </Button>
                        </>
                      ) : (
                        <Button 
                          mode="contained"
                          onPress={() => {
                            setSelectedCustomer(customer._id);
                            setVerificationData({});
                          }}
                          style={styles.verifyButton}
                        >
                          Verify Customer
                        </Button>
                      )}
                    </Card.Actions>
                  </Card>
                  <Divider style={styles.divider} />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No pending verifications</Text>
            )}
          </View>
        )}
      </Card>

      {/* Verified Customers Section */}
      <Card style={styles.sectionCard}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('verified')}
        >
          <View style={styles.sectionHeaderContent}>
            <MaterialIcons 
              name={expandedSection === 'verified' ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} 
              size={24} 
              color="#333"
            />
            <Text style={styles.sectionTitle}>Verified Customers ({verifiedCustomers.length})</Text>
          </View>
        </TouchableOpacity>

        {expandedSection === 'verified' && (
          <View style={styles.sectionContent}>
            {verifiedCustomers.length > 0 ? (
              verifiedCustomers.map(customer => (
                <View key={customer._id}>
                  <Card style={styles.customerCard}>
                    <Card.Content>
                      <View style={styles.customerHeader}>
                        <MaterialIcons name="person" size={20} color="#666" />
                        <Text style={styles.customerName}>
                          {customer.name || 'Unnamed Customer'}
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                          <Text style={styles.customerStatusVerified}>Verified</Text>
                        </View>
                      </View>

                      <View style={styles.customerDetails}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="speed" size={16} color="#666" />
                          <Text style={styles.detailText}>Meter: {customer.meterNumber}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="bolt" size={16} color="#666" />
                          <Text style={styles.detailText}>Disco: {customer.disco}</Text>
                        </View>
                        {customer.verification.verifiedAt && (
                          <View style={styles.detailRow}>
                            <MaterialIcons name="calendar-today" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              Verified on: {new Date(customer.verification.verifiedAt).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Display verification details for verified customers */}
                      <View style={styles.verificationDetails}>
                        <Text style={styles.verificationDetailsTitle}>Verification Data:</Text>
                        <View style={styles.verificationGrid}>
                          <View style={styles.verificationColumn}>
                            <Text style={styles.verificationLabel}>MTK1:</Text>
                            <Text style={styles.verificationValue}>{customer.verification.MTK1}</Text>
                            
                            <Text style={styles.verificationLabel}>MTK2:</Text>
                            <Text style={styles.verificationValue}>{customer.verification.MTK2}</Text>
                          </View>
                          <View style={styles.verificationColumn}>
                            <Text style={styles.verificationLabel}>RTK1:</Text>
                            <Text style={styles.verificationValue}>{customer.verification.RTK1}</Text>
                            
                            <Text style={styles.verificationLabel}>RTK2:</Text>
                            <Text style={styles.verificationValue}>{customer.verification.RTK2}</Text>
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                  <Divider style={styles.divider} />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No verified customers</Text>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 8,
  },
  customerCard: {
    marginBottom: 8,
    backgroundColor: 'white',
    elevation: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  customerStatusPending: {
    color: '#FF9800',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FFF3E0',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerStatusVerified: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  customerDetails: {
    marginLeft: 28,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  verificationForm: {
    marginTop: 12,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: 8,
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#e0e0e0',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  verificationDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  verificationDetailsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 14,
  },
  verificationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verificationColumn: {
    flex: 1,
  },
  verificationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 4,
  },
  verificationValue: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },
});