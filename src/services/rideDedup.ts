/**
 * rideDedup.ts
 *
 * Module-level deduplication registry for ride requests.
 *
 * Problem: the backend re-sends the same ride_request FCM / socket event every
 * few seconds.  When a driver rejects or times-out a request the Redux slice is
 * cleared, but if a stale re-send arrives afterwards the overlay would reappear
 * and the countdown timer would restart.
 *
 * Solution: maintain a module-level Set of rideIds that have already been
 * "handled" (shown once and then dismissed via accept / reject / timeout).
 * Every incoming ride handler checks this set BEFORE dispatching to Redux.
 * The set is populated by GlobalIncomingRequest when a request is dismissed.
 *
 * The set lives for the JS bundle lifetime (survives navigation, not app-restart).
 * For app restarts the MMKV-based restore path has its own guards.
 */

import mmkvService from './storage/mmkvService';

const dismissedRideIds = new Set<string>();

/**
 * Returns true when this rideId was already offered to the driver and
 * then dismissed (accepted / rejected / timed-out / cancelled). Callers should
 * silently ignore these rides and remove them from all order lists.
 */
export const isRideDismissed = (rideId: string): boolean => {
  if (!rideId) return false;
  const idStr = String(rideId);
  if (dismissedRideIds.has(idStr)) return true;
  try {
    return mmkvService.getBoolean(`dismissed_ride_${idStr}` as any) === true;
  } catch {
    return false;
  }
};

/**
 * Call this as soon as a ride is accepted, rejected, timed-out, or cancelled.
 * All subsequent FCM / socket / Firebase re-sends for this rideId will be ignored.
 */
export const markRideDismissed = (rideId: string): void => {
  if (!rideId) return;
  const idStr = String(rideId);
  dismissedRideIds.add(idStr);
  try {
    mmkvService.setBoolean(`dismissed_ride_${idStr}` as any, true);
  } catch (e) {
    console.log('[rideDedup] Failed to save dismissed ride to MMKV:', e);
  }
};
