import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Package, PackageState } from '../../types/package.types';
import { packageApi } from '../../api/packageApi';
import logger from '../../utils/logger';

const TAG = 'package';

const initialState: PackageState = {
  packages: [],
  loading: false,
  buyLoading: false,
  error: null,
};

export const fetchPackagesThunk = createAsyncThunk(
  'package/fetchPackages',
  async (serviceIdArg: any = undefined, { rejectWithValue }) => {
    try {
      const rawId = typeof serviceIdArg === 'object' && serviceIdArg ? (serviceIdArg._id || serviceIdArg.id) : serviceIdArg;
      const serviceId = rawId && rawId !== '[object Object]' ? String(rawId).trim() : undefined;
      const response = await packageApi.getPackages(serviceId);
      logger.info(TAG, `Packages fetched successfully${serviceId ? ` for serviceId: ${serviceId}` : ''}`);
      return response.data;
    } catch (error: any) {
      logger.error(TAG, 'Failed to fetch packages', error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch packages'
      );
    }
  }
);

export const buyPackageThunk = createAsyncThunk(
  'package/buyPackage',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await packageApi.buyPackage(id);
      logger.info(TAG, `Package ${id} bought successfully`);
      return response.data;
    } catch (error: any) {
      logger.error(TAG, `Failed to buy package ${id}`, error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to buy package'
      );
    }
  }
);

const packageSlice = createSlice({
  name: 'package',
  initialState,
  reducers: {
    clearPackageError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackagesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackagesThunk.fulfilled, (state, action: PayloadAction<Package[]>) => {
        state.loading = false;
        state.packages = action.payload || [];
      })
      .addCase(fetchPackagesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(buyPackageThunk.pending, (state) => {
        state.buyLoading = true;
        state.error = null;
      })
      .addCase(buyPackageThunk.fulfilled, (state) => {
        state.buyLoading = false;
      })
      .addCase(buyPackageThunk.rejected, (state, action) => {
        state.buyLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPackageError } = packageSlice.actions;
export default packageSlice.reducer;
