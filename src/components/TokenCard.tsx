import React from 'react';
import { Card, Title, Paragraph } from 'react-native-paper';

export default function TokenCard({ token }: { token: any }) {
  return (
    <Card style={{ margin: 10 }}>
      <Card.Content>
        <Title>Token: {token.value}</Title>
        <Paragraph>Meter: {token.meterNumber}</Paragraph>
      </Card.Content>
    </Card>
  );
}