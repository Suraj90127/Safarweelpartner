import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';
import { useIsFocused, useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { rideApi } from '../../api/rideApi';
import { ROUTES } from '../../constants/routes';
import { Button } from '../../components/Button';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  acceptRideThunk,
  removeAvailableOrder,
  setActiveRide,
} from '../../redux/slices/rideSlice';
import { isRideDismissed, markRideDismissed } from '../../services/rideDedup';
import { getSocket } from '../../services/socket/socketClient';
import { emitRideAccepted } from '../../services/socket/socketManager';
import mmkvService from '../../services/storage/mmkvService';
import { useThemePalette } from '../../utils/theme';
import { getDistanceKm, parseStops, parsePickupLatLng, parseDropLatLng } from '../../utils/helpers';
import { geocodeAddress } from '../../utils/mapUtils';

interface OrderItem {
  id: string;
  vehicleType: string;
  paymentMethod: string;
  fareBase: number;
  fareExtra: number;
  fareTotal: number;
  pickupDistance: string;
  pickupAddress: string;
  dropDistance: string;
  dropAddress: string;
  customerName: string;
  customerPhone?: string;
  customerRating: number;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  pickupLocation?: any;
  dropLocation?: any;
  raw?: any;
  duration?: number;
  stops?: any[];
}

const parseDistanceKm = (value?: string): number => {
  if (!value) return NaN;
  return parseFloat(String(value).replace(/[^0-9.]/g, ''));
};

const shouldKeepExistingDistance = (
  existing: OrderItem,
  incoming: OrderItem,
): boolean => {
  const existingPickup = parseDistanceKm(existing.pickupDistance);
  const existingDrop = parseDistanceKm(existing.dropDistance);
  const incomingPickup = parseDistanceKm(incoming.pickupDistance);
  const incomingDrop = parseDistanceKm(incoming.dropDistance);

  if (
    !Number.isNaN(existingPickup) &&
    !Number.isNaN(existingDrop) &&
    !Number.isNaN(incomingPickup) &&
    !Number.isNaN(incomingDrop)
  ) {
    const existingHasDifferentDistances =
      Math.abs(existingPickup - existingDrop) >= 0.1;
    const incomingLooksDuplicated = Math.abs(incomingPickup - incomingDrop) < 0.1;
    if (existingHasDifferentDistances && incomingLooksDuplicated) {
      return true;
    }
  }

  return false;
};

const hasValidCoord = (val?: number): boolean =>
  typeof val === 'number' && !Number.isNaN(val) && val !== 0;

const mergeOrderForDisplay = (
  existing: OrderItem | undefined,
  incoming: OrderItem,
): OrderItem => {
  if (!existing) return incoming;

  const pickupLat = hasValidCoord(incoming.pickupLat)
    ? incoming.pickupLat
    : existing.pickupLat;
  const pickupLng = hasValidCoord(incoming.pickupLng)
    ? incoming.pickupLng
    : existing.pickupLng;

  const dropLat = hasValidCoord(incoming.dropLat)
    ? incoming.dropLat
    : existing.dropLat;
  const dropLng = hasValidCoord(incoming.dropLng)
    ? incoming.dropLng
    : existing.dropLng;

  const customerName =
    incoming.customerName &&
      incoming.customerName !== 'Passenger' &&
      incoming.customerName !== 'Customer'
      ? incoming.customerName
      : existing.customerName && existing.customerName !== 'Passenger'
        ? existing.customerName
        : incoming.customerName || existing.customerName;

  const customerPhone = incoming.customerPhone || existing.customerPhone;

  const customerRating =
    incoming.customerRating && incoming.customerRating !== 4.8
      ? incoming.customerRating
      : existing.customerRating || incoming.customerRating;

  let pickupDistance = incoming.pickupDistance;
  let dropDistance = incoming.dropDistance;

  if (
    shouldKeepExistingDistance(existing, incoming) ||
    (!hasValidCoord(incoming.pickupLat) && hasValidCoord(existing.pickupLat))
  ) {
    pickupDistance = existing.pickupDistance;
    dropDistance = existing.dropDistance;
  }

  return {
    ...existing,
    ...incoming,
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    customerName,
    customerPhone,
    customerRating,
    pickupDistance,
    dropDistance,
    raw: {
      ...(existing.raw || {}),
      ...(incoming.raw || {}),
      pickup: existing.raw?.pickup || incoming.raw?.pickup,
      drop: existing.raw?.drop || incoming.raw?.drop,
      customer: existing.raw?.customer || incoming.raw?.customer,
    },
  };
};

const getLivePickupDistanceLabel = (
  order: OrderItem,
  driverCoords: { latitude: number; longitude: number } | null,
): string => {
  if (
    !driverCoords ||
    typeof order.pickupLat !== 'number' ||
    typeof order.pickupLng !== 'number' ||
    Number.isNaN(order.pickupLat) ||
    Number.isNaN(order.pickupLng) ||
    order.pickupLat === 0 ||
    order.pickupLng === 0
  ) {
    return order.pickupDistance;
  }

  const distKm = getDistanceKm(driverCoords, {
    latitude: order.pickupLat,
    longitude: order.pickupLng,
  });


  // console.log("distkm", distKm)

  if (!Number.isFinite(distKm) || distKm <= 0) {
    return order.pickupDistance;
  }


  if (distKm < 1) {
    return `${Math.max(1, Math.round(distKm * 1000))} m`;
  }

  // console.log("distKm.toFixed(1)", distKm.toFixed(1))

  return `${distKm.toFixed(1)} km`;
};

