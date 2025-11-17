import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Text, Menu, Dialog, Portal, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const DISCO_OPTIONS = ["ABA", "IKEDC", "IBEDC", "AEDC", "BEDC", "EEDC"];
const CUSTOMER_LIMIT = 10;
const UPGRADE_OPTIONS = [
  { name: "20 customers", price: 5000, newLimit: 20 },
  { name: "50 customers", price: 10000, newLimit: 50 },
  { name: "Unlimited", price: 20000, newLimit: -1 }
];
const PAYMENT_DETAILS = {
  accountNumber: '1234567890',
  bankName: 'Example Bank',
  accountName: 'Vendor App Admin'
};

const AddCustomerScreen = () => {
  const [formData, setFormData] = useState({
    meterNumber: '',
    disco: '',
    name: '',
    address: '',
    phone: '',
  });
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCustomerCount, setCurrentCustomerCount] = useState(0);
  const [upgradeDialogVisible, setUpgradeDialogVisible] = useState(false);
  const [selectedUpgrade, setSelectedUpgrade] = useState(null);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // Fetch current customer count (mock data for demo)
    // In a real app, you would call your API here
    setCurrentCustomerCount(10); // Set to 10 to simulate limit reached
  }, []);

  const handleSubmit = async () => {
    // First check if limit is reached
    if (currentCustomerCount >= CUSTOMER_LIMIT) {
      setUpgradeDialogVisible(true);
      return;
    }

    try {
      setLoading(true);
      // Here you would call your actual API to add customer
      // const response = await axios.post('/vendor/customers', formData);
      
      // Mock success response
      Alert.alert('Success', 'Customer added successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePayment = async () => {
    if (!selectedUpgrade) {
      Alert.alert('Error', 'Please select an upgrade option');
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      // Here you would call your API to process the upgrade
      // await axios.post('/vendor/upgrade', { plan: selectedUpgrade.newLimit });
      
      // Mock success
      Alert.alert(
        'Success', 
        `Your account has been upgraded to ${selectedUpgrade.name}. Please allow some time for processing.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setUpgradeDialogVisible(false);
              // In a real app, you would refresh the customer limit here
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process upgrade');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Add New Customer</Title>
          
          {currentCustomerCount >= CUSTOMER_LIMIT && (
            <Text style={styles.limitWarning}>
              You've reached your limit of {CUSTOMER_LIMIT} customers. Please upgrade to add more.
            </Text>
          )}
          
          <TextInput
            label="Meter Number"
            value={formData.meterNumber}
            onChangeText={text => setFormData({...formData, meterNumber: text})}
            mode="outlined"
            style={styles.input}
            disabled={currentCustomerCount >= CUSTOMER_LIMIT}
          />

          <TextInput
            label="Customer Name (Optional)"
            value={formData.name}
            onChangeText={text => setFormData({...formData, name: text})}
            mode="outlined"
            style={styles.input}
            disabled={currentCustomerCount >= CUSTOMER_LIMIT}
          />

          <TextInput
            label="Address (Optional)"
            value={formData.address}
            onChangeText={text => setFormData({...formData, address: text})}
            mode="outlined"
            style={styles.input}
            disabled={currentCustomerCount >= CUSTOMER_LIMIT}
          />

          <TextInput
            label="Phone Number (Optional)"
            value={formData.phone}
            onChangeText={text => setFormData({...formData, phone: text})}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            disabled={currentCustomerCount >= CUSTOMER_LIMIT}
          />

          <Text style={styles.label}>Disco</Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setMenuVisible(true)}
                style={styles.dropdownButton}
                disabled={currentCustomerCount >= CUSTOMER_LIMIT}
              >
                {formData.disco || 'Select Disco'}
              </Button>
            }
          >
            {DISCO_OPTIONS.map(disco => (
              <Menu.Item
                key={disco}
                title={disco}
                onPress={() => {
                  setFormData({...formData, disco});
                  setMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={loading}
            disabled={!formData.meterNumber || !formData.disco}
            style={styles.submitButton}
          >
            {currentCustomerCount >= CUSTOMER_LIMIT ? 'Upgrade Required' : 'Add Customer'}
          </Button>
        </Card.Content>
      </Card>

      {/* Upgrade Dialog */}
      <Portal>
        <Dialog visible={upgradeDialogVisible} onDismiss={() => setUpgradeDialogVisible(false)}>
          <Dialog.Title>Upgrade Your Account</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              You've reached your customer limit. Please select an upgrade option:
            </Text>
            
            {UPGRADE_OPTIONS.map(option => (
              <Card 
                key={option.name} 
                style={[
                  styles.upgradeOption,
                  selectedUpgrade?.name === option.name && styles.selectedUpgrade
                ]}
                onPress={() => setSelectedUpgrade(option)}
              >
                <Card.Content>
                  <Title style={styles.optionTitle}>{option.name}</Title>
                  <Text style={styles.optionPrice}>₦{option.price.toLocaleString()}</Text>
                </Card.Content>
              </Card>
            ))}

            <Text style={styles.paymentTitle}>Payment Details:</Text>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailText}>
                <Text style={styles.paymentLabel}>Account Number: </Text>
                {PAYMENT_DETAILS.accountNumber}
              </Text>
              <Text style={styles.paymentDetailText}>
                <Text style={styles.paymentLabel}>Bank Name: </Text>
                {PAYMENT_DETAILS.bankName}
              </Text>
              <Text style={styles.paymentDetailText}>
                <Text style={styles.paymentLabel}>Account Name: </Text>
                {PAYMENT_DETAILS.accountName}
              </Text>
            </View>
            
            <Text style={styles.note}>
              Please make payment to the account above and click "Submit Payment".
              You may be asked to provide proof of payment.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUpgradeDialogVisible(false)}>Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleUpgradePayment}
              disabled={!selectedUpgrade || isSubmittingUpgrade}
            >
              {isSubmittingUpgrade ? <ActivityIndicator color="#fff" /> : 'Submit Payment'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
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
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  limitWarning: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  upgradeOption: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  selectedUpgrade: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5ff',
  },
  dialogText: {
    marginBottom: 15,
    fontSize: 15,
    lineHeight: 22,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionPrice: {
    fontSize: 15,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  paymentTitle: {
    marginTop: 16,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  paymentDetails: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
  },
  paymentDetailText: {
    marginBottom: 6,
    fontSize: 14,
  },
  paymentLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  note: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default AddCustomerScreen;