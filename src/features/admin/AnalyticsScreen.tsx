import React from 'react';
import { View, Text } from 'react-native';
import { Title } from 'react-native-paper';

export default function AnalyticsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Title>System Analytics</Title>
      <Text>Token requests: Coming soon</Text>
      <Text>Revenue: Coming soon</Text>
    </View>
  );
}