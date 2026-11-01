
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import mmkvService from '../services/storage/mmkvService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import ENV from '../config/env';
import { getDistanceKm } from '../utils/helpers';
import { getDistanceInMeters } from '../utils/mapUtils';
import { LatLng } from '../types/location.types';
import {
  setCurrentLocation,
  setIsTracking,
  setPermissionGranted,
  setLocationError,
} from '../redux/slices/locationSlice';
import {
  requestLocationPermission,
  requestNotificationPermission,
  startTracking,
  stopTracking,
  getCurrentLocation,
} from '../services/location/locationService';
import { emitLocationUpdate } from '../services/socket/socketManager';
import { Location } from '../types/location.types';
import logger from '../utils/logger';

const TAG = 'useLocation';

// Emit location to socket max once per 10 seconds
const SOCKET_EMIT_INTERVAL_MS = 10000;

const getDestinationCoords = (ride: any): LatLng | null => {
  if (!ride) return null;
  const drop = ride.drop || ride.dropLocation;
  if (!drop) return null;
  if (drop.coordinates) {
    if (Array.isArray(drop.coordinates)) {
      return {
        latitude: drop.coordinates[1],
        longitude: drop.coordinates[0],
      };
    }
    if (typeof drop.coordinates === 'object') {
      const lat = drop.coordinates.latitude ?? drop.coordinates.lat;
      const lng = drop.coordinates.longitude ?? drop.coordinates.lng;
      if (lat !== undefined && lng !== undefined) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  const lat = drop.latitude ?? drop.lat;
  const lng = drop.longitude ?? drop.lng;
  if (lat !== undefined && lng !== undefined) {
    return { latitude: lat, longitude: lng };
  }
  return null;
};

const checkTrafficFromRoutesAPI = async (
  origin: LatLng,
  destination: LatLng,
): Promise<boolean> => {
  const apiKey =
    Platform.OS === 'ios'
      ? ENV.GOOGLE_MAPS_API_KEY_IOS
      : ENV.GOOGLE_MAPS_API_KEY_ANDROID;

  const url = 'https://routes.googleapis.com/v1/routes:computeRoutes';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    const data = await response.json();
    const route = data?.routes?.[0];
    if (route) {
      const duration = parseInt(route.duration?.replace('s', ''), 10) || 0;
      const staticDuration = parseInt(route.staticDuration?.replace('s', ''), 10) || 0;
      return duration > staticDuration;
    }
  } catch (error) {
    logger.error(TAG, 'Failed to fetch traffic status from Google Routes API', error);
  }
  return false;
};

// Minimum speed (m/s) before a GPS heading is considered reliable.
// Below this threshold the device compass jitters badly when stationary.
const MIN_SPEED_FOR_HEADING_MS = 2.0; // ≈ 7.2 km/h

// Ref to persist the last reliable heading across location updates (module-level).
let lastReliableHeading: number = 0;

export const useLocation = () => {
  const dispatch = useAppDispatch();
  const isOnline = useAppSelector(state => state.driver.isOnline);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const driver = useAppSelector(state => state.driver.profile);


  const activeRide = useAppSelector(state => state.ride.activeRide);

  const lastEmitTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const driverRef = useRef(driver);
  const vehicleRef = useRef(vehicle);

  // Keep driverRef and vehicleRef updated
  useEffect(() => {
    driverRef.current = driver;
    vehicleRef.current = vehicle;
  }, [driver, vehicle]);

  // Traffic / Stop Time tracker refs
  const previousLocationRef = useRef<Location | null>(null);
  const latestLocationRef = useRef<Location | null>(null);
  const lastLocationUpdateTimeRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRideRef = useRef(activeRide);

  const trafficTimeRef = useRef<number>(0);
  const stopTimeRef = useRef<number>(0);
  const lastSavedTrafficTimeRef = useRef<number>(0);
  const lastSavedStopTimeRef = useRef<number>(0);
  const lastTrafficCheckTimeRef = useRef<number>(0);
  const lastTrafficCheckValueRef = useRef<boolean>(false);

  // Tracked ride distance (meters) and duration (seconds) refs
  const trackedDistanceMetersRef = useRef<number>(0);
  const trackedStartTimeRef = useRef<number>(0);

  // Keep activeRideRef updated with the latest activeRide state
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Background timer callback to track stopped and traffic time
  const tickTimer = useCallback(async () => {
    const ride = activeRideRef.current;
    if (!ride) return;

    const status = ride.status;
    const isOngoing = status === 'ongoing' || status === 'in_progress';
    if (!isOngoing) return;

    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastTickTimeRef.current) / 1000);
    lastTickTimeRef.current = now;

    if (elapsedSeconds <= 0) return;

    const currentLoc = latestLocationRef.current;
    if (!currentLoc) return;

    // Determine if stopped (speed < 2 km/h)
    let isStopped = false;
    const timeSinceLastUpdate = now - lastLocationUpdateTimeRef.current;

    if (timeSinceLastUpdate > 15000) {
      // No updates for 15s means stationary/stopped
      isStopped = true;
    } else {
      const speedMs = currentLoc.coords.speed;
      if (speedMs !== undefined && speedMs !== null && speedMs >= 0) {
        const speedKmH = speedMs * 3.6;
        isStopped = speedKmH < 2;
      } else if (previousLocationRef.current && previousLocationRef.current.timestamp !== currentLoc.timestamp) {
        const timeDiffHrs = (currentLoc.timestamp - previousLocationRef.current.timestamp) / 3600000;
        const calculatedSpeed = timeDiffHrs > 0 ? (getDistanceKm(previousLocationRef.current.coords, currentLoc.coords) / timeDiffHrs) : 0;
        isStopped = calculatedSpeed < 2;
      } else {
        isStopped = false;
      }
    }

    if (isStopped) {
      const destCoords = getDestinationCoords(ride);
      if (destCoords) {
        let inTraffic = false;
        const checkNow = Date.now();
        if (checkNow - lastTrafficCheckTimeRef.current < 30000) {
          inTraffic = lastTrafficCheckValueRef.current;
        } else {
          inTraffic = await checkTrafficFromRoutesAPI(currentLoc.coords, destCoords);
          lastTrafficCheckTimeRef.current = checkNow;
          lastTrafficCheckValueRef.current = inTraffic;
        }

        if (inTraffic) {
          trafficTimeRef.current += elapsedSeconds;
          logger.info(TAG, `Added ${elapsedSeconds}s to Traffic Time (Total: ${trafficTimeRef.current}s)`);
        } else {
          stopTimeRef.current += elapsedSeconds;
          logger.info(TAG, `Added ${elapsedSeconds}s to Stop Time (Total: ${stopTimeRef.current}s)`);
        }

        if (
          trafficTimeRef.current !== lastSavedTrafficTimeRef.current ||
          stopTimeRef.current !== lastSavedStopTimeRef.current
        ) {
          mmkvService.setNumber(STORAGE_KEYS.TRAFFIC_TIME, trafficTimeRef.current);
          mmkvService.setNumber(STORAGE_KEYS.STOP_TIME, stopTimeRef.current);
          lastSavedTrafficTimeRef.current = trafficTimeRef.current;
          lastSavedStopTimeRef.current = stopTimeRef.current;
        }
      }
    }
  }, []);

  // Load and reset counters based on active ride status transitions, and manage background interval timer
  useEffect(() => {
    const status = activeRide?.status;
    const isOngoing = status === 'ongoing' || status === 'in_progress';

    if (isOngoing) {
      trafficTimeRef.current = mmkvService.getNumber(STORAGE_KEYS.TRAFFIC_TIME) || 0;
      lastSavedTrafficTimeRef.current = trafficTimeRef.current;
      stopTimeRef.current = mmkvService.getNumber(STORAGE_KEYS.STOP_TIME) || 0;
      lastSavedStopTimeRef.current = stopTimeRef.current;

      // Tracked distance & start time
      trackedDistanceMetersRef.current = mmkvService.getNumber(STORAGE_KEYS.TRACKED_RIDE_DISTANCE) || 0;
      let startTime = mmkvService.getNumber(STORAGE_KEYS.TRACKED_RIDE_START_TIME);
      if (!startTime || startTime === 0) {
        startTime = Date.now();
        mmkvService.setNumber(STORAGE_KEYS.TRACKED_RIDE_START_TIME, startTime);
      }
      trackedStartTimeRef.current = startTime;

      lastTickTimeRef.current = Date.now();

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          tickTimer();
        }, 5000);
        logger.info(TAG, 'Stopped/Traffic timer started');
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        logger.info(TAG, 'Stopped/Traffic timer cleared');
      }
      trafficTimeRef.current = 0;
      stopTimeRef.current = 0;
      lastSavedTrafficTimeRef.current = 0;
      lastSavedStopTimeRef.current = 0;
      trackedDistanceMetersRef.current = 0;
      trackedStartTimeRef.current = 0;
      previousLocationRef.current = null;
      latestLocationRef.current = null;
      lastLocationUpdateTimeRef.current = 0;
      lastTrafficCheckTimeRef.current = 0;
      lastTrafficCheckValueRef.current = false;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeRide?.status, tickTimer]);

  const handleLocationUpdate = useCallback(
    async (loc: Location) => {
      // Save last known location to MMKV for background FCM calculations
      mmkvService.setString(
        STORAGE_KEYS.LAST_KNOWN_LOCATION,
        JSON.stringify({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
      );

      // Update Redux — this triggers map re-center.
      // Filter noisy GPS heading: only trust it when the driver is genuinely
      // moving (speed >= 2 m/s) and the value is a valid compass bearing.
      // When stationary the GPS heading can jump around wildly (or return -1),
      // so we keep the last reliable heading instead of spinning the map.
      const rawSpeed = loc.coords.speed ?? 0;
      const rawHeading = loc.coords.heading ?? -1;
      const isMoving = rawSpeed >= MIN_SPEED_FOR_HEADING_MS;
      const isValidHeading = rawHeading >= 0 && Number.isFinite(rawHeading);

      if (isMoving && isValidHeading) {
        lastReliableHeading = rawHeading;
      }

      dispatch(
        setCurrentLocation({
          location: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          heading: lastReliableHeading,
          speed: rawSpeed,
        }),
      );

      // Throttle socket emission
      const now = Date.now();

      if (
        isOnline &&
        driver?._id &&
        now - lastEmitTimeRef.current > SOCKET_EMIT_INTERVAL_MS
      ) {
        lastEmitTimeRef.current = now;
        const vehicleId =
          vehicle?.vehicleTypeId ||
          (driver as any)?.driver_id?.vehicleTypeId?._id ||
          (driver as any)?.driver_id?.vehicleTypeId ||
          (driver as any)?.vehicleTypeId;

        emitLocationUpdate({
          driverId: driver._id,
          vehicleId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          heading: loc.coords.heading ?? 0,
          speed: loc.coords.speed ?? 0,
          timestamp: loc.timestamp,
        });

      }

      // Track locations & calculate distance delta between previous and current location
      const status = activeRide?.status;
      const isOngoing = status === 'ongoing' || status === 'in_progress';
      if (isOngoing) {
        if (latestLocationRef.current) {
          previousLocationRef.current = latestLocationRef.current;

          const prevCoords = previousLocationRef.current.coords;
          const currCoords = loc.coords;

          const deltaMeters = getDistanceInMeters(
            prevCoords.latitude,
            prevCoords.longitude,
            currCoords.latitude,
            currCoords.longitude
          );

          // Accumulate distance if realistic movement (>= 2m to avoid jitter, <= 500m to avoid teleports)
          if (deltaMeters >= 2 && deltaMeters <= 500) {
            trackedDistanceMetersRef.current += deltaMeters;
            const roundedMeters = Math.round(trackedDistanceMetersRef.current);
            mmkvService.setNumber(STORAGE_KEYS.TRACKED_RIDE_DISTANCE, roundedMeters);
            logger.info(TAG, `Tracked Ride Distance: +${Math.round(deltaMeters)}m (Total: ${roundedMeters}m)`);
          }
        }
        latestLocationRef.current = loc;
        lastLocationUpdateTimeRef.current = Date.now();

        // Calculate and update duration in seconds
        if (trackedStartTimeRef.current > 0) {
          const durationSeconds = Math.round((Date.now() - trackedStartTimeRef.current) / 1000);
          mmkvService.setNumber(STORAGE_KEYS.TRACKED_RIDE_DURATION, durationSeconds);
        }
      }
    },
    [dispatch, driver?._id, activeRide, vehicle?.vehicleTypeId, isOnline],
  );

  const handleError = useCallback(
    (err: string) => {
      logger.error(TAG, err);
      dispatch(setLocationError(err));
    },
    [dispatch],
  );

  const initTracking = useCallback(async () => {
    const granted = await requestLocationPermission();
    dispatch(setPermissionGranted(granted));

    // Request notification permission sequentially
    await requestNotificationPermission();

    if (!granted) {
      dispatch(setLocationError('Location permission denied'));
      return;
    }

    try {
      // Fetch initial position quickly
      const initial = await getCurrentLocation();
      handleLocationUpdate(initial);
    } catch {
      logger.warn(TAG, 'Could not get initial location');
    }

    // Use high-accuracy when driver is online (on active ride)
    startTracking({
      mode: isOnline ? 'high' : 'balanced',
      onUpdate: handleLocationUpdate,
      onError: handleError,
    });

    dispatch(setIsTracking(true));
  }, [dispatch, isOnline, handleLocationUpdate, handleError]);

  // Start/stop tracking when online status changes
  useEffect(() => {
    initTracking();

    return () => {
      stopTracking();
      dispatch(setIsTracking(false));
    };
  }, [isOnline]); // Re-run when driver goes online/offline

  // Periodic 8s location update and emit when driver is online
  useEffect(() => {
    let onlineLocationTimer: ReturnType<typeof setInterval> | null = null;

    if (isOnline) {
      onlineLocationTimer = setInterval(async () => {
        try {
          const loc = await getCurrentLocation();
          handleLocationUpdate(loc);
          logger.info(TAG, '8s periodic online location update processed');
        } catch (error) {
          logger.warn(TAG, '8s periodic getCurrentLocation failed, falling back to latest cached location');
          const currentLoc = latestLocationRef.current;
          const currentDriver = driverRef.current;
          const currentVehicle = vehicleRef.current;
          if (currentLoc && currentDriver?._id) {
            const vehicleId =
              currentVehicle?.vehicleTypeId ||
              (currentDriver as any)?.driver_id?.vehicleTypeId?._id ||
              (currentDriver as any)?.driver_id?.vehicleTypeId ||
              (currentDriver as any)?.vehicleTypeId;
            emitLocationUpdate({
              driverId: currentDriver._id,
              vehicleId,
              lat: currentLoc.coords.latitude,
              lng: currentLoc.coords.longitude,
              heading: currentLoc.coords.heading ?? 0,
              speed: currentLoc.coords.speed ?? 0,
              timestamp: currentLoc.timestamp,
            });
          }
        }
      }, 8000);
    }

    return () => {
      if (onlineLocationTimer) {
        clearInterval(onlineLocationTimer);
        onlineLocationTimer = null;
      }
    };
  }, [isOnline, handleLocationUpdate]);

  // Pause tracking when app is backgrounded (saves battery)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current === 'active' &&
          nextState.match(/inactive|background/)
        ) {
          if (!isOnline) {
            stopTracking();
            dispatch(setIsTracking(false));
          }
        } else if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          if (!isOnline) {
            initTracking();
          }
        }
        appStateRef.current = nextState;
      },
    );

    return () => subscription.remove();
  }, [isOnline, initTracking, dispatch]);
};
