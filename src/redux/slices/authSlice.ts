import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Platform, NativeModules} from 'react-native';
import {AuthState, Driver, SendOtpRequest, VerifyOtpRequest} from '../../types/auth.types';
import {authApi} from '../../api/authApi';
import {driverApi} from '../../api/driverApi';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import logger from '../../utils/logger';
import { destroySocket } from '../../services/socket/socketClient';
import { stopTracking } from '../../services/location/locationService';

const TAG = 'auth';

type RegisterProfilePayload = {
  name?: string;
  dob?: string;
  gender?: string;
  profile_image_id?: string;
  phone?: string;
  city?: string;
  referral_code?: string;
};

/**
 * Clears all local state, MMKV storage, socket connections, location watchers,
 * native overlay notifications, and redux-persist cache.
 */
export const clearLocalSessionAndStorage = () => {
  try {
    mmkvService.clearTokens();
    mmkvService.clearAll();
  } catch (e) {
    logger.error(TAG, 'Error clearing MMKV storage', e);
  }

  try {
    destroySocket();
  } catch (e) {
    logger.error(TAG, 'Error destroying socket connection', e);
  }

  try {
    stopTracking();
  } catch (e) {
    logger.error(TAG, 'Error stopping location tracking', e);
  }

  try {
    const { PermissionModule } = NativeModules;
    if (Platform.OS === 'android' && PermissionModule) {
      PermissionModule.setLoggedIn?.(false);
      PermissionModule.setOnlineStatus?.(false);
      PermissionModule.stopSound?.();
      PermissionModule.hideFloatingRequest?.();
      PermissionModule.stopFloatingBubble?.();
      PermissionModule.stopFloatingBubbleService?.();
    }
  } catch (e) {
    logger.error(TAG, 'Error clearing native overlay sound/UI', e);
  }

  try {
    const { persistor } = require('../store');
    if (persistor && typeof persistor.purge === 'function') {
      persistor.purge();
    }
  } catch (e) {
    logger.error(TAG, 'Error purging redux-persist storage', e);
  }
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const sendOtpThunk = createAsyncThunk(
  'auth/sendOtp',
  async (payload: SendOtpRequest, {rejectWithValue}) => {
    try {
      const response = await authApi.sendOtp(payload);
      logger.info(TAG, 'OTP sent successfully');
      return response.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to send OTP. Try again.';
      logger.error(TAG, `sendOtp failed: ${message}`);
      return rejectWithValue(message);
    }
  },
);

export const verifyOtpThunk = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: VerifyOtpRequest, {rejectWithValue}) => {
    try {
      const response = await authApi.verifyOtp(payload);
      const token = response.data.token || response.data.accessToken || '';
      const {driver, isSignup} = response.data;
      
      console.log('Received token:', token, 'isSignup:', isSignup);
      // Persist the single token for both access and refresh cases
      mmkvService.setTokens(token, token);
      mmkvService.setString(STORAGE_KEYS.PHONE, payload.phone);
      logger.info(TAG, `Driver authenticated: ${token}`);

      try {
        const { PermissionModule } = NativeModules;
        if (Platform.OS === 'android' && PermissionModule) {
          PermissionModule.setLoggedIn?.(true);
        }
      } catch (e) {
        logger.error(TAG, 'Error setting native logged in status', e);
      }

      // If it is a signup, reset onboarding flags, else sync from backend
      if (isSignup) {
        mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, false);
        mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, false);
        mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
      } else {
        const verified = response.data.is_verified === true || driver?.isVerified === true || (driver as any)?.is_verified === true;
        const hasProfile = Boolean(
          (driver?.name && driver.name.trim().length > 0) ||
          driver?.gender ||
          driver?.dob ||
          driver?.city ||
          driver?.profile_image_id ||
          driver?.documents?.profileSetupComplete ||
          verified
        );

        if (hasProfile) {
          mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
        }

        if (verified) {
          mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
          mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
          mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
          mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);
          mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
          mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
        } else if (driver?.documents) {
          if (driver.documents.dlUploaded) {
            mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
          }
          if (driver.documents.profileSetupComplete) {
            mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
          }
          if (driver.documents.vehicleUploaded) {
            mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
          }
        }
      }

      return {token, driver, isSignup};
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Invalid OTP. Please try again.';
      logger.error(TAG, `verifyOtp failed: ${message}`);
      return rejectWithValue(message);
    }
  },
);

