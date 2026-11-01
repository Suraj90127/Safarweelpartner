/**
 * Driver API
 */

import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { Driver } from '../types/auth.types';
import {
  DashboardStats,
  DriverReferralEarn,
  EarningsSummary,
  ReferralSummaryResponse,
} from '../types/driver.types';
import { get, post, put } from './httpClient';

export const driverApi = {
  getProfile: (isnotverify?: boolean) =>
    get<Driver>(API_ENDPOINTS.DRIVER.PROFILE, { params: { isnotverify } }),

  getMyVehicle: () => get<any>(API_ENDPOINTS.DRIVER.VEHICLE),

  getReferrals: () => get<any>(API_ENDPOINTS.DRIVER.REFERRALS),

  getRating: () => get<any>(API_ENDPOINTS.DRIVER.RATING),

  updateStatus: (isOnline: boolean) =>
    put(API_ENDPOINTS.DRIVER.UPDATE_STATUS, { isOnline }),

  getDashboardStats: () => get<DashboardStats>(API_ENDPOINTS.DASHBOARD.STATS),

  getEarnings: () => get<EarningsSummary>(API_ENDPOINTS.EARNINGS.SUMMARY),

  getTodayEarnings: () =>
    get<{ amount: number; currency: string }>(API_ENDPOINTS.EARNINGS.TODAY),

  getWeeklyEarnings: () =>
    get<{ amount: number; currency: string }>(API_ENDPOINTS.EARNINGS.WEEKLY),

  uploadDl: (formData: FormData) =>
    post<any>('/driver-doc/upload-dl', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadAvatar: (formData: FormData) =>
    post<{ success: boolean; message: string; url: string }>(
      '/driver-doc/upload-avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    ),

  uploadRc: (formData: FormData) =>
    post<any>('/driver-doc/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  uploadAadhaarPan: (formData: FormData) =>
    post<any>('/driver-doc/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  updateProfile: (data: {
    name?: string;
    last_name?: string;
    dob?: string;
    gender?: string;
    profile_image_id?: string;
    phone?: string;
    city?: string;
    email?: string;
    referral_code?: string;
  }) => put<any>('/driver/updateProfile', data),

  registerProfile: (data: {
    name?: string;
    dob?: string;
    gender?: string;
    profile_image_id?: string;
    phone?: string;
    city?: string;
    referral_code?: string;
  }) => post<any>('/driver/register', data),

  getServices: () => get<any>('/services'),

  getVehicles: () => get<any>('/vehicle'),

  getCities: () => get<any>('/city'),

  uploadVehicle: (formData: FormData) =>
    post<any>('/driver-vehicle/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  createReview: (data: {
    rideId?: string;
    driverId: string;
    riderId: string;
    rating: number;
    review: string;
    targetType: 'driver' | 'rider';
  }) => post<any>(API_ENDPOINTS.REVIEW.CREATE, data),

  updateDlInfo: (data: { dl_number?: string; licenseType?: string }) =>
    put<any>('/driver-doc/update-dl-info', data),

  getDriverDocuments: () => get<any>('/driver-doc/document'),

  getIncentiveSummary: (serviceId: string) =>
    get<any>(API_ENDPOINTS.INCENTIVE.SUMMARY(serviceId)),

  getRateCardByService: (serviceId: string) =>
    get<any>(API_ENDPOINTS.RATE_CARD.BY_SERVICE(serviceId)),

  getReferralEarn: () =>
    get<DriverReferralEarn[]>(API_ENDPOINTS.REFERRAL_EARN.LIST),

  getReferralSummary: () =>
    get<ReferralSummaryResponse>(API_ENDPOINTS.USER.REFERRAL_SUMMARY),
};
