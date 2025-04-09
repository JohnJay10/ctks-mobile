import React from 'react';
import { TextInput } from 'react-native-paper';

export default function MeterInput({ value, onChangeText }: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <TextInput
      label="Meter Number"
      value={value}
      onChangeText={onChangeText}
      style={{ marginBottom: 15 }}
      keyboardType="numeric"
    />
  );
}