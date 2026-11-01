/**
 * Route names — single source of truth for all navigation keys.
 * Prevents typo-related navigation bugs.
 */

export const ROUTES = {
  // Root
  SPLASH: 'Splash',

  // Auth Stack
  AUTH: 'Auth',
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  OTP: 'OTP',
  SUPPORT: 'Support',
  LIVE_CHAT: 'LiveChat',
  LANGUAGE: 'Language',
  DL_UPLOAD: 'DlUpload',
  PROFILE_SETUP: 'ProfileSetup',
  SELFIE_CAMERA: 'SelfieCamera',
  DOCUMENT_CENTER: 'DocumentCenter',
  VEHICLE_SETUP: 'VehicleSetup',
  VEHICLE_NUMBER: 'VehicleNumber',
  AADHAAR_PAN: 'AadhaarPan',
  PERMISSIONS: 'Permissions',

  // App Stack
  APP: 'App',
  DASHBOARD: 'Dashboard',
  DRIVER_MAP: 'DriverMap',

  // Ride
  ACCEPT_RIDE: 'AcceptRide',
  ACTIVE_RIDE: 'ActiveRide',
  OTP_RIDE: 'OtpRide',
  END_RIDE: 'EndRide',
  COMPLETED_RIDE: 'CompletedRide',
  RIDE_DETAIL: 'RideDetail',
  RIDE_CHAT: 'RideChat',
  ORDERS: 'Orders',

  // Bottom Tabs
  MAIN_TABS: 'MainTabs',
  HOME_TAB: 'HomeTab',
  ACTIVE_RIDE_TAB: 'ActiveRideTab',
  MY_RIDES_TAB: 'MyRidesTab',
  EARNINGS_TAB: 'EarningsTab',
  PROFILE_TAB: 'ProfileTab',
  SETTINGS_TAB: 'SettingsTab',

  // Screens
  EARNINGS: 'Earnings',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',

  DRIVER_INFO: 'DriverInfo',
  ID_CARD: 'IdCard',
  DOCUMENTS: 'Documents',
  EARNING: 'Earning',
  INCENTIVE: 'Incentive',
  CLAIM: 'Claim',
  PAYMENT: 'Payment',
  REFERRAL: 'Referral',
  PRIVACY_POLICY: 'PrivacyPolicy',
  TERMS_OF_SERVICE: 'TermsOfService',
  ONLINE_PAYMENT: 'OnlinePayment',
  RIDE_GUIDE: 'RideGuide',

  DL_VIEW: 'DlView',
  AADHAAR_VIEW: 'AadhaarView',
  PAN_VIEW: 'PanView',
  RC_VIEW: 'RcView',
  VEHICLE_SETUP_VIEW: 'VehicleSetupView',
  PAYOUT_METHOD: 'PayoutMethod',
  PAYMENT_HISTORY: 'PaymentHistory',
  WALLET_RECHARGE: 'WalletRecharge',
  RATE_CARD: 'RateCard',
  RATING: 'Rating',
  NOTIFICATIONS: 'Notifications',
  SOCIAL_LINKS: 'SocialLinks',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteName = typeof ROUTES[RouteKey];
