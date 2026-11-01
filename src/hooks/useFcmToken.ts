/**
 * useFcmToken hook
 * Handles retrieving the FCM token upon user login and updating it on token refresh.
 */

import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { authApi } from '../api/authApi';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { clearRide, setIncomingRequest } from '../redux/slices/rideSlice';
import mmkvService from '../services/storage/mmkvService';
import logger from '../utils/logger';

import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { ROUTES } from '../constants/routes';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  navigateFromBackground,
  navigationRef,
} from '../navigation/navigationRef';
import {
  acceptRideThunk,
  fetchFirstTwoRidesThunk,
  removeAvailableOrder,
  setActiveRide,
  validateUserPackageThunk,
} from '../redux/slices/rideSlice';
import { store } from '../redux/store';
import { isRideDismissed, markRideDismissed } from '../services/rideDedup';
import { geocodeAddress } from '../utils/mapUtils';
import { parseStops, parsePickupLatLng, parseDropLatLng } from '../utils/helpers';

const TAG = 'useFcmToken';

// Dedup guard: backend re-sends the same pending ride via FCM every few seconds.
// Track the last offered ride so rapid re-emits do not re-trigger the popup.
const RIDE_OFFER_DEDUP_MS = 10000;
let lastFcmRideOfferId: string | null = null;
let lastFcmRideOfferAt = 0;
export const syncFcmTokenWithBackend = async (driverId?: string) => {
  try {
    let token = '';
    try {
      token = await messaging().getToken();
    } catch (e: any) {
      console.warn(
        '[syncFcmTokenWithBackend] Could not get native FCM token:',
        e?.message || e,
      );
    }

    if (!token && driverId) {
      token = `fcm-token-dev-${driverId}`;
    }

    if (token) {
      await authApi.saveFcmToken(token);
      logger.info(
        TAG,
        `FCM Token synced on driver online: ${token.substring(0, 15)}...`,
      );
    } else {
      logger.warn(TAG, 'No FCM token or fallback available to sync on online.');
    }
  } catch (err: any) {
    console.error('[syncFcmTokenWithBackend] Failed to sync FCM token:', err);
  }
};

