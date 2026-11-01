import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Image,
  InteractionManager,
  NativeModules,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Ionicons';

import { rideApi } from '../../api/rideApi';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchDashboardStatsThunk,
  fetchDriverProfileThunk,
  fetchMyVehicleThunk,
  setOnlineStatus,
} from '../../redux/slices/driverSlice';
import { fetchPopupThunk } from '../../redux/slices/popupSlice';
import {
  acceptRideThunk,
  fetchFirstTwoRidesThunk,
  removeAvailableOrder,
  setActiveRide,
  validateUserPackageThunk,
} from '../../redux/slices/rideSlice';
import { isRideDismissed, markRideDismissed } from '../../services/rideDedup';
import { emitRideAccepted } from '../../services/socket/socketManager';
import OverlayPermissionManager from '../../services/OverlayPermissionManager';

import { ROUTES } from '../../constants/routes';
import { formatCurrency } from '../../utils/formatters';
import { useThemePalette } from '../../utils/theme';

import database from '@react-native-firebase/database';
import PromotionModal from '../../components/PromotionModal';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { syncFcmTokenWithBackend } from '../../hooks/useFcmToken';
import { getSocket } from '../../services/socket/socketClient';
import mmkvService from '../../services/storage/mmkvService';
import logger from '../../utils/logger';

interface RideCardData {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerRating: number;
  pickupAddress: string;
  dropAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  distance: number;
  duration: number;
  fareTotal: number;
  fareBase: number;
  fareSurge: number;
  vehicleType?: string;
  paymentMethod?: string;
  stops?: any[];
  requestedAt?: string;
  expiresAt?: string;
}

const normalizeRidePayload = (data: any): RideCardData => {
  const rideId = data.rideId || data.id || data._id || '';
  const total = parseFloat(
    data.totalFare || data.fare?.total || data.amount || '0',
  );
  const surge = parseFloat(data.surgeFare || data.fare?.surge || '0');
  const base = total - surge > 0 ? total - surge : total;

  const pickupAddr =
    typeof data.pickup === 'string'
      ? data.pickup
      : data.pickup?.address || data.pickupAddress || 'Pickup Location';
  const dropAddr =
    typeof data.drop === 'string'
      ? data.drop
      : data.drop?.address || data.dropAddress || 'Drop Location';

  const pLat = parseFloat(
    data.pickupLat ||
    data.pickup?.coordinates?.latitude ||
    data.pickup?.lat ||
    '0',
  );
  const pLng = parseFloat(
    data.pickupLng ||
    data.pickup?.coordinates?.longitude ||
    data.pickup?.lng ||
    '0',
  );
  const dLat = parseFloat(
    data.dropLat || data.drop?.coordinates?.latitude || data.drop?.lat || '0',
  );
  const dLng = parseFloat(
    data.dropLng || data.drop?.coordinates?.longitude || data.drop?.lng || '0',
  );

  const custName = data.customerName || data.customer?.name || 'Customer';
  const custPhone = data.customerPhone || data.customer?.phone || '';
  const custRating = parseFloat(
    data.customerRating || data.customer?.rating || '4.8',
  );

  const dist = parseFloat(
    data.rideDistance || data.distance || data.fare?.distance || '0',
  );
  const dur = parseFloat(
    data.rideDuration || data.duration || data.fare?.time || '0',
  );

  return {
    id: rideId,
    customerName: custName,
    customerPhone: custPhone,
    customerRating: custRating,
    pickupAddress: pickupAddr,
    dropAddress: dropAddr,
    pickupLat: pLat,
    pickupLng: pLng,
    dropLat: dLat,
    dropLng: dLng,
    distance: dist,
    duration: dur,
    fareTotal: total,
    fareBase: base,
    fareSurge: surge,
    paymentMethod: (data.paymentMethod || 'CASH').toUpperCase(),
    vehicleType: (data.vehicleType || 'BIKE').toUpperCase(),
    stops: data.stops,
    requestedAt: data.requestedAt || new Date().toISOString(),
    expiresAt: data.expiresAt,
  };
};

