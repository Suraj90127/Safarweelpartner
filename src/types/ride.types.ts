// Ride types

import { LatLng } from './location.types';

export type RideStatus =
  | 'pending'
  | 'accepted'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'arrived'
  | 'ongoing'
  | 'searching';

export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'upi';

export interface RideLocation {
  address: string;
  coordinates: LatLng;
  placeId?: string;
}

export interface RideCustomer {
  id: string;
  name: string;
  phone: string;
  profilePhoto?: string;
  rating: number;
}

export interface RideFare {
  base: number;
  distance: number;
  time: number;
  surge: number;
  total: number;
  currency: string;
}

export interface RideRequest {
  id: string;
  customerId: string;
  customer: RideCustomer;
  pickup: RideLocation;
  drop: RideLocation;
  stops?: RideLocation[];
  distance: number;       // km
  duration: number;       // minutes
  fare: RideFare;
  paymentMethod: PaymentMethod;
  status: RideStatus;
  requestedAt: string;
  expiresAt: string;
  notes?: string;
}

export interface ActiveRide extends RideRequest {
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  routePolyline?: string; // encoded polyline
  currentEta?: number;    // minutes
}

export interface RideState {
  incomingRequest: RideRequest | null;
  availableOrders: RideRequest[];
  activeRide: ActiveRide | null;
  rideHistory: ActiveRide[];
  isLoading: boolean;
  error: string | null;
  acceptTimeout: number | null;
  // Ride eligibility
  firstTwoRides: any[];
  freeRideLimit?: number;
  hasActivePackage: boolean | null;  // null = not yet fetched
  eligibilityLoading: boolean;
}


export interface RideAction {
  rideId: string;
  action: 'accept' | 'reject' | 'start' | 'complete' | 'arrived' | 'cancel';
  reason?: string;
}