export const useFcmToken = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch initial package validation & free rides status on app load
    dispatch(validateUserPackageThunk());
    dispatch(fetchFirstTwoRidesThunk());

    const saveToken = async (token: string) => {
      try {
        await authApi.saveFcmToken(token);
      } catch (error) {
        console.error('[useFcmToken] Failed to save FCM token:', error);
      }
    };

    // Check if the default Firebase app is initialized natively
    const defaultApp = firebase.apps.find(app => app.name === '[DEFAULT]');
    if (!defaultApp) {
      console.warn(
        '[useFcmToken] Default Firebase app is not initialized natively. Using mock token for development testing.',
      );
      return;
    }

    const setupFcm = async () => {
      try {
        // Request authorization for push notifications
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        // Also request permission via Notifee (vital for Android 13+)
        await notifee.requestPermission();

        // Create notification channels for Android early
        if (Platform.OS === 'android') {
          await notifee.createChannel({
            id: 'ride_updates',
            name: 'Ride Updates',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
          });
          await notifee.createChannel({
            id: 'chat_messages',
            name: 'Chat Messages',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
          });
          await notifee.createChannel({
            id: 'general_notifications',
            name: 'General Notifications',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibration: true,
          });
        }

        if (enabled) {
          logger.info(TAG, 'FCM permission granted');
          const token = await messaging().getToken();
          if (token) {
            await saveToken(token);
          }
        } else {
          logger.warn(TAG, 'FCM permission not granted');
        }
      } catch (error) {
        logger.error(TAG, 'Error setting up FCM', error);
      }
    };

    setupFcm();

    // Listen for FCM token refresh
    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
      async newToken => {
        logger.info(TAG, `FCM Token refreshed: ${newToken}`);
        await saveToken(newToken);
      },
    );

    const checkAndRestoreIncomingRide = async () => {
      try {
        // Check if driver accepted via the native overlay BEFORE the app opened.
        // In this case, the floating overlay already accepted the ride — we must NOT
        // show the incoming request overlay again when the app comes to foreground.
        const { PermissionModule: PM } = require('react-native').NativeModules;
        if (PM?.wasRideAcceptedViaOverlay) {
          const wasAccepted: boolean = await PM.wasRideAcceptedViaOverlay();
          if (wasAccepted) {
            PM.clearRideAcceptedViaOverlay();

            // If the ride was already accepted in the foreground, skip everything.
            const currentStateNow = store.getState();
            if (currentStateNow.ride.activeRide) {
              logger.info(
                TAG,
                'Overlay-accept: ride already active in Redux — skipping restore.',
              );
              mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
              mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
              return;
            }

            // Check for pending data FIRST — before any eligibility API calls.
            // If no pending data exists, the foreground handleAccept is already
            // processing this ride (race condition window) or already completed it.
            // Either way, do NOT show any alert — just return.
            const pendingDataStr = mmkvService.getString(
              STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP,
            );
            if (!pendingDataStr) {
              logger.info(
                TAG,
                'Overlay-accept: no pending MMKV data — foreground handler is processing or already handled.',
              );
              return;
            }

            // Merge MMKV + Redux values to avoid false alerts from one stale source.
            const mmkvPackage = mmkvService.getBoolean(
              STORAGE_KEYS.HAS_ACTIVE_PACKAGE,
            );
            const mmkvRidesCount = mmkvService.getNumber(
              STORAGE_KEYS.FIRST_TWO_RIDES_COUNT,
            );
            const mmkvLimit =
              mmkvService.getNumber(STORAGE_KEYS.FREE_RIDE_LIMIT) ?? 2;
            const state = store.getState();

            const driver = state.driver.profile || state.auth.driver;
            const walletBalance = driver?.wallet ?? 0;
            const hasWalletBalance = walletBalance > 0;

            const reduxPackage = state.ride.hasActivePackage;
            const reduxRidesCount = state.ride.firstTwoRides?.length ?? 0;

            const packageIsActive =
              mmkvPackage === true || reduxPackage === true;
            const packageIsDefinitelyInactive =
              mmkvPackage === false && reduxPackage === false;
            const usedRideCount = Math.max(
              mmkvRidesCount ?? 0,
              reduxRidesCount,
            );

            const isEligibleToAccept =
              packageIsActive ||
              (packageIsDefinitelyInactive &&
                (usedRideCount < mmkvLimit || hasWalletBalance)) ||
              !packageIsDefinitelyInactive;

            if (!isEligibleToAccept) {
              Alert.alert(
                'Ride Accept Disabled',
                'Aapke free rides khatam ho gaye hain, koi active package nahi hai aur wallet balance bhi 0 hai. Ride accept karne ke liye package khareedein ya wallet recharge karein.',
                [{ text: 'OK', style: 'default' }],
              );
              mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
              mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
              return;
            }

            // Accept the ride now and navigate to the AcceptRide screen.
            // logger.info(TAG, 'Overlay-accept from background/killed — accepting ride and navigating.');
            try {
              const data = JSON.parse(pendingDataStr);
              console.log('[useFcmToken] Overlay-accept data:', data);
              const rideId = data.rideId as string;
              const total = parseFloat(data.totalFare || '0');
              const surge = parseFloat(data.surgeFare || '0');
              const base = total - surge;

              const parsedPickup = parsePickupLatLng(data, 0, 0);
              const parsedDrop = parseDropLatLng(data, 0, 0);
              let pLat = parsedPickup.latitude;
              let pLng = parsedPickup.longitude;
              let dLat = parsedDrop.latitude;
              let dLng = parsedDrop.longitude;

              // Resolve real coordinates from the address when the payload does
              // not include lat/lng, so the map does not fall back to the
              // hardcoded default location.
              if (pLat === 0 && pLng === 0 && data.pickupAddress) {
                const geocoded = await geocodeAddress(data.pickupAddress);
                if (geocoded) {
                  pLat = geocoded.latitude;
                  pLng = geocoded.longitude;
                }
              }
              if (dLat === 0 && dLng === 0 && data.dropAddress) {
                const geocoded = await geocodeAddress(data.dropAddress);
                if (geocoded) {
                  dLat = geocoded.latitude;
                  dLng = geocoded.longitude;
                }
              }

              mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
              mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);

              const activeRide = {
                id: rideId,
                status: 'accepted',
                acceptedAt: new Date().toISOString(),
                customer: {
                  name: data.customerName || 'Customer',
                  phone: data.customerPhone || '',
                  rating: parseFloat(data.customerRating || '4.5'),
                },
                pickup: {
                  address: data.pickupAddress || '',
                  coordinates: {
                    latitude: pLat || 12.971899,
                    longitude: pLng || 77.641151,
                  },
                },
                drop: {
                  address: data.dropAddress || '',
                  coordinates: {
                    latitude: dLat || 12.934988,
                    longitude: dLng || 77.618388,
                  },
                },
                fare: { base, distance: 0, surge, total, currency: 'INR' },
                distance: parseFloat(data.rideDistance || data.distance || '0'),
                duration: parseFloat(data.rideDuration || data.duration || '0'),
                stops: parseStops(data),
              };

              // Set the active ride and navigate FIRST so the AcceptRide screen
              // opens immediately, then confirm the accept with the backend.
              dispatch(setActiveRide(activeRide as any));

              const rideData = { ...activeRide };
              navigateFromBackground(ROUTES.APP, {
                screen: ROUTES.ACCEPT_RIDE,
                params: { rideId, rideData },
              });

              // Best-effort backend accept. Navigation already happened, so the
              // screen opens even if this call is a no-op (e.g. already accepted).
              try {
                await dispatch(acceptRideThunk(rideId));
              } catch (acceptErr) {
                logger.error(
                  TAG,
                  'Overlay-accept backend acceptRide failed',
                  acceptErr,
                );
              }
            } catch (err) {
              logger.error(TAG, 'Overlay-accept flow failed', err);
            }
            return;
          }
        }

        const incomingDataStr = mmkvService.getString(
          STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP,
        );
        if (!incomingDataStr) return;

        // If a ride has already been accepted (activeRide exists in Redux),
        // just clean up the temp key and do not show the incoming overlay again.
        const currentState = store.getState();
        if (currentState.ride.activeRide) {
          // logger.info(TAG, 'Active ride already in Redux — skipping incoming ride restore and cleaning temp key.');
          mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
          mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
          return;
        }

        // If the driver already acted on this ride (rejected / timed-out) during
        // the current session, skip re-dispatch and clean up the stale MMKV keys.
        const parsedRideId = (() => {
          try {
            return JSON.parse(incomingDataStr)?.rideId as string | undefined;
          } catch {
            return undefined;
          }
        })();
        if (parsedRideId && isRideDismissed(parsedRideId)) {
          logger.info(
            TAG,
            `Skipping MMKV restore — ride ${parsedRideId} already dismissed`,
          );
          mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
          mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
          return;
        }

        // logger.info(TAG, `Restoring incoming ride request from MMKV: ${incomingDataStr}`);
        const data = JSON.parse(incomingDataStr);

        const total = parseFloat(data.totalFare || '0');
        const surge = parseFloat(data.surgeFare || '0');
        const base = total - surge;

        let pLat = parseFloat(data.pickupLat || data.pickupLatitude || '0');
        let pLng = parseFloat(data.pickupLng || data.pickupLongitude || '0');
        let dLat = parseFloat(data.dropLat || data.dropLatitude || '0');
        let dLng = parseFloat(data.dropLng || data.dropLongitude || '0');

        if (pLat === 0 && pLng === 0 && data.pickupAddress) {
          const geocoded = await geocodeAddress(data.pickupAddress);
          if (geocoded) {
            pLat = geocoded.latitude;
            pLng = geocoded.longitude;
          }
        }
        if (dLat === 0 && dLng === 0 && data.dropAddress) {
          const geocoded = await geocodeAddress(data.dropAddress);
          if (geocoded) {
            dLat = geocoded.latitude;
            dLng = geocoded.longitude;
          }
        }

        const pickupDistance = parseFloat(
          data.distance || data.pickupDistance || data.pickup_distance || '0',
        );
        const rideDistance = parseFloat(
          data.rideDistance ||
          data.dropDistance ||
          data.drop_distance ||
          data.distance ||
          '0',
        );

        const rideRequest = {
          id: data.rideId,
          customerId: data.customerId || '',
          customer: {
            id: data.customerId || '',
            name: data.customerName || 'Customer',
            phone: data.customerPhone || '',
            rating: parseFloat(data.customerRating || '4.5'),
            profilePhoto: data.customerPhoto || '',
          },
          pickup: {
            address: data.pickupAddress || '',
            coordinates: {
              latitude: pLat || 12.971899,
              longitude: pLng || 77.641151,
            },
          },
          drop: {
            address: data.dropAddress || '',
            coordinates: {
              latitude: dLat || 12.934988,
              longitude: dLng || 77.618388,
            },
          },
          distance: pickupDistance,
          rideDistance,
          duration: parseFloat(data.rideDuration || data.duration || '0'),
          fare: {
            base: base,
            distance: rideDistance,
            time: parseFloat(data.rideDuration || data.duration || '0'),
            surge: surge,
            total: total,
            currency: 'INR',
          },
          paymentMethod: (data.paymentMethod || 'cash') as any,
          status: 'pending' as any,
          requestedAt: data.requestedAt || new Date().toISOString(),
          expiresAt:
            data.expiresAt || new Date(Date.now() + 60000).toISOString(),
          stops: parseStops(data),
        };

        dispatch(setIncomingRequest(rideRequest));
        mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
      } catch (error) {
        logger.error(TAG, 'Error restoring incoming ride request', error);
      }
    };

    // Check on mount
    checkAndRestoreIncomingRide();

    // Listen to AppState transitions to restore cached rides on app foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkAndRestoreIncomingRide();
      }
    };
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // Listen for FCM messages in the foreground
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      // logger.info(TAG, `Foreground FCM message received: ${JSON.stringify(remoteMessage)}`);
      const data = remoteMessage.data as any;
      console.log('usefcmtoken ddd', data);
      if (!data) return;

      // Filter by user notification settings
      if (data.type === 'ride_request') {
        const rideRequestsEnabled =
          mmkvService.getBoolean(STORAGE_KEYS.RIDE_REQUESTS_NOTIF) ?? true;
        if (!rideRequestsEnabled) {
          logger.info(
            TAG,
            'Ignoring FCM ride request because notifications are disabled in settings',
          );
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
        const earningsEnabled =
          mmkvService.getBoolean(STORAGE_KEYS.EARNINGS_UPDATES_NOTIF) ?? true;
        if (!earningsEnabled) {
          logger.info(
            TAG,
            'Ignoring earnings/payout notification because it is disabled in settings',
          );
          return;
        }
      }

      if (data.type === 'ride_request') {
        if (data.rideId) {
          mmkvService.setString(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP, data.rideId);
        }

        // Read the latest state directly to avoid a stale closure value.
        const currentState = store.getState();

        // Already on an accepted ride — ignore any new ride offers.
        if (currentState.ride.activeRide) {
          logger.info(
            TAG,
            `Ignoring FCM ride request ${data.rideId} — a ride is already active`,
          );
          return;
        }

        // Already dismissed (rejected / timed-out / accepted) in this session.
        // The backend re-sends the same request every few seconds; once the
        // driver has acted on it we must never re-open the overlay.
        if (data.rideId && isRideDismissed(data.rideId as string)) {
          logger.info(
            TAG,
            `Ignoring dismissed FCM ride request ${data.rideId}`,
          );
          return;
        }

        const currentIncoming = currentState.ride.incomingRequest;

        const total = parseFloat(data.totalFare || '0');
        const surge = parseFloat(data.surgeFare || '0');
        const base = total - surge;

        // Same ride is already showing. Only re-dispatch when the fare actually
        // changed (a real update). Identical re-sends are ignored so the popup
        // stays as-is until its own timer expires, and the countdown is not reset.
        if (currentIncoming && currentIncoming.id === data.rideId) {
          const fareChanged =
            currentIncoming.fare.total !== total ||
            currentIncoming.fare.surge !== surge ||
            currentIncoming.fare.base !== base;

          if (!fareChanged) {
            logger.info(
              TAG,
              `Ignoring unchanged FCM re-send for ride ${data.rideId}`,
            );
            return;
          }

          const updatedRequest = {
            ...currentIncoming,
            fare: {
              ...currentIncoming.fare,
              base: base,
              surge: surge,
              total: total,
            },
            // Keep the original expiresAt so the running countdown is preserved.
          };
          dispatch(setIncomingRequest(updatedRequest));
          return;
        }

        // Ignore rapid re-emits of the same ride within the dedup window so the
        // popup does not reappear every few seconds for the same request.
        const nowTs = Date.now();
        if (
          lastFcmRideOfferId === data.rideId &&
          nowTs - lastFcmRideOfferAt < RIDE_OFFER_DEDUP_MS
        ) {
          logger.info(
            TAG,
            `Ignoring rapid duplicate FCM ride request ${data.rideId}`,
          );
          return;
        }
        lastFcmRideOfferId = data.rideId as string;
        lastFcmRideOfferAt = nowTs;

        const parsedPickup = parsePickupLatLng(data, 0, 0);
        const parsedDrop = parseDropLatLng(data, 0, 0);
        let pLat = parsedPickup.latitude;
        let pLng = parsedPickup.longitude;
        let dLat = parsedDrop.latitude;
        let dLng = parsedDrop.longitude;

        if (pLat === 0 && pLng === 0 && data.pickupAddress) {
          const geocoded = await geocodeAddress(data.pickupAddress);
          if (geocoded) {
            pLat = geocoded.latitude;
            pLng = geocoded.longitude;
          }
        }
        if (dLat === 0 && dLng === 0 && data.dropAddress) {
          const geocoded = await geocodeAddress(data.dropAddress);
          if (geocoded) {
            dLat = geocoded.latitude;
            dLng = geocoded.longitude;
          }
        }

        const pickupDistance = parseFloat(
          data.distance || data.pickupDistance || data.pickup_distance || '0',
        );
        const rideDistance = parseFloat(
          data.rideDistance ||
          data.dropDistance ||
          data.drop_distance ||
          data.distance ||
          '0',
        );

        const rideRequest = {
          id: data.rideId,
          customerId: data.customerId || '',
          customer: {
            id: data.customerId || '',
            name: data.customerName || 'Customer',
            phone: data.customerPhone || '',
            rating: parseFloat(data.customerRating || '4.5'),
            profilePhoto: data.customerPhoto || '',
          },
          pickup: {
            address: data.pickupAddress || '',
            coordinates: {
              latitude: pLat || 12.971899,
              longitude: pLng || 77.641151,
            },
          },
          drop: {
            address: data.dropAddress || '',
            coordinates: {
              latitude: dLat || 12.934988,
              longitude: dLng || 77.618388,
            },
          },
          distance: pickupDistance,
          rideDistance,
          duration: parseFloat(data.rideDuration || data.duration || '0'),
          fare: {
            base: base,
            distance: rideDistance,
            time: parseFloat(data.rideDuration || data.duration || '0'),
            surge: surge,
            total: total,
            currency: 'INR',
          },
          paymentMethod: (data.paymentMethod || 'cash') as any,
          status: 'pending' as any,
          requestedAt: data.requestedAt || new Date().toISOString(),
          expiresAt:
            data.expiresAt || new Date(Date.now() + 60000).toISOString(),
          stops: parseStops(data),
        };

        dispatch(setIncomingRequest(rideRequest));

      } else if (
        data.type === 'ride_cancelled' ||
        data.type === 'ride_timeout' ||
        data.type === 'ride_expired' ||
        data.status === 'cancelled' ||
        data.status === 'no_driver_found' ||
        data.status === 'expired'
      ) {
        // Stop sound and hide native overlay IMMEDIATELY on any cancellation/timeout event
        const { PermissionModule: PM } = require('react-native').NativeModules;
        if (Platform.OS === 'android' && PM) {
          PM.stopSound();
          PM.hideFloatingRequest();
        }

        const cancelledRideId =
          data.rideId || data.id || data._id || data.orderId;

        if (cancelledRideId) {
          markRideDismissed(String(cancelledRideId));
          dispatch(removeAvailableOrder(String(cancelledRideId)));
        }

        mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
        mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);

        const currentState = store.getState();
        const activeRide = currentState.ride.activeRide;
        const activeRideId =
          (activeRide as any)?._id || (activeRide as any)?.id;
        const incomingRequest = currentState.ride.incomingRequest;
        const incomingRequestId = incomingRequest?.id;

        // If an incoming request matches this cancelled/expired ride, clear it
        if (
          incomingRequest &&
          (!cancelledRideId ||
            String(incomingRequestId) === String(cancelledRideId))
        ) {
          dispatch(setIncomingRequest(null));
        }

        // If the event is for an expired offer (no_driver_found / no longer available),
        // it was just a pending offer that timed out — silently finish without alert or push sound.
        const isOfferExpired =
          data.status === 'no_driver_found' ||
          data.status === 'expired' ||
          String(data.title || '').toLowerCase().includes('no longer available') ||
          String(data.body || '').toLowerCase().includes('no longer available');

        if (isOfferExpired) {
          logger.info(
            TAG,
            `Ride offer ${cancelledRideId} is no longer available — silently cleared.`,
          );
          return;
        }

        // If the driver is currently on an active ride and this cancellation is for a DIFFERENT ride, ignore!
        if (
          cancelledRideId &&
          activeRideId &&
          String(cancelledRideId) !== String(activeRideId)
        ) {
          logger.info(
            TAG,
            `Ignoring FCM ride_cancelled for ride ${cancelledRideId} — current active ride is ${activeRideId}`,
          );
          return;
        }

        const cancelTitle =
          typeof data.title === 'string' ? data.title : 'Ride Cancelled';
        const cancelBody =
          typeof data.body === 'string'
            ? data.body
            : 'The ride has cancelled this ride.';

        const showCancelNotification = async () => {
          try {
            const channelId = await notifee.createChannel({
              id: 'ride_updates',
              name: 'Ride Updates',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              vibration: true,
            });

            await notifee.displayNotification({
              title: cancelTitle,
              body: cancelBody,
              data: data,
              android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: { id: 'default' },
              },
            });
          } catch (err) {
            console.error(
              '[useFcmToken] Failed to display ride-cancel notification:',
              err,
            );
          }
        };

        // Only show alert, notification, and clear active ride if the active ride matches this cancellation
        if (
          activeRide &&
          (!cancelledRideId || String(activeRideId) === String(cancelledRideId))
        ) {
          Alert.alert(cancelTitle, cancelBody, [
            {
              text: 'OK',
              onPress: () => navigationRef.navigate(ROUTES.MAIN_TABS as any),
            },
          ]);
          showCancelNotification();
          dispatch(clearRide());
        }
      } else if (
        data.type === 'ride_accepted' ||
        data.type === 'ride_arrived' ||
        data.type === 'ride_started'
      ) {
        const titleStr =
          typeof data.title === 'string' ? data.title : 'Ride Update';
        const bodyStr = typeof data.body === 'string' ? data.body : '';

        // Use Notifee to display a real push notification banner in the foreground
        const displayNotif = async () => {
          try {
            const channelId = await notifee.createChannel({
              id: 'ride_updates',
              name: 'Ride Updates',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              vibration: true,
            });

            await notifee.displayNotification({
              title: titleStr,
              body: bodyStr,
              android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: {
                  id: 'default',
                },
              },
            });
          } catch (err) {
            console.error(
              '[useFcmToken] Failed to display notifee notification:',
              err,
            );
          }
        };
        displayNotif();
      } else if (data.type === 'chat_message') {
        const titleStr =
          typeof data.title === 'string' ? data.title : 'New Message';
        const bodyStr = typeof data.body === 'string' ? data.body : '';
        const displayNotif = async () => {
          try {
            const channelId = await notifee.createChannel({
              id: 'chat_messages',
              name: 'Chat Messages',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              vibration: true,
            });

            await notifee.displayNotification({
              title: titleStr,
              body: bodyStr,
              data: data,
              android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: {
                  id: 'default',
                },
              },
            });
          } catch (err) {
            console.error(
              '[useFcmToken] Failed to display notifee notification:',
              err,
            );
          }
        };
        displayNotif();
      } else if (data.type === 'general_notification') {
        const titleStr =
          typeof data.title === 'string'
            ? data.title
            : remoteMessage.notification?.title || 'Notification';
        const bodyStr =
          typeof data.body === 'string'
            ? data.body
            : remoteMessage.notification?.body || '';
        const displayNotif = async () => {
          try {
            const channelId = await notifee.createChannel({
              id: 'general_notifications',
              name: 'General Notifications',
              importance: AndroidImportance.HIGH,
              sound: 'default',
              vibration: true,
            });

            await notifee.displayNotification({
              title: titleStr,
              body: bodyStr,
              android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: {
                  id: 'default',
                },
              },
            });
          } catch (err) {
            console.error(
              '[useFcmToken] Failed to display general notification:',
              err,
            );
          }
        };
        displayNotif();
      }
    });

    const unsubscribeForeground = notifee.onForegroundEvent(
      ({ type, detail }) => {
        if (type === EventType.PRESS) {
          console.log(
            '[Notifee Foreground] Notification pressed:',
            detail.notification,
          );
          const dataObj = detail.notification?.data;
          if (dataObj && dataObj.type === 'chat_message') {
            navigationRef.navigate(ROUTES.RIDE_CHAT as any);
          }
        }
      },
    );

    const checkInitialNotification = async () => {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log(
          '[Notifee Initial] App launched by notification:',
          initialNotification.notification,
        );
        const dataObj = initialNotification.notification?.data;
        if (dataObj && dataObj.type === 'chat_message') {
          setTimeout(() => {
            navigationRef.navigate(ROUTES.RIDE_CHAT as any);
          }, 1500);
        }
      }
    };

    checkInitialNotification();

    return () => {
      unsubscribeOnTokenRefresh();
      appStateSubscription.remove();
      unsubscribeOnMessage();
      unsubscribeForeground();
    };
  }, [isAuthenticated, dispatch]);
};