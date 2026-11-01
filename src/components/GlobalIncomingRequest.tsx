import { useNavigationState } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  DeviceEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';

import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  acceptRideThunk,
  clearRide,
  removeAvailableOrder,
  setActiveRide,
  setIncomingRequest,
} from '../redux/slices/rideSlice';

import { ROUTES } from '../constants/routes';
import {
  navigateFromBackground,
  navigationRef,
} from '../navigation/navigationRef';

import { STORAGE_KEYS } from '../constants/storageKeys';
import { markRideDismissed } from '../services/rideDedup';
import { emitRideAccepted } from '../services/socket/socketManager';
import mmkvService from '../services/storage/mmkvService';
import { getDistanceKm, parseStops } from '../utils/helpers';
import { fetchGoogleRoute } from '../utils/mapUtils';

const { PermissionModule } = NativeModules;

const parseLatLng = (loc: any, fallbackLat: number, fallbackLng: number) => {
  if (!loc) return { latitude: fallbackLat, longitude: fallbackLng };
  if (Array.isArray(loc.coordinates)) {
    return {
      latitude: loc.coordinates[1] ?? fallbackLat,
      longitude: loc.coordinates[0] ?? fallbackLng,
    };
  }
  if (loc.coordinates && typeof loc.coordinates === 'object') {
    const lat = loc.coordinates.latitude ?? loc.coordinates.lat;
    const lng = loc.coordinates.longitude ?? loc.coordinates.lng;
    if (lat !== undefined && lng !== undefined) {
      return { latitude: lat, longitude: lng };
    }
  }
  const lat = loc.latitude ?? loc.lat;
  const lng = loc.longitude ?? loc.lng;
  if (lat !== undefined && lng !== undefined) {
    return { latitude: lat, longitude: lng };
  }
  return { latitude: fallbackLat, longitude: fallbackLng };
};

const resolveRideDistanceKm = (request: any): number => {
  const parsedRideDistance = Number(
    request?.rideDistance ??
    request?.dropDistance ??
    request?.drop_distance ??
    request?.fare?.distance,
  );
  if (Number.isFinite(parsedRideDistance) && parsedRideDistance > 0) {
    return parsedRideDistance;
  }

  const fallbackDistance = Number(request?.distance);
  if (Number.isFinite(fallbackDistance) && fallbackDistance > 0) {
    return fallbackDistance;
  }

  const pickupLoc = parseLatLng(request?.pickup, 12.971899, 77.641151);
  const dropLoc = parseLatLng(request?.drop, 12.934988, 77.618388);
  const derivedDistance = getDistanceKm(pickupLoc, dropLoc);
  if (Number.isFinite(derivedDistance) && derivedDistance > 0) {
    return derivedDistance;
  }

  return 0;
};

