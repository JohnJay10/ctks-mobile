import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DISCO_OPTIONS } from '../utils/constants';

export default function DiscoDropdown({ 
  selectedValue, 
  onValueChange,
  style 
}: {
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: any;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <View style={[styles.container, style]}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button 
            onPress={() => setVisible(true)}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={selectedValue ? styles.buttonLabelSelected : styles.buttonLabel}
            theme={{ colors: { primary: '#6200ee' } }}
          >
            <View style={styles.buttonInner}>
              <MaterialCommunityIcons 
                name="transmission-tower" 
                size={20} 
                color={selectedValue ? "#6200ee" : "#9e9e9e"}
                style={styles.icon}
              />
              <Text style={selectedValue ? styles.textSelected : styles.text}>
                {selectedValue || 'Select DISCO'}
              </Text>
              <MaterialCommunityIcons 
                name={visible ? "menu-up" : "menu-down"} 
                size={24} 
                color={selectedValue ? "#6200ee" : "#9e9e9e"} 
              />
            </View>
          </Button>
        }
        contentStyle={styles.menuContent}
      >
        {DISCO_OPTIONS.map((disco, index) => (
          <React.Fragment key={disco}>
            <Menu.Item
              title={disco}
              onPress={() => {
                onValueChange(disco);
                setVisible(false);
              }}
              titleStyle={styles.menuItemText}
              style={styles.menuItem}
            />
            {index !== DISCO_OPTIONS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </Menu>
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
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 4,
    elevation: 4,
    marginTop: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
  },
});