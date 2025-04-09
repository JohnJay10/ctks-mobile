import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DataTable, Button, Modal, Portal, TextInput } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext';

const VendorManagementScreen = () => {
  const { api } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    password: '',
    permissions: []
  });

  // Permission options
  const permissions = [
    'create_tokens',
    'view_customers',
    'manage_products',
    'view_analytics'
  ];

  // Fetch all vendors
  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');  
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Create new vendor
  const createVendor = async () => {
    try {
      await api.post('/vendors', newVendor);
      fetchVendors(); // Refresh list
      setVisible(false);
      setNewVendor({
        name: '',
        email: '',
        password: '',
        permissions: []
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  // Toggle permission
  const togglePermission = (permission) => {
    setNewVendor(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <View style={styles.container}>
      <Button 
        mode="contained" 
        onPress={() => setVisible(true)}
        style={styles.addButton}
      >
        Add New Vendor
      </Button>

      <ScrollView>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Name</DataTable.Title>
            <DataTable.Title>Email</DataTable.Title>
            <DataTable.Title>Permissions</DataTable.Title>
          </DataTable.Header>

          {vendors.map(vendor => (
            <DataTable.Row key={vendor._id}>
              <DataTable.Cell>{vendor.name}</DataTable.Cell>
              <DataTable.Cell>{vendor.email}</DataTable.Cell>
              <DataTable.Cell>
                {vendor.permissions.join(', ')}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>

      {/* Add Vendor Modal */}
      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <TextInput
            label="Name"
            value={newVendor.name}
            onChangeText={text => setNewVendor({...newVendor, name: text})}
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={newVendor.email}
            onChangeText={text => setNewVendor({...newVendor, email: text})}
            style={styles.input}
            keyboardType="email-address"
          />
          <TextInput
            label="Password"
            value={newVendor.password}
            onChangeText={text => setNewVendor({...newVendor, password: text})}
            style={styles.input}
            secureTextEntry
          />

          <View style={styles.permissionsContainer}>
            {permissions.map(permission => (
              <Button
                key={permission}
                mode={newVendor.permissions.includes(permission) ? "contained" : "outlined"}
                onPress={() => togglePermission(permission)}
                style={styles.permissionButton}
              >
                {permission.replace('_', ' ')}
              </Button>
            ))}
          </View>

          <Button 
            mode="contained" 
            onPress={createVendor}
            style={styles.submitButton}
          >
            Create Vendor
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    marginBottom: 16,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
  },
  permissionButton: {
    margin: 4,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default VendorManagementScreen;