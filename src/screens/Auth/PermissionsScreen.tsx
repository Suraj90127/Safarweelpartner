import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  AppState,
  AppStateStatus,
  Platform,
  PermissionsAndroid,
  Alert,
  NativeModules,
  Linking,
  Modal,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { useAppSelector } from '../../redux/hooks';
import OverlayPermissionManager, { DeviceBrandInfo } from '../../services/OverlayPermissionManager';

const { PermissionModule } = NativeModules;

interface PermissionItem {
  id: 'location' | 'overlay' | 'battery';
  title: string;
  description: string;
  icon: string;
  isGranted: boolean;
}

const PermissionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isDark = useAppSelector(state => state.theme.isDark);
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'location',
      title: 'Background Location',
      description: 'Helps find rides based on location',
      icon: 'location-outline',
      isGranted: false,
    },
    {
      id: 'overlay',
      title: 'Display over other apps',
      description: 'Permit app to display on top of other apps to get rides alerts',
      icon: 'apps-outline',
      isGranted: false,
    },
    {
      id: 'battery',
      title: 'Battery Usage',
      description: 'Helps app run in background',
      icon: 'battery-charging-outline',
      isGranted: false,
    },
  ]);

  const [isRestrictedModalVisible, setIsRestrictedModalVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceBrandInfo | null>(null);
  const overlayRequestedRef = useRef(false);
  const overlaySettingsPendingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fetch device brand info on mount
  useEffect(() => {
    const fetchDeviceInfo = async () => {
      const info = await OverlayPermissionManager.getDeviceBrand();
      setDeviceInfo(info);
    };
    fetchDeviceInfo();
  }, []);

  const checkPermissionsStatus = useCallback(async (fromSettingsReturn = false) => {
    try {
      let locationGranted = false;
      let overlayGranted = false;
      let batteryGranted = false;

      if (Platform.OS === 'android') {
        // 1. Check location permissions
        const fineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        // Background location is only required for Android 10 (Q) and above
        const bgLocation = Platform.Version >= 29
          ? await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION)
          : true;

        locationGranted = fineLocation && bgLocation;

        // 2. Check overlay permission from native module
        overlayGranted = await OverlayPermissionManager.isGranted();

        // 3. Check battery optimization from native module
        if (PermissionModule) {
          batteryGranted = await PermissionModule.checkBatteryOptimization();
        }
      } else {
        // iOS or fallback
        locationGranted = true;
        overlayGranted = true;
        batteryGranted = true;
      }

      setPermissions((prev) =>
        prev.map((item) => {
          if (item.id === 'location') return { ...item, isGranted: locationGranted };
          if (item.id === 'overlay') return { ...item, isGranted: overlayGranted };
          if (item.id === 'battery') return { ...item, isGranted: batteryGranted };
          return item;
        })
      );

      // If user returned from overlay settings and permission is still denied on Android 13+,
      // show the restricted settings guide modal.
      if (
        fromSettingsReturn &&
        overlaySettingsPendingRef.current &&
        !overlayGranted &&
        Platform.OS === 'android' &&
        Platform.Version >= 33
      ) {
        setIsRestrictedModalVisible(true);
      }

      // Clear pending state after the user returns from settings or once permission is granted.
      if (overlayGranted || fromSettingsReturn) {
        overlaySettingsPendingRef.current = false;
      }

      // Keep backward compatibility with existing flag but avoid premature resets.
      if (overlayGranted || fromSettingsReturn) {
        overlayRequestedRef.current = false;
      }
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  }, []);

  // Listen to AppState changes (e.g. returning from settings)
  useEffect(() => {
    checkPermissionsStatus();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current !== 'active' && nextAppState === 'active';
      appStateRef.current = nextAppState;

      if (nextAppState === 'active') {
        checkPermissionsStatus(wasInBackground);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [checkPermissionsStatus]);

  // Request handlers
  const handleRequestPermission = async (id: 'location' | 'overlay' | 'battery') => {
    if (Platform.OS !== 'android') return;

    try {
      if (id === 'location') {
        // Request fine location first
        const fineGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Safarweel Partner needs location access to receive nearby ride requests.',
            buttonPositive: 'OK',
          }
        );

        if (fineGranted === PermissionsAndroid.RESULTS.GRANTED) {
          if (Platform.Version >= 29) {
            // Request background location
            Alert.alert(
              'Background Location Required',
              'To receive bookings even when the app is closed, please select "Allow all the time" in the next screen.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Go to Settings',
                  onPress: async () => {
                    await PermissionsAndroid.request(
                      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
                    );
                    checkPermissionsStatus();
                  },
                },
              ]
            );
          } else {
            checkPermissionsStatus();
          }
        }
      } else if (id === 'overlay') {
        overlayRequestedRef.current = true;
        overlaySettingsPendingRef.current = true;
        const result = await OverlayPermissionManager.requestPermission();
        if (!result) {
          overlaySettingsPendingRef.current = false;
          overlayRequestedRef.current = false;
          Alert.alert('Error', 'Unable to open overlay permission settings.');
        }
      } else if (id === 'battery') {
        if (PermissionModule) {
          await PermissionModule.requestBatteryOptimization();
        } else {
          Alert.alert(
            'Rebuild Required',
            'Please rebuild the Android app to enable direct settings redirects. In the meantime, you can turn off battery optimization for this app in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
    } catch (err) {
      console.log('Error requesting permission:', err);
    }
  };

  const handleOpenOemSettings = async () => {
    await OverlayPermissionManager.openOemSettings();
  };

  const handleOpenAppInfo = async () => {
    setIsRestrictedModalVisible(false);
    await OverlayPermissionManager.openSettings();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 dark:bg-darkBg">
      <ScreenHeader
        title=""
        rightElement={
          <TouchableOpacity
            className="flex-row items-center border-[1.5px] border-textLight dark:border-darkBorder rounded-full px-4 py-1.5 bg-lightBg dark:bg-darkBg"
            onPress={() => navigation.navigate(ROUTES.SUPPORT)}
          >
            <Icon name="headset-outline" size={18} color={isDark ? COLORS.textDark : COLORS.textLight} className="mr-1.5" />
            <Text className="text-[15px] font-bold text-textLight dark:text-textDark">Help</Text>
          </TouchableOpacity>
        }
      />

      {/* Blue Banner */}
      <View className="bg-brandBlueLight py-5 px-5">
        <Text className="text-[22px] font-bold text-white leading-7">Give all permissions to proceed</Text>
      </View>

      {/* Content */}
      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          {permissions.map((item) => (
            <View key={item.id}>
              <TouchableOpacity
                className="flex-row items-center bg-lightBg dark:bg-darkCard rounded-xl p-[18px] shadow shadow-black/5 elevation-2"
                onPress={() => !item.isGranted && handleRequestPermission(item.id)}
                activeOpacity={item.isGranted ? 1 : 0.7}
              >
                <View className="w-11 h-11 rounded-full bg-[#EFF6FF] dark:bg-darkBg justify-center items-center mr-4">
                  <Icon name={item.icon} size={24} color={COLORS.primary} />
                </View>

                <View className="flex-1 pr-2">
                  <Text className="text-base font-bold text-textLight dark:text-textDark mb-1">{item.title}</Text>
                  <Text className="text-[13px] text-textLightSecondary dark:text-textDarkSecondary leading-[18px]">{item.description}</Text>
                </View>

                <View className="justify-center items-center">
                  {item.isGranted ? (
                    <Icon name="checkmark-circle" size={26} color={COLORS.primary} />
                  ) : (
                    <Icon name="chevron-forward" size={22} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>

              {/* OEM specific suggestions under the overlay item if not granted */}
              {item.id === 'overlay' && !item.isGranted && deviceInfo?.isXiaomi && (
                <TouchableOpacity
                  onPress={handleOpenOemSettings}
                  className="mt-2 mx-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-bold text-orange-700 dark:text-orange-400">Xiaomi / MIUI Device Detected</Text>
                    <Text className="text-[11px] text-orange-600 dark:text-orange-500 mt-0.5">
                      You must also enable "Display pop-up windows while running in the background". Tap here to configure.
                    </Text>
                  </View>
                  <Icon name="settings-outline" size={16} color="#c2410c" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Restricted Settings Instructions Modal */}
      <Modal
        visible={isRestrictedModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRestrictedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white dark:bg-darkCard w-[90%] rounded-2xl p-6 max-h-[85%] shadow-2xl">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 justify-center items-center mb-2">
                <Icon name="shield-half-outline" size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">
                Bypass Restricted Settings
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-5">
                Android restricted this permission for security because the app was sideloaded. Follow these quick steps to enable it:
              </Text>

              <View className="bg-gray-50 dark:bg-darkBg p-4 rounded-xl space-y-3">
                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-brandBlueLight justify-center items-center mr-3 mt-0.5">
                    <Text className="text-white text-xs font-bold">1</Text>
                  </View>
                  <Text className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-5">
                    Tap the <Text className="font-bold text-brandBlueLight">Go to App Info</Text> button below.
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-brandBlueLight justify-center items-center mr-3 mt-0.5">
                    <Text className="text-white text-xs font-bold">2</Text>
                  </View>
                  <Text className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-5">
                    In the top-right corner of the settings page, tap the <Text className="font-bold">three vertical dots (⋮)</Text> menu icon.
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-brandBlueLight justify-center items-center mr-3 mt-0.5">
                    <Text className="text-white text-xs font-bold">3</Text>
                  </View>
                  <Text className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-5">
                    Tap <Text className="font-bold">"Allow restricted settings"</Text> and verify your fingerprint/PIN.
                  </Text>
                </View>

                <View className="flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-brandBlueLight justify-center items-center mr-3 mt-0.5">
                    <Text className="text-white text-xs font-bold">4</Text>
                  </View>
                  <Text className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-5">
                    Go back to this screen and enable <Text className="font-bold">Display over other apps</Text> again.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setIsRestrictedModalVisible(false)}
                className="flex-1 bg-gray-100 dark:bg-darkBg py-3 rounded-xl items-center border border-gray-200 dark:border-darkBorder"
              >
                <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenAppInfo}
                className="flex-2 bg-brandBlueLight py-3 px-6 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-sm">Go to App Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PermissionsScreen;
