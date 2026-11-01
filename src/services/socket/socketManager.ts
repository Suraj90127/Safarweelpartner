/**
 * Socket Manager
 * High-level manager: connects, registers events, handles reconnection,
 * and wires socket events into Redux store.
 */

import { NativeModules, Platform } from 'react-native';
import { Socket } from 'socket.io-client';
import { showCustomAlert } from '../../components/GlobalAlertHost';
import { APP_CONFIG } from '../../config/app';
import { ROUTES } from '../../constants/routes';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { navigationRef } from '../../navigation/navigationRef';
import {
  clearRide,
  removeAvailableOrder,
  setIncomingRequest,
  updateActiveRide,
} from '../../redux/slices/rideSlice';
import {
  incrementReconnectAttempts,
  setSocketError,
  setSocketStatus,
} from '../../redux/slices/socketSlice';
import { AppDispatch, store } from '../../redux/store';
import logger from '../../utils/logger';
import { isRideDismissed, markRideDismissed } from '../rideDedup';
import mmkvService from '../storage/mmkvService';
import { createSocket, destroySocket, getSocket } from './socketClient';

const TAG = 'SocketManager';

// Clear any cached incoming-ride data and hide the native overlay on cancel so
// a cancelled ride cannot be restored or re-shown.
const clearIncomingRideArtifacts = () => {
  try {
    const { PermissionModule } = NativeModules;
    if (Platform.OS === 'android' && PermissionModule) {
      PermissionModule.stopSound();
      PermissionModule.hideFloatingRequest();
    }
  } catch (e) {
    logger.error(TAG, 'Failed to hide native overlay on cancel', e);
  }
  mmkvService.delete(STORAGE_KEYS.ACTIVE_RIDE_ID_TEMP);
  mmkvService.delete(STORAGE_KEYS.INCOMING_RIDE_DATA_TEMP);
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// Dedup guard: backend re-offers the same pending ride every few seconds.
// Track the last offered ride so rapid re-emits do not re-trigger the popup.
let lastRideOfferId: string | null = null;
let lastRideOfferAt = 0;
const RIDE_OFFER_DEDUP_MS = 10000;

const clearHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const startHeartbeat = (socket: Socket) => {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket.connected) {
      socket.emit(SOCKET_EVENTS.HEARTBEAT, { timestamp: Date.now() });
    }
  }, APP_CONFIG.socket.heartbeatInterval);
};

