/**
 * Socket event names — single source of truth.
 * Shared between client and server teams.
 */

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',

  // Driver lifecycle
  DRIVER_ONLINE: 'driver:online',
  DRIVER_OFFLINE: 'driver:offline',
  DRIVER_LOCATION_UPDATE: 'driver:location',
  DRIVER_STATUS_CHANGE: 'driver:status_change',

  // Ride lifecycle
  NEW_RIDE_REQUEST: 'ride:new_request',
  RIDE_REQUEST_CANCELLED: 'ride:request_cancelled',
  RIDE_ACCEPTED: 'ride:accepted',
  RIDE_REJECTED: 'ride:rejected',
  RIDE_STARTED: 'ride:started',
  RIDE_COMPLETED: 'ride:completed',
  RIDE_CANCELLED: 'ride:cancelled',
  RIDE_DROP_LOCATION_CHANGED: 'ride:drop_location:changed',
  RIDE_STATUS_UPDATE: 'ride:status_update',

  // Support Chat
  SUPPORT_JOIN: 'support:join_chat',
  SUPPORT_SEND_MESSAGE: 'support:send_message',
  SUPPORT_RECEIVE_MESSAGE: 'support:receive_message',

  // Heartbeat
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_ACK: 'heartbeat:ack',

  // Notifications
  NOTIFICATION: 'notification',

  // Errors
  ERROR: 'error',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
