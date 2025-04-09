import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider } from './auth/AuthContext';
import AppNavigator from '@/navigation/AppNavigator';


export default function App() {
  return (
    <AuthProvider>
      <PaperProvider theme={{ roundness: 10 }}>
        <AppNavigator />
        <StatusBar style="auto" />
      </PaperProvider>
    </AuthProvider>
  );
}