export const initSocketManager = (
  token: string,
  dispatch: AppDispatch,
): Socket => {
  const socket = createSocket(token);

  // ─── Connection events ───────────────────────────────────────────────────

  socket.on(SOCKET_EVENTS.CONNECT, () => {
    logger.info(TAG, 'Socket connected');
    dispatch(setSocketStatus('connected'));
    startHeartbeat(socket);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, reason => {
    logger.warn(TAG, `Socket disconnected: ${reason}`);
    dispatch(setSocketStatus('disconnected'));
    clearHeartbeat();
  });

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error: Error) => {
    logger.error(TAG, `Connection error: ${error.message}`);
    dispatch(setSocketError(error.message));
  });

  socket.on(SOCKET_EVENTS.RECONNECT_ATTEMPT, () => {
    logger.debug(TAG, 'Reconnect attempt');
    dispatch(setSocketStatus('reconnecting'));
    dispatch(incrementReconnectAttempts());
  });

  socket.on(SOCKET_EVENTS.RECONNECT, () => {
    logger.info(TAG, 'Reconnected');
    dispatch(setSocketStatus('connected'));
  });

  // ─── Ride events ─────────────────────────────────────────────────────────

  socket.on(SOCKET_EVENTS.NEW_RIDE_REQUEST, payload => {
    const newRide = payload?.ride;
    if (!newRide?.id) return;

    // Filter by user notification settings
    const rideRequestsEnabled =
      mmkvService.getBoolean(STORAGE_KEYS.RIDE_REQUESTS_NOTIF) ?? true;
    if (!rideRequestsEnabled) {
      logger.info(
        TAG,
        `Ignoring socket ride request ${newRide.id} because notifications are disabled in settings`,
      );
      return;
    }

    const state = store.getState();

    // Already on an accepted ride — ignore any new offers.
    if (state.ride.activeRide) {
      logger.info(
        TAG,
        `Ignoring ride request ${newRide.id} — a ride is already active`,
      );
      return;
    }

    // Already dismissed (rejected / timed-out / accepted) — ignore re-sends.
    if (isRideDismissed(newRide.id)) {
      logger.info(TAG, `Ignoring dismissed socket ride request ${newRide.id}`);
      return;
    }

    // The same ride is already being shown — ignore re-emit to avoid a duplicate popup.
    if (
      state.ride.incomingRequest &&
      state.ride.incomingRequest.id === newRide.id
    ) {
      logger.info(
        TAG,
        `Ignoring duplicate ride request ${newRide.id} — already showing`,
      );
      return;
    }

    // Ignore rapid re-emits of the same ride within the dedup window.
    const now = Date.now();
    if (
      lastRideOfferId === newRide.id &&
      now - lastRideOfferAt < RIDE_OFFER_DEDUP_MS
    ) {
      logger.info(TAG, `Ignoring rapid duplicate ride request ${newRide.id}`);
      return;
    }

    lastRideOfferId = newRide.id;
    lastRideOfferAt = now;
    logger.info(TAG, `New ride request: ${newRide.id}`);
    dispatch(setIncomingRequest(newRide));
  });

  socket.on(SOCKET_EVENTS.RIDE_REQUEST_CANCELLED, (payload?: any) => {
    logger.info(TAG, 'Ride request cancelled by customer');
    const eventPayload = payload?.payload ?? payload;
    const cancelledRideId =
      eventPayload?.rideId ||
      eventPayload?.id ||
      eventPayload?._id ||
      (typeof payload === 'string' ? payload : undefined);

    if (cancelledRideId) {
      markRideDismissed(String(cancelledRideId));
      dispatch(removeAvailableOrder(String(cancelledRideId)));
    }

    const currentIncoming = store.getState().ride.incomingRequest;
    if (
      !cancelledRideId ||
      !currentIncoming ||
      String(currentIncoming.id) === String(cancelledRideId)
    ) {
      clearIncomingRideArtifacts();
      dispatch(setIncomingRequest(null));
    }
  });

  socket.on(SOCKET_EVENTS.RIDE_CANCELLED, (payload?: any) => {
    logger.info(TAG, 'Active ride cancelled');
    const eventPayload = payload?.payload ?? payload;
    const cancelledRideId =
      eventPayload?.rideId ||
      eventPayload?.id ||
      eventPayload?._id ||
      (typeof payload === 'string' ? payload : undefined);

    if (cancelledRideId) {
      markRideDismissed(String(cancelledRideId));
      dispatch(removeAvailableOrder(String(cancelledRideId)));
    }

    const activeRide = store.getState().ride.activeRide;
    const activeRideId = (activeRide as any)?._id ?? activeRide?.id;

    if (!activeRide) {
      clearIncomingRideArtifacts();
      return;
    }

    // If event specifies a rideId and it doesn't match current active ride, ignore!
    if (
      cancelledRideId &&
      activeRideId &&
      String(cancelledRideId) !== String(activeRideId)
    ) {
      logger.info(
        TAG,
        `Ignoring RIDE_CANCELLED for ride ${cancelledRideId} — current active ride is ${activeRideId}`,
      );
      return;
    }

    console.log('ssh', activeRide);
    showCustomAlert({
      title: 'Ride Cancelled',
      message: 'The ride has cancelled this ride.',
      type: 'warning',
      buttons: [
        {
          text: 'OK',
          onPress: () => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(ROUTES.MAIN_TABS as never);
            }
          },
        },
      ],
    });
    clearIncomingRideArtifacts();
    dispatch(clearRide());
  });

  socket.on(SOCKET_EVENTS.RIDE_DROP_LOCATION_CHANGED, payload => {
    logger.info(
      TAG,
      `Ride drop location changed event received: ${JSON.stringify(payload)}`,
    );
    const eventPayload = payload?.payload ?? payload;
    const rideIdFromEvent = eventPayload?.rideId;
    const activeRide = store.getState().ride.activeRide;
    const activeRideId = (activeRide as any)?._id ?? activeRide?.id;
    if (
      activeRide &&
      (activeRideId === rideIdFromEvent || activeRide.id === rideIdFromEvent)
    ) {
      dispatch(
        updateActiveRide({
          dropLocation: eventPayload.dropLocation,
          payment: eventPayload.payment,
        } as any),
      );
      showCustomAlert({
        title: 'Drop Location Changed',
        message: 'The ride has updated the drop location.',
        type: 'info',
      });
    }
  });

  // Heartbeat ack
  socket.on(SOCKET_EVENTS.HEARTBEAT_ACK, () => {
    logger.debug(TAG, 'Heartbeat acknowledged');
  });

  // Connect
  socket.connect();
  dispatch(setSocketStatus('connecting'));

  return socket;
};

export const teardownSocketManager = (dispatch: AppDispatch): void => {
  clearHeartbeat();
  destroySocket();
  dispatch(setSocketStatus('disconnected'));
};

// ─── Emission helpers ────────────────────────────────────────────────────────

export const emitDriverOnline = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.DRIVER_ONLINE, payload);
};

export const emitDriverOffline = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.DRIVER_OFFLINE, payload);
};

export const emitLocationUpdate = (payload: object) => {
  const isOnline = store.getState().driver.isOnline;
  if (!isOnline) return;
  const socket = getSocket();
  socket?.volatile.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, payload);
};

export const emitRideAccepted = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.RIDE_ACCEPTED, payload);
};

export const emitRideRejected = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.RIDE_REJECTED, payload);
};

export const emitRideStarted = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.RIDE_STARTED, payload);
};

export const emitRideCompleted = (payload: object) => {
  const socket = getSocket();
  socket?.emit(SOCKET_EVENTS.RIDE_COMPLETED, payload);
};
