import { View, StyleSheet, Alert } from 'react-native';
import { Button, TextInput, RadioButton, Text } from 'react-native-paper';
import { useAuth } from '@/auth/AuthContext';
import React, { useState } from 'react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'vendor' | 'admin'>('vendor');
  const { login, loading } = useAuth();



  // ... previous code remains the same
  const handleLogin = () => {
    login(`${role}:${email}`, password).catch((error) => {
      Alert.alert('Error', error.message);
    });
  };

  // ... the rest of the component

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CTKS Login</Text>
      
      <RadioButton.Group onValueChange={(value) => setRole(value as 'vendor' | 'admin')} value={role}>
        <View style={styles.radioGroup}>
          <RadioButton.Item label="Vendor" value="vendor" />
          <RadioButton.Item label="Admin" value="admin" />
        </View>
      </RadioButton.Group>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button 
        mode="contained" 
        onPress={handleLogin}
        loading={loading}
        disabled={!email || !password}
        style={styles.button}
      >
        Login
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
  radioGroup: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }
});