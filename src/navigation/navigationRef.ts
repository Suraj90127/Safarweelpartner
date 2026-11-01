import { createNavigationContainerRef } from '@react-navigation/native';
import { AppState } from 'react-native';

/**
 * Global navigation ref — attach to <NavigationContainer ref={navigationRef}>.
 * Use this to navigate from outside React component tree (background events,
 * native DeviceEventEmitter callbacks, etc.).
 */
export const navigationRef = createNavigationContainerRef<any>();

// Pending navigation queued while the container is not yet ready.
let pendingNav: { name: string; params?: object } | null = null;
let appStateSubForNav: ReturnType<typeof AppState.addEventListener> | null = null;

function flushPendingNav() {
  if (!pendingNav) return;
  if (navigationRef.isReady() && AppState.currentState === 'active') {
    const { name, params } = pendingNav;
    pendingNav = null;
    appStateSubForNav?.remove();
    appStateSubForNav = null;
    (navigationRef as any).navigate(name, params);
  }
}

export function getActiveRouteName(): string | undefined {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name;
  }
  return undefined;
}

export function navigateFromBackground(name: string, params?: object) {
  console.log(`🚀 [BackgroundNav] Attempting navigation to: "${name}"`, params || '');
  if (navigationRef.isReady() && AppState.currentState === 'active') {
    (navigationRef as any).navigate(name, params);
    return;
  }

  // Queue the request and retry when the app becomes active.
  pendingNav = { name, params };
  if (!appStateSubForNav) {
    appStateSubForNav = AppState.addEventListener('change', state => {
      if (state === 'active') {
        flushPendingNav();
      }
    });
  }
  // Also attempt immediately in case isReady() flips before AppState fires.
  setTimeout(flushPendingNav, 100);
}