const GlobalIncomingRequestContent: React.FC<{ incomingRequest: any }> = ({
  incomingRequest,
}) => {
  const dispatch = useAppDispatch();

  const activeRide = useAppSelector(state => state.ride.activeRide);
  const hasActivePackage = useAppSelector(state => state.ride.hasActivePackage);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const firstTwoRidesCount = useAppSelector(
    state => state.ride.firstTwoRides.length,
  );
  const driver = useAppSelector(
    state => state.driver.profile || state.auth.driver,
  );

  // Eligibility (hasActivePackage / firstTwoRides) is checked fresh inside
  // handleAccept by reading MMKV directly — no render-level variables needed.

  // Do NOT subscribe to currentLocation here — it fires on every GPS update
  // (1–2 s) and forces this component to re-render and re-evaluate
  // useNavigationState even when nothing about the incoming request changed.
  // Instead, read the last-known location directly from MMKV inside effects
  // where it is actually needed.

  const [_secondsLeft, setSecondsLeft] = useState(30);
  const [visible, setVisible] = useState(false);
  const [realPickupDist, setRealPickupDist] = useState<string | null>(null);
  const [realPickupTime, setRealPickupTime] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Guards so one-time side effects (sound, native overlay) don't replay on
  // every location update or unchanged re-render of the same request.
  const soundedRideIdRef = useRef<string | null>(null);
  const shownRideIdRef = useRef<string | null>(null);
  const lastShownFareRef = useRef<{
    base: number;
    surge: number;
    total: number;
  } | null>(null);
  const handleRejectRef = useRef<(reason?: string) => void>(() => {});

  // 1. Traverse navigation state to find the current active leaf route name
  const currentRouteName = useNavigationState(state => {
    if (!state) return null;
    let route: any = state.routes[state.index];
    while (route.state) {
      const stateIndex = route.state.index ?? 0;
      route = route.state.routes[stateIndex];
    }
    return route.name;
  });

  // Determine visibility condition (not shown when on active ride, orders screen, ride screens or when request is null)
  const shouldBeVisible =
    !!incomingRequest &&
    !activeRide &&
    currentRouteName !== ROUTES.ORDERS &&
    currentRouteName !== 'Orders' &&
    currentRouteName !== ROUTES.ACCEPT_RIDE &&
    currentRouteName !== ROUTES.ACTIVE_RIDE &&
    currentRouteName !== ROUTES.OTP_RIDE &&
    currentRouteName !== ROUTES.END_RIDE &&
    currentRouteName !== ROUTES.COMPLETED_RIDE;

  // 2. Decline handler (reusable)
  const handleReject = useCallback(
    async (_reason?: string) => {
      if (!incomingRequest) return;

      const rideId = incomingRequest.id;

      // Mark as dismissed FIRST so any concurrent FCM/socket re-sends are ignored.
      markRideDismissed(rideId);
      shownRideIdRef.current = null;
      lastShownFareRef.current = null;
      soundedRideIdRef.current = null;

      // Stop sound and hide native overlay.
      if (Platform.OS === 'android' && PermissionModule) {
        if (
          currentRouteName !== ROUTES.ORDERS &&
          currentRouteName !== 'Orders'
        ) {
          PermissionModule.stopSound();
        }
        PermissionModule.hideFloatingRequest();
      }

      // Remove MMKV temp keys so checkAndRestoreIncomingRide does not
      // re-dispatch this ride when the app next comes to the foreground.
      mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
      mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);

      // Remove from available orders and clear the incoming ride from Redux.
      dispatch(removeAvailableOrder(rideId));
      dispatch(setIncomingRequest(null));
    },
    [dispatch, incomingRequest, currentRouteName],
  );

  // 2.5 Timeout handler (overlay expired after 15s — hides overlay & stops sound, but allows ride to show on Orders page)
  const handleTimeout = useCallback(() => {
    shownRideIdRef.current = null;
    lastShownFareRef.current = null;
    soundedRideIdRef.current = null;

    if (Platform.OS === 'android' && PermissionModule) {
      if (
        currentRouteName !== ROUTES.ORDERS &&
        currentRouteName !== 'Orders'
      ) {
        PermissionModule.stopSound();
      }
      PermissionModule.hideFloatingRequest();
    }

    mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
    mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);

    dispatch(setIncomingRequest(null));
  }, [dispatch, currentRouteName]);

  // Keep a stable ref to the latest reject handler for manual dismissals.
  handleRejectRef.current = handleReject;

  // 3. Accept handler
  const handleAccept = useCallback(async () => {
    if (!incomingRequest) return;

    // ── Eligibility gate: read MMKV fresh at accept time ─────────────────────
    // MMKV is authoritative — it is only written by the API on app load and ride
    // complete, so it always holds the last verified value.
    const mmkvPkg = mmkvService.getBoolean(STORAGE_KEYS.HAS_ACTIVE_PACKAGE);
    const mmkvCount = mmkvService.getNumber(STORAGE_KEYS.FIRST_TWO_RIDES_COUNT);
    const mmkvLimit = mmkvService.getNumber(STORAGE_KEYS.FREE_RIDE_LIMIT) ?? 2;

    // Merge MMKV + Redux to avoid false negatives from one stale source.
    // If either source says package is active, allow immediately.
    const packageIsActive = mmkvPkg === true || hasActivePackage === true;

    // If both sources explicitly say no package, enforce free-ride limit.
    const packageIsDefinitelyInactive =
      mmkvPkg === false && hasActivePackage === false;

    // Use the highest known count so a stale lower value does not grant extra rides.
    const usedRideCount = Math.max(mmkvCount ?? 0, firstTwoRidesCount ?? 0);

    const walletBalance = driver?.wallet ?? 0;
    const hasWalletBalance = walletBalance > 0;

    // Unknown package state should not block accept.
    const canAccept =
      packageIsActive ||
      (packageIsDefinitelyInactive &&
        (usedRideCount < mmkvLimit || hasWalletBalance)) ||
      !packageIsDefinitelyInactive;

    if (!canAccept) {
      Alert.alert(
        'Package or Wallet Balance Required',
        'Aapke free rides khatam ho gaye hain, koi active package nahi hai aur wallet balance bhi 0 hai. Ride accept karne ke liye package khareedein ya wallet recharge karein.',
        [{ text: 'OK', style: 'default' }],
      );
      return;
    }

    PermissionModule?.stopSound();

    const rideDistanceKm = resolveRideDistanceKm(incomingRequest);

    const pickupAddress =
      typeof incomingRequest.pickup === 'string'
        ? incomingRequest.pickup
        : incomingRequest.pickup?.address ||
          incomingRequest.pickupAddress ||
          '';
    const dropAddress =
      typeof incomingRequest.drop === 'string'
        ? incomingRequest.drop
        : incomingRequest.drop?.address ||
          incomingRequest.dropAddress ||
          '';

    const customerName =
      incomingRequest.customer?.name ||
      incomingRequest.customerName ||
      'Customer';
    const customerPhone =
      incomingRequest.customer?.phone ||
      incomingRequest.customerPhone ||
      '+91 99999 55555';
    const customerRating =
      incomingRequest.customer?.rating ||
      incomingRequest.customerRating ||
      4.8;

    const total = Number(
      incomingRequest.fare?.total ??
      incomingRequest.totalFare ??
      incomingRequest.fareTotal ??
      0,
    );
    const surge = Number(
      incomingRequest.fare?.surge ??
      incomingRequest.surgeFare ??
      incomingRequest.fareSurge ??
      0,
    );
    const base = total - surge > 0 ? total - surge : total;

    const params = {
      id: incomingRequest.id,
      pickup: {
        address: pickupAddress,
        coordinates: {
          latitude:
            incomingRequest.pickup?.coordinates?.latitude ||
            incomingRequest.pickup?.lat ||
            12.971899,
          longitude:
            incomingRequest.pickup?.coordinates?.longitude ||
            incomingRequest.pickup?.lng ||
            77.641151,
        },
      },
      drop: {
        address: dropAddress,
        coordinates: {
          latitude:
            incomingRequest.drop?.coordinates?.latitude ||
            incomingRequest.drop?.lat ||
            12.934988,
          longitude:
            incomingRequest.drop?.coordinates?.longitude ||
            incomingRequest.drop?.lng ||
            77.618388,
        },
      },
      customer: {
        name: customerName,
        phone: customerPhone,
        rating: customerRating,
      },
      fare: {
        base: base || 60,
        distance: rideDistanceKm || incomingRequest.fare?.distance || 120,
        surge: surge || 0,
        total: total || 210,
      },
      distance: rideDistanceKm || incomingRequest.distance || 0,
      duration: incomingRequest.duration || 0,
      stops: incomingRequest.stops || parseStops(incomingRequest),
    };

    // ── Optimistic: navigate immediately so the screen opens without delay ──
    // Mark dismissed first so any concurrent FCM/socket re-sends are ignored.
    markRideDismissed(incomingRequest.id);
    dispatch(
      setActiveRide({
        ...incomingRequest,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      }),
    );
    emitRideAccepted({ rideId: incomingRequest.id });

    navigateFromBackground(ROUTES.APP, {
      screen: ROUTES.ACCEPT_RIDE,
      params: { rideId: incomingRequest.id, rideData: params },
    });

    // Bring the app to the foreground and stop sound immediately.
    if (Platform.OS === 'android' && PermissionModule) {
      PermissionModule.stopSound();
      PermissionModule.hideFloatingRequest();
      PermissionModule.stopFloatingBubble();
      PermissionModule.bringToForeground();
    }

    shownRideIdRef.current = null;
    lastShownFareRef.current = null;
    soundedRideIdRef.current = null;
    mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
    mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);

    // ── Confirm with backend in background (does not block navigation) ──
    const result = await dispatch(acceptRideThunk(incomingRequest.id));
    if (acceptRideThunk.rejected.match(result)) {
      const errorMsg =
        (result.payload as string) ||
        'This ride is no longer available or was already accepted by another driver.';
      Alert.alert('Ride Not Available', errorMsg, [
        {
          text: 'OK',
          onPress: () => {
            if (navigationRef.isReady() && navigationRef.canGoBack()) {
              navigationRef.goBack();
            }
          },
        },
      ]);
    }
  }, [dispatch, firstTwoRidesCount, hasActivePackage, incomingRequest]);

  // 5. Animating entry and exit of 0 banner
  useEffect(() => {
    if (shouldBeVisible) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [shouldBeVisible, slideAnim]);

  // 5.5. Fetch precise route details for pickup
  useEffect(() => {
    if (!incomingRequest || !shouldBeVisible) {
      setRealPickupDist(null);
      setRealPickupTime(null);
      return;
    }

    // Read location directly from MMKV — avoids subscribing to the Redux
    // location slice (which fires on every GPS tick).
    let driverCoords: { latitude: number; longitude: number } | null = null;
    try {
      const stored = mmkvService.getString(STORAGE_KEYS.LAST_KNOWN_LOCATION);
      if (stored) driverCoords = JSON.parse(stored);
    } catch (e) {
      console.log(
        '[GlobalIncomingRequest] Failed to parse stored driver location:',
        e,
      );
    }

    const pickupLoc = parseLatLng(incomingRequest.pickup, 12.971899, 77.641151);
    const pLat = pickupLoc.latitude;
    const pLng = pickupLoc.longitude;

    if (driverCoords && pLat && pLng) {
      let active = true;
      fetchGoogleRoute(
        { latitude: driverCoords.latitude, longitude: driverCoords.longitude },
        { latitude: pLat, longitude: pLng },
      )
        .then(res => {
          if (
            active &&
            res.distance &&
            (res.timeWithTraffic || res.normalTime)
          ) {
            setRealPickupDist(res.distance ?? null);
            setRealPickupTime((res.timeWithTraffic || res.normalTime) ?? null);
          }
        })
        .catch(err => {
          console.error('[GlobalIncomingRequest] fetchGoogleRoute error:', err);
        });
      return () => {
        active = false;
      };
    }
  }, [incomingRequest, shouldBeVisible]);
  useEffect(() => {
    if (!incomingRequest || !shouldBeVisible) {
      if (Platform.OS === 'android' && PermissionModule) {
        if (
          currentRouteName !== ROUTES.ORDERS &&
          currentRouteName !== 'Orders'
        ) {
          PermissionModule.stopSound();
        }
        PermissionModule.hideFloatingRequest();
      }
      soundedRideIdRef.current = null;
      shownRideIdRef.current = null;
      lastShownFareRef.current = null;
      return;
    }

    const isNewRide = soundedRideIdRef.current !== incomingRequest.id;
    if (isNewRide) {
      setSecondsLeft(15);

      const soundEnabled =
        mmkvService.getBoolean(STORAGE_KEYS.SOUND_ENABLED) ?? true;
      if (Platform.OS === 'android' && PermissionModule && soundEnabled) {
        PermissionModule.playSound();
      }
      soundedRideIdRef.current = incomingRequest.id;
    }

    if (Platform.OS === 'android' && PermissionModule) {
      const total = Number(
        incomingRequest.fare?.total ??
        incomingRequest.totalFare ??
        incomingRequest.fareTotal ??
        0,
      );
      const surge = Number(
        incomingRequest.fare?.surge ??
        incomingRequest.surgeFare ??
        incomingRequest.fareSurge ??
        0,
      );
      const base = total - surge > 0 ? total - surge : total;

      // Check if this is the same ride AND fare hasn't changed
      const sameRideId = shownRideIdRef.current === incomingRequest.id;
      const sameCurrentFare =
        lastShownFareRef.current &&
        lastShownFareRef.current.base === base &&
        lastShownFareRef.current.surge === surge &&
        lastShownFareRef.current.total === total;

      // If in background and already handled by index.js background FCM handler
      const activeRideIdTemp = mmkvService.getString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
      const alreadyHandledInBackground =
        AppState.currentState !== 'active' &&
        activeRideIdTemp === incomingRequest.id;

      // Skip only if both ride ID and fare data are unchanged, or already showing in background
      if ((sameRideId && sameCurrentFare) || alreadyHandledInBackground) {
        return;
      }

      const fareStr = `₹${base}`;
      const surgeStr = surge > 0 ? `₹${surge}` : '';

      // Read location from MMKV — same source used above, no Redux subscription.
      let driverCoords2: { latitude: number; longitude: number } | null = null;
      try {
        const stored2 = mmkvService.getString(STORAGE_KEYS.LAST_KNOWN_LOCATION);
        if (stored2) driverCoords2 = JSON.parse(stored2);
      } catch (e) {
        console.log(
          '[GlobalIncomingRequest] Failed to parse stored driver location:',
          e,
        );
      }

      const pickupLoc = parseLatLng(
        incomingRequest.pickup,
        12.971899,
        77.641151,
      );
      const pLat = pickupLoc.latitude;
      const pLng = pickupLoc.longitude;

      let pickupDist = realPickupDist || '1.2 Km';
      let pickupTime = realPickupTime || '3 mins';

      if (!realPickupDist || !realPickupTime) {
        if (driverCoords2 && pLat && pLng) {
          const distKm = getDistanceKm(driverCoords2, {
            latitude: pLat,
            longitude: pLng,
          });

          if (distKm < 1) {
            pickupDist = `${Math.round(distKm * 1000)} m`;
          } else {
            pickupDist = `${distKm.toFixed(1)} Km`;
          }

          const estMinutes = Math.max(1, Math.round((distKm / 25) * 60 + 1));
          pickupTime = `${estMinutes} mins`;
        }
      }

      const pickupAddress =
        typeof incomingRequest.pickup === 'string'
          ? incomingRequest.pickup
          : incomingRequest.pickup?.address ||
            incomingRequest.pickupAddress ||
            '';
      const dropAddress =
        typeof incomingRequest.drop === 'string'
          ? incomingRequest.drop
          : incomingRequest.drop?.address ||
            incomingRequest.dropAddress ||
            '';

      const rideDistanceKm = resolveRideDistanceKm(incomingRequest);
      const dropDist = `${(rideDistanceKm || 0).toFixed(1)} Km`;
      const vehicleType =
        vehicle?.serviceId?.name ||
        incomingRequest.vehicleType ||
        'Bike';

      const expiresAtVal = incomingRequest.expiresAt
        ? new Date(incomingRequest.expiresAt).getTime()
        : 0;
      const nowVal = Date.now();
      const durationSecs = expiresAtVal
        ? Math.max(10, Math.floor((expiresAtVal - nowVal) / 1000))
        : 15;

      PermissionModule.showFloatingRequest(
        fareStr,
        surgeStr,
        String(pickupDist || '1.2 Km'),
        String(pickupTime || '3 mins'),
        pickupAddress,
        dropDist,
        dropAddress,
        vehicleType,
        durationSecs,
      );
      shownRideIdRef.current = incomingRequest.id;
      lastShownFareRef.current = { base, surge, total };
    }
  }, [incomingRequest, shouldBeVisible, realPickupDist, realPickupTime]);

  // 7. Countdown timer — only active in foreground (native overlay handles its own timer in background)
  useEffect(() => {
    if (!incomingRequest || !shouldBeVisible) return;
    if (AppState.currentState !== 'active') return;

    let timeLeft = 15;
    setSecondsLeft(15);

    const timer = setInterval(() => {
      timeLeft -= 1;
      setSecondsLeft(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timer);
        handleTimeout();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [incomingRequest?.id, shouldBeVisible, handleTimeout]);

  // 8. Listen to native events (Accept/Decline) emitted from the floating request overlay
  useEffect(() => {
    const acceptSub = DeviceEventEmitter.addListener(
      'onFloatingRequestAccept',
      () => {
        // handleAccept performs a fresh eligibility check before proceeding
        handleAccept();
      },
    );

    const declineSub = DeviceEventEmitter.addListener(
      'onFloatingRequestDecline',
      () => {
        handleReject('declined');
      },
    );

    const timeoutSub = DeviceEventEmitter.addListener(
      'onFloatingRequestTimeout',
      () => {
        handleTimeout();
      },
    );

    return () => {
      acceptSub.remove();
      declineSub.remove();
      timeoutSub.remove();
    };
  }, [handleAccept, handleReject, handleTimeout]);

  if (!visible || !incomingRequest) return null;

  return null;
};

const GlobalIncomingRequest: React.FC = () => {
  const incomingRequest = useAppSelector(state => state.ride.incomingRequest);
  const activeRide = useAppSelector(state => state.ride.activeRide);

  if (!incomingRequest || activeRide) {
    return null;
  }

  return <GlobalIncomingRequestContent incomingRequest={incomingRequest} />;
};

export default React.memo(GlobalIncomingRequest);
