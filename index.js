import './global.css';
import 'react-native-gesture-handler';
import { enableScreens, enableFreeze } from 'react-native-screens';

enableScreens(true);
enableFreeze(true);

if (!__DEV__) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

import { AppRegistry, NativeModules, Platform, DeviceEventEmitter, AppState } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

import mmkvService from './src/services/storage/mmkvService';
import { STORAGE_KEYS } from './src/constants/storageKeys';
import { rideApi } from './src/api/rideApi';
import ENV from './src/config/env';
import { getDistanceKm } from './src/utils/helpers';
import { markRideDismissed } from './src/services/rideDedup';

const { PermissionModule } = NativeModules;

// ─── Background FCM Handler ─────────────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('------------fcm----------- Message received:', remoteMessage);

  const token = mmkvService.getAccessToken();
  if (!token) {
    console.log('[Background FCM] Driver is logged out, ignoring message');
    return;
  }

  const { data } = remoteMessage;
  if (!data) return;

  // Filter by user notification settings
  if (data.type === 'ride_request') {
    const rideRequestsEnabled = mmkvService.getBoolean(STORAGE_KEYS.RIDE_REQUESTS_NOTIF) ?? true;
    if (!rideRequestsEnabled) {
      console.log('[Background FCM] Ignoring ride request because notifications are disabled in settings');
      return;
    }
  }

  const titleStr = typeof data.title === 'string' ? data.title : '';
  const bodyStr = typeof data.body === 'string' ? data.body : '';
  const isEarningsMsg =
    data.type === 'earnings_update' ||
    data.type === 'earnings_summary' ||
    titleStr.toLowerCase().includes('earning') ||
    bodyStr.toLowerCase().includes('earning') ||
    titleStr.toLowerCase().includes('payout') ||
    bodyStr.toLowerCase().includes('payout');

  if (isEarningsMsg) {
    const earningsEnabled = mmkvService.getBoolean(STORAGE_KEYS.EARNINGS_UPDATES_NOTIF) ?? true;
    if (!earningsEnabled) {
      console.log('[Background FCM] Ignoring earnings/payout notification because it is disabled in settings');
      return;
    }
  }

  if (data.type === 'ride_request') {
    // ── Dedup: same rideId already stored means the native overlay is already
    // showing this request.  Re-processing would reset the countdown timer.
    const existingRideId = mmkvService.getString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
    if (existingRideId && existingRideId === data.rideId) {
      return;
    }

    if (data.rideId) {
      mmkvService.setString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP, data.rideId);
    }
    mmkvService.setString(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP, JSON.stringify(data));

    // 1. Resolve pickup coordinates
    let resolvedPickupLat = parseFloat(data.pickupLat || data.pickupLatitude || '0');
    let resolvedPickupLng = parseFloat(data.pickupLng || data.pickupLongitude || '0');

    const apiKey = Platform.OS === 'ios' ? ENV.GOOGLE_MAPS_API_KEY_IOS : ENV.GOOGLE_MAPS_API_KEY_ANDROID;

    if (resolvedPickupLat === 0 && resolvedPickupLng === 0 && data.pickupAddress) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(data.pickupAddress)}&key=${apiKey}`;
        const response = await fetch(url);
        const json = await response.json();
        if (json.status === 'OK' && json.results && json.results.length > 0) {
          const location = json.results[0].geometry.location;
          resolvedPickupLat = location.lat;
          resolvedPickupLng = location.lng;
        }
      } catch (e) {
        console.error('[Background FCM] Geocoding failed:', e);
      }
    }

    // 2. Fetch driver's current location from MMKV
    const driverLocStr = mmkvService.getString(STORAGE_KEYS.LAST_KNOWN_LOCATION);
    let driverLoc = null;
    if (driverLocStr) {
      try {
        driverLoc = JSON.parse(driverLocStr);
      } catch (e) {
        console.error('[Background FCM] Failed to parse driver location:', e);
      }
    }

    // 3. Define default / fallback values dynamically based on coordinates
    let pickupDist = '1.2 Km';
    let pickupTime = '3 mins';

    if (driverLoc && resolvedPickupLat !== 0 && resolvedPickupLng !== 0) {
      const distKm = getDistanceKm(driverLoc, { latitude: resolvedPickupLat, longitude: resolvedPickupLng });
      if (distKm < 1) {
        pickupDist = `${Math.round(distKm * 1000)} m`;
      } else {
        pickupDist = `${distKm.toFixed(1)} Km`;
      }
      const estMinutes = Math.max(1, Math.round((distKm / 25) * 60 + 1));
      pickupTime = `${estMinutes} mins`;
    } else {
      if (data.distance) {
        pickupDist = `${parseFloat(data.distance).toFixed(1)} Km`;
      }
      if (data.duration) {
        pickupTime = `${Math.round(parseFloat(data.duration))} mins`;
      }
    }

    // 4. Query Directions API if coordinates are available
    if (driverLoc && resolvedPickupLat !== 0 && resolvedPickupLng !== 0) {
      try {
        const routeUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLoc.latitude},${driverLoc.longitude}&destination=${resolvedPickupLat},${resolvedPickupLng}&mode=two_wheeler&key=${apiKey}`;
        const response = await fetch(routeUrl);
        const json = await response.json();
        if (json.status === 'OK') {
          const leg = json.routes[0]?.legs[0];
          if (leg) {
            pickupDist = leg.distance?.text || pickupDist;
            pickupTime = leg.duration?.text || pickupTime;

          }
        }
      } catch (e) {
        console.error('[Background FCM] Directions lookup failed:', e);
      }
    }


    const total = parseFloat(data.totalFare || '0');
    const surge = parseFloat(data.surgeFare || '0');
    const base = total - surge;

    const fareStr = `₹${base}`;
    const surgeStr = surge > 0 ? `₹${surge}` : '';
    const dropDist = `${parseFloat(data.rideDistance || '0').toFixed(1)} Km`;
    const vehicleType = 'Bike';

    const expiresAtVal = data.expiresAt ? new Date(data.expiresAt).getTime() : 0;
    const nowVal = Date.now();
    const durationSecs = expiresAtVal ? Math.max(0, Math.floor((expiresAtVal - nowVal) / 1000)) : 60;

    if (Platform.OS === 'android' && PermissionModule) {
      const existingOverlayRideId = mmkvService.getString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
      if (existingOverlayRideId && existingOverlayRideId !== data.rideId) {
        PermissionModule.hideFloatingRequest();
      }
      const soundEnabled = mmkvService.getBoolean(STORAGE_KEYS.SOUND_ENABLED) ?? true;
      if (soundEnabled) {
        PermissionModule.playSound();
      }
      PermissionModule.showFloatingRequest(
        fareStr,
        surgeStr,
        pickupDist,
        pickupTime,
        data.pickupAddress || '',
        dropDist,
        data.dropAddress || '',
        vehicleType,
        durationSecs
      );
    }
  } else if (
    data.type === 'ride_cancelled' ||
    data.type === 'ride_timeout' ||
    data.type === 'ride_expired' ||
    data.status === 'cancelled' ||
    data.status === 'no_driver_found' ||
    data.status === 'expired'
  ) {
    if (Platform.OS === 'android' && PermissionModule) {
      PermissionModule.stopSound();
      PermissionModule.hideFloatingRequest();
    }

    const cancelledId = data.rideId || data.id || data._id;
    if (cancelledId) {
      markRideDismissed(String(cancelledId));
    }

    // Clear BOTH cached keys so the cancelled ride is not restored/re-shown when
    // the app returns to the foreground.
    mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
    mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
  }
});

