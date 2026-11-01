import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { alertApi, AlertData } from '../../api/alertApi';
import logger from '../../utils/logger';

const TAG = 'alertSlice';

export interface AlertState {
  alerts: AlertData[];
  loading: boolean;
  error: string | null;
}

const initialState: AlertState = {
  alerts: [],
  loading: false,
  error: null,
};

export const fetchAlertsByTypeThunk = createAsyncThunk(
  'alert/fetchByType',
  async (userType: string, { rejectWithValue }) => {
    try {
      const response = await alertApi.getAlertsByType(userType);
      return response?.data || [];
    } catch (error: any) {
      logger.error(TAG, 'Failed to fetch alerts by type:', error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch alerts'
      );
    }
  }
);

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    clearAlerts: (state) => {
      state.alerts = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlertsByTypeThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAlertsByTypeThunk.fulfilled,
        (state, action: PayloadAction<AlertData[]>) => {
          state.loading = false;
          state.alerts = action.payload;
        }
      )
      .addCase(fetchAlertsByTypeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAlerts } = alertSlice.actions;
export default alertSlice.reducer;
