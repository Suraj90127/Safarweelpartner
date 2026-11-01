import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image, Modal, NativeModules, Platform, BackHandler, ActivityIndicator, Linking } from 'react-native';
import Toast, { ToastType } from '../../components/Toast';
import CustomAlert from '../../components/CustomAlert';
import { Button } from '../../components/Button';
import messaging from '@react-native-firebase/messaging';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ThemedMapView } from '../../components/ThemedMapView';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  arrivedAtPickupThunk,
  updateActiveRide,
  getActiveDriverRideThunk,
  cancelRideThunk,
  clearRide,
} from '../../redux/slices/rideSlice';
import { ROUTES } from '../../constants/routes';
import { useThemePalette } from '../../utils/theme';
import Images from '../../utils/images';
import type { AppNavProp } from '../../navigation/types';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { markRideDismissed } from '../../services/rideDedup';
import logger from '../../utils/logger';

import { fetchGoogleRoute, getDistanceInMeters, splitRouteAtLocation, geocodeAddress, getBearingFromPolyline } from '../../utils/mapUtils';
import { LatLng } from '../../types/location.types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parsePickupLatLng, parseDropLatLng, parseStops } from '../../utils/helpers';

const CANCEL_REASONS = [
  { id: 'no_show', label: 'Passenger did not show up' },
  { id: 'requested', label: 'Passenger asked to cancel' },
  { id: 'breakdown', label: 'Vehicle breakdown' },
  { id: 'waiting', label: 'Waited too long' },
  { id: 'other', label: 'Other reason' },
];

type CustomAlertVariant = 'success' | 'error' | 'info';

type CustomAlertState = {
  visible: boolean;
  title: string;
  message: string;
  variant: CustomAlertVariant;
  confirmText: string;
  onConfirm?: () => void;
};

const defaultCustomAlertState: CustomAlertState = {
  visible: false,
  title: '',
  message: '',
  variant: 'info',
  confirmText: 'OK',
};

const ActiveRideScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.ACTIVE_RIDE>>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const rawRide = useAppSelector(state => state.ride.activeRide) as any;
  const ride = useMemo(() => {
    if (!rawRide) return null;
    return rawRide?.ride ?? rawRide?.data?.ride ?? rawRide?.data ?? rawRide;
  }, [rawRide]);

  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.PermissionModule) {
      NativeModules.PermissionModule.stopSound();
      NativeModules.PermissionModule.hideFloatingRequest();
    }
    setCustomAlert(defaultCustomAlertState);
    dispatch(getActiveDriverRideThunk());
  }, [dispatch]);

  // ── Hardware Back Handler (Return to previous/Home cleanly) ──────────────────
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

  const currentLocation = useAppSelector(state => state.location.currentLocation);
  const driverSpeed = useAppSelector(state => state.location.speed);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const vehicleMapIcon =
    vehicle?.vehicleMapIcon ||
    vehicle?.serviceId?.vehicleMapIcon ||
    vehicle?.vehicleImage ||
    vehicle?.serviceId?.vehicleImage;

  const [driverTracksViewChanges, setDriverTracksViewChanges] = useState(true);

  useEffect(() => {
    setDriverTracksViewChanges(true);
  }, [vehicleMapIcon]);

  const handleDriverImageLoaded = useCallback(() => {
    setDriverTracksViewChanges(true);
    const timer = setTimeout(() => {
      setDriverTracksViewChanges(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeDistance, setRouteDistance] = useState<string | undefined>(undefined);
  const [routeDuration, setRouteDuration] = useState<string | undefined>(undefined);
  const mapRef = useRef<MapView>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<CustomAlertState>(defaultCustomAlertState);
  const [isEndingRide, setIsEndingRide] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: ToastType }>({ visible: false, title: '', message: '', type: 'info' });
  const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), []);
  const showToast = useCallback((title: string, message: string = '', type: ToastType = 'info') => {
    setToast({ visible: true, title, message, type });
  }, []);

  const showCustomAlert = useCallback((config: Omit<CustomAlertState, 'visible'>) => {
    setCustomAlert({
      ...config,
      visible: true,
      confirmText: config.confirmText || 'OK',
      variant: config.variant || 'info',
    });
  }, []);

  const closeCustomAlert = useCallback(() => {
    setCustomAlert(defaultCustomAlertState);
  }, []);

  const handleCustomAlertConfirm = useCallback(() => {
    const onConfirm = customAlert.onConfirm;
    closeCustomAlert();
    onConfirm?.();
  }, [closeCustomAlert, customAlert.onConfirm]);

  const completedRideIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        const data = remoteMessage.data;
        const msgType = typeof data?.type === 'string' ? data.type.toLowerCase() : '';
        const msgStatus = typeof data?.status === 'string' ? data.status.toLowerCase() : '';
        if (msgType !== 'ride_completed' && msgStatus !== 'ride_completed') {
          return;
        }

        const activeRideId = String(ride?._id || ride?.id || '');
        const notifiedRideId = String(data.rideId || data.id || '');
        if (!activeRideId) {
          logger.info(
            'ActiveRideScreen',
            'Ignoring ride_completed FCM because there is no active ride on screen.',
          );
          return;
        }
        if (notifiedRideId && notifiedRideId !== activeRideId) {
          logger.info(
            'ActiveRideScreen',
            `Ignoring ride_completed FCM for ride ${notifiedRideId}; active ride is ${activeRideId}.`,
          );
          return;
        }
        if (completedRideIdRef.current === activeRideId) return;

        completedRideIdRef.current = activeRideId;
        logger.info(
          'ActiveRideScreen',
          `Received ride_completed FCM for ride ${activeRideId}.`,
        );
        showCustomAlert({
          title: 'Ride Completed',
          message: 'Your ride is completed.',
          variant: 'success',
          confirmText: 'OK',
          onConfirm: () => {
            dispatch(clearRide());
            navigation.navigate(ROUTES.MAIN_TABS as any, {
              screen: ROUTES.HOME_TAB,
            });
          },
        });
      });

      return unsubscribe;
    }, [dispatch, navigation, ride, showCustomAlert]),
  );

  const [geocodedPickup, setGeocodedPickup] = useState<LatLng | null>(null);
  const [geocodedDrop, setGeocodedDrop] = useState<LatLng | null>(null);
  const [fallbackLocation, setFallbackLocation] = useState<LatLng | null>(() =>
    currentLocation?.latitude && currentLocation.longitude ? currentLocation : null,
  );

  useEffect(() => {
    if (
      !fallbackLocation &&
      currentLocation?.latitude &&
      currentLocation.longitude
    ) {
      setFallbackLocation(currentLocation);
    }
  }, [currentLocation, fallbackLocation]);

  const directPickup = useMemo(() => {
    return parsePickupLatLng(ride, 0, 0);
  }, [ride]);

  const directDrop = useMemo(() => {
    return parseDropLatLng(ride, 0, 0);
  }, [ride]);

  const pickupAddress =
    ride?.pickupLocation?.address ||
    ride?.pickup?.address ||
    ride?.pickupAddress ||
    ride?.origin?.address;

  const dropAddress =
    ride?.dropLocation?.address ||
    ride?.drop?.address ||
    ride?.dropAddress ||
    ride?.destination?.address;

  // Auto geocode pickup if direct coordinates are missing (0,0)
  useEffect(() => {
    if (directPickup.latitude !== 0 && directPickup.longitude !== 0) {
      return;
    }
    if (pickupAddress && typeof pickupAddress === 'string' && pickupAddress.trim().length > 3) {
      let active = true;
      geocodeAddress(pickupAddress.trim()).then(coords => {
        if (active && coords && (coords.latitude !== 0 || coords.longitude !== 0)) {
          setGeocodedPickup(coords);
        }
      });
      return () => { active = false; };
    }
  }, [directPickup.latitude, directPickup.longitude, pickupAddress]);

  // Auto geocode drop if direct coordinates are missing (0,0)
  useEffect(() => {
    if (directDrop.latitude !== 0 && directDrop.longitude !== 0) {
      return;
    }
    if (dropAddress && typeof dropAddress === 'string' && dropAddress.trim().length > 3) {
      let active = true;
      geocodeAddress(dropAddress.trim()).then(coords => {
        if (active && coords && (coords.latitude !== 0 || coords.longitude !== 0)) {
          setGeocodedDrop(coords);
        }
      });
      return () => { active = false; };
    }
  }, [directDrop.latitude, directDrop.longitude, dropAddress]);

  const pickupLatLng = useMemo(() => {
    if (directPickup.latitude !== 0 && directPickup.longitude !== 0) {
      return directPickup;
    }
    if (geocodedPickup && (geocodedPickup.latitude !== 0 || geocodedPickup.longitude !== 0)) {
      return geocodedPickup;
    }
    return {
      latitude: fallbackLocation?.latitude ?? 12.971899,
      longitude: fallbackLocation?.longitude ?? 77.641151,
    };
  }, [directPickup, geocodedPickup, fallbackLocation]);

  const dropLatLng = useMemo(() => {
    if (directDrop.latitude !== 0 && directDrop.longitude !== 0) {
      return directDrop;
    }
    if (geocodedDrop && (geocodedDrop.latitude !== 0 || geocodedDrop.longitude !== 0)) {
      return geocodedDrop;
    }
    return {
      latitude: fallbackLocation
        ? fallbackLocation.latitude - 0.03
        : 12.934988,
      longitude: fallbackLocation
        ? fallbackLocation.longitude - 0.02
        : 77.618388,
    };
  }, [directDrop, geocodedDrop, fallbackLocation]);

  const isHeadingToPickup = ride?.status === 'accepted';
  const isArrivedAtPickup = ride?.status === 'arrived' || ride?.status === 'driver_arrived';
  const targetLatLng = isHeadingToPickup ? pickupLatLng : dropLatLng;

  const lastLocationString = mmkvService.getString(STORAGE_KEYS.LAST_KNOWN_LOCATION);
  let savedLocation: { latitude?: number; longitude?: number } | null = null;
  if (lastLocationString) {
    try {
      savedLocation = JSON.parse(lastLocationString);
    } catch (e) {
      console.log('[ActiveRideScreen] Error parsing saved location:', e);
    }
  }

  const initialDriverLocation = useRef<LatLng>({
    latitude: currentLocation?.latitude || savedLocation?.latitude || targetLatLng.latitude,
    longitude: currentLocation?.longitude || savedLocation?.longitude || targetLatLng.longitude,
  });
  const [driverLatLng, setDriverLatLng] = useState(initialDriverLocation.current);
  const latestDriverLocationRef = useRef(driverLatLng);
  latestDriverLocationRef.current = driverLatLng;

  useEffect(() => {
    if (!currentLocation || currentLocation.latitude === 0 || currentLocation.longitude === 0) {
      return;
    }

    const movementFromLastFix = getDistanceInMeters(
      driverLatLng.latitude,
      driverLatLng.longitude,
      currentLocation.latitude,
      currentLocation.longitude,
    );

    // Ignore stationary GPS drift; accept clear vehicle movement or a meaningful
    // displacement when the device does not report speed reliably.
    if (driverSpeed >= 1.5 || movementFromLastFix >= 25) {
      setDriverLatLng(currentLocation);
    }
  }, [currentLocation, driverSpeed, driverLatLng]);

  const distanceToDropInMeters = useMemo(() => {
    if (!driverLatLng || !dropLatLng) return Infinity;
    return getDistanceInMeters(
      driverLatLng.latitude,
      driverLatLng.longitude,
      dropLatLng.latitude,
      dropLatLng.longitude
    );
  }, [driverLatLng, dropLatLng]);

  const fitToRoute = useCallback(() => {
    if (!mapRef.current || !driverLatLng || !targetLatLng) return;
    if (targetLatLng.latitude === 0 && targetLatLng.longitude === 0) return;
    mapRef.current.fitToCoordinates(
      [
        driverLatLng,
        targetLatLng,
        ...(routeCoords.length > 0 ? routeCoords : []),
      ],
      {
        edgePadding: { top: 120, right: 60, bottom: 260, left: 60 },
        animated: true,
      }
    );
  }, [driverLatLng, targetLatLng, routeCoords]);

  const initialFitDoneRef = useRef(false);
  useEffect(() => {
    if (targetLatLng.latitude !== 0 && targetLatLng.longitude !== 0 && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true;
      const t = setTimeout(() => {
        fitToRoute();
      }, 700);
      return () => clearTimeout(t);
    }
  }, [targetLatLng.latitude, targetLatLng.longitude, fitToRoute]);

  const parsedStops = useMemo(() => {
    return parseStops(ride?.stops || ride?.stopPoints || ride);
  }, [ride]);

  const stopLatLngs = useMemo(() => {
    return parsedStops
      .map((stop: any) => ({
        latitude: stop.latitude,
        longitude: stop.longitude,
      }))
      .filter(
        (loc: any) =>
          !isNaN(loc.latitude) &&
          loc.latitude !== 0 &&
          !isNaN(loc.longitude) &&
          loc.longitude !== 0,
      );
  }, [parsedStops]);

  const latestRouteInputsRef = useRef({
    driverLatLng,
    targetLatLng,
    isHeadingToPickup,
    stopLatLngs,
  });
  latestRouteInputsRef.current = {
    driverLatLng,
    targetLatLng,
    isHeadingToPickup,
    stopLatLngs,
  };

  const lastProgressIndexRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);
  const routeRequestIdRef = useRef(0);
  // Smoothed route bearing ref — persists across renders to avoid abrupt jumps
  const lastRouteBearingRef = useRef<number>(0);

  // Reset progress when target or ride status changes
  useEffect(() => {
    lastProgressIndexRef.current = 0;
  }, [ride?.status, targetLatLng.latitude, targetLatLng.longitude]);

  // Fetch route when ride status or target changes
  useEffect(() => {
    if (!ride?.status) return;

    let active = true;
    const requestId = ++routeRequestIdRef.current;
    const routeOrigin = latestDriverLocationRef.current;
    const waypoints = isHeadingToPickup ? [] : stopLatLngs;

    fetchGoogleRoute(routeOrigin, targetLatLng, waypoints).then(res => {
      if (active && requestId === routeRequestIdRef.current && res.coordinates.length > 0) {
        setRouteCoords(res.coordinates);
        setRouteDistance(res.distance);
        setRouteDuration(res.timeWithTraffic || res.normalTime);
        lastProgressIndexRef.current = 0;
      }
    });

    return () => { active = false; };
  }, [
    ride?.status,
    targetLatLng,
    targetLatLng.latitude,
    targetLatLng.longitude,
    isArrivedAtPickup,
    isHeadingToPickup,
    stopLatLngs,
  ]);

  // Re-fetch route whenever screen regains focus (e.g. returning from DriverMapScreen)
  useFocusEffect(
    useCallback(() => {
      lastProgressIndexRef.current = 0;
      let active = true;
      const {
        driverLatLng: routeOrigin,
        targetLatLng: routeTarget,
        isHeadingToPickup: headingToPickup,
        stopLatLngs: routeStops,
      } = latestRouteInputsRef.current;

      if (routeTarget && routeTarget.latitude !== 0 && routeTarget.longitude !== 0) {
        const requestId = ++routeRequestIdRef.current;
        const waypoints = headingToPickup ? [] : routeStops;

        fetchGoogleRoute(routeOrigin, routeTarget, waypoints).then(res => {
          if (active && requestId === routeRequestIdRef.current && res.coordinates.length > 0) {
            setRouteCoords(res.coordinates);
            setRouteDistance(res.distance);
            setRouteDuration(res.timeWithTraffic || res.normalTime);
            lastProgressIndexRef.current = 0;
          }
        });
      }

      return () => {
        active = false;
      };
    }, [])
  );

  // Dynamically trim route ahead of driver: as driver moves, traversed path is removed
  // and only the forward route to destination is shown
  const { activePolylineCoords, distanceToRoute } = useMemo(() => {
    if (routeCoords.length === 0 || !driverLatLng) {
      return { activePolylineCoords: [], distanceToRoute: 0 };
    }
    const res = splitRouteAtLocation(routeCoords, driverLatLng, lastProgressIndexRef.current);
    lastProgressIndexRef.current = res.closestSegmentIndex;
    return {
      activePolylineCoords: res.remaining.length >= 2 ? res.remaining : routeCoords,
      distanceToRoute: res.distanceToRoute,
    };
  }, [routeCoords, driverLatLng]);

  // ── Road-aligned heading from polyline (replaces noisy GPS compass) ──────
  // Finds the road segment closest to the driver and returns its bearing.
  // A 70/30 low-pass keeps the value stable over small GPS wobbles.
  const routeHeading = useMemo(() => {
    const raw = getBearingFromPolyline(activePolylineCoords, driverLatLng);
    if (raw === null) return lastRouteBearingRef.current;
    // Smooth across the 0/360 boundary to prevent spinning the long way round
    const prev = lastRouteBearingRef.current;
    const delta = ((raw - prev + 540) % 360) - 180;
    const smoothed = (prev + delta * 0.3 + 360) % 360;
    lastRouteBearingRef.current = smoothed;
    return smoothed;
  }, [activePolylineCoords, driverLatLng]);

  useEffect(() => {
    if (!mapRef.current || !initialFitDoneRef.current) return;

    mapRef.current.animateCamera({
      center: {
        latitude: driverLatLng.latitude,
        longitude: driverLatLng.longitude,
      },
      heading: routeHeading,
      zoom: 18,
      pitch: 45,
    }, { duration: 850 });
  }, [driverLatLng, routeHeading]);

  // Off-route automatic reroute (if driver deviates > 80m from route)
  useEffect(() => {
    if (routeCoords.length === 0 || !driverLatLng) return;
    const now = Date.now();
    if (distanceToRoute > 80 && now - lastRerouteTimeRef.current > 15000) {
      lastRerouteTimeRef.current = now;
      const requestId = ++routeRequestIdRef.current;
      const waypoints = isHeadingToPickup ? [] : stopLatLngs;
      fetchGoogleRoute(driverLatLng, targetLatLng, waypoints).then(res => {
        if (requestId === routeRequestIdRef.current && res.coordinates.length > 0) {
          setRouteCoords(res.coordinates);
          setRouteDistance(res.distance);
          setRouteDuration(res.timeWithTraffic || res.normalTime);
          lastProgressIndexRef.current = 0;
        }
      });
    }
  }, [distanceToRoute, driverLatLng, isHeadingToPickup, targetLatLng, stopLatLngs, routeCoords.length]);

  // ─── Waiting Timer (3 mins Free Waiting -> Paid Waiting) ───────────────────
  const [waitingElapsedSeconds, setWaitingElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (ride?.status !== 'arrived') {
      setWaitingElapsedSeconds(0);
      return;
    }

    const currentRideId = ride._id || ride.id;
    const storageKey = `${STORAGE_KEYS.ARRIVED_AT_PREFIX}${currentRideId}`;
    let arrivedAtMs = ride.arrivedAt ? new Date(ride.arrivedAt).getTime() : 0;

    if (!arrivedAtMs || isNaN(arrivedAtMs)) {
      const storedMs = mmkvService.getNumber(storageKey as any);
      if (storedMs && storedMs > 0) {
        arrivedAtMs = storedMs;
      } else {
        arrivedAtMs = Date.now();
        mmkvService.setNumber(storageKey as any, arrivedAtMs);
      }
    } else {
      mmkvService.setNumber(storageKey as any, arrivedAtMs);
    }

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - arrivedAtMs) / 1000));
      setWaitingElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [ride?.status, ride?.arrivedAt, ride?._id, ride?.id]);

  const FREE_WAITING_LIMIT_SECONDS = 180; // 3 minutes free waiting time
  const isFreeWaiting = waitingElapsedSeconds < FREE_WAITING_LIMIT_SECONDS;

  const formattedWaitingTime = useMemo(() => {
    if (isFreeWaiting) {
      const remaining = FREE_WAITING_LIMIT_SECONDS - waitingElapsedSeconds;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      const paidSecs = waitingElapsedSeconds - FREE_WAITING_LIMIT_SECONDS;
      const mins = Math.floor(paidSecs / 60);
      const secs = paidSecs % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }, [isFreeWaiting, waitingElapsedSeconds]);

  const handleArrivedAtPickup = useCallback(async () => {
    if (!ride) return;
    const currentRideId = ride._id || ride.id;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    mmkvService.setNumber(`${STORAGE_KEYS.ARRIVED_AT_PREFIX}${currentRideId}` as any, nowMs);

    await dispatch(arrivedAtPickupThunk(currentRideId));
    dispatch(updateActiveRide({ ...ride, status: 'arrived', arrivedAt: nowIso }));
    showToast('Arrived at pickup', 'You have arrived at the customer\'s pickup location', 'success');
  }, [dispatch, ride, showToast]);

  const handleCompleteRide = async () => {
    if (!ride || isEndingRide) return;
    setIsEndingRide(true);
    try {
      const res = await dispatch(getActiveDriverRideThunk()).unwrap();
      const updatedRide = (res?.ride ?? res?.data?.ride ?? res?.data ?? res) || ride;
      const rawFare =
        updatedRide?.totalFare ??
        updatedRide?.payment?.totalFare ??
        updatedRide?.fare?.total ??
        updatedRide?.payment?.fare ??
        ride?.payment?.totalFare ??
        ride?.payment?.fare ??
        ride?.fare?.total ??
        0;

      const totalFare = Number(rawFare) || 0;

      navigation.navigate(ROUTES.END_RIDE, {
        rideId: updatedRide?._id || updatedRide?.id || ride._id || ride.id,
        fare: totalFare,
      });
    } catch (error) {
      console.warn('Failed to fetch active driver ride before ending:', error);
      const fallbackFare = Number(ride.payment?.totalFare || ride.payment?.fare || ride.fare?.total || 0);
      navigation.navigate(ROUTES.END_RIDE, {
        rideId: ride._id || ride.id,
        fare: fallbackFare,
      });
    } finally {
      setIsEndingRide(false);
    }
  };

  const handleStartNavigation = () => {
    if (!ride) return;
    if (ride.status === 'in_progress' || ride.status === 'ongoing') {
      navigation.navigate(ROUTES.DRIVER_MAP as any, {
        drop: {
          latitude: dropLatLng.latitude,
          longitude: dropLatLng.longitude,
          address: ride.dropLocation?.address || ride.drop?.address,
        },
        stops: parsedStops,
      });
    } else {
      navigation.navigate(ROUTES.DRIVER_MAP as any, {
        pickup: {
          latitude: pickupLatLng.latitude,
          longitude: pickupLatLng.longitude,
          address: ride.pickupLocation?.address || ride.pickup?.address,
        },
        stops: parsedStops,
      });
    }
  };

  const handleCancelRide = () => {
    setSelectedReason(null);
    setShowCancelModal(true);
  };

  const handleConfirmCancelWithReason = async () => {
    if (!selectedReason) {
      showCustomAlert({
        title: 'Select Reason',
        message: 'Please select a reason for cancellation.',
        variant: 'info',
        confirmText: 'OK',
      });
      return;
    }
    if (!ride) return;
    const currentRideId = ride._id || ride.id;
    const reasonLabel = CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;

    setShowCancelModal(false);

    try {
      if (currentRideId.startsWith('MOCK')) {
        markRideDismissed(currentRideId);
        setCustomAlert(defaultCustomAlertState);
        dispatch(clearRide());
        navigation.navigate(ROUTES.MAIN_TABS as any);
      } else {
        markRideDismissed(currentRideId);
        const resultAction = await dispatch(cancelRideThunk({ rideId: currentRideId, cancelReason: reasonLabel }));
        if (cancelRideThunk.fulfilled.match(resultAction)) {
          setCustomAlert(defaultCustomAlertState);
          dispatch(clearRide());
          navigation.navigate(ROUTES.MAIN_TABS as any);
        } else {
          showCustomAlert({
            title: 'Error',
            message: (resultAction.payload as string) || 'Failed to cancel ride',
            variant: 'error',
            confirmText: 'OK',
          });
        }
      }
    } catch (err) {
      console.error('[ActiveRideScreen] Error cancelling ride:', err);
      showCustomAlert({
        title: 'Error',
        message: 'An unexpected error occurred',
        variant: 'error',
        confirmText: 'OK',
      });
    }
  };
  const handleCallRider = () => {
    const phone = ride?.userId?.phone || ride?.customer?.phone;

    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (!ride) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

        {/* Header Bar */}
        <View
          style={{ backgroundColor: palette.background, borderColor: palette.border }}
          className="pt-1 px-4 pb-3 flex-row justify-between items-center border-b"
        >
          <TouchableOpacity className="p-1" onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(ROUTES.MAIN_TABS as any);
            }
          }}>
            <Icon name="arrow-back" size={26} color={palette.text} />
          </TouchableOpacity>
          <Text style={{ color: palette.text }} className="text-lg font-extrabold">Ongoing Ride</Text>
          <TouchableOpacity className="p-1" onPress={() => navigation.navigate(ROUTES.SUPPORT as any)}>
            <Icon name="help-circle-outline" size={26} color={palette.text} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 justify-center items-center px-8 pb-16">
          <Image
            source={isDark ? Images.noVehicleDark : Images.noVehicle}
            className="w-64 h-56 mb-6"
            resizeMode="contain"
          />
          <Text style={{ color: palette.text }} className="text-xl font-extrabold mb-2.5 text-center">No Active Ride Found.</Text>
          <Text style={{ color: palette.mutedText }} className="text-sm text-center leading-6 mb-8">
            You do not have any ongoing rides at the moment. Please go back to the dashboard to accept new ride requests.
          </Text>

          <Button
            label="Go to Dashboard"
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(ROUTES.MAIN_TABS as any);
              }
            }}
            height={48}
            borderRadius={24}
            style={{ width: '80%' }}
            textStyle={{ fontSize: 15, fontWeight: '800' }}
          />
        </View>

        <CustomAlert
          visible={customAlert.visible}
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.variant === 'info' ? 'info' : customAlert.variant === 'success' ? 'success' : 'error'}
          buttons={[
            {
              text: customAlert.confirmText,
              onPress: handleCustomAlertConfirm,
            },
          ]}
          onDismiss={closeCustomAlert}
        />
        <Toast
          visible={toast.visible}
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
        />
      </View>
    );
  }

  const midLatitude = (driverLatLng.latitude + targetLatLng.latitude) / 2;
  const midLongitude = (driverLatLng.longitude + targetLatLng.longitude) / 2;
  const latDelta = Math.abs(driverLatLng.latitude - targetLatLng.latitude) * 1.5 || 0.02;
  const lngDelta = Math.abs(driverLatLng.longitude - targetLatLng.longitude) * 1.5 || 0.02;

  const statusLabel = () => {
    switch (ride.status) {
      case 'accepted':
        return 'Heading to Pickup';
      case 'arrived':
        return 'Arrived at Pickup';
      case 'ongoing':
      case 'in_progress':
        return 'Heading to Drop';
      default:
        return 'Ongoing Ride';
    }
  };

  const getActionButton = () => {
    switch (ride.status) {
      case 'accepted':
        return (
          <View className="w-full">
            <Button
              label="Arrived at Pickup"
              onPress={handleArrivedAtPickup}
              height={52}
              borderRadius={16}
            />
            <Button
              variant="outline"
              label="Cancel Ride"
              onPress={handleCancelRide}
              height={52}
              borderRadius={16}
              style={{ marginTop: 12, borderColor: 'rgba(239, 68, 68, 0.5)' }}
              textStyle={{ color: '#EF4444', fontWeight: '800' }}
            />
          </View>
        );

      case 'arrived':
        return (
          <View className="w-full">
            <Button
              label="Start Ride"
              onPress={() => navigation.navigate(ROUTES.OTP_RIDE, { rideId: ride._id || ride.id })}
              height={52}
              borderRadius={16}
            />
            <Button
              variant="outline"
              label="Cancel Ride"
              onPress={handleCancelRide}
              height={52}
              borderRadius={16}
              style={{ marginTop: 12, borderColor: 'rgba(239, 68, 68, 0.5)' }}
              textStyle={{ color: '#EF4444', fontWeight: '800' }}
            />
          </View>
        );

      case 'ongoing':
      case 'in_progress': {
        const distStr =
          distanceToDropInMeters < 1000
            ? `${Math.round(distanceToDropInMeters)}m`
            : `${(distanceToDropInMeters / 1000).toFixed(1)}km`;

        return (
          <Button
            label="End Ride"
            onPress={handleCompleteRide}
            isLoading={isEndingRide}
            disabled={isEndingRide}
            height={52}
            borderRadius={16}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

        {/* Header Bar */}
        <View
          style={{ backgroundColor: palette.background, borderColor: palette.border }}
          className="px-4 pb-3 flex-row justify-between items-center border-b"
        >
          <TouchableOpacity className="p-1" onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(ROUTES.MAIN_TABS as any);
            }
          }}>
            <Icon name="arrow-back" size={26} color={palette.text} />
          </TouchableOpacity>
          <Text style={{ color: palette.text }} className="text-lg font-extrabold">{statusLabel()}</Text>
          <TouchableOpacity className="p-1" onPress={() => navigation.navigate(ROUTES.RIDE_GUIDE as any)}>
            <Icon name="help-circle-outline" size={26} color={palette.text} />
          </TouchableOpacity>
        </View>

        {/* Map Section */}
        <View className="flex-1 relative">
          <ThemedMapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            initialRegion={{
              latitude: midLatitude,
              longitude: midLongitude,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta,
            }}
          >
            {/* Driver Marker */}
            <Marker
              coordinate={driverLatLng}
              title="Your Location"
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              // rotation={
              //   // Use road-aligned bearing from the polyline, not the GPS compass
              //   routeHeading
              // }
              rotation={0}
              tracksViewChanges={driverTracksViewChanges}
            >
              <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                {vehicleMapIcon ? (
                  <Image
                    source={{ uri: vehicleMapIcon }}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                    onLoad={handleDriverImageLoaded}
                    onError={() => setDriverTracksViewChanges(false)}
                  />
                ) : (
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#FACC15',
                      borderWidth: 2,
                      borderColor: '#0F172A',
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 4,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3,
                    }}
                  >
                    <Icon name="car-sport" size={20} color="#0F172A" />
                  </View>
                )}
              </View>
            </Marker>

            {/* Pickup Location Marker */}
            {pickupLatLng && pickupLatLng.latitude !== 0 && pickupLatLng.longitude !== 0 && (
              <Marker
                coordinate={pickupLatLng}
                title="Pickup Location"
                description={ride?.pickupLocation?.address || ride?.pickup?.address || 'Pickup Point'}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="items-center">
                  <View className="bg-emerald-600 px-2 py-0.5 rounded-full border border-white flex-row items-center gap-1 shadow-md mb-0.5">
                    <Text className="text-[10px] font-black text-white">PICKUP</Text>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white items-center justify-center shadow-lg">
                    <Icon name="location" size={16} color="white" />
                  </View>
                </View>
              </Marker>
            )}

            {/* Drop Location Marker */}
            {dropLatLng && dropLatLng.latitude !== 0 && dropLatLng.longitude !== 0 && (
              <Marker
                coordinate={dropLatLng}
                title="Drop Location"
                description={ride?.dropLocation?.address || ride?.drop?.address || 'Drop Point'}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="items-center">
                  <View className="bg-rose-600 px-2 py-0.5 rounded-full border border-white flex-row items-center gap-1 shadow-md mb-0.5">
                    <Text className="text-[10px] font-black text-white">DROP</Text>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white items-center justify-center shadow-lg">
                    <Icon name="flag" size={16} color="white" />
                  </View>
                </View>
              </Marker>
            )}

            {/* Stops Markers */}
            {parsedStops.length > 0 &&
              parsedStops.map((stop: any, idx: number) => {
                if (!stop.latitude || !stop.longitude) return null;
                return (
                  <Marker
                    key={`active-stop-${idx}-${stop.latitude}-${stop.longitude}`}
                    coordinate={{
                      latitude: stop.latitude,
                      longitude: stop.longitude,
                    }}
                    title={stop.title || `Stop ${idx + 1}`}
                    description={stop.address}
                  >
                    <View className="items-center">
                      <View className="bg-amber-500 px-2 py-1 rounded-full border border-white flex-row items-center gap-1 shadow-md">
                        <View className="w-3.5 h-3.5 rounded-full bg-white justify-center items-center">
                          <Text className="text-[9px] font-black text-amber-600">
                            {idx + 1}
                          </Text>
                        </View>
                        <Text
                          className="text-[10px] font-bold text-white max-w-[120px]"
                          numberOfLines={1}
                        >
                          {stop.title || `Stop ${idx + 1}`}
                        </Text>
                      </View>
                    </View>
                  </Marker>
                );
              })}

            {/* Active route ahead to destination (previous traversed route is removed, stable key prevents ghost overlays) */}
            {activePolylineCoords.length >= 2 && (
              <Polyline
                key="active-route-polyline"
                coordinates={activePolylineCoords}
                strokeColor={palette.primary}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </ThemedMapView>

          {/* Floating View Route button */}
          <TouchableOpacity
            style={{ backgroundColor: palette.surface }}
            className="absolute top-4 left-4 flex-row rounded-full py-2.5 px-3.5 items-center shadow-lg"
            onPress={fitToRoute}
          >
            <Icon name="scan-outline" size={18} color={palette.text} />
            <Text style={{ color: palette.text }} className="text-xs font-bold ml-1.5">View Route</Text>
          </TouchableOpacity>

          {/* Floating Start Navigation button */}
          <TouchableOpacity
            style={{ backgroundColor: palette.surface }}
            className="absolute top-4 right-4 flex-row rounded-full py-2.5 px-4 items-center shadow-lg"
            onPress={handleStartNavigation}
          >
            <Icon name="navigate" size={18} color={palette.text} />
            <Text style={{ color: palette.text }} className="text-xs font-bold ml-1.5">Navigate</Text>
          </TouchableOpacity>
        </View>

        {/* Details Bottom Sheet */}
        <View
          style={{ backgroundColor: palette.surface, borderColor: palette.border }}
          className="rounded-t-[24px] p-5 shadow-2xl border-t"
        >
          {/* ETA Header */}
          <View
            style={{ borderColor: palette.border }}
            className="flex-row justify-between items-center border-b pb-3.5 mb-3.5"
          >
            <View className="flex-col">
              <Text style={{ color: palette.mutedText }} className="text-[10px] font-bold uppercase tracking-widest">{isArrivedAtPickup ? 'Status' : isHeadingToPickup ? 'Pickup ETA' : 'Drop ETA'}</Text>
              <Text style={{ color: palette.text }} className="text-xl font-black mt-0.5">
                {isArrivedAtPickup
                  ? 'At Pickup Point'
                  : `${routeDuration || (isHeadingToPickup ? '5 mins' : '12 mins')}${routeDistance ? ` (${routeDistance})` : ''}`}
              </Text>
            </View>
            <View className="bg-yellow-500/10 rounded-lg px-3 py-1.5">
              <Text className="text-xs font-extrabold text-yellow-600">{statusLabel()}</Text>
            </View>
          </View>

          {/* Waiting Timer Card (When Arrived at Pickup) */}
          {ride.status === 'arrived' && (
            <View
              style={{
                backgroundColor: isFreeWaiting ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                borderColor: isFreeWaiting ? '#10B981' : '#F59E0B',
              }}
              className="flex-row items-center justify-between rounded-2xl p-3.5 border mb-3.5 shadow-sm"
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  style={{ backgroundColor: isFreeWaiting ? '#10B981' : '#F59E0B' }}
                  className="w-10 h-10 rounded-full justify-center items-center mr-3 shadow-sm"
                >
                  <Icon name={isFreeWaiting ? 'time-outline' : 'alarm-outline'} size={22} color="white" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ color: isFreeWaiting ? '#047857' : '#B45309' }}
                    className="text-xs font-black uppercase tracking-wider"
                  >
                    {isFreeWaiting ? 'Free Waiting Time' : 'Paid Waiting Time'}
                  </Text>
                  <Text style={{ color: palette.mutedText }} className="text-[11px] font-semibold mt-0.5">
                    {isFreeWaiting ? 'Customer has 3 mins free waiting' : 'Paid waiting charges applicable'}
                  </Text>
                </View>
              </View>

              <View
                style={{ backgroundColor: isFreeWaiting ? '#10B981' : '#F59E0B' }}
                className="px-3.5 py-1.5 rounded-xl justify-center items-center shadow-sm"
              >
                <Text className="text-base font-black text-white font-mono tracking-wider">
                  {formattedWaitingTime}
                </Text>
              </View>
            </View>
          )}

          {/* Rider Details Card */}
          <View
            style={{ backgroundColor: palette.background, borderColor: palette.border }}
            className="flex-row items-center rounded-2xl p-3 border mb-3.5"
          >
            <View style={{ backgroundColor: palette.primary }} className="w-11 h-11 rounded-full justify-center items-center mr-3">
              <Text className="text-base font-black text-white">
                {(ride.userId?.name || ride.customer?.name || 'C')?.[0]?.toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text style={{ color: palette.text }} className="text-sm font-bold">{ride.userId?.name || ride.customer?.name || 'Customer'}</Text>
              <View className="flex-row items-center mt-0.5">
                <Icon name="star" size={14} color="#EAB308" />
                <Text style={{ color: palette.mutedText }} className="text-xs font-semibold ml-1">
                  {(ride.userId?.rating || ride.customer?.rating || 4.8).toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Call / Chat Options */}
            <View className="flex-row items-center">
              <TouchableOpacity
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                className="w-10 h-10 rounded-full border justify-center items-center"
                onPress={handleCallRider}
              >
                <Icon name="call" size={20} color={palette.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                className="w-10 h-10 rounded-full border justify-center items-center ml-2"
                onPress={() => navigation.navigate(ROUTES.RIDE_CHAT as any)}
              >
                <Icon name="chatbubble-ellipses" size={20} color={palette.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stops Summary Timeline (Only if stops exist) */}
          {parsedStops.length > 0 && (
            <View
              style={{ backgroundColor: palette.background, borderColor: palette.border }}
              className="rounded-2xl p-3 border mb-3"
            >
              <Text style={{ color: palette.mutedText }} className="text-[10px] font-bold uppercase tracking-widest mb-2">
                Trip Stops ({parsedStops.length})
              </Text>
              <View className="gap-2">
                {parsedStops.map((stop: any, idx: number) => (
                  <View key={idx} className="flex-row items-center">
                    <View className="w-4 h-4 rounded-full bg-amber-500/20 justify-center items-center mr-2">
                      <Text className="text-[8px] font-black text-amber-600 dark:text-amber-500">{idx + 1}</Text>
                    </View>
                    <Text style={{ color: palette.text }} className="text-xs flex-1 font-semibold" numberOfLines={1}>
                      {stop.title || stop.address || `Stop ${idx + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Target Address Card */}
          <View className="flex-row items-start px-1 mb-5">
            <Icon name={isHeadingToPickup ? 'pin' : 'flag'} size={18} color={isHeadingToPickup ? '#10B981' : '#EF4444'} />
            <View className="flex-1 ml-2">
              <Text style={{ color: palette.mutedText }} className="text-[9px] font-bold tracking-wider mb-0.5">{isHeadingToPickup ? 'PICKUP POINT' : 'DROP POINT'}</Text>
              <Text style={{ color: palette.text }} className="text-[13px] leading-5" numberOfLines={2}>
                {isHeadingToPickup ? (ride.pickupLocation?.address || ride.pickup?.address) : (ride.dropLocation?.address || ride.drop?.address)}
              </Text>
            </View>
          </View>

          {/* Actions Button */}
          <View className="w-full">{getActionButton()}</View>
        </View>

        {/* Cancellation Reason Modal */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
              className="w-full rounded-t-[38px] overflow-hidden border-t pb-4"
            >
              <View className="items-center pt-2.5">
                <View style={{ backgroundColor: palette.border }} className="w-10 h-1 rounded-full" />
              </View>

              <View className="px-6 pt-6 pb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text style={{ color: palette.text }} className="text-[22px] font-black">Cancel Ride</Text>
                    <Text style={{ color: palette.mutedText }} className="text-[12px] mt-1">
                      Select a reason before cancelling. This helps improve service quality.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: palette.background }}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    onPress={() => {
                      setSelectedReason(null);
                      setShowCancelModal(false);
                    }}
                  >
                    <Icon name="close" size={18} color={palette.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="px-5 pt-2 pb-1">
                {CANCEL_REASONS.map(item => {
                  const selected = selectedReason === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedReason(item.id)}
                      style={
                        selected
                          ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }
                          : { backgroundColor: palette.background, borderColor: palette.border }
                      }
                      className="mb-2.5 rounded-2xl px-4 py-3.5 flex-row items-center border"
                    >
                      <View
                        className={`w-5 h-5 rounded-full mr-3 items-center justify-center border-2 ${selected ? 'border-red-500 bg-red-500' : 'border-slate-400'
                          }`}
                      >
                        {selected && <View className="w-2 h-2 rounded-full bg-white" />}
                      </View>

                      <Text
                        style={selected ? { color: '#EF4444' } : { color: palette.text }}
                        className="flex-1 text-[13px] font-semibold"
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="px-5 pb-3 pt-3 flex-row gap-3">
                <Button
                  variant="outline"
                  label="Keep Ride"
                  onPress={() => {
                    setSelectedReason(null);
                    setShowCancelModal(false);
                  }}
                  height={48}
                  borderRadius={12}
                  style={{ flex: 1 }}
                  textStyle={{ fontSize: 13, fontWeight: '700' }}
                />

                <Button
                  label="Cancel Ride"
                  disabled={!selectedReason}
                  onPress={handleConfirmCancelWithReason}
                  height={48}
                  borderRadius={12}
                  style={{ flex: 1 }}
                  gradientColors={['#EF4444', '#DC2626']}
                  textStyle={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Custom In-App Alert Modal */}
        <CustomAlert
          visible={customAlert.visible}
          title={customAlert.title}
          message={customAlert.message}
          type={customAlert.variant === 'info' ? 'info' : customAlert.variant === 'success' ? 'success' : 'error'}
          buttons={[
            {
              text: customAlert.confirmText,
              onPress: handleCustomAlertConfirm,
            }
          ]}
          onDismiss={closeCustomAlert}
        />

        <Toast {...toast} onDismiss={hideToast} />
      </View>
    </SafeAreaView>
  );
};

export default ActiveRideScreen;
