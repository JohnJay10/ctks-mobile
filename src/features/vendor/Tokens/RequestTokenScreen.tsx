import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Text, Menu, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const RequestTokenScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [units, setUnits] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [disco, setDisco] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Fetch vendor's customers and disco pricing
  useEffect(() => {
    // Simulate API calls
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch customers
        // const customersRes = await api.get('/vendor/customers');
        setCustomers([
          { id: '1', meterNumber: '123456789', disco: 'IKEDC', name: 'John Doe' },
          { id: '2', meterNumber: '987654321', disco: 'AEDC', name: 'Jane Smith' },
        ]);

        // If customerId was passed in params
        if (route.params?.customerId) {
          const customer = customers.find(c => c.id === route.params.customerId);
          if (customer) {
            setSelectedCustomer(customer);
            setMeterNumber(customer.meterNumber);
            setDisco(customer.disco);
          }
        }

        // Fetch disco pricing
        // const pricingRes = await api.get('/disco-pricing');
        // setPricePerUnit(pricingRes.data.pricePerUnit);
        setPricePerUnit(50); // Temporary hardcoded value
      } catch (error) {
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [route.params]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      const totalAmount = Number(units) * pricePerUnit;
      
      // Here you would integrate with payment gateway
      // After successful payment, request token from admin
      // await api.post('/vendor/token-requests', {
      //   meterNumber,
      //   units: Number(units),
      //   amount: totalAmount,
      //   disco
      // });

      Alert.alert(
        'Request Submitted',
        `Token request for ${units} units (₦${totalAmount}) has been submitted for approval`
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Request Token</Title>

          {!route.params?.customerId && (
            <>
              <Text style={styles.label}>Select Customer</Text>
              <Menu
                visible={false} // You'll need to manage menu visibility state
                onDismiss={() => {}}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => {}}
                    style={styles.dropdownButton}
                  >
                    {selectedCustomer ? 
                      `${selectedCustomer.name} (${selectedCustomer.meterNumber})` : 
                      'Select Customer'}
                  </Button>
                }
              >
                {customers.map(customer => (
                  <Menu.Item
                    key={customer.id}
                    title={`${customer.name} (${customer.meterNumber})`}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setMeterNumber(customer.meterNumber);
                      setDisco(customer.disco);
                    }}
                  />
                ))}
              </Menu>
            </>
          )}

          <TextInput
            label="Meter Number"
            value={meterNumber}
            onChangeText={setMeterNumber}
            mode="outlined"
            style={styles.input}
            disabled={!!selectedCustomer}
          />

          <TextInput
            label="Disco"
            value={disco}
            onChangeText={setDisco}
            mode="outlined"
            style={styles.input}
            disabled={true}
          />

          <TextInput
            label="Units"
            value={units}
            onChangeText={setUnits}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Price per Unit:</Text>
            <Text style={styles.priceValue}>₦{pricePerUnit}</Text>
          </View>

          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Total Amount:</Text>
            <Text style={styles.priceValue}>
              ₦{units ? (Number(units) * pricePerUnit).toLocaleString() : '0'}
            </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleRequest}
            loading={loading}
            disabled={!units || !meterNumber || !disco}
            style={styles.submitButton}
          >
            Proceed to Payment
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    borderRadius: 8,
  },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  label: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: 8,
  },
  dropdownButton: {
    marginBottom: 16,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: '#333',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RequestTokenScreen;











