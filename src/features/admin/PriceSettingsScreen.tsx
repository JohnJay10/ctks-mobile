import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, Button, TextInput, Title, ActivityIndicator, Snackbar, Card, Text } from 'react-native-paper';
import { useAuth } from '../../auth/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DiscoDropdown from '../../components/DiscoDropdown';

interface DiscoPrice {
  _id: string;
  discoName: string;
  pricePerUnit: number;
  updatedAt: string;
}

const DiscoPriceSettingScreen = () => {
  const { api, authState } = useAuth();
  const [prices, setPrices] = useState<DiscoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [newPrice, setNewPrice] = useState({
    discoName: '',
    pricePerUnit: ''
  });

  // Fetch all DISCO prices
  const fetchPrices = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/admin/disco-pricing', {
        headers: {
          Authorization: `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (response.data) {
        const pricesData = (response.data.data || response.data).map((item: any) => ({
          ...item,
          _id: item._id || `${item.discoName}-${item.pricePerUnit}-${Date.now()}` // fallback unique ID
        }));
        setPrices(pricesData);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      let errorMessage = 'Failed to fetch prices';
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Authentication expired. Please login again.';
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'Network error - no response from server';
      } else {
        errorMessage = `Request error: ${err.message}`;
      }
  
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Create new DISCO price
  const handleCreatePrice = async () => {
    try {
      if (!newPrice.discoName || !newPrice.pricePerUnit || isNaN(Number(newPrice.pricePerUnit))) {
        setSnackbarMessage('Please select a DISCO and enter a valid price');
        setSnackbarVisible(true);
        return;
      }
  
      const priceValue = Number(newPrice.pricePerUnit);
      const discoName = newPrice.discoName;
  
      const response = await api.post(
        '/admin/disco-pricing',
        {
          discoName: discoName,
          pricePerUnit: priceValue
        },
        {
          headers: {
            Authorization: `Bearer ${authState.token}`
          }
        }
      );
  
      const newPriceEntry = {
        _id: response.data._id || `${discoName}-${priceValue}-${Date.now()}`,
        discoName: discoName,
        pricePerUnit: priceValue,
        updatedAt: new Date().toISOString(),
        ...response.data
      };
  
      setPrices(prev => [...prev, newPriceEntry]);
      setNewPrice({ discoName: '', pricePerUnit: '' });
      setSnackbarMessage(`${discoName} price created successfully`);
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Create error:', error);
      setSnackbarMessage(error.response?.data?.message || 'Failed to create price');
      setSnackbarVisible(true);
    }
  };

  // Format currency (Naira)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Title style={styles.title}>DISCO Pricing Management</Title>

      {/* Add New Price Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Set New Electricity Price</Text>
          
          {/* DISCO Selection Dropdown */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Electricity Provider</Text>
            <DiscoDropdown 
              selectedValue={newPrice.discoName}
              onValueChange={(disco) => setNewPrice({...newPrice, discoName: disco})}
              style={styles.dropdown}
            />
          </View>

          {/* Price Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price Per Unit (kWh)</Text>
            <TextInput
              value={newPrice.pricePerUnit}
              onChangeText={text => setNewPrice({...newPrice, pricePerUnit: text})}
              keyboardType="numeric"
              mode="outlined"
              style={styles.priceInput}
              outlineColor="#e0e0e0"
              activeOutlineColor="#6200ee"
              left={<TextInput.Affix text="₦ " style={styles.currencyAffix} />}
              placeholder="0.00"
              theme={{
                colors: {
                  placeholder: '#9e9e9e'
                }
              }}
            />
          </View>

          <Button 
            mode="contained" 
            onPress={handleCreatePrice}
            style={styles.submitButton}
            labelStyle={styles.submitButtonLabel}
            contentStyle={styles.submitButtonContent}
          >
            Save Price
          </Button>
        </Card.Content>
      </Card>

      {/* Current Prices List */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Current Electricity Prices</Text>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={[styles.tableHeader, styles.discoColumn]}>Provider</DataTable.Title>
              <DataTable.Title numeric style={[styles.tableHeader, styles.priceColumn]}>Price/kWh</DataTable.Title>
              <DataTable.Title style={[styles.tableHeader, styles.dateColumn]}>Updated</DataTable.Title>
            </DataTable.Header>

            {prices.map(item => (
              <DataTable.Row 
                key={item._id} 
                style={styles.tableRow}
              >
                <DataTable.Cell style={styles.discoColumn}>
                  <View style={styles.discoCell}>
                    <MaterialCommunityIcons 
                      name="transmission-tower" 
                      size={20} 
                      color="#6200ee"
                      style={styles.discoIcon}
                    />
                    <Text style={styles.discoName}>{item.discoName}</Text>
                  </View>
                </DataTable.Cell>
                
                <DataTable.Cell numeric style={styles.priceColumn}>
                  <Text style={styles.priceText}>
                    {formatCurrency(item.pricePerUnit)}
                  </Text>
                </DataTable.Cell>
                
                <DataTable.Cell style={styles.dateColumn}>
                  <Text style={styles.dateText}>
                    {formatDate(item.updatedAt)}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

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
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#616161',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fafafa',
  },
  priceInput: {
    backgroundColor: '#fafafa',
  },
  currencyAffix: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#6200ee',
    borderRadius: 4,
    elevation: 0,
    shadowOpacity: 0,
    marginTop: 8,
  },
  submitButtonLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  submitButtonContent: {
    height: 48,
  },
  tableHeader: {
    fontWeight: '600',
    color: '#333',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  discoCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoIcon: {
    marginRight: 8,
  },
  discoName: {
    fontWeight: '500',
    color: '#333',
  },
  priceText: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  dateText: {
    color: '#666',
    fontSize: 12,
  },
  snackbar: {
    backgroundColor: '#333',
    marginBottom: 20,
  },
  discoColumn: {
    flex: 2,
    paddingRight: 8,
  },
  priceColumn: {
    flex: 1.5,
    paddingHorizontal: 8,
  },
  dateColumn: {
    flex: 1.8,
    paddingLeft: 8,
  },
});

export default DiscoPriceSettingScreen;