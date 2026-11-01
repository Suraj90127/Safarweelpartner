import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { get, put, patch, post } from '../../api/httpClient';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BankInfo {
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface UpiInfo {
  vpa: string;
}

export interface PayoutMethodState {
  _id?: string;
  bank: BankInfo;
  upi: UpiInfo;
  activeMethod: 'bank' | 'upi' | 'none';
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PayoutMethodState = {
  _id: undefined,
  bank: { holderName: '', bankName: '', accountNumber: '', ifscCode: '' },
  upi: { vpa: '' },
  activeMethod: 'none',
  loading: false,
  saving: false,
  error: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

/** Fetch saved payout method for the logged-in driver */
export const fetchPayoutMethodThunk = createAsyncThunk(
  'payout/fetchMyPayoutMethod',
  async (_, { rejectWithValue }) => {
    try {
      const res = await get<any>('/payout-method/my');
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to fetch payout method');
    }
  }
);

/** Save / update bank account */
export const saveBankThunk = createAsyncThunk(
  'payout/saveBank',
  async (
    data: { holderName: string; bankName: string; accountNumber: string; ifscCode: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await put<any>('/payout-method/bank', data);
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to save bank account');
    }
  }
);

/** Save / update UPI ID */
export const saveUpiThunk = createAsyncThunk(
  'payout/saveUpi',
  async (data: { vpa: string }, { rejectWithValue }) => {
    try {
      const res = await put<any>('/payout-method/upi', data);
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to save UPI ID');
    }
  }
);

/** Switch active method */
export const setActiveMethodThunk = createAsyncThunk(
  'payout/setActiveMethod',
  async (activeMethod: 'bank' | 'upi', { rejectWithValue }) => {
    try {
      const res = await patch<any>('/payout-method/active', { activeMethod });
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to update active method');
    }
  }
);

/** Request a new payout */
export const createPayoutThunk = createAsyncThunk(
  'payout/createPayout',
  async (
    data: { payoutMethodId: string; amount: number; type: 'Bank' | 'Upi' },
    { rejectWithValue }
  ) => {
    try {
      const res = await post<any>('/driver-payout/', data);
      return res;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to request payout');
    }
  }
);

// ─── Helper to extract data from API response ─────────────────────────────────
const extractData = (res: any) => res?.data ?? res;

// ─── Slice ───────────────────────────────────────────────────────────────────
const payoutSlice = createSlice({
  name: 'payout',
  initialState,
  reducers: {
    /** Switch active method locally — no API call */
    setLocalActiveMethod: (state, action: PayloadAction<'bank' | 'upi'>) => {
      state.activeMethod = action.payload;
    },
  },
  extraReducers: builder => {
    // ── fetch ──────────────────────────────────────────────────────────────
    builder
      .addCase(fetchPayoutMethodThunk.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayoutMethodThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        const d = extractData(action.payload);
        state._id = d?._id ?? state._id;
        state.bank = d?.bank ?? initialState.bank;
        state.upi  = d?.upi  ?? initialState.upi;
        state.activeMethod = d?.activeMethod ?? 'none';
      })
      .addCase(fetchPayoutMethodThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ── saveBank ───────────────────────────────────────────────────────────
    builder
      .addCase(saveBankThunk.pending, state => { state.saving = true; state.error = null; })
      .addCase(saveBankThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.saving = false;
        const d = extractData(action.payload);
        state._id = d?._id ?? state._id;
        state.bank = d?.bank ?? state.bank;
        state.activeMethod = d?.activeMethod ?? 'bank';
      })
      .addCase(saveBankThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // ── saveUpi ────────────────────────────────────────────────────────────
    builder
      .addCase(saveUpiThunk.pending, state => { state.saving = true; state.error = null; })
      .addCase(saveUpiThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.saving = false;
        const d = extractData(action.payload);
        state._id = d?._id ?? state._id;
        state.upi = d?.upi ?? state.upi;
        state.activeMethod = d?.activeMethod ?? 'upi';
      })
      .addCase(saveUpiThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // ── setActiveMethod ────────────────────────────────────────────────────
    builder
      .addCase(setActiveMethodThunk.fulfilled, (state, action: PayloadAction<any>) => {
        const d = extractData(action.payload);
        state._id = d?._id ?? state._id;
        state.activeMethod = d?.activeMethod ?? state.activeMethod;
      });
  },
});

export const { setLocalActiveMethod } = payoutSlice.actions;
export default payoutSlice.reducer;