export const registerProfileThunk = createAsyncThunk(
  'auth/registerProfile',
  async (payload: RegisterProfilePayload, {rejectWithValue}) => {
    try {
      const response = await driverApi.registerProfile(payload);
      if (response.success === false) {
        return rejectWithValue(response.message || 'Failed to register profile.');
      }

      const responseData = response.data as any;
      const nestedData = responseData?.data;
      const token =
        responseData?.accessToken ||
        responseData?.access_token ||
        responseData?.token ||
        nestedData?.accessToken ||
        nestedData?.access_token ||
        nestedData?.token;

      if (typeof token === 'string' && token.length > 0) {
        mmkvService.setTokens(token, token);
      }

      const registeredDriver =
        responseData?.driver ||
        responseData?.profile ||
        nestedData?.driver ||
        nestedData?.profile;

      return {
        token: typeof token === 'string' && token.length > 0 ? token : null,
        driver: registeredDriver || null,
        profile: payload,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to register profile.';
      logger.error(TAG, `registerProfile failed: ${message}`);
      return rejectWithValue(message);
    }
  },
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, {rejectWithValue}) => {
    try {
      await authApi.logout();
    } catch {
      // Ignore API errors on logout — always clear local state
    } finally {
      clearLocalSessionAndStorage();
      logger.info(TAG, 'Driver logged out');
    }
  },
);

export const deleteAccountThunk = createAsyncThunk(
  'auth/deleteAccount',
  async (_, {rejectWithValue}) => {
    try {
      await authApi.deleteAccount();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to delete account. Please try again.';
      logger.error(TAG, `deleteAccount failed: ${message}`);
      return rejectWithValue(message);
    } finally {
      clearLocalSessionAndStorage();
      logger.info(TAG, 'Driver account deleted locally');
    }
  },
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AuthState = {
  driver: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        driver: Driver;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      state.driver = action.payload.driver;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      try {
        const { PermissionModule } = NativeModules;
        if (Platform.OS === 'android' && PermissionModule) {
          PermissionModule.setLoggedIn?.(true);
        }
      } catch (e) {
        logger.error(TAG, 'Error setting native logged in status', e);
      }
    },

    updateDriver: (state, action: PayloadAction<Partial<Driver>>) => {
      if (state.driver) {
        state.driver = {...state.driver, ...action.payload};
      }
    },

    clearAuth: state => {
      try {
        clearLocalSessionAndStorage();
      } catch (e) {
        logger.error(TAG, 'Error in clearAuth', e);
      }
      state.driver = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Send OTP
    builder
      .addCase(sendOtpThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOtpThunk.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(sendOtpThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify OTP
    builder
      .addCase(verifyOtpThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtpThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.driver = action.payload.driver;
        state.accessToken = action.payload.token;
        state.refreshToken = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(verifyOtpThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register Profile
    builder
      .addCase(registerProfileThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.driver) {
          state.driver = {
            ...state.driver,
            ...action.payload.driver,
            ...action.payload.profile,
          };
        }
        if (action.payload.token) {
          state.accessToken = action.payload.token;
          state.refreshToken = action.payload.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(registerProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logoutThunk.fulfilled, () => initialState);

    // Delete Account
    builder.addCase(deleteAccountThunk.fulfilled, () => initialState);
  },
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const {setCredentials, updateDriver, clearAuth, setError, clearError} =
  authSlice.actions;

export default authSlice.reducer;
