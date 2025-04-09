import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card, Button, ActivityIndicator, Menu } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../auth/AuthContext';
import { TextInput } from 'react-native-paper';

const DISCO_OPTIONS = ["ABA", "IKEDC", "IBEDC", "AEDC", "BEDC", "EEDC"];

const CustomerManagementScreen = () => {
  const { colors } = useTheme();
  const { api, authState } = useAuth();
  const [loading, setLoading] = useState(false);
  
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

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Validate form
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
            onPress: () => setFormData({ meterNumber: '', disco: '', lastToken: '' })
          }
        ]
      );

      setFormData({ meterNumber: '', disco: '', lastToken: '' });

    } catch (error: unknown) {
      let errorMessage = 'Failed to create customer';
      
      if (typeof error === 'object' && error !== null) {
        const axiosError = error as {
          response?: {
            data?: { message?: string },
            status?: number
          },
          message?: string
        };
        
        if (axiosError.response) {
          errorMessage = axiosError.response.data?.message || 
                        `Server error (${axiosError.response.status})`;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        {/* Add Customer Form */}
        <Card style={[styles.formCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.onSurface }]}>
            Add New Customer
          </Text>
          
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
            />
            {formErrors.meterNumber && (
              <Text style={styles.errorText}>{formErrors.meterNumber}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              Disco *
            </Text>
            
            <Menu
              visible={discoMenuVisible}
              onDismiss={() => setDiscoMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.discoInput,
                    formErrors.disco && styles.inputError,
                    { backgroundColor: colors.background }
                  ]}
                  onPress={() => setDiscoMenuVisible(true)}
                >
                  <Text style={{ color: formData.disco ? colors.onSurface : '#999' }}>
                    {formData.disco || 'Select Disco'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              }
            >
              {DISCO_OPTIONS.map(disco => (
                <Menu.Item
                  key={disco}
                  onPress={() => {
                    handleInputChange('disco', disco);
                    setDiscoMenuVisible(false);
                  }}
                  title={disco}
                />
              ))}
            </Menu>
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
        </Card>
      </ScrollView>
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
});

export default CustomerManagementScreen;