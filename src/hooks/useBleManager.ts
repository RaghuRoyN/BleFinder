import { useEffect, useState, useRef, useCallback } from 'react';
import { BleManager, Device, Service, Characteristic } from 'react-native-ble-plx';

interface DeviceDetails {
  services: Service[];
  characteristics?: {
    [serviceUUID: string]: Characteristic[];
  };
}

const useBleManager = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [shouldReconnect, setShouldReconnect] = useState<boolean>(true);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const bleManager = useRef(new BleManager()).current;
  const MAX_RECONNECT_ATTEMPTS = 3;

  const isDuplicate = (devices: Device[], nextDevice: Device) =>
    devices.findIndex(device => nextDevice.id === device.id) > -1;

  const scanDevices = () => {
    setDevices([]);
    setConnectedDevice(null);
    setDeviceDetails(null);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        return;
      }
      if (device && device.name) {
        setDevices(prevState => {
          if (!isDuplicate(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });
  };

  const getServicesAndCharacteristics = useCallback(async (device: Device) => {
    try {
      const services = await device.services();
      const characteristicsByServiceUUID: {
        [serviceUUID: string]: Characteristic[];
      } = {};

      await Promise.all(
        services.map(async service => {
          try {
            const characteristics = await service.characteristics();
            characteristicsByServiceUUID[service.uuid] = characteristics;
          } catch (error) {
            console.error(
              `Failed to get characteristics for service ${service.uuid}:`,
              error,
            );
            characteristicsByServiceUUID[service.uuid] = [];
          }
        }),
      );

      setDeviceDetails({
        services,
        characteristics: characteristicsByServiceUUID,
      });
    } catch (error) {
      console.error('Failed to get services and characteristics:', error);
    }
  }, []);

  const connectToDevice = useCallback(
    async (deviceId: string, attempts = 0) => {
      try {
        setIsConnecting(true);
        const device = await bleManager.connectToDevice(deviceId);
        await device.discoverAllServicesAndCharacteristics();
        setConnectedDevice(device);
        bleManager.stopDeviceScan();
        await getServicesAndCharacteristics(device);
        setReconnectAttempts(0);
      } catch (error) {
        console.error(`Failed to connect (attempt ${attempts + 1}):`, error);
        if (attempts < MAX_RECONNECT_ATTEMPTS - 1) {
          setTimeout(() => connectToDevice(deviceId, attempts + 1), 2000);
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [getServicesAndCharacteristics, bleManager],
  );

  const handleDisconnect = useCallback(
    async (deviceId: string) => {
      try {
        setConnectedDevice(null);
        setDeviceDetails(null);
        await bleManager.cancelDeviceConnection(deviceId);
        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(() => connectToDevice(deviceId), 2000);
        }
      } catch (error) {
        console.error('Failed to disconnect', error);
      }
    },
    [connectToDevice, bleManager, reconnectAttempts, shouldReconnect],
  );

  useEffect(() => {
    if (connectedDevice) {
      const subscription = bleManager.onDeviceDisconnected(
        connectedDevice.id,
        (error, device) => {
          if (error) {
            console.error('Disconnected', error);
            return;
          }
          if (device) {
            handleDisconnect(device.id);
          }
        },
      );

      return () => subscription.remove();
    }
  }, [connectedDevice, handleDisconnect, bleManager]);

  const switchToDevice = useCallback(
    async (deviceId: string) => {
      setShouldReconnect(false);
      if (connectedDevice) {
        await handleDisconnect(connectedDevice.id);
        await connectToDevice(deviceId);
      } else {
        await connectToDevice(deviceId);
      }
      setShouldReconnect(true);
    },
    [connectedDevice, connectToDevice, handleDisconnect],
  );

  return {
    devices,
    connectedDevice,
    deviceDetails,
    isConnecting,
    scanDevices,
    connectToDevice,
    handleDisconnect,
    switchToDevice,
  };
};

export default useBleManager;
