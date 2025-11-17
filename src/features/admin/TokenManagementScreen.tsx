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
  approved: boolean;
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
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  customerVerification?: CustomerVerification;
  tokenId?: string;
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
  const [currentAction, setCurrentAction] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,  
    totalPages: 1
  });

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      const [requestsResponse, customersResponse] = await Promise.all([
        api.get(`/tokens/admin/requests?status=pending,approved&page=${page}&limit=10`, {
          headers: { Authorization: `Bearer ${authState.token}` }
        }),
        api.get('/admin/customers', {
          headers: { Authorization: `Bearer ${authState.token}` }
        })
      ]);

      const allCustomers = customersResponse.data.data || customersResponse.data || [];
      const allRequests = requestsResponse.data.data || requestsResponse.data || [];

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
    
    // Remove all hyphens to count just the digits
    const digitsOnly = value.replace(/-/g, '');
    
    // Check if the string contains only digits and hyphens
    if (!/^[\d-]+$/.test(value)) {
      setTokenError('Token can only contain numbers and hyphens');
      return false;
    }
    
    // Check the digit count is between 16-46
    if (digitsOnly.length < 16 || digitsOnly.length > 46) {
      setTokenError('Token must have 16-46 digits (hyphens ignored)');
      return false;
    }
    
    setTokenError('');
    return true;
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      setCurrentAction(`approve-${requestId}`);
      const response = await api.patch(
        `/tokens/admin/approve/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${authState.token}` } }
      );

      if (response.data.success) {
        setRequests(prev => prev.map(req => 
          req._id === requestId ? { ...req, status: 'approved' } : req
        ));
        setSnackbarMessage('Request approved successfully');
      }
    } catch (error) {
      console.error('Approval error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
      setCurrentAction('');
      setSnackbarVisible(true);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      setCurrentAction(`reject-${requestId}`);
      const response = await api.patch(
        `/tokens/admin/reject/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${authState.token}` } }
      );

      if (response.data.success) {
        setRequests(prev => prev.map(req => 
          req._id === requestId ? { ...req, status: 'rejected' } : req
        ));
        setSnackbarMessage('Request rejected successfully');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
      setCurrentAction('');
      setSnackbarVisible(true);
    }
  };

  const handleIssueToken = async () => {
    if (!validateToken(tokenValue)) return;
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      setCurrentAction(`issue-${selectedRequest._id}`);
      const response = await api.post(
        '/tokens/admin/issue',
        {
          tokenValue,
          meterNumber: selectedRequest.meterNumber,
          vendorId: selectedRequest.vendorId._id,
          units: selectedRequest.units,
          amount: selectedRequest.amount,
          requestId: selectedRequest._id,
          MSN: selectedRequest.customerVerification?.MSN
        },
        { headers: { Authorization: `Bearer ${authState.token}` } }
      );

      if (response.data.success) {
        setRequests(prev => prev.map(req => 
          req._id === selectedRequest._id ? { ...req, status: 'completed', tokenId: response.data.data.token._id } : req
        ));
        setSelectedRequest(null);
        setTokenValue('');
        setSnackbarMessage('Token issued successfully');
      }
    } catch (error) {
      console.error('Token issuance error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to issue token');
    } finally {
      setActionLoading(false);
      setCurrentAction('');
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

  const renderStatusBadge = (status: string) => {
    if (status === 'pending') return null;
  
    const statusStyles = {
      pending: styles.statusPending,
      approved: styles.statusApproved,
      rejected: styles.statusRejected,
      completed: styles.statusCompleted
    };

    return (
      <Text style={[styles.statusText, statusStyles[status]]}>
        {status.toUpperCase()}
      </Text>
    );
  };

  const renderActionButtons = (request: TokenRequest) => {
    switch (request.status) {
      case 'pending':
        return (
          <View style={styles.pendingActionsContainer}>
            <Button
              compact
              mode="contained"
              onPress={() => handleApproveRequest(request._id)}
              style={styles.approveButtonSmall}
              labelStyle={styles.smallButtonLabel}
              contentStyle={styles.smallButtonContent}
              disabled={actionLoading && currentAction !== `approve-${request._id}`}
              loading={actionLoading && currentAction === `approve-${request._id}`}
            >
              Approve
            </Button>
            <Button
              compact
              mode="outlined"
              onPress={() => handleRejectRequest(request._id)}
              style={styles.rejectButtonSmall}
              labelStyle={styles.smallButtonLabel}
              contentStyle={styles.smallButtonContent}
              disabled={actionLoading && currentAction !== `reject-${request._id}`}
              loading={actionLoading && currentAction === `reject-${request._id}`}
            >
              Reject
            </Button>
          </View>
        );
      case 'approved':
        return (
          <Button
            compact
            mode="contained"
            onPress={() => setSelectedRequest(request)}
            style={styles.issueButtonSmall}
            labelStyle={styles.smallButtonLabel}
            contentStyle={styles.smallButtonContent}
          >
            Issue
          </Button>
        );
      case 'completed':
        return (
          <Text style={styles.completedTextSmall}>
            ISSUED
          </Text>
        );
      default:
        return null;
    }
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
        <Title style={styles.title}>Token Requests Management</Title>

        <Card style={styles.card} elevation={2}>
          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.vendorCell}>Vendor/Meter</DataTable.Title>
              <DataTable.Title numeric style={styles.amountCell}>Amount</DataTable.Title>
              <DataTable.Title style={styles.statusCell}>Status</DataTable.Title>
              <DataTable.Title style={styles.actionCell}>Actions</DataTable.Title>
            </DataTable.Header>

            {requests.length === 0 ? (
              <DataTable.Row>
                <DataTable.Cell colSpan={4} style={styles.emptyCell}>
                  <Text style={styles.emptyText}>No token requests found</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ) : (
              requests.map(request => (
                <DataTable.Row key={request._id} style={styles.tableRow}>
                  <DataTable.Cell style={styles.vendorCell}>
                    <Text style={styles.vendorName}>{request.vendorId.name}</Text>
                    <Text style={styles.vendorEmail}>{request.meterNumber}</Text>
                    <Text style={styles.vendorDate}>{formatDate(request.createdAt)}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.amountCell}>
                    <Text style={styles.amountText}>₦{request.amount?.toLocaleString()}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.statusCell}>
                    {renderStatusBadge(request.status)}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.actionCell}>
                    {renderActionButtons(request)}
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
              <Text style={styles.dialogSubtitle}>
                For {selectedRequest.vendorId.name} - {selectedRequest.meterNumber}
              </Text>
              
              <Divider style={styles.divider} />

              {/* Request ID Field */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Request ID</Text>
                <TextInput
                  value={selectedRequest._id}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              </View>

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
                <Text style={styles.label}>Amount (₦)</Text>
                <TextInput
                  value={selectedRequest.amount.toString()}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
              <Text style={styles.label}>Token Value *</Text>
              <TextInput
                value={tokenValue}
                onChangeText={setTokenValue}
                mode="outlined"
                placeholder="Enter 16-45 digit token (hyphens allowed)"
                error={!!tokenError}
                style={styles.input}
                maxLength={45} // Allowing for hyphens in the max length
                keyboardType="numbers-and-punctuation" // Changed to allow hyphens
              />
              {tokenError && <Text style={styles.errorText}>{tokenError}</Text>}
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
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleIssueToken}
                  loading={actionLoading && currentAction === `issue-${selectedRequest._id}`}
                  disabled={!tokenValue || !!tokenError || (actionLoading && currentAction !== `issue-${selectedRequest._id}`)}
                  style={styles.sendButton}
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
    padding: 16,
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
  },
  tableHeader: {
    backgroundColor: '#f0f2f5',
  },
  tableRow: {
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  vendorCell: {
    flex: 2,
  },
  vendorName: {
    fontWeight: '500',
    fontSize: 14,
  },
  vendorEmail: {
    fontSize: 12,
    color: '#666',
  },
  vendorDate: {
    fontSize: 11,
    color: '#999',
  },
  amountCell: {
    justifyContent: 'center',
  },
  amountText: {
    fontWeight: '500',
  },
  statusCell: {
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusPending: {
    color: '#FFA000',
  },
  statusApproved: {
    color: '#4CAF50',
  },
  statusRejected: {
    color: '#F44336',
  },
  statusCompleted: {
    color: '#2196F3',
  },
  actionCell: {
    justifyContent: 'center',
  },
  emptyCell: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
  },
  emptyText: {
    color: '#999',
  },
  dialogCard: {
    marginTop: 16,
    borderRadius: 8,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dialogSubtitle: {
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#F44336',
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
    borderColor: '#666',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 16,
  },
  paginationButton: {
    minWidth: 80,
  },
  pageText: {
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  pendingActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 150,
  },
  smallButtonContent: {
    height: 30,
    paddingHorizontal: 8,
  },
  smallButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
    marginHorizontal: 0,
  },
  approveButtonSmall: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minWidth: 70,
  },
  rejectButtonSmall: {
    borderColor: '#F44336',
    borderRadius: 4,
    minWidth: 70,
  },
  issueButtonSmall: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    minWidth: 70,
  },
  completedTextSmall: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    width: 70,
  },
});

export default TokenManagementScreen;