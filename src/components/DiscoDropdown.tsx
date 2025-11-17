import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';

type Disco = {
  _id: string;
  discoName: string;
  pricePerUnit: number;
};

export default function DiscoDropdown({ 
  selectedValue,   
  onValueChange,
  style 
}: {
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: any;
}) {
  const [visible, setVisible] = useState(false);
  const [discos, setDiscos] = useState<Disco[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api, authState, initialized } = useAuth(); // Get initialized from context

 const fetchDiscos = async () => {
  try {
    setLoading(true);  
    setError(null);
    
    // Double check we have a token
    if (!authState.token) {
      throw new Error('Authentication token missing');
    }

    console.log('Current token:', authState.token); // Debug token

    // Make request with explicit headers
    const response = await api.get('/vendor/disco-pricing?enabledOnly=true', {
  headers: {
    Authorization: `Bearer ${authState.token}`
  }
});


    console.log('API Response:', response.data);
    if (response.data.success) {
      setDiscos(response.data.data);
    } else {
      throw new Error(response.data.message || 'Failed to fetch DISCOs');
    }
  } catch (err) {
    console.log('Full error:', err);
    const errorMessage = err.response?.data?.message || err.message || 'Error loading DISCO options';
    setError(errorMessage);
    
    if (err.response?.status === 401) {
      Alert.alert('Session Expired', 'Please login again');
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    console.log('Auth state:', {
      initialized,
      authenticated: authState.authenticated,
      token: authState.token ? 'exists' : 'null'
    });
    
    if (initialized && authState.authenticated) {
      fetchDiscos();
    }
  }, [authState.authenticated, initialized]); // Watch both values

  return (
    <View style={[styles.container, style]}>
      <Button 
        onPress={() => {
          if (!loading && authState.authenticated) {
            setVisible(true);
          }
        }}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={selectedValue ? styles.buttonLabelSelected : styles.buttonLabel}
        theme={{ colors: { primary: '#6200ee' } }}
        disabled={loading || !authState.authenticated}
      >
        <View style={styles.buttonInner}>
          <MaterialCommunityIcons 
            name="transmission-tower" 
            size={20} 
            color={selectedValue ? "#6200ee" : "#9e9e9e"}
            style={styles.icon}
          />
          {loading ? (
            <ActivityIndicator size="small" color="#6200ee" style={styles.loader} />
          ) : (
            <Text style={selectedValue ? styles.textSelected : styles.text}>
              {!authState.authenticated ? 'Login required' : 
               selectedValue || (error ? 'Error loading' : 'Select DISCO')}
            </Text>
          )}
          {!loading && authState.authenticated && (
            <MaterialCommunityIcons 
              name={visible ? "menu-up" : "menu-down"} 
              size={24} 
              color={selectedValue ? "#6200ee" : "#9e9e9e"} 
            />
          )}
        </View>
      </Button>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setVisible(false)}
        >
          <View style={styles.menuContent}>
            {!authState.authenticated ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Authentication required</Text>
                <Text style={styles.errorSubtext}>Please login to access DISCO options</Text>
              </View>
            ) : loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button 
                  mode="contained"
                  onPress={fetchDiscos}
                  style={styles.retryButton}
                  labelStyle={styles.buttonLabel}
                >
                  Retry
                </Button>
              </View>
            ) : discos.length === 0 ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No DISCOs available</Text>
              </View>
            ) : (
              discos.map((disco) => (
                <TouchableOpacity
                  key={disco._id}
                  style={[
                    styles.menuItem,
                    selectedValue === disco.discoName && styles.selectedItem
                  ]}
                  onPress={() => {
                    onValueChange(disco.discoName);
                    setVisible(false);
                  }}
                >
                  <Text style={styles.menuItemText}>{disco.discoName}</Text>
                  <Text style={styles.priceText}>
                    ₦{disco.pricePerUnit.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    marginVertical: 8,
  },
  button: {
    width: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  buttonLabel: {
    color: '#9e9e9e',
    fontSize: 16,
  },
  buttonLabelSelected: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  text: {
    color: '#9e9e9e',
    fontSize: 16,
    flex: 1,
    marginLeft: 8,
  },
  textSelected: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
  loader: {
    flex: 1,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '80%',
    maxHeight: '60%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: '#f0f0ff',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    width: '80%',
    backgroundColor: '#6200ee',
    borderRadius: 4,
  },
});