// ─── Global Event Listeners for Native Floating request ─────────────────────
DeviceEventEmitter.addListener('onFloatingRequestAccept', async () => {
  if (Platform.OS === 'android' && PermissionModule) {
    PermissionModule.stopSound();
    PermissionModule.hideFloatingRequest();
    PermissionModule.stopFloatingBubble();
  }
});

DeviceEventEmitter.addListener('onFloatingRequestDecline', async () => {
  if (AppState.currentState !== 'active') {
    const rideId = mmkvService.getString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
    if (rideId) {
      try {
        if (Platform.OS === 'android' && PermissionModule) {
          PermissionModule.stopSound();
          PermissionModule.hideFloatingRequest();
        }
        await rideApi.rejectRide(rideId, 'declined');
      } catch (e) {
        console.error('[Global listener] Failed to reject ride via API:', e);
      } finally {
        mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
        mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
      }
    }
  } else {
    if (Platform.OS === 'android' && PermissionModule) {
      PermissionModule.stopSound();
      PermissionModule.hideFloatingRequest();
    }
  }
});

DeviceEventEmitter.addListener('onFloatingRequestTimeout', () => {
  if (Platform.OS === 'android' && PermissionModule) {
    PermissionModule.stopSound();
    PermissionModule.hideFloatingRequest();
  }
  // On timeout: do NOT reject the ride via API so it remains available in OrdersScreen
  mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
  mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
});

AppRegistry.registerComponent(appName, () => App);
