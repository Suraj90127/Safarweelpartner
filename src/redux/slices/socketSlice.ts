import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SocketState, SocketStatus } from '../../types/socket.types';

const initialState: SocketState = {
  status: 'disconnected',
  isConnected: false,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  error: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocketStatus: (state, action: PayloadAction<SocketStatus>) => {
      state.status = action.payload;
      state.isConnected = action.payload === 'connected';
      if (action.payload === 'connected') {
        state.lastConnectedAt = new Date().toISOString();
        state.reconnectAttempts = 0;
        state.error = null;
      }
    },

    incrementReconnectAttempts: state => {
      state.reconnectAttempts += 1;
    },

    setSocketError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.status = 'error';
      state.isConnected = false;
    },

    resetSocket: () => initialState,
  },
});

export const {
  setSocketStatus,
  incrementReconnectAttempts,
  setSocketError,
  resetSocket,
} = socketSlice.actions;

export default socketSlice.reducer;
