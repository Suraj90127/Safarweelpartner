import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { transactionApi } from '../../api/transactionApi';
import logger from '../../utils/logger';

const TAG = 'transaction';

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface TransactionDetails {
  refNo: string;
  method: string;
  subtotal: number;
  fee: number;
  net: number;
}

export interface Transaction {
  id: string;
  type: 'earning' | 'payout' | 'pass' | 'recharge';
  amount: number;
  timestamp: string;
  status: 'completed' | 'processing' | 'failed';
  title: string;
  subtitle: string;
  details: TransactionDetails;
}

export interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  loading: false,
  error: null,
};

// ─── MAPPER FOR ROBUST BACKEND INTEGRATION ──────────────────────────────────
const mapBackendTransaction = (backendTxn: any): Transaction => {
  const id = backendTxn.id || backendTxn._id || `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  // Map type: fallback to 'earning'
  let type: 'earning' | 'payout' | 'pass' | 'recharge' = 'earning';
  const rawType = [
    backendTxn.type,
    backendTxn.category,
    backendTxn.title,
    backendTxn.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (
    rawType.includes('recharge') ||
    /top[\s_-]?up/.test(rawType) ||
    /wallet[\s_-]?(credit|fund|add)/.test(rawType) ||
    /add[\s_-]?money/.test(rawType) ||
    /fund[\s_-]?wallet/.test(rawType)
  ) {
    type = 'recharge';
  } else if (rawType.includes('payout') || rawType.includes('withdraw') || rawType.includes('debit')) {
    type = 'payout';
  } else if (rawType.includes('pass') || rawType.includes('package') || rawType.includes('purchase')) {
    type = 'pass';
  }
  
  // Map status: fallback to 'completed'
  let status: 'completed' | 'processing' | 'failed' = 'completed';
  const rawStatus = String(backendTxn.status || '').toLowerCase();
  if (rawStatus === 'processing' || rawStatus === 'pending' || rawStatus === 'initiated' || rawStatus === 'active') {
    status = 'processing';
  } else if (rawStatus === 'failed' || rawStatus === 'rejected') {
    status = 'failed';
  }
  
  const amount = Number(backendTxn.amount ?? 0);
  
  // Map date / timestamp format
  let timestamp = backendTxn.timestamp || '';
  if (!timestamp && backendTxn.createdAt) {
    try {
      const date = new Date(backendTxn.createdAt);
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      timestamp = date.toLocaleString('en-US', options).replace(',', '');
    } catch {
      timestamp = backendTxn.createdAt;
    }
  }
  if (!timestamp) {
    timestamp = new Date().toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', '');
  }

  const title =
    backendTxn.title ||
    (type === 'earning'
      ? 'Ride Earning'
      : type === 'payout'
        ? 'Instant Payout'
        : type === 'recharge'
          ? 'Wallet Recharge'
          : 'Zero-Comm Pass');
  const subtitle =
    backendTxn.subtitle ||
    backendTxn.description ||
    (type === 'earning'
      ? 'Ride Fare Earning'
      : type === 'payout'
        ? 'to Payout Method'
        : type === 'recharge'
          ? 'Wallet top-up'
          : 'Pass purchase');

  const detailsObj = backendTxn.details || {};
  const refNo = detailsObj.refNo || backendTxn.referenceId || backendTxn.refNo || backendTxn.transactionId || id;
  const method = detailsObj.method || backendTxn.paymentMethod || backendTxn.method || (type === 'payout' ? 'Bank / UPI' : 'Wallet');
  const subtotal = Number(detailsObj.subtotal ?? backendTxn.subtotal ?? amount);
  const fee = Number(detailsObj.fee ?? backendTxn.fee ?? 0);
  const net = Number(detailsObj.net ?? backendTxn.net ?? (subtotal - fee));

  return {
    id,
    type,
    amount,
    timestamp,
    status,
    title,
    subtitle,
    details: {
      refNo,
      method,
      subtotal,
      fee,
      net
    }
  };
};

// ─── THUNK ───────────────────────────────────────────────────────────────────
export const fetchTransactionHistoryThunk = createAsyncThunk(
  'transaction/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await transactionApi.getTransactionHistory();
      logger.info(TAG, 'Transaction history fetched successfully');
      
      const rawData = response.data;
      // Handle cases where data is paginated or nested
      const transactionsArray = Array.isArray(rawData) 
        ? rawData 
        : (rawData && Array.isArray(rawData.items)) 
          ? rawData.items 
          : [];
          
      return transactionsArray.map(mapBackendTransaction);
    } catch (error: any) {
      logger.error(TAG, 'Failed to fetch transaction history', error);
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to fetch transaction history'
      );
    }
  }
);

// ─── SLICE ───────────────────────────────────────────────────────────────────
const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    clearTransactionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactionHistoryThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionHistoryThunk.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
        state.loading = false;
        state.transactions = action.payload || [];
      })
      .addCase(fetchTransactionHistoryThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTransactionError } = transactionSlice.actions;
export default transactionSlice.reducer;
