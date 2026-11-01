import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {DriverState, DashboardStats, EarningsSummary, ReferralSummaryResponse} from '../../types/driver.types';
import {Driver} from '../../types/auth.types';
import {driverApi} from '../../api/driverApi';
import logger from '../../utils/logger';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const TAG = 'driver';

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchDriverProfileThunk = createAsyncThunk(
  'driver/fetchProfile',
  async (isnotverify: boolean | undefined, {rejectWithValue}) => {
    try {
      const response = await driverApi.getProfile(isnotverify);
      logger.info(TAG, 'Driver profile fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch profile');
    }
  },
);

export const toggleOnlineStatusThunk = createAsyncThunk(
  'driver/toggleOnline',
  async (isOnline: boolean, {rejectWithValue}) => {
    try {
      await driverApi.updateStatus(isOnline);
      logger.info(TAG, `Driver status: ${isOnline ? 'online' : 'offline'}`);
      return isOnline;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to update status');
    }
  },
);

export const fetchDashboardStatsThunk = createAsyncThunk(
  'driver/fetchDashboard',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getDashboardStats();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch stats');
    }
  },
);

export const updateDriverProfileThunk = createAsyncThunk(
  'driver/updateProfile',
  async (payload: { name?: string; last_name?: string; dob?: string; gender?: string; phone?: string; city?: string; email?: string }, {rejectWithValue}) => {
    try {
      const response = await driverApi.updateProfile(payload);
      logger.info(TAG, 'Driver profile updated');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to update profile');
    }
  },
);

export const fetchMyVehicleThunk = createAsyncThunk(
  'driver/fetchVehicle',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getMyVehicle();
      logger.info(TAG, 'Driver vehicle fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch vehicle details');
    }
  },
);

export const fetchReferralsThunk = createAsyncThunk(
  'driver/fetchReferrals',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getReferrals();
      logger.info(TAG, 'Driver referrals fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch referrals');
    }
  },
);

export const fetchDriverDocumentsThunk = createAsyncThunk(
  'driver/fetchDocuments',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getDriverDocuments();
      logger.info(TAG, 'Driver documents fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch documents');
    }
  },
);

export const fetchDriverRatingThunk = createAsyncThunk(
  'driver/fetchRating',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getRating();
      logger.info(TAG, 'Driver rating fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch rating');
    }
  },
);

export const fetchIncentiveSummaryThunk = createAsyncThunk(
  'driver/fetchIncentiveSummary',
  async (serviceIdArg: any, {rejectWithValue}) => {
    try {
      const rawId = typeof serviceIdArg === 'object' && serviceIdArg ? (serviceIdArg._id || serviceIdArg.id) : serviceIdArg;
      const serviceId = String(rawId || '').trim();
      if (!serviceId || serviceId === '[object Object]') {
        return rejectWithValue('Invalid service ID');
      }
      const response = await driverApi.getIncentiveSummary(serviceId);
      logger.info(TAG, 'Driver incentive summary fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch incentive summary');
    }
  },
);

export const fetchRateCardsThunk = createAsyncThunk(
  'driver/fetchRateCards',
  async (serviceIdArg: any, {rejectWithValue}) => {
    try {
      const rawId = typeof serviceIdArg === 'object' && serviceIdArg ? (serviceIdArg._id || serviceIdArg.id) : serviceIdArg;
      const serviceId = String(rawId || '').trim();
      if (!serviceId || serviceId === '[object Object]') {
        return rejectWithValue('Invalid service ID');
      }
      const response = await driverApi.getRateCardByService(serviceId);
      logger.info(TAG, 'Driver rate cards fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch rate cards');
    }
  },
);

export const fetchReferralEarnThunk = createAsyncThunk(
  'driver/fetchReferralEarn',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getReferralEarn();
      logger.info(TAG, 'Driver referral earn fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch referral earn details');
    }
  },
);

export const fetchReferralSummaryThunk = createAsyncThunk(
  'driver/fetchReferralSummary',
  async (_, {rejectWithValue}) => {
    try {
      const response = await driverApi.getReferralSummary();
      logger.info(TAG, 'Driver referral summary fetched');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch referral summary');
    }
  },
);

