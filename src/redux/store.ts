/**
 * Redux Store
 * - Redux Toolkit
 * - Redux Persist with MMKV
 * - Typed hooks
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
} from 'redux-persist';

import mmkvService from '../services/storage/mmkvService';
import authReducer from './slices/authSlice';
import driverReducer from './slices/driverSlice';
import rideReducer from './slices/rideSlice';
import locationReducer from './slices/locationSlice';
import socketReducer from './slices/socketSlice';
import themeReducer from './slices/themeSlice';
import supportChatReducer from './slices/supportChatSlice';
import payoutReducer from './slices/payoutSlice';
import chatReducer from './slices/chatSlice';
import packageReducer from './slices/packageSlice';
import transactionReducer from './slices/transactionSlice';
import popupReducer from './slices/popupSlice';
import alertReducer from './slices/alertSlice';
import { completeRide, completeRideThunk } from './slices/rideSlice';
import { resetChat } from './slices/chatSlice';

// ─── Root reducer ────────────────────────────────────────────────────────────

const appReducer = combineReducers({
  auth: authReducer,
  driver: driverReducer,
  ride: rideReducer,
  location: locationReducer,
  socket: socketReducer,
  theme: themeReducer,
  supportChat: supportChatReducer,
  payout: payoutReducer,
  chat: chatReducer,
  package: packageReducer,
  transaction: transactionReducer,
  popup: popupReducer,
  alert: alertReducer,
});

const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: any) => {
  if (
    action.type === 'auth/logout/fulfilled' ||
    action.type === 'auth/logout/rejected' ||
    action.type === 'auth/deleteAccount/fulfilled' ||
    action.type === 'auth/clearAuth'
  ) {
    // Preserve theme state across logouts
    const themeState = state?.theme;
    state = themeState ? ({ theme: themeState } as any) : undefined;
  }

  const nextState = appReducer(state, action);
  if (
    action.type === completeRideThunk.fulfilled.type ||
    action.type === completeRide.type
  ) {
    return appReducer(nextState, resetChat());
  }
  return nextState;
};

// ─── Persist config — use MMKV as backend ───────────────────────────────────

const persistConfig = {
  key: 'root',
  version: 1,
  storage: mmkvService,
  // Only persist these slices; exclude ephemeral state
  whitelist: ['auth', 'driver', 'theme', 'payout'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ─── Store ───────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // These two DEV-only middleware traverse the ENTIRE state tree after every
      // dispatch. With GPS updates firing every 1–2 s they consume 200–800 ms of
      // JS time per second and are the primary cause of navigation lag.
      serializableCheck: false,
      immutabilityCheck: false,
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

// ─── Types ───────────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
