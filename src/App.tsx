/**
 * App.tsx — Root entry point
 * Sets up: Provider, PersistGate, QueryClient, NavigationContainer, GestureHandler
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import GlobalAlertHost from './components/GlobalAlertHost';
import { useFcmToken } from './hooks/useFcmToken';
import { useLocation } from './hooks/useLocation';
import { useSocket } from './hooks/useSocket';
import RootNavigator from './navigation/RootNavigator';
import { persistor, store } from './redux/store';
import ThemeProvider from './theme/ThemeProvider';

// ─── React Query client config ───────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const SocketBootstrap: React.FC = () => {
  useSocket();
  return null;
};

const LocationBootstrap: React.FC = () => {
  useLocation();
  return null;
};

const FcmBootstrap: React.FC = () => {
  useFcmToken();
  return null;
};

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <SocketBootstrap />
            <LocationBootstrap />
            <FcmBootstrap />
            {children}
            <GlobalAlertHost />
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
};

export default App;
