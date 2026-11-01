import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {RideState, RideRequest, ActiveRide} from '../../types/ride.types';
import {rideApi} from '../../api/rideApi';
import {packageApi} from '../../api/packageApi';
import logger from '../../utils/logger';

const TAG = 'ride';

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'active', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'no', 'inactive', 'disabled'].includes(normalized)) return false;
  }
  return undefined;
};

const extractHasActivePackage = (payload: any): boolean => {
  if (!payload || typeof payload !== 'object') return false;

  const directCandidates = [
    payload.valid,
    payload.isValid,
    payload.hasActivePackage,
    payload.hasPackage,
    payload.isActive,
    payload.active,
    payload.subscriptionActive,
    payload.planActive,
    payload?.data?.valid,
    payload?.data?.isValid,
    payload?.data?.hasActivePackage,
    payload?.data?.hasPackage,
    payload?.data?.isActive,
    payload?.data?.active,
    payload?.data?.subscriptionActive,
    payload?.data?.planActive,
  ];

  for (const candidate of directCandidates) {
    const parsed = toBoolean(candidate);
    if (parsed !== undefined) return parsed;
  }

  const statusCandidates = [
    payload.status,
    payload.packageStatus,
    payload.subscriptionStatus,
    payload?.data?.status,
    payload?.data?.packageStatus,
    payload?.data?.subscriptionStatus,
  ];

  for (const candidate of statusCandidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim().toLowerCase();
    if (['active', 'activated', 'valid'].includes(normalized)) return true;
    if (['inactive', 'expired', 'invalid', 'cancelled', 'canceled'].includes(normalized)) return false;
  }

  // Last-resort nested package object checks
  const packageNode = payload.package ?? payload.currentPackage ?? payload.subscription ?? payload?.data?.package ?? payload?.data?.currentPackage ?? payload?.data?.subscription;
  if (packageNode && typeof packageNode === 'object') {
    const nestedDirect = [
      packageNode.valid,
      packageNode.isValid,
      packageNode.isActive,
      packageNode.active,
      packageNode.hasActivePackage,
      packageNode.hasPackage,
    ];
    for (const candidate of nestedDirect) {
      const parsed = toBoolean(candidate);
      if (parsed !== undefined) return parsed;
    }

    if (typeof packageNode.status === 'string') {
      const normalized = packageNode.status.trim().toLowerCase();
      if (['active', 'activated', 'valid'].includes(normalized)) return true;
      if (['inactive', 'expired', 'invalid', 'cancelled', 'canceled'].includes(normalized)) return false;
    }
  }

  return false;
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const acceptRideThunk = createAsyncThunk(
  'ride/accept',
  async (rideId: string, {rejectWithValue}) => {
    try {
      const response = await rideApi.acceptRide(rideId);
      logger.info(TAG, `Ride ${rideId} accepted`);
      const resData = response?.data as any;
      return resData?.ride ?? resData?.data?.ride ?? resData?.data ?? resData;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.message;
      if (status === 409) {
        return rejectWithValue(
          message || 'This ride is no longer available or was accepted by another driver.',
        );
      }
      return rejectWithValue(message || 'Failed to accept ride');
    }
  },
);

export const rejectRideThunk = createAsyncThunk(
  'ride/reject',
  async ({rideId, reason}: {rideId: string; reason?: string}, {rejectWithValue}) => {
    try {
      await rideApi.rejectRide(rideId, reason);
      logger.info(TAG, `Ride ${rideId} rejected`);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to reject ride');
    }
  },
);

export const startRideThunk = createAsyncThunk(
  'ride/start',
  async ({rideId, otp}: {rideId: string; otp: string}, {rejectWithValue}) => {
    try {
      await rideApi.startRide(rideId, otp);
      logger.info(TAG, `Ride ${rideId} started`);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to start ride');
    }
  },
);

export const arrivedAtPickupThunk = createAsyncThunk(
  'ride/arrived',
  async (rideId: string, {rejectWithValue}) => {
    try {
      await rideApi.arrivedAtPickup(rideId);
      logger.info(TAG, `Arrived at pickup for ride ${rideId}`);
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to update status');
    }
  },
);

export const completeRideThunk = createAsyncThunk(
  'ride/complete',
  async (
    payload: string | { rideId: string; fare?: number; distance?: number; duration?: number; [key: string]: any },
    { rejectWithValue }
  ) => {
    try {
      const rideId = typeof payload === 'string' ? payload : payload.rideId;
      
      const trafficTime = mmkvService.getNumber(STORAGE_KEYS.TRAFFIC_TIME) || 0;
      const stopTime = mmkvService.getNumber(STORAGE_KEYS.STOP_TIME) || 0;
      const trackedDistance = mmkvService.getNumber(STORAGE_KEYS.TRACKED_RIDE_DISTANCE) || 0;
      const trackedDuration = mmkvService.getNumber(STORAGE_KEYS.TRACKED_RIDE_DURATION) || 0;

      const actualDistanceKm = parseFloat((trackedDistance / 1000).toFixed(2));
      const actualDurationMins = Math.round(trackedDuration / 60);

      const requestBody = {
        trafficTime,
        stopTime,      
        actualDistance: actualDistanceKm,
        actualDuration: actualDurationMins,
        ...(typeof payload === 'object' ? payload : {}),
      };

      logger.info(TAG, `Completing ride ${rideId} with data:`, requestBody);

      const response = await rideApi.completeRide(rideId, requestBody);
      logger.info(TAG, `Ride ${rideId} completed successfully`);

      mmkvService.delete(STORAGE_KEYS.TRAFFIC_TIME);
      mmkvService.delete(STORAGE_KEYS.STOP_TIME);
      mmkvService.delete(STORAGE_KEYS.TRACKED_RIDE_DISTANCE);
      mmkvService.delete(STORAGE_KEYS.TRACKED_RIDE_DURATION);
      mmkvService.delete(STORAGE_KEYS.TRACKED_RIDE_START_TIME);

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to complete ride');
    }
  },
);

export const cancelRideThunk = createAsyncThunk(
  'ride/cancel',
  async ({rideId, cancelReason}: {rideId: string; cancelReason: string}, {rejectWithValue}) => {
    try {
      const response = await rideApi.cancelRide(rideId, cancelReason);
      logger.info(TAG, `Ride ${rideId} cancelled`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to cancel ride');
    }
  },
);

export const createDynamicQRThunk = createAsyncThunk(
  'ride/createDynamicQR',
  async (amount: number, { rejectWithValue }) => {
    try {
      const response = await rideApi.createDynamicQR(amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to create dynamic QR');
    }
  }
);

export const getMyDriverRidesThunk = createAsyncThunk(
  'ride/getMyDriverRides',
  async (params: {status?: string; limit?: number} | undefined = {}, {rejectWithValue}) => {
    try {
      const response = await rideApi.getDriverRides(params.status, params.limit);
      logger.info(TAG, `My driver rides fetched, status: ${params.status}, limit: ${params.limit}`);
      return response.data || [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch driver rides');
    }
  },
);

export const getActiveDriverRideThunk = createAsyncThunk(
  'ride/getActiveDriverRide',
  async (_, {rejectWithValue}) => {
    try {
      const response = await rideApi.getActiveDriverRide();
      logger.info(TAG, 'Active driver ride fetched successfully');
      const resData = response?.data as any;
      return resData?.ride ?? resData?.data?.ride ?? resData?.data ?? resData;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch active ride');
    }
  },
);

// Fetch first two rides for free-ride eligibility check
export const fetchFirstTwoRidesThunk = createAsyncThunk(
  'ride/fetchFirstTwoRides',
  async (_, {rejectWithValue}) => {
    try {
      const response = await rideApi.getDriverFirstTwoRides();
      logger.info(TAG, 'First two rides fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.error(TAG, 'Failed to fetch first two rides', error);
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch first two rides');
    }
  },
);

// Validate user package — checks if driver has an active package
export const validateUserPackageThunk = createAsyncThunk(
  'ride/validateUserPackage',
  async (_, {rejectWithValue}) => {
    try {
      const response = await packageApi.validateUser();
      logger.info(TAG, 'Package validation fetched successfully');
      return response.data;
    } catch (error: any) {
      logger.error(TAG, 'Failed to validate user package', error);
      return rejectWithValue(error?.response?.data?.message || 'Failed to validate package');
    }
  },
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: RideState = {
  incomingRequest: null,
  availableOrders: [],
  activeRide: null,
  rideHistory: [],
  isLoading: false,
  error: null,
  acceptTimeout: null,
  // Ride eligibility
  firstTwoRides: Array((mmkvService.getNumber(STORAGE_KEYS.FIRST_TWO_RIDES_COUNT) ?? 0)).fill({}),
  freeRideLimit: mmkvService.getNumber(STORAGE_KEYS.FREE_RIDE_LIMIT) ?? 2,
  hasActivePackage: mmkvService.getBoolean(STORAGE_KEYS.HAS_ACTIVE_PACKAGE) ?? null,   // null = not yet fetched
  eligibilityLoading: false,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const rideSlice = createSlice({
  name: 'ride',
  initialState,
  reducers: {
    setIncomingRequest: (state, action: PayloadAction<RideRequest | null>) => {
      state.incomingRequest = action.payload;
      if (action.payload && action.payload.id) {
        const exists = state.availableOrders.some(o => o.id === action.payload!.id);
        if (!exists) {
          state.availableOrders.unshift(action.payload);
        } else {
          state.availableOrders = state.availableOrders.map(o =>
            o.id === action.payload!.id ? action.payload! : o,
          );
        }
      }
    },

    setAvailableOrders: (state, action: PayloadAction<RideRequest[]>) => {
      state.availableOrders = action.payload;
    },

    addAvailableOrder: (state, action: PayloadAction<RideRequest>) => {
      if (action.payload && action.payload.id) {
        const exists = state.availableOrders.some(o => o.id === action.payload.id);
        if (!exists) {
          state.availableOrders.unshift(action.payload);
        } else {
          state.availableOrders = state.availableOrders.map(o =>
            o.id === action.payload.id ? action.payload : o,
          );
        }
      }
    },

    removeAvailableOrder: (state, action: PayloadAction<string>) => {
      const targetId = String(action.payload);
      state.availableOrders = state.availableOrders.filter(
        o =>
          o &&
          String(o.id) !== targetId &&
          String((o as any)._id) !== targetId &&
          String((o as any).rideId) !== targetId,
      );
    },

    updateIncomingRequestFare: (state, action: PayloadAction<{rideId: string; extraIncreaseFare: number; totalFare: number}>) => {
      if (state.incomingRequest && state.incomingRequest.id === action.payload.rideId) {
        state.incomingRequest.fare.surge = action.payload.extraIncreaseFare;
        state.incomingRequest.fare.total = action.payload.totalFare;
      }
      state.availableOrders = state.availableOrders.map(o => {
        if (o.id === action.payload.rideId) {
          return {
            ...o,
            fare: {
              ...o.fare,
              surge: action.payload.extraIncreaseFare,
              total: action.payload.totalFare,
            },
          };
        }
        return o;
      });
    },

    setActiveRide: (state, action: PayloadAction<ActiveRide | null>) => {
      state.activeRide = action.payload;
      state.incomingRequest = null;
      if (action.payload?.id) {
        state.availableOrders = state.availableOrders.filter(o => o.id !== action.payload!.id);
      }
    },

    updateActiveRide: (state, action: PayloadAction<Partial<ActiveRide>>) => {
      if (state.activeRide) {
        state.activeRide = {...state.activeRide, ...action.payload};
      }
    },

    completeRide: state => {
      if (state.activeRide) {
        state.rideHistory.unshift({...state.activeRide, status: 'completed'});
      }
      state.activeRide = null;
      state.incomingRequest = null;
    },

    clearRide: state => {
      state.incomingRequest = null;
      state.activeRide = null;
    },

    setAcceptTimeout: (state, action: PayloadAction<number | null>) => {
      state.acceptTimeout = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
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
    // Accept Ride
    builder
      .addCase(acceptRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(acceptRideThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const unwrapped = (action.payload?.ride ?? action.payload?.data?.ride ?? action.payload?.data ?? action.payload) as ActiveRide;
        state.activeRide = unwrapped;
        state.incomingRequest = null;
      })
      .addCase(acceptRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.activeRide = null;
      });

    // Reject Ride
    builder
      .addCase(rejectRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(rejectRideThunk.fulfilled, state => {
        state.isLoading = false;
        state.incomingRequest = null;
      })
      .addCase(rejectRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Start Ride
    builder
      .addCase(startRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startRideThunk.fulfilled, state => {
        state.isLoading = false;
        if (state.activeRide) {
          state.activeRide.status = 'ongoing';
        }
      })
      .addCase(startRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Arrived at Pickup
    builder
      .addCase(arrivedAtPickupThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(arrivedAtPickupThunk.fulfilled, state => {
        state.isLoading = false;
        if (state.activeRide) {
          state.activeRide.status = 'driver_arrived';
        }
      })
      .addCase(arrivedAtPickupThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Complete Ride
    builder
      .addCase(completeRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeRideThunk.fulfilled, state => {
        state.isLoading = false;
        if (state.activeRide) {
          state.rideHistory.unshift({...state.activeRide, status: 'completed'});
        }
        state.activeRide = null;
        state.incomingRequest = null;
      })
      .addCase(completeRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Ride
    builder
      .addCase(cancelRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelRideThunk.fulfilled, state => {
        state.isLoading = false;
        if (state.activeRide) {
          state.rideHistory.unshift({...state.activeRide, status: 'cancelled'});
        }
        state.activeRide = null;
        state.incomingRequest = null;
      })
      .addCase(cancelRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get My Driver Rides
    builder
      .addCase(getMyDriverRidesThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMyDriverRidesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rideHistory = action.payload;
      })
      .addCase(getMyDriverRidesThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get Active Driver Ride
    builder
      .addCase(getActiveDriverRideThunk.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getActiveDriverRideThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const unwrapped = (action.payload?.ride ?? action.payload?.data?.ride ?? action.payload?.data ?? action.payload) as ActiveRide;
        state.activeRide = unwrapped;
      })
      .addCase(getActiveDriverRideThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch First Two Rides (free-ride eligibility)
    builder
      .addCase(fetchFirstTwoRidesThunk.pending, state => {
        state.eligibilityLoading = true;
      })
      .addCase(fetchFirstTwoRidesThunk.fulfilled, (state, action) => {
        state.eligibilityLoading = false;
        const payload = action.payload;
        const rides = Array.isArray(payload)
          ? payload
          : payload?.rides ?? payload?.data?.rides ?? payload?.data ?? [];
        const limit = payload?.freeRideLimit ?? payload?.data?.freeRideLimit ?? 2;
        state.firstTwoRides = rides;
        state.freeRideLimit = limit;
        mmkvService.setNumber(STORAGE_KEYS.FIRST_TWO_RIDES_COUNT, rides.length);
        mmkvService.setNumber(STORAGE_KEYS.FREE_RIDE_LIMIT, limit);
      })
      .addCase(fetchFirstTwoRidesThunk.rejected, state => {
        state.eligibilityLoading = false;
        // Do NOT reset to 0 on network/API failure — keep the last known good
        // MMKV value so drivers aren't falsely allowed extra free rides.
      });

    // Validate User Package (active package check)
    builder
      .addCase(validateUserPackageThunk.pending, state => {
        state.eligibilityLoading = true;
      })
      .addCase(validateUserPackageThunk.fulfilled, (state, action) => {
        state.eligibilityLoading = false;
        const payload = action.payload;
        const hasActive = extractHasActivePackage(payload);
        state.hasActivePackage = hasActive;
        mmkvService.setBoolean(STORAGE_KEYS.HAS_ACTIVE_PACKAGE, hasActive);
      })
      .addCase(validateUserPackageThunk.rejected, state => {
        state.eligibilityLoading = false;
        // Do NOT override to false on network/API failure — a driver who has an
        // active package must not get blocked because the request timed out.
        // MMKV keeps the last successful API result; Redux keeps it too.
      });
  },
});


// ─── Exports ─────────────────────────────────────────────────────────────────

export const {
  setIncomingRequest,
  setAvailableOrders,
  addAvailableOrder,
  removeAvailableOrder,
  updateIncomingRequestFare,
  setActiveRide,
  updateActiveRide,
  completeRide,
  clearRide,
  setAcceptTimeout,
  setLoading,
  setError,
  clearError,
} = rideSlice.actions;

export default rideSlice.reducer;
