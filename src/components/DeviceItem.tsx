import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Device } from 'react-native-ble-plx';

interface DeviceItemProps {
  device: Device;
  onPress: (deviceId: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  batteryLevel?: number;
}

const DeviceItem: React.FC<DeviceItemProps> = React.memo(
  ({ device, onPress, isConnected, isConnecting, batteryLevel }) => {
    const [showDetails, setShowDetails] = useState(false);

    const toggleDetails = useCallback(() => {
      setShowDetails(prev => !prev);
    }, []);

    const getRssiLabel = useCallback((rssi: number | null) => {
      if (rssi === null) return 'Unknown';
      if (rssi >= -60) return 'Strong';
      if (rssi >= -80) return 'Medium';
      return 'Weak';
    }, []);

    const calculateDistance = useCallback((rssi: number | null, txPower: number | null) => {
      if (rssi === null || rssi === 0) return 'Unknown';

      const defaultTxPower = -59;
      const actualTxPower = txPower ?? defaultTxPower;

      if (rssi < -100 || rssi > 0) {
        return 'Unknown';
      }

      const ratio = rssi / actualTxPower;
      if (ratio < 1.0) {
        return Math.pow(ratio, 10).toFixed(2) + ' m';
      } else {
        const distance = (0.89976 * Math.pow(ratio, 7.7095) + 0.111).toFixed(2);
        if (parseFloat(distance) > 1000) {
          return 'Unknown';
        }
        return distance + ' m';
      }
    }, []);

    return (
      <TouchableOpacity
        style={[
          styles.item,
          isConnected && styles.connectedItem,
          isConnecting && styles.connectingItem,
        ]}
        onPress={toggleDetails}
      >
        <View style={styles.infoContainer}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>{device.id}</Text>
          <Text style={styles.deviceRssi}>
            RSSI: {device.rssi} ({getRssiLabel(device.rssi)})
          </Text>
          <Text style={styles.deviceDistance}>
            Distance: {calculateDistance(device.rssi, device.txPowerLevel)}
          </Text>
          <Text style={styles.deviceBattery}>
            Battery: {batteryLevel ? `${batteryLevel}%` : 'NA'}
          </Text>
          {showDetails && (
            <>
              <Text style={styles.deviceAdditionalDetails}>
                Service Data: {device.serviceData ? JSON.stringify(device.serviceData) : 'NA'}
              </Text>
              <Text style={styles.deviceAdditionalDetails}>
                Manufacturer Data: {device.manufacturerData ? device.manufacturerData : 'NA'}
              </Text>
              <Text style={styles.deviceAdditionalDetails}>
                Tx Power Level: {device.txPowerLevel ?? 'NA'}
              </Text>
              <Text style={styles.deviceAdditionalDetails}>
                MTU: {device.mtu ?? 'NA'}
              </Text>
            </>
          )}
        </View>
        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={styles.connectButtonContainer}
            onPress={() => !isConnecting && onPress(device.id)}
            disabled={isConnecting}
          >
            <Text style={styles.connectButtonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
          {isConnecting && (
            <ActivityIndicator style={styles.activityIndicator} size="small" color="#0000ff" />
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  item: {
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectedItem: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  connectingItem: {
    borderColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  infoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  deviceRssi: {
    fontSize: 14,
    color: '#999',
  },
  deviceDistance: {
    fontSize: 14,
    color: '#999',
  },
  deviceBattery: {
    fontSize: 14,
    color: '#999',
  },
  deviceAdditionalDetails: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  connectButtonContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007BFF',
    borderRadius: 20,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  activityIndicator: {
    marginTop: 10,
  },
  connected: {
    color: '#4caf50',
  },
  disconnected: {
    color: '#f44336',
  },
});

export default DeviceItem;
