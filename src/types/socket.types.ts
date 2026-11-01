// Socket types

import { RideRequest } from './ride.types';
import { LocationUpdate } from './location.types';

export type SocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface SocketState {
  status: SocketStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectedAt: string | null;
  error: string | null;
}

// Outgoing payloads
export interface DriverOnlinePayload {
  driverId: string;
  location: { latitude: number; longitude: number };
  vehicleType: string;
}

export interface DriverOfflinePayload {
  driverId: string;
}

export interface LocationUpdatePayload extends LocationUpdate {}

export interface RideResponsePayload {
  rideId: string;
  driverId: string;
  reason?: string;
}

// Incoming payloads
export interface NewRideRequestPayload {
  ride: RideRequest;
}

export interface RideStatusUpdatePayload {
  rideId: string;
  status: string;
  message?: string;
}

export interface HeartbeatPayload {
  timestamp: number;
}