const getSavedDashboardStats = (): DashboardStats | null => {
  try {
    const json = mmkvService.getString(STORAGE_KEYS.DASHBOARD_STATS);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: DriverState = {
  profile: null,
  isOnline: false,
  dashboardStats: getSavedDashboardStats(),
  earnings: null,
  isLoading: false,
  error: null,
  vehicle: null,
  referrals: [],
  referralsLoading: false,
  referralsError: null,
  driverDocument: null,
  documentsLoading: false,
  documentsError: null,
  ratingDetails: null,
  ratingLoading: false,
  ratingError: null,
  incentives: null,
  incentivesLoading: false,
  incentivesError: null,
  rateCards: null,
  rateCardsLoading: false,
  rateCardsError: null,
  referralEarn: null,
  referralEarnLoading: false,
  referralEarnError: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Driver>) => {
      state.profile = action.payload;
    },

    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (state.profile) {
        state.profile.isOnline = action.payload;
      }
    },

    setDashboardStats: (state, action: PayloadAction<DashboardStats>) => {
      state.dashboardStats = action.payload;
    },

    setEarnings: (state, action: PayloadAction<EarningsSummary>) => {
      state.earnings = action.payload;
    },

    incrementTripCount: state => {
      if (state.profile) {
        state.profile.totalTrips += 1;
      }
      if (state.dashboardStats) {
        state.dashboardStats.totalTrips += 1;
      }
    },

    updateEarnings: (state, action: PayloadAction<number>) => {
      if (state.dashboardStats) {
        state.dashboardStats.todayEarnings += action.payload;
        state.dashboardStats.weeklyEarnings += action.payload;
      }
      if (state.earnings) {
        state.earnings.today += action.payload;
        state.earnings.weekly += action.payload;
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    resetDriver: () => initialState,
  },
  extraReducers: builder => {
    // Fetch Driver Profile
    builder
      .addCase(fetchDriverProfileThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDriverProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        const profile = action.payload;
        if (profile) {
          const isVerified = Boolean(
            profile.isVerified ||
            (profile as any).is_verified ||
            profile.status === 'available' ||
            profile.status === 'on_ride' ||
            profile.status === 'offline'
          );

          const hasProfileInfo = Boolean(
            (profile.name && profile.name.trim().length > 0) ||
            profile.gender ||
            profile.dob ||
            profile.city ||
            profile.profile_image_id ||
            profile.documents?.profileSetupComplete ||
            isVerified
          );

          if (hasProfileInfo) {
            mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
          }

          if (isVerified) {
            mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
            mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
          } else if (profile.documents) {
            if (profile.documents.dlUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
            }
            if (profile.documents.profileSetupComplete) {
              mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
            }
            if (profile.documents.vehicleUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
            }
            if (profile.documents.rcUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);
            }
            if (profile.documents.aadhaarPanUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
            }
          }
        }
      })
      .addCase(fetchDriverProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Toggle Online Status
    builder
      .addCase(toggleOnlineStatusThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(toggleOnlineStatusThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isOnline = action.payload;
        if (state.profile) {
          state.profile.isOnline = action.payload;
        }
      })
      .addCase(toggleOnlineStatusThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Dashboard Stats
    builder
      .addCase(fetchDashboardStatsThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardStats = action.payload;
        if (action.payload) {
          try {
            mmkvService.setString(STORAGE_KEYS.DASHBOARD_STATS, JSON.stringify(action.payload));
          } catch (e) {
            console.log('[driverSlice] Error storing dashboardStats to MMKV', e);
          }
        }
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Driver Profile
    builder
      .addCase(updateDriverProfileThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDriverProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile = { ...state.profile, ...action.payload };
        } else {
          state.profile = action.payload;
        }
      })
      .addCase(updateDriverProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch My Vehicle
    builder
      .addCase(fetchMyVehicleThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyVehicleThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicle = action.payload;

      })
      .addCase(fetchMyVehicleThunk.rejected, (state, action) => {
    
        state.isLoading = false;
        state.vehicle = [];
        state.error = action.payload as string;
      });

    // Fetch Referrals
    builder
      .addCase(fetchReferralsThunk.pending, state => {
        state.referralsLoading = true;
        state.referralsError = null;
      })
      .addCase(fetchReferralsThunk.fulfilled, (state, action) => {
        state.referralsLoading = false;
        state.referrals = action.payload?.referrals || [];
        if (state.profile) {
          state.profile.totalReferrals = action.payload?.totalReferrals ?? state.profile.totalReferrals;
        }
      })
      .addCase(fetchReferralsThunk.rejected, (state, action) => {
        state.referralsLoading = false;
        state.referralsError = action.payload as string;
      });

    // Fetch Driver Documents
    builder
      .addCase(fetchDriverDocumentsThunk.pending, state => {
        state.documentsLoading = true;
        state.documentsError = null;
      })
      .addCase(fetchDriverDocumentsThunk.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.driverDocument = action.payload;
      })
      .addCase(fetchDriverDocumentsThunk.rejected, (state, action) => {
        state.documentsLoading = false;
        state.documentsError = action.payload as string;
      });

    // Fetch Driver Rating
    builder
      .addCase(fetchDriverRatingThunk.pending, state => {
        state.ratingLoading = true;
        state.ratingError = null;
      })
      .addCase(fetchDriverRatingThunk.fulfilled, (state, action) => {
        state.ratingLoading = false;
        state.ratingDetails = action.payload;
      })
      .addCase(fetchDriverRatingThunk.rejected, (state, action) => {
        state.ratingLoading = false;
        state.ratingError = action.payload as string;
      });

    // Fetch Incentive Summary
    builder
      .addCase(fetchIncentiveSummaryThunk.pending, state => {
        state.incentivesLoading = true;
        state.incentivesError = null;
      })
      .addCase(fetchIncentiveSummaryThunk.fulfilled, (state, action) => {
        state.incentivesLoading = false;
        state.incentives = action.payload.incentives;
      })
      .addCase(fetchIncentiveSummaryThunk.rejected, (state, action) => {
        state.incentivesLoading = false;
        state.incentivesError = action.payload as string;
      });

    // Fetch Rate Cards
    builder
      .addCase(fetchRateCardsThunk.pending, state => {
        state.rateCardsLoading = true;
        state.rateCardsError = null;
      })
      .addCase(fetchRateCardsThunk.fulfilled, (state, action) => {
        state.rateCardsLoading = false;
        state.rateCards = action.payload;
      })
      .addCase(fetchRateCardsThunk.rejected, (state, action) => {
        state.rateCardsLoading = false;
        state.rateCardsError = action.payload as string;
      });

    // Fetch Referral Earn Schemes
    builder
      .addCase(fetchReferralEarnThunk.pending, state => {
        state.referralEarnLoading = true;
        state.referralEarnError = null;
      })
      .addCase(fetchReferralEarnThunk.fulfilled, (state, action) => {
        state.referralEarnLoading = false;
        state.referralEarn = action.payload;
      })
      .addCase(fetchReferralEarnThunk.rejected, (state, action) => {
        state.referralEarnLoading = false;
        state.referralEarnError = action.payload as string;
      });

    // Fetch Referral Summary
    builder
      .addCase(fetchReferralSummaryThunk.pending, state => {
        // Handled silently or load state
             state.referralEarnLoading = true;
        state.referralEarnError = null;
      })
      .addCase(fetchReferralSummaryThunk.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.totalReferrals = action.payload?.referralCount ?? state.profile.totalReferrals;
          state.profile.referralEarnings = action.payload?.referralEarnings ?? state.profile.referralEarnings;
          state.profile.referral_code = action.payload?.referral_code ?? state.profile.referral_code;
        }
      })
      .addCase(fetchReferralSummaryThunk.rejected, (state, action) => {
        // Rejection handled silently
      });
  },
});

// ─── Exports ─────────────────────────────────────────────────────────────────

export const {
  setProfile,
  setOnlineStatus,
  setDashboardStats,
  setEarnings,
  incrementTripCount,
  updateEarnings,
  setLoading,
  setError,
  resetDriver,
} = driverSlice.actions;

export default driverSlice.reducer;
