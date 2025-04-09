import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  DataTable, 
  Button, 
  Modal, 
  Portal, 
  TextInput, 
  Title, 
  ActivityIndicator, 
  Snackbar, 
  Card,
  Text
} from 'react-native-paper';
import { useAuth } from '../../../auth/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

interface Vendor {
  _id: string;
  email: string;
  username: string;
  approved: boolean;
  approvedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const VendorListScreen = () => {
  const { api, authState } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [newVendor, setNewVendor] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 1
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });  
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/vendors', {
        headers: {
          Authorization: `Bearer ${authState.token}`
        }
      });

      // Since your backend currently returns all vendors without pagination,
      // we'll implement client-side pagination
      const allVendors = response.data.data || [];
      setVendors(allVendors);
      
      // Calculate pagination details client-side
      setPagination(prev => ({
        ...prev,
        total: allVendors.length,
        totalPages: Math.ceil(allVendors.length / prev.limit)
      }));
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  // Get paginated subset of vendors
  const getPaginatedVendors = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return vendors.slice(startIndex, endIndex);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const onRefresh = useCallback(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchVendors();
  }, []);

  const approveVendor = async (vendor: Vendor) => {
    try {
      setApprovingId(vendor._id);
      
      const response = await api.patch(
        `/admin/vendors/${vendor._id}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authState.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update the specific vendor in our local state
      setVendors(prev => prev.map(v => 
        v._id === vendor._id ? { 
          ...v, 
          approved: true,
          approvedAt: new Date().toISOString()
        } : v
      ));

      setSnackbarMessage('Vendor approved successfully');
    } catch (error) {
      console.error('Approval error:', {
        error: error.response?.data || error.message,
        vendorId: vendor._id
      });

      const errorMessage = error.response?.data?.message || 
                         (error.response?.status === 400 ? 'Vendor already approved' : 
                         'Failed to approve vendor');
      
      setSnackbarMessage(errorMessage);
      fetchVendors();
    } finally {
      setApprovingId(null);
      setSnackbarVisible(true);
    }
  };

  const createVendor = async () => {
    try {
      // Validate all fields
      if (!newVendor.username.trim()) {
        setSnackbarMessage('Username is required');
        setSnackbarVisible(true);
        return;
      }
      if (!newVendor.email.trim()) {
        setSnackbarMessage('Email is required');
        setSnackbarVisible(true);
        return;
      }
      if (!newVendor.password.trim()) {
        setSnackbarMessage('Password is required');
        setSnackbarVisible(true);
        return;
      }
      if (newVendor.password.length < 6) {
        setSnackbarMessage('Password must be at least 6 characters');
        setSnackbarVisible(true);
        return;
      }
  
      // Prepare the request payload matching your backend expectations
      const payload = {
        email: newVendor.email.trim(),
        username: newVendor.username.trim(),
        password: newVendor.password.trim(),
        role: 'vendor' // Adding the required role field
      };
  
      const response = await api.post('/admin/vendors', payload, {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });
  
      // Handle successful response (201 Created)
      if (response.status === 201) {
        // Since your backend returns only a message, not the created vendor,
        // we need to fetch the updated list
        fetchVendors(1); // Refresh to first page
        
        setVisible(false);
        setNewVendor({ username: '', email: '', password: '' });
        setSnackbarMessage(response.data.message || 'Vendor created successfully');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Create vendor error:', error);
      
      let errorMessage = 'Vendor creation failed';
      if (error.response) {
        // Handle specific error cases
        if (error.response.status === 400) {
          errorMessage = error.response.data.message || 'Vendor already exists';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      setSnackbarMessage(errorMessage);
    } finally {
      setSnackbarVisible(true);
    }
  };
  const handleInputChange = useCallback((field: keyof typeof newVendor) => (text: string) => {
    setNewVendor(prev => ({
      ...prev,
      [field]: text
    }));
  }, []);

  if (loading && vendors.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  const paginatedVendors = getPaginatedVendors();

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Vendor Management</Title>
      
      <Button 
        mode="contained" 
        onPress={() => setVisible(true)}
        style={styles.addButton}
        icon="account-plus"
        labelStyle={styles.buttonLabel}
      >
        Add Vendor
      </Button>

      <Card style={styles.tableCard} elevation={2}>
        <DataTable>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.headerCell} textStyle={styles.headerText}>Username</DataTable.Title>
            <DataTable.Title style={styles.headerCell} textStyle={styles.headerText}>Email</DataTable.Title>
            <DataTable.Title style={styles.headerCell} textStyle={styles.headerText}>Status</DataTable.Title>
            <DataTable.Title style={styles.headerCell} textStyle={styles.headerText}>Actions</DataTable.Title>
          </DataTable.Header>

          {paginatedVendors.length === 0 ? (
            <DataTable.Row>
              <DataTable.Cell colSpan={4} style={styles.emptyCell}>
                <Text style={styles.emptyText}>No vendors found</Text>
              </DataTable.Cell>
            </DataTable.Row>
          ) : (
            paginatedVendors.map(vendor => (
              <DataTable.Row key={vendor._id} style={styles.tableRow}>
                <DataTable.Cell style={styles.dataCell} textStyle={styles.cellText}>{vendor.username}</DataTable.Cell>
                <DataTable.Cell style={styles.dataCell} textStyle={styles.cellText}>{vendor.email}</DataTable.Cell>
                <DataTable.Cell style={styles.statusCell}>
                  <View style={[
                    styles.statusBadge,
                    vendor.approved ? styles.approvedBadge : styles.pendingBadge
                  ]}>
                    <MaterialCommunityIcons 
                      name={vendor.approved ? 'check-circle' : 'clock'} 
                      size={14} 
                      color="#fff" 
                      style={styles.statusIcon}
                    />
                    <Text style={styles.statusText}>
                      {vendor.approved ? 'Approved' : 'Pending'}
                    </Text>
                  </View>
                  {vendor.approved && vendor.approvedAt && (
                    <Text style={styles.approvedDateText}>{formatDate(vendor.approvedAt)}</Text>
                  )}
                </DataTable.Cell>
                <DataTable.Cell style={styles.actionCell}>
                  {!vendor.approved ? (
                    <Button 
                      mode="contained"
                      onPress={() => approveVendor(vendor)}
                      disabled={approvingId === vendor._id}
                      loading={approvingId === vendor._id}
                      style={styles.actionButton}
                      labelStyle={styles.actionButtonLabel}
                      contentStyle={styles.actionButtonContent}
                      compact
                    >
                      Approve
                    </Button>
                  ) : (
                    <Text style={styles.approvedText}>Approved</Text>
                  )}
                </DataTable.Cell>
              </DataTable.Row>
            ))
          )}
        </DataTable>

        {/* Pagination Controls */}
        {vendors.length > pagination.limit && (
          <View style={styles.paginationContainer}>
            <Button 
              mode="text"
              onPress={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={styles.paginationButton}
              labelStyle={styles.paginationButtonLabel}
            >
              Previous
            </Button>
            
            <Text style={styles.pageText}>
              Page {pagination.page} of {pagination.totalPages}
            </Text>
            
            <Button 
              mode="text"
              onPress={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              style={styles.paginationButton}
              labelStyle={styles.paginationButtonLabel}
            >
              Next
            </Button>
          </View>
        )}
      </Card>

      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content>
              <Title style={styles.modalTitle}>Create New Vendor</Title>
              <TextInput
                label="Username"
                value={newVendor.username}
                onChangeText={handleInputChange('username')}
                style={styles.input}
                mode="outlined"
                autoCapitalize="none"
              />
              <TextInput
                label="Email"
                value={newVendor.email}
                onChangeText={handleInputChange('email')}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
              />
              <TextInput
                label="Password"
                value={newVendor.password}
                onChangeText={handleInputChange('password')}
                style={styles.input}
                secureTextEntry
                mode="outlined"
              />
              <Button 
                mode="contained" 
                onPress={createVendor}
                style={styles.submitButton}
                labelStyle={styles.buttonLabel}
                loading={loading}
              >
                Create Vendor
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: '600',
    color: '#343a40',
    textAlign: 'center',
  },
  addButton: {
    marginBottom: 20,
    borderRadius: 6,
    backgroundColor: '#4e73df',
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tableCard: {
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    height: 44,
  },
  headerCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  tableRow: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dataCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cellText: {
    fontSize: 13,
    color: '#212529',
  },
  statusCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionCell: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  emptyCell: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
  },
  emptyText: {
    color: '#6c757d',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  approvedDateText: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  approvedBadge: {
    backgroundColor: '#28a745',
  },
  pendingBadge: {
    backgroundColor: '#ffc107',
  },
  actionButton: {
    borderRadius: 4,
    height: 32,
    minWidth: 80,
  },
  actionButtonContent: {
    height: 32,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  approvedText: {
    color: '#28a745',
    fontWeight: '500',
    fontSize: 13,
  },
  modalContainer: {
    padding: 20,
  },
  modalCard: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    marginBottom: 20,
    fontSize: 18,
    color: '#343a40',
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 6,
    backgroundColor: '#4e73df',
    paddingVertical: 4,
  },
  snackbar: {
    backgroundColor: '#343a40',
    borderRadius: 6,
    marginBottom: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  paginationButton: {
    minWidth: 80,
  },
  paginationButtonLabel: {
    fontSize: 12,
  },
  pageText: {
    fontSize: 13,
    color: '#495057',
  },
});

export default VendorListScreen;