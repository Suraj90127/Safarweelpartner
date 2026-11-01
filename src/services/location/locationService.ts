/**
 * Location Service
 * Production-grade, battery-optimized location tracking.
 *
 * Key decisions:
 * - Uses distanceFilter to suppress micro-updates
 * - Batches socket emissions to avoid flooding
 * - Ref-based tracking to avoid Redux re-renders on every GPS tick
 * - Separate high-accuracy (active ride) and balanced (idle) modes
 */

import Geolocation, {
  GeoPosition,
  GeoError,
} from 'react-native-geolocation-service';
import { Platform } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import { APP_CONFIG } from '../../config/app';
import { Location } from '../../types/location.types';
import logger from '../../utils/logger';

const TAG = 'LocationService';

type WatcherId = ReturnType<typeof Geolocation.watchPosition>;

interface TrackingOptions {
  mode: 'high' | 'balanced';
  onUpdate: (loc: Location) => void;
  onError: (err: string) => void;
}

let watcherId: WatcherId | null = null;

// ─── Permission ──────────────────────────────────────────────────────────────

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const result = await check(permission);
    if (result === RESULTS.GRANTED) return true;

    const requestResult = await request(permission);
    return requestResult === RESULTS.GRANTED;
  } catch (error) {
    logger.error(TAG, `Permission request failed: ${String(error)}`);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      // For Android 13 (API level 33) and above, request POST_NOTIFICATIONS
      if (Platform.Version >= 33) {
        const result = await check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        if (result === RESULTS.GRANTED) return true;

        const requestResult = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        return requestResult === RESULTS.GRANTED;
      }
      return true; // Granted by default on older Android versions
    } else {
      // For iOS, verify if Firebase is initialized natively
      const defaultApp = firebase.apps.find(app => app.name === '[DEFAULT]');
      if (!defaultApp) {
        logger.warn(TAG, 'Firebase app not initialized, skipping notification permission request');
        return false;
      }
      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }
  } catch (error) {
    logger.error(TAG, `Notification permission request failed: ${String(error)}`);
    return false;
  }
};

// ─── One-shot location ───────────────────────────────────────────────────────

export const getCurrentLocation = (): Promise<Location> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position: GeoPosition) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        });
      },
      (error: GeoError) => {
        logger.error(TAG, `getCurrentPosition error: ${error.message}`);
        reject(new Error(error.message));
      },
      {
        enableHighAccuracy: true,
        timeout: APP_CONFIG.location.timeout,
        maximumAge: APP_CONFIG.location.maximumAge,
      },
    );
  });

// ─── Watch position ──────────────────────────────────────────────────────────

export const startTracking = (options: TrackingOptions): void => {
  stopTracking(); // clear any existing watcher

  const isHighAccuracy = options.mode === 'high';

  watcherId = Geolocation.watchPosition(
    (position: GeoPosition) => {
      const loc: Location = {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        timestamp: position.timestamp,
      };
      options.onUpdate(loc);
    },
    (error: GeoError) => {
      logger.error(TAG, `watchPosition error: ${error.message}`);
      options.onError(error.message);
    },
    {
      enableHighAccuracy: isHighAccuracy,
      distanceFilter: isHighAccuracy
        ? 5
        : APP_CONFIG.location.distanceFilter,
      interval: isHighAccuracy
        ? APP_CONFIG.location.fastestInterval
        : APP_CONFIG.location.interval,
      fastestInterval: APP_CONFIG.location.fastestInterval,
      forceRequestLocation: true,
      showLocationDialog: true,
      useSignificantChanges: !isHighAccuracy,
    } as any,
  );

  logger.info(TAG, `Tracking started (${options.mode} accuracy)`);
};

export const stopTracking = (): void => {
  if (watcherId !== null) {
    Geolocation.clearWatch(watcherId);
    watcherId = null;
    logger.info(TAG, 'Tracking stopped');
  }
};

export const isTracking = (): boolean => watcherId !== null;
