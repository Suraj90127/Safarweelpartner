/**
 * MMKV / AsyncStorage storage keys
 * Centralized to prevent key collisions
 */

export const STORAGE_KEYS = {
  // Auth
  ACCESS_TOKEN: '@SafarweelPartner/access_token',
  REFRESH_TOKEN: '@SafarweelPartner/refresh_token',
  DRIVER_ID: '@SafarweelPartner/driver_id',
  PHONE: '@SafarweelPartner/phone',

  // Redux Persist
  REDUX_ROOT: '@SafarweelPartner/redux_root',

  // Preferences
  THEME: '@SafarweelPartner/theme',
  LANGUAGE: '@SafarweelPartner/language',
  NOTIFICATIONS_ENABLED: '@SafarweelPartner/notifications_enabled',
  SOUND_ENABLED: '@SafarweelPartner/sound_enabled',
  RIDE_REQUESTS_NOTIF: '@SafarweelPartner/ride_requests_notif',
  EARNINGS_UPDATES_NOTIF: '@SafarweelPartner/earnings_updates_notif',

  // Location
  LAST_KNOWN_LOCATION: '@SafarweelPartner/last_known_location',

  // Ride
  ACTIVE_RIDE: '@SafarweelPartner/active_ride',
  ACTIVE_RIDE_ID_TEMP: '@SafarweelPartner/active_ride_id_temp',
  INCOMING_RIDE_DATA_TEMP: '@SafarweelPartner/incoming_ride_data_temp',
  TRAFFIC_TIME: '@SafarweelPartner/traffic_time',
  STOP_TIME: '@SafarweelPartner/stop_time',
  TRACKED_RIDE_DISTANCE: '@SafarweelPartner/tracked_ride_distance',
  TRACKED_RIDE_DURATION: '@SafarweelPartner/tracked_ride_duration',
  TRACKED_RIDE_START_TIME: '@SafarweelPartner/tracked_ride_start_time',
  ARRIVED_AT_PREFIX: '@SafarweelPartner/arrived_at_',

  // App State
  DL_UPLOADED: '@SafarweelPartner/dl_uploaded',
  PROFILE_SETUP_COMPLETE: '@SafarweelPartner/profile_setup_complete',
  VEHICLE_UPLOADED: '@SafarweelPartner/vehicle_uploaded',
  RC_UPLOADED: '@SafarweelPartner/rc_uploaded',
  AADHAAR_PAN_UPLOADED: '@SafarweelPartner/aadhaar_pan_uploaded',
  SELECTED_ID_TYPE: '@SafarweelPartner/selected_id_type',
  ONBOARDING_COMPLETE: '@SafarweelPartner/onboarding_complete',
  IS_ONLINE: '@SafarweelPartner/is_online',
  PROMOTION_LAST_SEEN: '@SafarweelPartner/promotion_last_seen',

  // Payout Method Details
  BANK_NAME: '@SafarweelPartner/bank_name',
  ACCOUNT_NUMBER: '@SafarweelPartner/account_number',
  IFSC_CODE: '@SafarweelPartner/ifsc_code',
  HOLDER_NAME: '@SafarweelPartner/holder_name',
  UPI_ID: '@SafarweelPartner/upi_id',
  ACTIVE_PAYOUT_METHOD: '@SafarweelPartner/active_payout_method',

  // Package & Eligibility Storage
  HAS_ACTIVE_PACKAGE: '@SafarweelPartner/has_active_package',
  FIRST_TWO_RIDES_COUNT: '@SafarweelPartner/first_two_rides_count',
  FREE_RIDE_LIMIT: '@SafarweelPartner/free_ride_limit',
  DASHBOARD_STATS: '@SafarweelPartner/dashboard_stats',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
