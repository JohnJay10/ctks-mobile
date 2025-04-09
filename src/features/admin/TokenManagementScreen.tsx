import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  DataTable, 
  Button, 
  TextInput, 
  Card, 
  Title, 
  ActivityIndicator, 
  Snackbar, 
  Text,
  Divider
} from 'react-native-paper';
import { useAuth } from '../../auth/AuthContext';

const { height } = Dimensions.get('window');

interface Vendor {
  _id: string;
  name: string;
  email: string;
}

interface CustomerVerification {
  isVerified: boolean;
  KRN?: string;
  SGC?: string;
  TI?: string;
  MSN?: string;
  MTK1?: string;
  MTK2?: string;
  RTK1?: string;
  RTK2?: string;
}

interface TokenRequest {
  _id: string;
  vendorId: Vendor;
  meterNumber: string;
  disco: string;
  units: number;
  amount: number;
  status: 'pending' | 'issued' | 'used' | 'expired';
  createdAt: string;
  customerVerification?: CustomerVerification;
}

const TokenManagementScreen = () => {
  const { api, authState } = useAuth();
  const [requests, setRequests] = useState<TokenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TokenRequest | null>(null);
  const [tokenValue, setTokenValue] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1
  });

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Fetch token requests and customers in parallel
      const [requestsResponse, customersResponse] = await Promise.all([
        api.get('/tokens/admin/requests', {
          headers: { Authorization: `Bearer ${authState.token}` }
        }),
        api.get('/admin/customers', {
          headers: { Authorization: `Bearer ${authState.token}` }
        })
      ]);

      const allCustomers = customersResponse.data.data || customersResponse.data || [];
      const allRequests = requestsResponse.data.data || requestsResponse.data || [];

      // Match requests with customer verification data
      const requestsWithVerification = allRequests.map((request: TokenRequest) => {
        const customer = allCustomers.find((c: any) => c.meterNumber === request.meterNumber);
        return {
          ...request,
          customerVerification: customer?.verification || null
        };
      });

      const startIdx = (page - 1) * pagination.limit;
      const endIdx = startIdx + pagination.limit;
      const paginatedRequests = requestsWithVerification.slice(startIdx, endIdx);

      setRequests(paginatedRequests);
      setPagination({
        page,
        limit: pagination.limit,
        total: requestsWithVerification.length,
        totalPages: Math.ceil(requestsWithVerification.length / pagination.limit)
      });
    } catch (error) {
      console.error('Fetch error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to fetch data');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchData(newPage);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const validateToken = (value: string) => {
    if (!value) {
      setTokenError('Token value is required');
      return false;
    }
   
    if (!/^\d+$/.test(value)) {
      setTokenError('Token must contain only numbers');
      return false;
    }
    setTokenError('');
    return true;
  };

  const handleIssueToken = async () => {
    if (!validateToken(tokenValue)) return;

    try {
      setActionLoading(true);
      const response = await api.post(   
        '/tokens/admin/issue',
        {
          tokenValue,
          meterNumber: selectedRequest?.meterNumber,
          vendorId: selectedRequest?.vendorId._id,
          units: selectedRequest?.units, 
        },
        {
          headers: { Authorization: `Bearer ${authState.token}` }
        }
      );

      setRequests(prev => prev.map(req => 
        req._id === selectedRequest?._id ? { ...req, status: 'issued' } : req
      ));

      setSelectedRequest(null);
      setTokenValue('');
      setSnackbarMessage('Token issued successfully');
    } catch (error) {
      console.error('Token issuance error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to issue token');
    } finally {
      setActionLoading(false);
      setSnackbarVisible(true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Title style={styles.title}>Token Requests</Title>

        <Card style={styles.card} elevation={2}>
          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.vendorCell}>Vendor</DataTable.Title>
              <DataTable.Title numeric>Amount</DataTable.Title>
              <DataTable.Title>Action</DataTable.Title>
            </DataTable.Header>

            {requests.length === 0 ? (
              <DataTable.Row>
                <DataTable.Cell colSpan={3} style={styles.emptyCell}>
                  <Text style={styles.emptyText}>No requests found</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ) : (
              requests.map(request => (
                <DataTable.Row key={request._id} style={styles.tableRow}>
                  <DataTable.Cell style={styles.vendorCell}>
                    <Text style={styles.vendorName} numberOfLines={1}>
                      {request.vendorId.name}
                    </Text>
                    <Text style={styles.vendorEmail} numberOfLines={1}>
                      {request.meterNumber}
                    </Text>
                    <Text style={styles.vendorDate}>
                      {formatDate(request.createdAt)}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.amountCell}>
                    <Text style={styles.amountText}>
                      ₦{request.amount?.toLocaleString()}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.actionCell}>
                    {request.status === 'pending' && (
                      <Button 
                        compact
                        mode="contained"
                        onPress={() => setSelectedRequest(request)}
                        style={styles.issueButton}
                        labelStyle={styles.buttonLabel}
                      >
                        Issue
                      </Button>
                    )}
                  </DataTable.Cell>
                </DataTable.Row>
              ))
            )}
          </DataTable>

          {pagination.totalPages > 1 && (
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

        {selectedRequest && (
          <Card style={styles.dialogCard}>
            <Card.Content>
              <Title style={styles.dialogTitle}>Issue Token</Title>
              <Text style={styles.dialogSubtitle}>For {selectedRequest.vendorId.name}</Text>
              
              <Divider style={styles.divider} />

              <View style={styles.formGroup}>
                <Text style={styles.label}>Meter Number</Text>
                <TextInput
                  value={selectedRequest.meterNumber}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Meter Serial Number (MSN)</Text>
                <TextInput
                  value={selectedRequest.customerVerification?.MSN || 'Not available'}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              </View>

              {/* Add Units field */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Units</Text>
                  <TextInput
                    value={selectedRequest.units.toString()}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Token Value *</Text>
                <TextInput
                  value={tokenValue}
                  onChangeText={(text) => {
                    setTokenValue(text);
                    validateToken(text);
                  }}
                  mode="outlined"
                  placeholder="Enter 20-digit token value"
                  style={[styles.input, tokenError ? styles.inputError : null]}
                  maxLength={25}
                  keyboardType="numeric"
                />
                {tokenError ? <Text style={styles.errorText}>{tokenError}</Text> : null}
              </View>

              <View style={styles.dialogButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSelectedRequest(null);
                    setTokenValue('');
                    setTokenError('');
                  }}
                  style={styles.cancelButton}
                  labelStyle={styles.dialogButtonLabel}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleIssueToken}
                  loading={actionLoading}
                  disabled={!tokenValue || !!tokenError || actionLoading}
                  style={styles.sendButton}
                  labelStyle={styles.dialogButtonLabel}
                >
                  Issue Token
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f0f2f5',
    height: 40,
  },
  vendorCell: {
    flex: 2,
    paddingHorizontal: 8,
  },
  tableRow: {
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  vendorName: {
    fontWeight: '500',
    fontSize: 14,
    color: '#333',
  },
  vendorEmail: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  vendorDate: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  amountCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionCell: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  issueButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    height: 32,
    minWidth: 70,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '500',
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
  dialogCard: {
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dialogSubtitle: {
    color: '#6c757d',
    fontSize: 14,
    marginBottom: 12,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#e9ecef',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    borderColor: '#6c757d',
  },
  sendButton: {
    backgroundColor: '#28a745',
  },
  dialogButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 14,
    color: '#495057',
  },
  snackbar: {
    backgroundColor: '#343a40',
    borderRadius: 4,
    margin: 16,
  },
});

export default TokenManagementScreen;