// ─── Module-level constants (never change, no need to re-create per render) ───
const GREETING_COLORS = [
  '#3B82F6',
  '#EC4899',
  '#F59E0B',
  '#22C55E',
  '#60A5FA',
  '#A855F7',
  '#FB923C',
  '#84CC16',
];
const GREETING_OFFSETS = [-2, 0, -4, 3, -3, 2, -3, 1];

function getGreetingText(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning ';
  if (hour >= 12 && hour < 17) return 'Good afternoon ';
  if (hour >= 17 && hour < 22) return 'Good evening ';
  return 'Good night ';
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  // ── Hardware Back Handler (Double tap to exit on Main Page) ───────────────────
  useFocusEffect(
    useCallback(() => {
      let lastBackPress = 0;
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  const driver = useAppSelector(
    state => state.driver.profile || state.auth.driver,
  );
  const isOnline = useAppSelector(state => state.driver.isOnline);
  const stats = useAppSelector(state => state.driver.dashboardStats);
  const currentLocation = useAppSelector(
    state => state.location.currentLocation,
  );

  const incomingRequest = useAppSelector(state => state.ride.incomingRequest);
  const availableOrders = useAppSelector(state => state.ride.availableOrders);
  const hasActivePackage = useAppSelector(state => state.ride.hasActivePackage);
  const firstTwoRidesCount = useAppSelector(
    state => state.ride.firstTwoRides.length,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<
    boolean | null
  >(null);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<
    boolean | null
  >(null);
  const [isPromoVisible, setIsPromoVisible] = useState(false);
  const [availableRides, setAvailableRides] = useState<RideCardData[]>([]);
  const [firebaseRideRequests, setFirebaseRideRequests] = useState<any[]>([]);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  const INACTIVE_RIDE_STATUSES = useMemo(
    () =>
      new Set([
        'cancelled',
        'canceled',
        'completed',
        'accepted',
        'in_progress',
        'started',
        'timeout',
        'expired',
        'rejected',
        'declined',
        'ended',
        'failed',
      ]),
    [],
  );

  const totalOrdersCount = (() => {
    const validAvailable = Array.isArray(availableOrders)
      ? availableOrders.filter(o => {
          if (!o?.id || isRideDismissed(o.id)) return false;
          const status = ((o as any).status || '').toLowerCase();
          return !INACTIVE_RIDE_STATUSES.has(status);
        }).length
      : 0;
    const validFirebase = Array.isArray(firebaseRideRequests)
      ? firebaseRideRequests.filter(r => {
          const id = r?.rideId || r?.id || r?._id || r?.firebaseKey;
          if (!id || isRideDismissed(id)) return false;
          const status = (r?.status || r?.rideStatus || '').toLowerCase();
          return !INACTIVE_RIDE_STATUSES.has(status);
        }).length
      : 0;
    return Math.max(validAvailable, validFirebase);
  })();

  // 🔥 Firebase Realtime Database — listen to rideRequests
  useEffect(() => {
    console.log(
      '🔥 [Firebase] Starting listener on /rideRequests...',
      incomingRequest,
    );
    const rideRequestsRef = database().ref('/rideRequests');

    const onValueChange = rideRequestsRef.on(
      'value',
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Convert object map to array safely
          const ridesArray = Object.keys(data).map(key => ({
            firebaseKey: key,
            ...(typeof data[key] === 'object' && data[key] !== null ? data[key] : { data: data[key] }),
          }));

          // Mark cancelled/inactive rides as dismissed and remove from Redux availableOrders
          ridesArray.forEach(r => {
            const id = r?.rideId || r?.id || r?._id || r?.firebaseKey;
            const status = (r?.status || r?.rideStatus || '').toLowerCase();
            if (id && INACTIVE_RIDE_STATUSES.has(status)) {
              markRideDismissed(String(id));
              dispatch(removeAvailableOrder(String(id)));
            }
          });

          // Only keep active, non-dismissed requests
          const activeRides = ridesArray.filter(r => {
            const id = r?.rideId || r?.id || r?._id || r?.firebaseKey;
            if (!id || isRideDismissed(String(id))) return false;
            const status = (r?.status || r?.rideStatus || '').toLowerCase();
            return !INACTIVE_RIDE_STATUSES.has(status);
          });
          setFirebaseRideRequests(activeRides);
        } else {
          setFirebaseRideRequests([]);
          console.log(
            '🔥 [Firebase] /rideRequests — No data found (empty or null)',
          );
        }
      },
      (error: Error) => {
        console.error(
          '❌ [Firebase] Error listening to /rideRequests:',
          error.message,
        );
      },
    );

    return () => {
      console.log('🔥 [Firebase] Removing listener from /rideRequests');
      rideRequestsRef.off('value', onValueChange);
    };
  }, [dispatch, INACTIVE_RIDE_STATUSES]);

  // Sync Redux incomingRequest into local availableRides list
  useEffect(() => {
    if (!incomingRequest || !incomingRequest.id) return;
    if (isRideDismissed(incomingRequest.id)) return;

    const rideData = normalizeRidePayload(incomingRequest);
    setAvailableRides(prev => {
      if (prev.some(r => r.id === rideData.id)) return prev;
      return [rideData, ...prev];
    });
  }, [incomingRequest]);

  // Fetch available rides from backend API
  const fetchAvailableRides = useCallback(async () => {
    try {
      const res = await rideApi.getDriverRides('pending', 10);
      const items = (res as any)?.data || res || [];
      if (Array.isArray(items) && items.length > 0) {
        const list = items
          .map(normalizeRidePayload)
          .filter(r => r.id && !isRideDismissed(r.id));
        setAvailableRides(prev => {
          const map = new Map<string, RideCardData>();
          prev.forEach(r => map.set(r.id, r));
          list.forEach(r => map.set(r.id, r));
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.log('[Dashboard] Error fetching available rides:', e);
    }
  }, []);

  // Realtime Socket Listeners for incoming/cancelled ride requests
  useEffect(() => {
    fetchAvailableRides();

    const socket = getSocket();
    if (!socket) return;

    const handleNewRide = (payload: any) => {
      if (!payload) return;
      const rideData = payload?.ride || payload;
      const ride = normalizeRidePayload(rideData);
      if (ride.id && !isRideDismissed(ride.id)) {
        setAvailableRides(prev => {
          if (prev.some(r => r.id === ride.id)) return prev;
          return [ride, ...prev];
        });
      }
    };

    const handleRideCancelled = (payload: any) => {
      const eventPayload = payload?.payload ?? payload;
      const cancelledId =
        eventPayload?.rideId ||
        eventPayload?.id ||
        eventPayload?._id ||
        (typeof payload === 'string' ? payload : undefined);
      if (cancelledId) {
        markRideDismissed(String(cancelledId));
        dispatch(removeAvailableOrder(String(cancelledId)));
        setAvailableRides(prev => prev.filter(r => String(r.id) !== String(cancelledId)));
        setFirebaseRideRequests(prev =>
          prev.filter(r => {
            const id = r?.rideId || r?.id || r?._id || r?.firebaseKey;
            return String(id) !== String(cancelledId);
          }),
        );
      }
    };

    socket.on('ride:new_request', handleNewRide);
    socket.on('ride_request', handleNewRide);
    socket.on('ride:request_cancelled', handleRideCancelled);
    socket.on('ride:cancelled', handleRideCancelled);

    return () => {
      socket.off('ride:new_request', handleNewRide);
      socket.off('ride_request', handleNewRide);
      socket.off('ride:request_cancelled', handleRideCancelled);
      socket.off('ride:cancelled', handleRideCancelled);
    };
  }, [fetchAvailableRides, dispatch]);



  const checkLocationPermission = useCallback(async () => {
    try {
      let locationGranted = false;
      if (Platform.OS === 'android') {
        const fineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        const bgLocation =
          Platform.Version >= 29
            ? await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            )
            : true;
        locationGranted = fineLocation && bgLocation;
      } else if (Platform.OS === 'ios') {
        const checkResult = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        locationGranted = checkResult === RESULTS.GRANTED;
      }
      const overlayGranted = await OverlayPermissionManager.isGranted();
      setHasLocationPermission(locationGranted);
      setHasOverlayPermission(overlayGranted);
    } catch (error) {
      console.log('[Dashboard] Error checking location permission:', error);
      setHasLocationPermission(false);
      setHasOverlayPermission(false);
    }
  }, []);

  const handleRequestPermission = useCallback(() => {
    navigation.navigate(ROUTES.PERMISSIONS);
  }, [navigation]);

  useEffect(() => {
    checkLocationPermission();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkLocationPermission();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [checkLocationPermission]);

  // Fetch only ONCE when app loads
  useEffect(() => {
    mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);

    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchDashboardStatsThunk());
      dispatch(fetchDriverProfileThunk());
      dispatch(fetchFirstTwoRidesThunk());
      dispatch(validateUserPackageThunk());
      dispatch(fetchPopupThunk());

      dispatch(fetchMyVehicleThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchDashboardStatsThunk()).unwrap(),
        dispatch(fetchDriverProfileThunk()).unwrap(),
        dispatch(fetchFirstTwoRidesThunk()).unwrap(),
        dispatch(validateUserPackageThunk()).unwrap(),
        dispatch(fetchPopupThunk()).unwrap(),
        fetchAvailableRides(),
        checkLocationPermission(),
      ]);
    } catch (err) {
      console.log('[Dashboard] Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, checkLocationPermission, fetchAvailableRides]);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastSeen = mmkvService.getString(STORAGE_KEYS.PROMOTION_LAST_SEEN);
    if (lastSeen !== today) {
      const timer = setTimeout(() => {
        setIsPromoVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClosePromo = useCallback(() => {
    const today = new Date().toDateString();
    mmkvService.setString(STORAGE_KEYS.PROMOTION_LAST_SEEN, today);
    setIsPromoVisible(false);
  }, []);

  const greetingChars = useMemo(() => {
    const text = getGreetingText();
    return text.split('').map((char, index) => ({
      char: char === ' ' ? '\u00A0' : char,
      style: {
        color: GREETING_COLORS[index % GREETING_COLORS.length],
        fontSize: 25,
        fontWeight: '900' as const,
        textShadowColor: '#2563EB',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 2,
        transform: [
          { translateY: GREETING_OFFSETS[index % GREETING_OFFSETS.length] },
        ],
      },
    }));
  }, []);

  useEffect(() => {
    if (
      (hasLocationPermission === false || hasOverlayPermission === false) &&
      isOnline
    ) {
      const socket = getSocket();
      if (socket && driver?._id) {
        socket.emit('driver:offline', {
          driverId: driver._id,
        });
        logger.info(
          'DashboardScreen',
          `Socket: Emitted driver:offline due to missing required permission for driver ${driver._id}`,
        );
      }
      dispatch(setOnlineStatus(false));
    }
  }, [
    hasLocationPermission,
    hasOverlayPermission,
    isOnline,
    dispatch,
    driver?._id,
  ]);

  const handleToggleOnline = useCallback(async () => {
    if (isToggleLoading) return; // Prevent multiple rapid clicks

    const nextStatus = !isOnline;

    if (
      nextStatus &&
      (!hasLocationPermission || !hasOverlayPermission)
    ) {
      handleRequestPermission();
      return;
    }

    setIsToggleLoading(true);
    try {
      if (nextStatus) {
        await syncFcmTokenWithBackend(driver?._id);
      }

      const socket = getSocket();

      if (socket && driver?._id) {
        if (nextStatus) {
          socket.emit('driver:online', {
            driverId: driver._id,
          });
          logger.info(
            'DashboardScreen',
            `Socket: Emitted driver:online for driver ${driver._id}`,
          );
        } else {
          socket.emit('driver:offline', {
            driverId: driver._id,
          });
          logger.info(
            'DashboardScreen',
            `Socket: Emitted driver:offline for driver ${driver._id}`,
          );
        }
      }

      dispatch(setOnlineStatus(nextStatus));
    } catch (error) {
      logger.error('DashboardScreen', 'Failed to toggle online status:', error);
      console.log('[Dashboard] Toggle online error:', error);
    } finally {
      setIsToggleLoading(false);
    }
  }, [
    dispatch,
    isOnline,
    driver?._id,
    hasLocationPermission,
    hasOverlayPermission,
    handleRequestPermission,
    isToggleLoading,
  ]);

  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: palette.background }}
      className="flex-1"
    >
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor={palette.background}
      />

      {/* Header */}
      <View
        style={{
          backgroundColor: palette.background,
          borderColor: palette.border,
        }}
        className="flex-row items-center justify-between px-5 pb-5 border-b"
      >
        <TouchableOpacity
          className="flex-row items-center gap-3.5"
          onPress={() => navigation.navigate(ROUTES.PROFILE)}
        >
          <View
            style={{ backgroundColor: palette.surface }}
            className="w-16 h-16 rounded-full overflow-hidden mr-3 border border-lightBorder dark:border-darkBorder"
          >
            {driver?.profile_image_id ? (
              <Image
                source={{ uri: driver.profile_image_id }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 justify-center items-center bg-slate-800 dark:bg-slate-700">
                <Text className="text-xl font-bold text-white">
                  {driver?.name?.[0]?.toUpperCase() ?? 'D'}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text className="text-[13px] text-textLightSecondary dark:text-textDarkSecondary">
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                {greetingChars.map((item, index) => (
                  <Text key={index} style={item.style}>
                    {item.char}
                  </Text>
                ))}
              </View>
            </Text>
            <Text className="text-lg font-extrabold text-textLight dark:text-textDark">
              {driver?.name ?? 'Driver'}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row items-center gap-3">
          {/* Header Online Toggle */}
          <TouchableOpacity
            style={{
              backgroundColor: isToggleLoading
                ? palette.mutedText
                : isOnline
                  ? palette.success
                  : palette.border,
              opacity: isToggleLoading ? 0.6 : 1,
            }}
            className="w-[52px] h-[28px] rounded-full p-[3px] justify-center"
            onPress={handleToggleOnline}
            activeOpacity={0.85}
            disabled={isToggleLoading}
          >
            {isToggleLoading ? (
              <View className="flex-1 justify-center items-center">
                <View className="w-3 h-3 rounded-full bg-white opacity-70" />
              </View>
            ) : (
              <View
                className={`w-[22px] h-[22px] rounded-full bg-white shadow ${isOnline ? 'self-end' : 'self-start'
                  }`}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        <View className="">
          {hasLocationPermission !== true || hasOverlayPermission !== true ? (
            /* Warning Permission Card */
            <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-5 shadow-md shadow-amber-500/5">
              <View className="flex-row items-start mb-3.5">
                <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 justify-center items-center mr-3 mt-0.5">
                  <Icon
                    name="warning-outline"
                    size={22}
                    color={palette.warning}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-amber-800 dark:text-amber-400 mb-1">
                    Required Permission Missing
                  </Text>
                  <Text className="text-[12px] text-amber-700 dark:text-amber-300 leading-[18px] font-semibold">
                    Location and display-over-other-apps permissions are required
                    to receive ride requests and alerts. Without them, you will{' '}
                    <Text className="font-bold text-red-600 dark:text-red-400">
                      NOT receive any rides
                    </Text>{' '}
                    (required permissions ke bina rides nahi aayengi). Please
                    enable them.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: palette.warning }}
                className="py-3 px-4 rounded-xl items-center flex-row justify-center active:opacity-90"
                onPress={handleRequestPermission}
                activeOpacity={0.85}
              >
                <Icon
                  name="shield-checkmark-outline"
                  size={16}
                  color="white"
                  className="mr-2"
                />
                <Text className="font-extrabold text-[13px] uppercase tracking-wider text-white">
                  Grant Required Permissions
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Location Active & Ready Status Card */
            <View
              className={
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 mb-5 shadow-sm'
                  : 'bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-500/30 rounded-2xl p-4 mb-5 shadow-sm'
              }
            >
              <View className="flex-row items-center justify-between mb-3.5 pt-1">
                <View className="flex-row items-center">
                  <View
                    className={
                      isOnline
                        ? 'w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse'
                        : 'w-2.5 h-2.5 rounded-full bg-red-500 mr-2 animate-pulse'
                    }
                  />
                  <Text
                    className={
                      isOnline
                        ? 'text-[13px] font-bold text-emerald-800 dark:text-emerald-400'
                        : 'text-[13px] font-bold text-red-600 dark:text-red-400'
                    }
                  >
                    Location Active & Ready
                  </Text>
                </View>
                <Text
                  className={
                    isOnline
                      ? 'text-[11px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider'
                      : 'text-[11px] text-red-600 dark:text-red-500 font-bold uppercase tracking-wider'
                  }
                >
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>

              {isOnline && (
                <TouchableOpacity
                  style={{ backgroundColor: palette.primary }}
                  className="py-2.5 px-4 rounded-xl items-center flex-row justify-center active:opacity-90 mt-1"
                  onPress={() => navigation.navigate(ROUTES.DRIVER_MAP)}
                  activeOpacity={0.85}
                >
                  <Icon
                    name="location-sharp"
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-extrabold text-[13px] uppercase tracking-wider text-white">
                    Show Current Location
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Stats grid */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            <StatCard
              label="Today Earning"
              value={formatCurrency(stats?.todayEarnings ?? 0)}
              icon="cash-outline"
              color={palette.success}
              surfaceColor={palette.surface}
              borderColor={palette.border}
            />
            <StatCard
              label="Today Ride"
              value={String(stats?.todayCompleted ?? stats?.totalTrips ?? 0)}
              icon="car-outline"
              color={palette.accent}
              surfaceColor={palette.surface}
              borderColor={palette.border}
            />
            <StatCard
              label="Today Cancel"
              value={String(stats?.todayCancelled ?? 0)}
              icon="close-circle-outline"
              color={palette.destructive}
              surfaceColor={palette.surface}
              borderColor={palette.border}
            />
            <StatCard
              label="Today Distance"
              value={`${stats?.todayDistanceKm ?? 0} km`}
              icon="navigate-outline"
              color={palette.warning}
              surfaceColor={palette.surface}
              borderColor={palette.border}
            />
          </View>
        </View>

        {/* Available Ride Orders Quick Access Card */}
        <View className="mb-6">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate(ROUTES.ORDERS as any)}
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
            className="rounded-3xl p-5 border shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4 flex-1">
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: '#fe4c01' }}
              >
                <Icon name="bicycle" size={28} color="#fff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-[17px] font-black"
                    style={{ color: palette.text }}
                  >
                    Orders & Requests
                  </Text>
                  {totalOrdersCount > 0 && (
                    <View className="bg-emerald-500 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-black text-white">
                        {totalOrdersCount} NEW
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="text-[12px] font-medium mt-0.5"
                  style={{ color: palette.mutedText }}
                >
                  {totalOrdersCount > 0
                    ? `${totalOrdersCount} passenger rides ready to accept`
                    : 'Tap to view live incoming order pool'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1 pl-2">
              <View
                className="w-9 h-9 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                }}
              >
                <Icon name="chevron-forward" size={18} color={palette.text} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PromotionModal visible={isPromoVisible} onClose={handleClosePromo} />
    </SafeAreaView>
  );
};

export default DashboardScreen;

const StatCard = React.memo(
  ({
    label,
    value,
    icon,
    color,
    surfaceColor,
    borderColor,
  }: {
    label: string;
    value: string;
    icon: string;
    color: string;
    surfaceColor?: string;
    borderColor?: string;
  }) => (
    <View
      className="flex-1 min-w-[44%] rounded-2xl p-4 border border-l-4 shadow-sm"
      style={{
        backgroundColor: surfaceColor,
        borderColor: borderColor,
        borderLeftColor: color,
      }}
    >
      <View className="mb-2">
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text className="text-[22px] font-extrabold mb-0.5" style={{ color }}>
        {value}
      </Text>
      <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest">
        {label}
      </Text>
    </View>
  ),
);