const normalizeOrder = (raw: any, vehicleType?: string): OrderItem => {
  const id =
    raw?.rideId ||
    raw?.id ||
    raw?._id ||
    raw?.firebaseKey ||
    (typeof raw === 'string' ? raw : `ride_${Date.now()}`);

  const total = Number(
    raw?.totalFare ??
    raw?.fare?.total ??
    raw?.fareTotal ??
    (typeof raw?.fare === 'number' ? raw.fare : 0) ??
    raw?.amount ??
    raw?.price ??
    0,
  );
  const extra = Number(
    raw?.surgeFare ??
    raw?.fare?.surge ??
    raw?.fareSurge ??
    raw?.fareExtra ??
    raw?.extra ??
    raw?.surge ??
    0,
  );
  const base = Math.max(0, total - extra) || total;

  const pickupAddr =
    raw?.pickupAddress ||
    (typeof raw?.pickup === 'string' ? raw?.pickup : raw?.pickup?.address) ||
    raw?.pickup_location?.address ||
    raw?.pickupLocation?.address ||
    'Pickup Location';

  const dropAddr =
    raw?.dropAddress ||
    (typeof raw?.drop === 'string' ? raw?.drop : raw?.drop?.address) ||
    raw?.drop_location?.address ||
    raw?.dropLocation?.address ||
    'Drop Location';

  const distVal = Number(
    raw?.pickupDistance ??
    raw?.pickup_distance ??
    raw?.driverPickupDistance ??
    raw?.driverDistance ??
    1.0,
  );
  const dropDistVal = Number(
    raw?.dropDistance ??
    raw?.rideDistance ??
    raw?.drop_distance ??
    raw?.distance ??
    raw?.fare?.distance ??
    5.0,
  );

  const parsedPickup = parsePickupLatLng(raw, 0, 0);
  const parsedDrop = parseDropLatLng(raw, 0, 0);

  const pLat = parsedPickup.latitude !== 0 ? parsedPickup.latitude : undefined;
  const pLng = parsedPickup.longitude !== 0 ? parsedPickup.longitude : undefined;
  const dLat = parsedDrop.latitude !== 0 ? parsedDrop.latitude : undefined;
  const dLng = parsedDrop.longitude !== 0 ? parsedDrop.longitude : undefined;

  const custName =
    raw?.customerName ||
    raw?.customer?.name ||
    raw?.userName ||
    raw?.user?.name ||
    raw?.passengerName ||
    'Passenger';

  const custPhone =
    raw?.customerPhone ||
    raw?.customer?.phone ||
    raw?.phone ||
    raw?.user?.phone ||
    '';

  const custRating = Number(
    raw?.customerRating ||
    raw?.customer?.rating ||
    raw?.rating ||
    raw?.user?.rating ||
    4.8,
  );

  return {
    id,
    vehicleType:
      raw?.vehicleType ||
      raw?.serviceName ||
      raw?.serviceType ||
      vehicleType ||
      'Bike',
    paymentMethod: raw?.paymentMethod || raw?.payment?.method || 'Cash',
    fareBase: base,
    fareExtra: extra,
    fareTotal: total,
    pickupDistance: `${distVal.toFixed(1)} km`,
    pickupAddress: pickupAddr,
    dropDistance: `${dropDistVal.toFixed(1)} km`,
    dropAddress: dropAddr,
    customerName: custName,
    customerPhone: custPhone,
    customerRating: custRating,
    pickupLat: pLat,
    pickupLng: pLng,
    dropLat: dLat,
    dropLng: dLng,
    pickupLocation: raw?.pickupLocation || raw?.pickup_location || raw?.pickup,
    dropLocation: raw?.dropLocation || raw?.drop_location || raw?.drop,
    duration: Number(
      raw?.duration ||
      raw?.rideDuration ||
      raw?.fare?.time ||
      10,
    ),
    stops: parseStops(raw),
    raw,
  };
};

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const vehicle = useAppSelector(state => state.driver.vehicle);

  const driver = useAppSelector(state => state.driver.profile);
  const hasActivePackage = useAppSelector(state => state.ride.hasActivePackage);
  const firstTwoRidesCount = useAppSelector(
    state => state.ride.firstTwoRides.length,
  );
  const incomingRequest = useAppSelector(state => state.ride.incomingRequest);


  const availableOrders = useAppSelector(state => state.ride.availableOrders);
  const activeRide = useAppSelector(state => state.ride.activeRide);

  const isFocused = useIsFocused();

  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const initialList: OrderItem[] = [];
    if (Array.isArray(availableOrders) && availableOrders.length > 0) {
      availableOrders.forEach(item => {
        if (item?.id && !isRideDismissed(item.id)) {
          initialList.push(normalizeOrder(item, vehicle?.serviceId?.name));
        }
      });
    }
    if (incomingRequest?.id && !isRideDismissed(incomingRequest.id)) {
      const normalizedIncoming = normalizeOrder(
        incomingRequest,
        vehicle?.serviceId?.name,
      );
      const existingIndex = initialList.findIndex(o => o.id === incomingRequest.id);
      if (existingIndex === -1) {
        initialList.push(normalizedIncoming);
      } else {
        initialList[existingIndex] = mergeOrderForDisplay(
          initialList[existingIndex],
          normalizedIncoming,
        );
      }
    }
    return initialList;
  });


  console.log("orders on oder pageeee", orders)
  console.log("incomingRequest on oder pageeee", incomingRequest)
  console.log("availableOrders on oder pageeee", availableOrders)

  const [isSoundOn, setIsSoundOn] = useState<boolean>(() => {
    const saved = mmkvService.getBoolean(STORAGE_KEYS.SOUND_ENABLED);
    return saved ?? true;
  });
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // ── Hardware Back Handler (Return to Home cleanly) ───────────────────────────
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate(ROUTES.MAIN_TABS as any);
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  let driverCoordsForPickup: { latitude: number; longitude: number } | null = null;
  try {
    const stored = mmkvService.getString(STORAGE_KEYS.LAST_KNOWN_LOCATION);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number'
      ) {
        driverCoordsForPickup = {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
        };
      }
    }
  } catch (e) {
    console.log('[OrdersScreen] Failed to parse LAST_KNOWN_LOCATION:', e);
  }

  const geocodingInProgressRef = useRef<Set<string>>(new Set());

  // Proactively resolve coordinates for any order that has an address but missing coordinates
  useEffect(() => {
    orders.forEach(order => {
      if (
        (!order.pickupLat || order.pickupLat === 0) &&
        order.pickupAddress &&
        !geocodingInProgressRef.current.has(order.id)
      ) {
        geocodingInProgressRef.current.add(order.id);
        geocodeAddress(order.pickupAddress)
          .then(coords => {
            if (coords) {
              setOrders(prev =>
                prev.map(o =>
                  o.id === order.id
                    ? {
                      ...o,
                      pickupLat: coords.latitude,
                      pickupLng: coords.longitude,
                    }
                    : o,
                ),
              );
            }
          })
          .catch(err => {
            console.log('[OrdersScreen] Geocoding error:', err);
          });
      }
    });
  }, [orders]);

  // Toggle sound ON / OFF and persist
  const toggleSound = useCallback(() => {
    setIsSoundOn(prev => {
      const next = !prev;
      mmkvService.setBoolean(STORAGE_KEYS.SOUND_ENABLED, next);
      if (Platform.OS === 'android' && NativeModules.PermissionModule) {
        if (!next) {
          NativeModules.PermissionModule.stopSound();
        } else if (orders.length > 0) {
          NativeModules.PermissionModule.playSound();
        }
      }
      return next;
    });
  }, [orders.length]);

  // Hide floating overlay on mount, stop sound on unmount
  useEffect(() => {
    if (Platform.OS === 'android') {
      const { PermissionModule } = NativeModules;
      if (PermissionModule) {
        PermissionModule.hideFloatingRequest();
      }
    }
    return () => {
      if (Platform.OS === 'android' && NativeModules.PermissionModule) {
        NativeModules.PermissionModule.stopSound();
      }
    };
  }, []);

  // Continuous sound loop: As long as orders are present in the list, sound is enabled, screen is focused, and NO active ride is present
  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.PermissionModule) {
      if (isFocused && orders.length > 0 && isSoundOn && !activeRide) {
        NativeModules.PermissionModule.playSound();
      } else {
        NativeModules.PermissionModule.stopSound();
      }
    }
  }, [isFocused, orders.length, isSoundOn, activeRide]);

  // Sync Redux availableOrders pool into local orders list (preserves rides even after 15s timeout)
  useEffect(() => {
    setOrders(prev => {
      // 1. Purge any dismissed orders
      const cleaned = prev.filter(o => !isRideDismissed(o.id));
      if (!Array.isArray(availableOrders) || availableOrders.length === 0) {
        return cleaned;
      }

      const validPool = availableOrders
        .filter(r => r && r.id && !isRideDismissed(r.id))
        .map(r => normalizeOrder(r, vehicle?.serviceId?.name));

      const map = new Map<string, OrderItem>();
      cleaned.forEach(o => map.set(o.id, o));
      validPool.forEach(o => {
        map.set(o.id, mergeOrderForDisplay(map.get(o.id), o));
      });
      return Array.from(map.values());
    });
  }, [availableOrders, vehicle?.serviceId?.name]);

  // Sync if an active request arrives in Redux
  useEffect(() => {
    if (incomingRequest?.id && !isRideDismissed(incomingRequest.id)) {
      const normalized = normalizeOrder(
        incomingRequest,
        vehicle?.serviceId?.name,
      );
      setOrders(prev => {
        const existingIndex = prev.findIndex(o => o.id === normalized.id);
        if (existingIndex === -1) {
          return [normalized, ...prev];
        }
        const next = [...prev];
        next[existingIndex] = mergeOrderForDisplay(
          prev[existingIndex],
          normalized,
        );
        return next;
      });
    }
  }, [incomingRequest, vehicle?.serviceId?.name]);

  const enrichRawWithRedux = useCallback(
    (item: any) => {
      if (!item || typeof item !== 'object') return item;
      const id = String(
        item.rideId || item.id || item._id || item.firebaseKey || '',
      );
      if (!id) return item;

      const reduxMatch =
        (incomingRequest?.id === id ? incomingRequest : null) ||
        (Array.isArray(availableOrders)
          ? availableOrders.find(r => r?.id === id)
          : null);

      if (!reduxMatch) return item;

      const matchAny = reduxMatch as any;
      return {
        ...matchAny,
        ...item,
        customer: matchAny.customer || item.customer,
        pickup: matchAny.pickup || item.pickup,
        drop: matchAny.drop || item.drop,
        distance: matchAny.distance ?? item.distance,
        rideDistance: matchAny.rideDistance ?? item.rideDistance,
      };
    },
    [incomingRequest, availableOrders],
  );

  // 🔥 Firebase Realtime Database — listen to rideRequests in realtime
  useEffect(() => {
    const rideRequestsRef = database().ref('/rideRequests');

    const onValueChange = rideRequestsRef.on(
      'value',
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const ridesArray: any[] = Object.keys(data).map(key => ({
            firebaseKey: key,
            ...(typeof data[key] === 'object' ? data[key] : { data: data[key] }),
          }));

          const INACTIVE_STATUSES = [
            'cancelled',
            'canceled',
            'completed',
            'accepted',
            'in_progress',
            'started',
            'timeout',
            'expired',
            'rejected',
          ];

          const cancelledIdsSet = new Set<string>();

          ridesArray.forEach(item => {
            const id = String(
              item.rideId || item.id || item._id || item.firebaseKey || '',
            );
            const status = (item.status || item.rideStatus || '').toLowerCase();
            if (id && INACTIVE_STATUSES.includes(status)) {
              cancelledIdsSet.add(id);
              markRideDismissed(id);
              dispatch(removeAvailableOrder(id));
            }
          });

          const validFirebaseOrders = ridesArray
            .filter(item => {
              const id = String(
                item.rideId || item.id || item._id || item.firebaseKey || '',
              );
              if (!id || isRideDismissed(id) || cancelledIdsSet.has(id)) return false;
              const status = (item.status || item.rideStatus || '').toLowerCase();
              return !INACTIVE_STATUSES.includes(status);
            })
            .map(item =>
              normalizeOrder(
                enrichRawWithRedux(item),
                vehicle?.serviceId?.name,
              ),
            );

          const fbIdSet = new Set(validFirebaseOrders.map(o => o.id));

          setOrders(prev => {
            const existingMap = new Map<string, OrderItem>();
            prev.forEach(o => {
              if (!isRideDismissed(o.id) && !cancelledIdsSet.has(o.id)) {
                existingMap.set(o.id, o);
              }
            });

            const resultMap = new Map<string, OrderItem>();

            // Retain any non-firebase orders that haven't been dismissed or cancelled
            prev.forEach(o => {
              const isFromFb =
                !!o.raw?.firebaseKey ||
                o.id.startsWith('-') ||
                fbIdSet.has(o.id);
              if (!isFromFb && !isRideDismissed(o.id) && !cancelledIdsSet.has(o.id)) {
                resultMap.set(o.id, o);
              }
            });

            // Update / add all valid Firebase orders, merging with existing data
            validFirebaseOrders.forEach(o => {
              if (!isRideDismissed(o.id) && !cancelledIdsSet.has(o.id)) {
                const existing = existingMap.get(o.id);
                resultMap.set(o.id, mergeOrderForDisplay(existing, o));
              }
            });

            const nextOrders = Array.from(resultMap.values());
            if (
              nextOrders.length === 0 &&
              Platform.OS === 'android' &&
              NativeModules.PermissionModule
            ) {
              NativeModules.PermissionModule.stopSound();
            }
            return nextOrders;
          });
        } else {
          // If Firebase is empty, keep only non-firebase active orders
          setOrders(prev => {
            const next = prev.filter(
              o =>
                !o.raw?.firebaseKey &&
                !o.id.startsWith('-') &&
                !isRideDismissed(o.id),
            );
            if (
              next.length === 0 &&
              Platform.OS === 'android' &&
              NativeModules.PermissionModule
            ) {
              NativeModules.PermissionModule.stopSound();
            }
            return next;
          });
        }
      },
      (error: Error) => {
        console.log(
          '❌ [OrdersScreen] Error listening to /rideRequests:',
          error?.message,
        );
      },
    );

    return () => {
      rideRequestsRef.off('value', onValueChange);
    };
  }, [vehicle?.serviceId?.name, dispatch, enrichRawWithRedux]);

  // Listen to FCM messages (Foreground push events for new ride requests & cancellations)
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      const data = remoteMessage.data as any;

      if (!data) return;

      const msgType = data.type || data.status;
      const rideId = data.rideId || data.id;

      // 1. Handle Ride Cancellation -> Remove from list & stop sound if needed
      if (
        msgType === 'ride_cancelled' ||
        msgType === 'cancel' ||
        msgType === 'ride_canceled' ||
        msgType === 'ride_timeout' ||
        msgType === 'ride_expired' ||
        data.status === 'cancelled' ||
        data.status === 'no_driver_found' ||
        data.status === 'expired'
      ) {
        if (rideId) {
          markRideDismissed(String(rideId));
          dispatch(removeAvailableOrder(String(rideId)));
          setOrders(prev => {
            const next = prev.filter(o => o.id !== String(rideId));
            if (
              next.length === 0 &&
              Platform.OS === 'android' &&
              NativeModules.PermissionModule
            ) {
              NativeModules.PermissionModule.stopSound();
              NativeModules.PermissionModule.hideFloatingRequest();
            }
            return next;
          });
        }
        return;
      }

      // 2. Handle New Ride Request -> Add to list
      if (
        msgType === 'ride_request' ||
        data.status === 'searching' ||
        data.status === 'pending' ||
        (rideId && (data.pickupAddress || data.totalFare))
      ) {
        if (!rideId || isRideDismissed(String(rideId))) return;

        const newOrder = normalizeOrder(
          enrichRawWithRedux(data),
          vehicle?.serviceId?.name,
        );
        setOrders(prev => {
          const existingIndex = prev.findIndex(o => o.id === newOrder.id);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = mergeOrderForDisplay(
              prev[existingIndex],
              newOrder,
            );
            return next;
          }
          return [newOrder, ...prev];
        });
      }
    });

    return () => {
      unsubscribeOnMessage();
    };
  }, [isAuthenticated, vehicle?.serviceId?.name, dispatch, enrichRawWithRedux]);

  // Fetch pending available orders from Firebase Realtime DB and backend API
  const fetchPendingOrders = useCallback(async () => {
    try {
      // 1. Fetch from Firebase Realtime Database
      let fbList: OrderItem[] = [];
      try {
        const snap = await database().ref('/rideRequests').once('value');
        if (snap.exists()) {
          const data = snap.val();
          const ridesArray: any[] = Object.keys(data).map(key => ({
            firebaseKey: key,
            ...(typeof data[key] === 'object' ? data[key] : { data: data[key] }),
          }));

          const INACTIVE_STATUSES = [
            'cancelled',
            'canceled',
            'completed',
            'accepted',
            'in_progress',
            'started',
            'timeout',
            'expired',
            'rejected',
          ];

          ridesArray.forEach(item => {
            const id = String(
              item.rideId || item.id || item._id || item.firebaseKey || '',
            );
            const status = (item.status || item.rideStatus || '').toLowerCase();
            if (id && INACTIVE_STATUSES.includes(status)) {
              markRideDismissed(id);
              dispatch(removeAvailableOrder(id));
            }
          });

          fbList = ridesArray
            .filter(item => {
              const id = String(
                item.rideId || item.id || item._id || item.firebaseKey || '',
              );
              if (!id || isRideDismissed(id)) return false;
              const status = (item.status || item.rideStatus || '').toLowerCase();
              return !INACTIVE_STATUSES.includes(status);
            })
            .map(item =>
              normalizeOrder(
                enrichRawWithRedux(item),
                vehicle?.serviceId?.name,
              ),
            );
        }
      } catch (fbErr) {
        console.log('[OrdersScreen] Error fetching from Firebase once:', fbErr);
      }

      // 2. Fetch pending available orders from backend API
      let apiList: OrderItem[] = [];
      try {
        const res = await rideApi.getDriverRides('pending', 20);
        const items = (res as any)?.data || res || [];
        if (Array.isArray(items)) {
          apiList = items
            .map((item: any) =>
              normalizeOrder(
                enrichRawWithRedux(item),
                vehicle?.serviceId?.name,
              ),
            )
            .filter((item: OrderItem) => item.id && !isRideDismissed(item.id));
        }
      } catch (apiErr) {
        console.log('[OrdersScreen] Error fetching pending API orders:', apiErr);
      }

      // 3. Merge Redux availableOrders + Firebase + API + existing active non-dismissed orders
      setOrders(prev => {
        const map = new Map<string, OrderItem>();
        // Keep existing non-dismissed orders
        prev.forEach(o => {
          if (!isRideDismissed(o.id)) {
            map.set(o.id, o);
          }
        });
        // Add Redux available orders
        if (Array.isArray(availableOrders)) {
          availableOrders.forEach(item => {
            if (item?.id && !isRideDismissed(item.id)) {
              const normalized = normalizeOrder(item, vehicle?.serviceId?.name);
              map.set(item.id, mergeOrderForDisplay(map.get(item.id), normalized));
            }
          });
        }
        // Add API orders
        apiList.forEach(o => {
          if (!isRideDismissed(o.id)) {
            map.set(o.id, mergeOrderForDisplay(map.get(o.id), o));
          }
        });
        // Add Firebase orders
        fbList.forEach(o => {
          if (!isRideDismissed(o.id)) {
            map.set(o.id, mergeOrderForDisplay(map.get(o.id), o));
          }
        });
        return Array.from(map.values());
      });
    } catch (e) {
      console.log('[OrdersScreen] Error fetching pending orders:', e);
    }
  }, [vehicle?.serviceId?.name, availableOrders, enrichRawWithRedux]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingOrders();
    setRefreshing(false);
  }, [fetchPendingOrders]);

  // Fetch pending orders whenever the OrdersScreen is focused
  useEffect(() => {
    if (isFocused && isAuthenticated) {
      fetchPendingOrders();
    }
  }, [isFocused, isAuthenticated, fetchPendingOrders]);

  // Realtime Socket Listeners for new/cancelled ride requests
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewRide = (payload: any) => {
      if (!payload) return;
      const data = payload?.payload || payload;
      const rideId = data.rideId || data.id || data._id;
      if (!rideId || isRideDismissed(String(rideId))) return;

      const newOrder = normalizeOrder(data, vehicle?.serviceId?.name);
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleRideCancelled = (payload: any) => {
      const eventPayload = payload?.payload ?? payload;
      const cancelledId =
        eventPayload?.rideId ||
        eventPayload?.id ||
        eventPayload?._id ||
        (typeof payload === 'string' ? payload : undefined);
      if (cancelledId) {
        const idStr = String(cancelledId);
        markRideDismissed(idStr);
        dispatch(removeAvailableOrder(idStr));
        setOrders(prev => {
          const next = prev.filter(o => o.id !== idStr);
          if (
            next.length === 0 &&
            Platform.OS === 'android' &&
            NativeModules.PermissionModule
          ) {
            NativeModules.PermissionModule.stopSound();
            NativeModules.PermissionModule.hideFloatingRequest();
          }
          return next;
        });
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
  }, [vehicle?.serviceId?.name, dispatch]);

  // Handle Accept Order
  const handleAcceptOrder = useCallback(
    async (order: OrderItem) => {
      const mmkvPkg = mmkvService.getBoolean(STORAGE_KEYS.HAS_ACTIVE_PACKAGE);
      const mmkvCount = mmkvService.getNumber(
        STORAGE_KEYS.FIRST_TWO_RIDES_COUNT,
      );
      const mmkvLimit =
        mmkvService.getNumber(STORAGE_KEYS.FREE_RIDE_LIMIT) ?? 2;

      const packageIsActive = mmkvPkg === true || hasActivePackage === true;
      const packageIsDefinitelyInactive =
        mmkvPkg === false && hasActivePackage === false;
      const usedRideCount = Math.max(mmkvCount ?? 0, firstTwoRidesCount ?? 0);

      const walletBalance = driver?.wallet ?? 0;
      const hasWalletBalance = walletBalance > 0;

      const canAccept =
        packageIsActive ||
        (packageIsDefinitelyInactive &&
          (usedRideCount < mmkvLimit || hasWalletBalance)) ||
        !packageIsDefinitelyInactive;

      if (!canAccept) {
        Alert.alert(
          'Package or Wallet Balance Required',
          'Aapke free rides khatam ho gaye hain. Ride accept karne ke liye package khareedein ya wallet recharge karein.',
          [{ text: 'OK', style: 'default' }],
        );
        return;
      }

      if (Platform.OS === 'android') {
        const { PermissionModule } = NativeModules;
        if (PermissionModule) {
          PermissionModule.stopSound();
          PermissionModule.hideFloatingRequest();
        }
      }

      let finalPLat = order.pickupLat;
      let finalPLng = order.pickupLng;
      let finalDLat = order.dropLat;
      let finalDLng = order.dropLng;

      if ((!finalPLat || !finalPLng) && order.pickupAddress && order.pickupAddress !== 'Pickup Location') {
        try {
          const geocoded = await geocodeAddress(order.pickupAddress);
          if (geocoded && geocoded.latitude !== 0) {
            finalPLat = geocoded.latitude;
            finalPLng = geocoded.longitude;
          }
        } catch (e) {
          console.log('[OrdersScreen] Geocode pickup failed:', e);
        }
      }

      if ((!finalDLat || !finalDLng) && order.dropAddress && order.dropAddress !== 'Drop Location') {
        try {
          const geocoded = await geocodeAddress(order.dropAddress);
          if (geocoded && geocoded.latitude !== 0) {
            finalDLat = geocoded.latitude;
            finalDLng = geocoded.longitude;
          }
        } catch (e) {
          console.log('[OrdersScreen] Geocode drop failed:', e);
        }
      }

      const params = {
        id: order.id,
        raw: order.raw,
        pickupLocation: order.pickupLocation,
        dropLocation: order.dropLocation,
        pickup: {
          address: order.pickupAddress,
          coordinates: {
            latitude: finalPLat || 0,
            longitude: finalPLng || 0,
          },
        },
        drop: {
          address: order.dropAddress,
          coordinates: {
            latitude: finalDLat || 0,
            longitude: finalDLng || 0,
          },
        },
        customer: {
          name: order.customerName,
          phone: order.customerPhone || '+91 99999 55555',
          rating: order.customerRating,
        },
        fare: {
          base: order.fareBase,
          distance: order.fareBase,
          surge: order.fareExtra,
          total: order.fareTotal,
        },
        distance: parseFloat(order.dropDistance) || 2.0,
        duration: order.duration || 10,
        stops: order.stops,
      };

      markRideDismissed(order.id);
      dispatch(removeAvailableOrder(order.id));
      if (Platform.OS === 'android' && NativeModules.PermissionModule) {
        NativeModules.PermissionModule.stopSound();
        NativeModules.PermissionModule.hideFloatingRequest();
      }
      dispatch(
        setActiveRide({
          id: order.id,
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          customer: params.customer,
          pickup: params.pickup,
          drop: params.drop,
          pickupLocation: order.pickupLocation || {
            address: order.pickupAddress,
            coordinates: finalPLat && finalPLng ? [finalPLng, finalPLat] : undefined,
          },
          dropLocation: order.dropLocation || {
            address: order.dropAddress,
            coordinates: finalDLat && finalDLng ? [finalDLng, finalDLat] : undefined,
          },
          fare: { ...params.fare, currency: 'INR' },
          distance: params.distance,
          duration: order.duration || 10,
          raw: order.raw,
        } as any),
      );

      emitRideAccepted({ rideId: order.id });
      setOrders(prev => prev.filter(o => o.id !== order.id));

      navigation.navigate(ROUTES.ACCEPT_RIDE as any, {
        rideId: order.id,
        rideData: params,
      });

      const result = await dispatch(acceptRideThunk(order.id));
      if (acceptRideThunk.rejected.match(result)) {
        const errorMsg =
          (result.payload as string) ||
          'This ride is no longer available or was already accepted by another driver.';
        Alert.alert('Ride Not Available', errorMsg, [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]);
      }
    },
    [
      dispatch,
      driver?.wallet,
      firstTwoRidesCount,
      hasActivePackage,
      navigation,
    ],
  );

  // Handle Decline Order
  const handleDeclineOrder = useCallback(
    async (orderId: string) => {
      markRideDismissed(orderId);
      dispatch(removeAvailableOrder(orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));

      try {
        await rideApi.rejectRide(orderId, 'driver_ignored');
      } catch (e) {
        console.log('[OrdersScreen] Reject API error:', e);
      }
    },
    [dispatch],
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}
    >
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(ROUTES.MAIN_TABS as any);
              }
            }}
            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 items-center justify-center"
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={22} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
          <Text
            className="text-[24px] font-black tracking-tight"
            style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
          >
            {orders.length} Orders
          </Text>
        </View>

        {/* Sound Toggle Pill */}
        <TouchableOpacity
          onPress={toggleSound}
          activeOpacity={0.8}
          className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full"
          style={{
            backgroundColor: isSoundOn
              ? isDark
                ? '#1E293B'
                : '#94A3B8'
              : isDark
                ? '#334155'
                : '#CBD5E1',
          }}
        >
          <View className="w-6 h-6 rounded-full bg-white/90 items-center justify-center">
            <Icon
              name={isSoundOn ? 'volume-medium' : 'volume-mute'}
              size={15}
              color="#475569"
            />
          </View>
          <Text className="text-[13px] font-black text-white uppercase">
            {isSoundOn ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content: Left Sidebar Rail + Main Order Cards ───────────────── */}
      <View className="flex-1 flex-row">
        {/* Left Mini-Sidebar Rail */}
        {orders.length > 0 && (
          <View
            className="w-[72px] items-center pt-2 pb-6 border-r"
            style={{
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false} className="w-full">
              {orders.map((item, index) => {
                return (
                  <TouchableOpacity
                    key={`rail_${item.id}_${index}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedOrderIndex(index);
                      scrollRef.current?.scrollTo({
                        y: index * 360,
                        animated: true,
                      });
                    }}
                    className="items-center py-3.5 px-1 relative"
                  >
                    {/* Ring indicator */}
                    <View className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 items-center justify-center relative mb-1">
                      <View
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            index % 3 === 0
                              ? '#EF4444'
                              : index % 3 === 1
                                ? '#F43F5E'
                                : '#10B981',
                        }}
                      />
                    </View>
                    <Text
                      className="text-[15px] font-black"
                      style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                    >
                      ₹{item.fareBase}
                    </Text>
                    {item.fareExtra > 0 && (
                      <Text className="text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        +₹{item.fareExtra}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Main Orders Scroll Area */}
        <View className="flex-1 px-3">
          {/* "Go To" Pill button at top */}
          <View className="py-2">
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center self-start gap-1.5 px-3.5 py-1.5 rounded-full border"
              style={{
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              }}
            >
              <Icon name="location-sharp" size={15} color="#475569" />
              <Text
                className="text-[13px] font-bold"
                style={{ color: isDark ? '#E2E8F0' : '#334155' }}
              >
                Go To
              </Text>
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            /* Empty State with Pull to Refresh */
            <ScrollView
              contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#fe4c01']}
                  tintColor={isDark ? '#fe4c01' : '#fe4c01'}
                />
              }
            >
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}
              >
                <Icon name="bicycle" size={44} color="#94A3B8" />
              </View>
              <Text
                className="text-[18px] font-black text-center mb-1"
                style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
              >
                No Orders Available Right Now
              </Text>
              <Text
                className="text-[13px] text-center leading-5"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Stay online on your dashboard. When nearby passengers book a
                ride, all orders will appear here automatically. Pull down to refresh.
              </Text>
            </ScrollView>
          ) : (
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#fe4c01']}
                  tintColor={isDark ? '#fe4c01' : '#fe4c01'}
                />
              }
            >
              {orders.map(item => {
                const formattedVehicle =
                  item.vehicleType.charAt(0).toUpperCase() +
                  item.vehicleType.slice(1).toLowerCase();

                return (
                  <View
                    key={item.id}
                    className="rounded-3xl p-4 mb-4 border shadow-sm"
                    style={{
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#CBD5E1',
                    }}
                  >
                    {/* Top Row: Vehicle Badge */}
                    <View className="flex-row items-center self-start gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 mb-2">
                      {/* <Icon
                        name="bicycle"
                        size={15}
                        color={isDark ? '#E2E8F0' : '#334155'}
                      /> */}
                      <Text
                        className="text-[13px] font-bold"
                        style={{ color: isDark ? '#E2E8F0' : '#334155' }}
                      >
                        {formattedVehicle}
                      </Text>
                    </View>

                    {/* Fare Header */}
                    <View className="flex-row items-baseline gap-1.5 mb-4">
                      <Text
                        className="text-[32px] font-black tracking-tight"
                        style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                      >
                        ₹{item.fareBase}
                      </Text>
                      {item.fareExtra > 0 && (
                        <Text className="text-[26px] font-black text-emerald-500">
                          + ₹{item.fareExtra}
                        </Text>
                      )}
                      {/* <Text
                        className="text-[14px] font-medium ml-1"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      >
                        ({item.paymentMethod})
                      </Text> */}
                    </View>

                    {/* Timeline Route: Pickup & Drop */}
                    <View className="mb-4">
                      {/* Pickup */}
                      <View className="flex-row items-start">
                        <View className="w-5 items-center mr-2.5 mt-1">
                          <View className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white" />
                        </View>
                        <View className="flex-1">
                          {(!item.pickupLat || item.pickupLat === 0 || !driverCoordsForPickup) ? (
                            <View className="flex-row items-center my-0.5">
                              <ActivityIndicator
                                size="small"
                                color={isDark ? '#38BDF8' : '#4F46E5'}
                              />
                              <Text
                                className="text-[13px] font-semibold ml-1.5"
                                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                              >
                                Calculating...
                              </Text>
                            </View>
                          ) : (
                            <Text
                              className="text-[16px] font-black leading-tight"
                              style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                            >
                              {getLivePickupDistanceLabel(item, driverCoordsForPickup)}
                            </Text>
                          )}
                          <Text
                            className="text-[13px] font-normal leading-4 mt-0.5"
                            style={{ color: isDark ? '#94A3B8' : '#475569' }}
                            numberOfLines={2}
                          >
                            {item.pickupAddress}
                          </Text>
                        </View>
                      </View>

                      {/* Vertical Connector Line */}
                      <View className="w-5 items-center my-0.5">
                        <View
                          className="w-[1.5px] h-7"
                          style={{
                            backgroundColor: isDark ? '#475569' : '#CBD5E1',
                          }}
                        />
                      </View>

                      {/* Drop */}
                      <View className="flex-row items-start">
                        <View className="w-5 items-center mr-2.5 mt-1">
                          <Icon
                            name="caret-down-sharp"
                            size={14}
                            color={isDark ? '#FFFFFF' : '#0F172A'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-[16px] font-black leading-tight"
                            style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
                          >
                            {item.dropDistance}
                          </Text>
                          <Text
                            className="text-[13px] font-normal leading-4 mt-0.5"
                            style={{ color: isDark ? '#94A3B8' : '#475569' }}
                            numberOfLines={2}
                          >
                            {item.dropAddress}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Actions: Decline & Accept Buttons */}
                    <View className="flex-row items-center gap-3 pt-1">
                      {/* Circular Minus Decline Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleDeclineOrder(item.id)}
                        className="w-13 h-13 rounded-full border-2 items-center justify-center"
                        style={{
                          width: 52,
                          height: 52,
                          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                          borderColor: '#EF4444',
                        }}
                      >
                        <Icon
                          name="remove-outline"
                          size={24}
                          color={isDark ? '#E2E8F0' : '#0F172A'}
                        />
                      </TouchableOpacity>

                      {/* Accept Button */}
                      <Button
                        label="Accept"
                        onPress={() => handleAcceptOrder(item)}
                        height={52}
                        borderRadius={26}
                        style={{ flex: 1 }}
                        textStyle={{ fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ── Fixed Bottom Navigation Bar (Home & Orders) ──────────────────── */}
      <View
        className="flex-row items-center justify-around py-2.5 px-6 border-t"
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
        }}
      >
        {/* Home Tab Button */}
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(ROUTES.MAIN_TABS as any);
            }
          }}
          activeOpacity={0.7}
          className="items-center py-1 px-4"
        >
          <Icon name="home-outline" size={22} color="#64748B" />
          <Text className="text-[11px] font-bold text-slate-500 mt-0.5">
            Home
          </Text>
        </TouchableOpacity>

        {/* Orders Active Pill Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          className="flex-row items-center gap-2 bg-black dark:bg-slate-800 px-5 py-2.5 rounded-full"
        >
          <Icon name="arrow-down-outline" size={16} color="#FFFFFF" />
          <Text className="text-[14px] font-black text-white">Orders</Text>
          {orders.length > 0 && (
            <View className="bg-yellow-400 px-2 py-0.5 rounded-full ml-0.5">
              <Text className="text-[11px] font-black text-slate-900">
                {orders.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OrdersScreen;