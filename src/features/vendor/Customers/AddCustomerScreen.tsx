import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Title, Text, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const DISCO_OPTIONS = ["ABA", "IKEDC", "IBEDC", "AEDC", "BEDC", "EEDC"];

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
  const navigation = useNavigation();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Here you would call your API to add the customer
      // await api.post('/vendor/customers', formData);
      Alert.alert('Success', 'Customer added successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Add New Customer</Title>
          
          <TextInput
            label="Meter Number"
            value={formData.meterNumber}
            onChangeText={text => setFormData({...formData, meterNumber: text})}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Customer Name (Optional)"
            value={formData.name}
            onChangeText={text => setFormData({...formData, name: text})}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Address (Optional)"
            value={formData.address}
            onChangeText={text => setFormData({...formData, address: text})}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Phone Number (Optional)"
            value={formData.phone}
            onChangeText={text => setFormData({...formData, phone: text})}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
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
            Add Customer
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
  submitButton: {
    marginTop: 8,
  },
});

export default AddCustomerScreen;