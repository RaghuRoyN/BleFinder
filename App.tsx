import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import useBleManager from './src/hooks/useBleManager';
import DeviceItem from './src/components/DeviceItem';
import {Device} from 'react-native-ble-plx';

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const allPermissionsGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allPermissionsGranted) {
        Alert.alert(
          'Permissions Required',
          'Please enable Bluetooth and Location permissions in settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Go to Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ],
        );
      } else {
        console.log('Permissions granted:', granted);
      }
    } catch (error) {
      console.warn(error);
    }
  }
};

const App: React.FC = () => {
  const {
    devices,
    connectedDevice,
    deviceDetails,
    isConnecting,
    scanDevices,
    handleDisconnect,
    switchToDevice,
  } = useBleManager();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (connectedDevice && deviceDetails) {
      setModalVisible(true);
    }
  }, [connectedDevice, deviceDetails]);

  const getBatteryLevel = (): number | undefined => {
    if (deviceDetails?.characteristics) {
      const batteryCharacteristics = deviceDetails.characteristics['180F'];
      if (batteryCharacteristics) {
        const batteryCharacteristic = batteryCharacteristics.find(
          char => char.uuid === '2A19',
        );
        if (batteryCharacteristic && batteryCharacteristic.value) {
          return parseInt(batteryCharacteristic.value, 16);
        }
      }
    }
    return undefined;
  };

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<Device>) => (
      <DeviceItem
        device={item}
        onPress={
          connectedDevice?.id === item.id ? handleDisconnect : switchToDevice
        }
        isConnected={connectedDevice?.id === item.id}
        isConnecting={isConnecting && connectedDevice?.id === item.id}
        batteryLevel={
          connectedDevice?.id === item.id ? getBatteryLevel() : undefined
        }
      />
    ),
    [connectedDevice, deviceDetails, isConnecting, switchToDevice],
  );

  const keyExtractor = useCallback((item: Device) => item.id, []);

  const getItemLayout = useCallback(
    (data: ArrayLike<Device> | null | undefined, index: number) => ({
      length: 80,
      offset: 80 * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={scanDevices}>
        <Text style={styles.buttonText}>Start Scan</Text>
      </TouchableOpacity>
      {devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text>No devices found. Start scanning.</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={10}
        />
      )}
      {isConnecting && (
        <View style={styles.activityIndicatorOverlay}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      )}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <Text style={styles.connectedDeviceTitle}>
                Connected to: {connectedDevice?.name}
              </Text>
              <Text style={styles.connectedDeviceId}>
                ID: {connectedDevice?.id}
              </Text>
              <Text style={styles.connectedDeviceSectionTitle}>
                Services and Characteristics:
              </Text>
              {deviceDetails?.services.map((service, index) => (
                <View key={index} style={styles.serviceContainer}>
                  <Text style={styles.serviceUUID}>
                    Service UUID: {service.uuid}
                  </Text>
                  {deviceDetails.characteristics?.[service.uuid]?.map(
                    (characteristic, charIndex) => (
                      <Text key={charIndex} style={styles.characteristicUUID}>
                        Characteristic UUID: {characteristic.uuid}
                      </Text>
                    ),
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.closeButtonContainer}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  connectedDeviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  connectedDeviceId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  connectedDeviceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  serviceContainer: {
    marginBottom: 10,
  },
  serviceUUID: {
    fontSize: 14,
    marginBottom: 5,
  },
  characteristicUUID: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  closeButtonContainer: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007BFF',
    borderRadius: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});

export default App;
