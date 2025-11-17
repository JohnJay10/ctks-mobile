import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { Text, useTheme, Card, Button, ActivityIndicator, Menu, Divider, TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../auth/AuthContext';
import DiscoDropdown from '../../../components/DiscoDropdown';
// Adjust the relative path based on your actual file structure

interface Verification {
  isVerified: boolean;
  rejected: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  verifiedAt?: string;
}

interface Customer {
  _id: string;
  meterNumber: string;
  disco: string;
  lastToken?: string;
  createdAt: string;
  verification?: Verification;
}

interface VendorInfo {
  customerLimit: number;
  customerCount: number;
  pendingUpgrade?: boolean;
  effectiveLimit?: number;
}


const ITEMS_PER_PAGE = 4;
const CUSTOMER_LIMIT = 1000;

const CustomerManagementScreen = () => {
  const { colors } = useTheme();
  const { api, authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({ customerLimit: CUSTOMER_LIMIT, customerCount: 0 });
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [upgradeQuantity, setUpgradeQuantity] = useState(500);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [lastUpgradeTime, setLastUpgradeTime] = useState<number>(0);
  
  // Form State
  const [formData, setFormData] = useState({
    meterNumber: '',
    disco: '',
    lastToken: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    meterNumber: '',
    disco: '',
    lastToken: ''
  });
  
  const [discoMenuVisible, setDiscoMenuVisible] = useState(false);
  
  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [expandedSection, setExpandedSection] = useState<'verification' | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Load customers and vendor info
  const loadCustomers = useCallback(async () => {
    try {
      setRefreshing(true);
      const [customersResponse, vendorResponse] = await Promise.all([
        api.get('/vendor/getPendingVerifications', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }),
        api.get('/vendor/getVendorLimits', {
          headers: { Authorization: `Bearer ${authState.token}` },
          params: { ts: Date.now() }
        })
      ]);

      // Handle response data with proper null checks
      const customersData = Array.isArray(customersResponse.data?.data) ? 
        customersResponse.data.data : 
        (Array.isArray(customersResponse.data) ? customersResponse.data : []);
      
      const vendorData = vendorResponse.data?.data || vendorResponse.data || {};

      setCustomers(customersData);
      setFilteredCustomers(customersData);
      setVendorInfo({
        customerLimit: vendorData.customerLimit || CUSTOMER_LIMIT,
        customerCount: vendorData.customerCount || 0,
        pendingUpgrade: vendorData.pendingUpgrade || false
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load customer data');
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setRefreshing(false);
    }
  }, [api, authState.token, lastUpgradeTime]);

  useEffect(() => {
    loadCustomers(); // Initial load
    
    const interval = setInterval(() => {
      loadCustomers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loadCustomers]);

  // Update total pages when filtered customers change
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    setTotalPages(newTotalPages);
    // Reset to page 1 when search results change
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [filteredCustomers]);

  // Get paginated data
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, endIndex);
  };

  // Handle search
  const handleSearch = useCallback(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.meterNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, customers]);

  // Handle input change for search
  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (text.trim() === '') {
      setFilteredCustomers(customers);
      setCurrentPage(1);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { meterNumber: '', disco: '', lastToken: '' };

    if (!formData.meterNumber.trim()) {
      newErrors.meterNumber = 'Meter number is required';
      valid = false;
    } else if (!/^\d{6,20}$/.test(formData.meterNumber)) {
      newErrors.meterNumber = 'Invalid meter number (6-20 digits)';
      valid = false;
    }

    if (!formData.disco) {
      newErrors.disco = 'Disco is required';
      valid = false;
    }

    if (!formData.lastToken.trim()) {
      newErrors.lastToken = 'Last token is required for verification';
      valid = false;
    } else if (!/^\d{8,20}$/.test(formData.lastToken)) {
      newErrors.lastToken = 'Invalid token format (8-20 digits)';
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const response = await api.post('/vendor/addCustomer', formData, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      Alert.alert(
        'Success',
        `Customer added successfully!\n\nMeter: ${formData.meterNumber}\nDisco: ${formData.disco}\nLast Token: ${formData.lastToken}`,
        [
          {
            text: 'Add Another',
            onPress: () => {
              setFormData({ meterNumber: '', disco: '', lastToken: '' });
              loadCustomers();
            }
          }
        ]
      );

      setFormData({ meterNumber: '', disco: '', lastToken: '' });
      loadCustomers(); // Refresh customer list

    } catch (error: any) {
      let errorMessage = 'Failed to create customer';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      `Server error (${error.response.status})`;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeQuantityChange = (value: number) => {
    const newValue = Math.max(500, Math.min(value, 5000)); // Limit between 500 and 5000
    setUpgradeQuantity(newValue - (newValue % 500)); // Round to nearest 500
  };

  const initiateUpgrade = async () => {
    try {
      setUpgradeLoading(true);
      const amount = upgradeQuantity * 100; 
      
      const response = await api.post('/vendor/initiateUpgrade', {
        additionalCustomers: upgradeQuantity,
        amount: amount
      }, {
        headers: { 
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('Invalid response from server');
      }
      
      const { instructions } = response.data;
      
      Alert.alert(
        'Successful Response',
    
        `Your account will be upgraded automatically once payment is verified.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setUpgradeModalVisible(false);
              setLastUpgradeTime(Date.now()); // Trigger refresh
            } 
          }
        ]
      );
      
    } catch (error: any) {
      let errorMessage = 'Failed to initiate upgrade';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const toggleSection = (section: 'verification') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  // Pagination controls component
  const PaginationControls = () => (
    <View style={styles.paginationContainer}>
      <Button
        mode="outlined"
        onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        style={styles.paginationButton}
      >
        Previous
      </Button>
      
      <Text style={[styles.pageText, { color: colors.onSurface }]}>
        Page {currentPage} of {totalPages}
      </Text>
      
      <Button
        mode="outlined"
        onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        style={styles.paginationButton}
      >
        Next
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadCustomers}
            colors={[colors.primary]}
          />
        }
      >
        {/* Add Customer Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.onSurface }]}>
            Add New Customer
          </Text>
          
          <View style={styles.customerLimitContainer}>
            <Text style={[styles.customerLimitText, { color: colors.onSurface }]}>
              Customer slots: {vendorInfo.customerCount}/{vendorInfo.customerLimit}
            </Text>
            {vendorInfo.customerCount >= vendorInfo.customerLimit ? (
              <Text style={styles.upgradeRequiredText}>
                {vendorInfo.pendingUpgrade ? 
                  'Upgrade processing...' : 
                  'Upgrade required to add more customers'}
              </Text>
            ) : (
              <Text style={[styles.hintText, { color: colors.success }]}>
                {vendorInfo.customerLimit > CUSTOMER_LIMIT ?
                  `Upgraded! +${vendorInfo.customerLimit - CUSTOMER_LIMIT} slots` :
                  'Basic plan'}
              </Text>
            )}
          </View>
          
          {vendorInfo.customerCount < vendorInfo.customerLimit ? (
    <View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              Meter Number *
            </Text>
            <TextInput
              style={[
                styles.input,
                formErrors.meterNumber && styles.inputError,
                { backgroundColor: colors.background, color: colors.onSurface }
              ]}
              placeholder="Enter meter number (6-20 digits)"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={formData.meterNumber}
              onChangeText={(text) => handleInputChange('meterNumber', text)}
              error={!!formErrors.meterNumber}
            />
            {formErrors.meterNumber && (
              <Text style={styles.errorText}>{formErrors.meterNumber}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              Disco *
            </Text>
            <DiscoDropdown
              selectedValue={formData.disco}
              onValueChange={(value) => handleInputChange('disco', value)}
              style={[
                styles.input,
                formErrors.disco && styles.inputError,
                { backgroundColor: colors.background }
              ]}
            />
            {formErrors.disco && (
              <Text style={styles.errorText}>{formErrors.disco}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              Last Token *
            </Text>
            <TextInput
              style={[
                styles.input,
                formErrors.lastToken && styles.inputError,
                { backgroundColor: colors.background, color: colors.onSurface }
              ]}
              placeholder="Enter last purchased token (8-20 digits)"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={formData.lastToken}
              onChangeText={(text) => handleInputChange('lastToken', text)}
              error={!!formErrors.lastToken}
            />
            <Text style={[styles.hintText, { color: colors.onSurface }]}>
              This helps verify the customer's existence
            </Text>
            {formErrors.lastToken && (
              <Text style={styles.errorText}>{formErrors.lastToken}</Text>
            )}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            labelStyle={styles.submitButtonText}
          >
            Add Customer
          </Button>
     </View>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={() => setUpgradeModalVisible(true)}
                      style={[styles.submitButton, { marginTop: 20 }]}
                      labelStyle={styles.submitButtonText}
                    >
                      Upgrade Required
                    </Button>
                  )}
                </Card>

                {/* Verification Status Section */}
                <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => toggleSection('verification')}
                  >
                    <View style={styles.sectionHeaderContent}>
                      <MaterialIcons 
                        name={expandedSection === 'verification' ? 'keyboard-arrow-down' : 'keyboard-arrow-right'} 
                        size={24} 
                        color={colors.onSurface}
                      />
                      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                        Verification Status ({filteredCustomers.length})
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {expandedSection === 'verification' && (
                    <View style={styles.sectionContent}>
                      {/* Search Bar */}
                      <View style={styles.searchContainer}>
                        <TextInput
                          style={[
                            styles.searchInput,
                            { backgroundColor: colors.background, color: colors.onSurface }
                          ]}
                          placeholder="Search by meter number"
                          placeholderTextColor="#999"
                          value={searchTerm}
                          onChangeText={handleSearchChange}
                          onSubmitEditing={handleSearch}
                          returnKeyType="search"
                        />
                <Button
                  mode="contained"
                  onPress={handleSearch}
                  style={styles.searchButton}
                >
                  Search
                </Button>
              </View>

             
{getPaginatedData().length > 0 ? (
  <View>
  {getPaginatedData().map((customer, index) => {
    const isRejected = customer.verification?.rejected || false;
    return (
      <View key={customer._id}>
        <Card
          style={[
            styles.customerCard,
            {
              backgroundColor: colors.background,
              borderLeftWidth: 4,
              borderLeftColor: isRejected ? colors.error : colors.warning,
            },
          ]}
        >
          <Card.Content>
            <View style={styles.customerHeader}>
              <MaterialIcons name="speed" size={20} color={colors.onSurface} />
              <Text style={[styles.customerName, { color: colors.onSurface }]}>
                Meter: {customer.meterNumber}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isRejected
                      ? colors.errorContainer
                      : colors.warningContainer,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: isRejected ? colors.error : colors.warning },
                  ]}
                >
                  {isRejected ? "Rejected" : "Pending"}
                </Text>
              </View>
            </View>

            <View style={styles.customerDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="bolt" size={16} color={colors.onSurface} />
                <Text style={[styles.detailText, { color: colors.onSurface }]}>
                  Disco: {customer.disco}
                </Text>
              </View>
              {customer.lastToken && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="vpn-key" size={16} color={colors.onSurface} />
                  <Text style={[styles.detailText, { color: colors.onSurface }]}>
                    Last Token: {customer.lastToken}
                  </Text>
                </View>
              )}
              {isRejected && customer.verification && (
                <View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="info" size={16} color={colors.onSurface} />
                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                      Reason: {customer.verification.rejectionReason || "No reason provided"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={16} color={colors.onSurface} />
                    <Text style={[styles.detailText, { color: colors.onSurface }]}>
                      Rejected: {formatDate(customer.verification.rejectedAt)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
        {index < getPaginatedData().length - 1 && (
          <Divider style={[styles.divider, { backgroundColor: colors.onSurface }]} />
        )}
      </View>
    );
  })}
  {totalPages > 1 && <PaginationControls />}
</View>
) : (
  <Text style={[styles.emptyText, { color: colors.onSurface }]}>
    {searchTerm ? "No matching customers found" : "No customers awaiting verification"}
  </Text>
)}

            </View>
          )}
        </Card>
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal
        visible={upgradeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
              Upgrade Your Account
            </Text>
            
            <Text style={[styles.modalText, { color: colors.onSurface }]}>
              You've reached your current customer limit of {vendorInfo.customerLimit}.
              Upgrade to add more customers.
            </Text>
            
            <View style={styles.upgradeQuantityContainer}>
              <Text style={[styles.modalText, { color: colors.onSurface }]}>
                Additional customer slots:
              </Text>
              <View style={styles.quantityControls}>
                <Button
                  mode="outlined"
                  onPress={() => handleUpgradeQuantityChange(upgradeQuantity - 500)}
                  disabled={upgradeQuantity <= 500} 
                >
                  -
                </Button>
                <Text style={[styles.quantityText, { color: colors.onSurface }]}>
                  {upgradeQuantity}
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => handleUpgradeQuantityChange(upgradeQuantity + 500)}
                  disabled={upgradeQuantity >= 5000}
                >
                  +
                </Button>
              </View>
              <Text style={[styles.priceText, { color: colors.onSurface }]}>
                Price: ₦{(upgradeQuantity * 100).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentTitle, { color: colors.onSurface }]}>
                Payment Details:
              </Text>
              <Text style={[styles.paymentInfo, { color: colors.onSurface }]}>
                Bank: Moniepoint MFB
              </Text>
              <Text style={[styles.paymentInfo, { color: colors.onSurface }]}>
                Account Name: CRADTECH SOLUTIONS SERVICES
              </Text>
              <Text style={[styles.paymentInfo, { color: colors.onSurface }]}>
                Account Number: 6497415111
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setUpgradeModalVisible(false)}
                disabled={upgradeLoading}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={initiateUpgrade}
                loading={upgradeLoading}
                disabled={upgradeLoading}
              >
                Complete Upgrade
              </Button>
            </View>
          </View>
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
  content: {
    flex: 1,
  },
  formCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  customerLimitContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  customerLimitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  upgradeRequiredText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  discoInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 6,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
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
    marginLeft: 8,
  },
  sectionContent: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
    height: 40,
  },
  searchButton: {
    height: 40,
    justifyContent: 'center',
  },
  customerCard: {
    marginBottom: 8,
    elevation: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
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
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
    height: 1,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  paginationButton: {
    minWidth: 100,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    borderRadius: 8,
    padding: 20,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeQuantityContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  paymentDetails: {
    marginTop: 16,
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  paymentTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paymentInfo: {
    marginBottom: 4,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});

export default CustomerManagementScreen;