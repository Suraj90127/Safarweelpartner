import ENV from './env';
import { APP_CONFIG } from './app';

export const SOCKET_CONFIG = {
  url: ENV.SOCKET_URL,
  options: {
    path: ENV.SOCKET_PATH,
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: APP_CONFIG.socket.reconnectionAttempts,
    reconnectionDelay: APP_CONFIG.socket.reconnectionDelay,
    reconnectionDelayMax: APP_CONFIG.socket.reconnectionDelayMax,
    timeout: APP_CONFIG.socket.timeout,
    forceNew: false,
    multiplex: true,
  },
};
