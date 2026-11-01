/**
 * Axios HTTP Client
 * - JWT injection
 * - Token refresh on 401
 * - Request / response interceptors
 * - Typed responses
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { ApiResponse } from '../types/api.types';
import ENV from '../config/env';
import mmkvService from '../services/storage/mmkvService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import logger from '../utils/logger';

const TAG = 'HttpClient';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const httpClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach access token ──────────────────────────────

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = mmkvService.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug(TAG, `→ ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => Promise.reject(error),
);

// ─── Response interceptor — handle 401 with token refresh ───────────────────

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    logger.debug(TAG, `← ${response.status} ${response.config.url}`);
    return response;
  },
  async error => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } =
      error.config;

    const isAuthRequest = originalRequest.url && (
      originalRequest.url.includes('send-otp') ||
      originalRequest.url.includes('verify-otp') ||
      originalRequest.url.includes('refresh')
    );

    const isProfileSetup = mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE);
    const shouldSkipRefresh = isAuthRequest || !isProfileSetup;

    console.log('[HttpClient] response interceptor error:', {
      url: originalRequest.url,
      status: error.response?.status,
      isAuthRequest,
      isProfileSetup,
      shouldSkipRefresh
    });

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return httpClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = mmkvService.getRefreshToken();
        const response = await axios.post(
          `${ENV.API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`,
          { refreshToken },
        );
        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;
        mmkvService.setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return httpClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        mmkvService.clearTokens();
        try {
          const { store } = require('../redux/store');
          const { clearAuth } = require('../redux/slices/authSlice');
          if (store && clearAuth) {
            store.dispatch(clearAuth());
          }
        } catch (dispatchErr) {
          logger.error(TAG, 'Failed to dispatch clearAuth', dispatchErr);
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    logger.error(
      TAG,
      `← ${error.response?.status} ${error.config?.url}: ${error.message}`,
    );
    return Promise.reject(error);
  },
);

// ─── Typed request helpers ───────────────────────────────────────────────────

export const get = <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> =>
  httpClient.get<ApiResponse<T>>(url, config).then(r => r.data);

export const post = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> =>
  httpClient.post<ApiResponse<T>>(url, data, config).then(r => r.data);

export const put = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> =>
  httpClient.put<ApiResponse<T>>(url, data, config).then(r => r.data);

export const patch = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> =>
  httpClient.patch<ApiResponse<T>>(url, data, config).then(r => r.data);

export const del = <T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> =>
  httpClient.delete<ApiResponse<T>>(url, config).then(r => r.data);

export default httpClient;
