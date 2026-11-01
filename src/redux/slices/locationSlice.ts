import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocationState, LatLng } from '../../types/location.types';

const initialState: LocationState = {
  currentLocation: null,
  heading: 0,
  speed: 0,
  isTracking: false,
  permissionGranted: false,
  error: null,
  lastUpdated: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (
      state,
      action: PayloadAction<{ location: LatLng; heading?: number; speed?: number }>,
    ) => {
      state.currentLocation = action.payload.location;
      state.heading = action.payload.heading ?? state.heading;
      state.speed = action.payload.speed ?? state.speed;
      state.lastUpdated = Date.now();
      state.error = null;
    },

    setIsTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },

    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
    },

    setLocationError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    resetLocation: () => initialState,
  },
});

export const {
  setCurrentLocation,
  setIsTracking,
  setPermissionGranted,
  setLocationError,
  resetLocation,
} = locationSlice.actions;

export default locationSlice.reducer;
