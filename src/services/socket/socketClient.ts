/**
 * Socket Client
 * Creates and manages the Socket.IO connection instance.
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../config/socket';
import logger from '../../utils/logger';

const TAG = 'SocketClient';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const createSocket = (token: string): Socket => {
  if (socket?.connected) {
    logger.debug(TAG, 'Socket already connected, reusing instance');
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(SOCKET_CONFIG.url, {
    ...SOCKET_CONFIG.options,
    auth: { token },
  });

  logger.info(TAG, `Socket created for ${SOCKET_CONFIG.url}`);
  return socket;
};

export const destroySocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    logger.info(TAG, 'Socket destroyed');
  }
};

export const connectSocket = (): void => {
  if (socket && !socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
