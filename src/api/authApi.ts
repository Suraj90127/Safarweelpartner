/**
 * Auth API
 */

import { post, del } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import {
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../types/auth.types';

export const authApi = {
  sendOtp: (payload: SendOtpRequest) =>
    post<SendOtpResponse>(API_ENDPOINTS.AUTH.SEND_OTP, payload),

  verifyOtp: (payload: VerifyOtpRequest) =>
    post<VerifyOtpResponse>(API_ENDPOINTS.AUTH.VERIFY_OTP, payload),

  logout: () => post(API_ENDPOINTS.AUTH.LOGOUT),

  saveFcmToken: (fcmToken: string) =>
    post<any>(API_ENDPOINTS.AUTH.SAVE_FCM_TOKEN, { fcm_token: fcmToken }),

  deleteAccount: () =>
    del<any>(API_ENDPOINTS.AUTH.DELETE_ACCOUNT),
};
