/**
 * Ride API
 */

import { post, get, patch } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { ActiveRide } from '../types/ride.types';

export const rideApi = {
  acceptRide: (rideId: string) =>
    post(API_ENDPOINTS.RIDE.ACCEPT(rideId)),

  rejectRide: (rideId: string, reason?: string) =>
    post(API_ENDPOINTS.RIDE.REJECT(rideId), { reason }),

  startRide: (rideId: string, otp: string) =>
    patch(API_ENDPOINTS.RIDE.STATUS(rideId), { status: 'ongoing', otp }),

  completeRide: (rideId: string, payload?: object) =>
    post(API_ENDPOINTS.RIDE.COMPLETE(rideId), payload),

  arrivedAtPickup: (rideId: string) =>
    post(API_ENDPOINTS.RIDE.ARRIVED(rideId)),

  cancelRide: (rideId: string, cancelReason: string) =>
    post(API_ENDPOINTS.RIDE.CANCEL(rideId), { cancelReason }),

  getActiveRide: () => get<ActiveRide>(API_ENDPOINTS.RIDE.ACTIVE),

  getRideHistory: (page = 1, pageSize = 20) =>
    get<ActiveRide[]>(`${API_ENDPOINTS.RIDE.HISTORY}?page=${page}&pageSize=${pageSize}`),

  getDriverRides: (status?: string, limit?: number) =>
    get<any[]>(API_ENDPOINTS.RIDE.DRIVER_MY, { params: { status, limit } }),

  getActiveDriverRide: () =>
    get<any>(API_ENDPOINTS.RIDE.DRIVER_ACTIVE),

  getDriverFirstTwoRides: () =>
    get<any>(API_ENDPOINTS.RIDE.FIRST_TWO),

  createDynamicQR: (amount: number) =>
    post(API_ENDPOINTS.RIDE.CREATE_DYNAMIC_QR, { amount }),
};
