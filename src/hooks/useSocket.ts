/**
 * useSocket hook
 * Initializes and tears down the socket connection.
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  initSocketManager,
  teardownSocketManager,
} from '../services/socket/socketManager';
import { getSocket } from '../services/socket/socketClient';
import logger from '../utils/logger';

const TAG = 'useSocket';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const token = useAppSelector(state => state.auth.accessToken);
  const socketStatus = useAppSelector(state => state.socket.status);
  const driverId = useAppSelector(
    state => state.driver.profile?.id || state.auth.driver?.id,
  );

  useEffect(() => {
    console.log('[useSocket] useEffect triggered with isAuthenticated:', isAuthenticated, 'token:', token);
    if (!isAuthenticated || !token) return;

    logger.info(TAG, 'Initializing socket');
    initSocketManager(token, dispatch);

    return () => {
      logger.info(TAG, 'Tearing down socket');
      teardownSocketManager(dispatch);
    };
  }, [isAuthenticated, token, dispatch]);

  // Emit join event at root level whenever socket status becomes connected
  useEffect(() => {
    if (socketStatus === 'connected' && driverId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('join', {
          userId: driverId,
          role: 'driver',
        });
        logger.info(TAG, `Socket: Emitted join for driver ${driverId} at root level`);
      }
    }
  }, [socketStatus, driverId]);
};
