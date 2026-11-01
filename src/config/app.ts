/**
 * App-wide configuration constants
 */
import ENV from './env';

export const APP_CONFIG = {
  name: ENV.APP_NAME,
  version: ENV.APP_VERSION,

  // Location tracking
  location: {
    highAccuracy: true,
    distanceFilter: 10, // meters — only emit if moved 10m
    interval: 5000,     // ms — foreground polling interval
    fastestInterval: 2000,
    timeout: 15000,
    maximumAge: 10000,
    batchSize: 5,       // batch socket emissions
  },

  // Socket
  socket: {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    heartbeatInterval: 30000,
    timeout: 20000,
  },

  // Ride
  ride: {
    acceptTimeoutSeconds: 30,
    nearbyRadiusKm: 5,
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
  },
} as const;
