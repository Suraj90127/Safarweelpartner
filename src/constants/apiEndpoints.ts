/**
 * API endpoint constants
 */

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SEND_OTP: '/driver/send-otp',
    VERIFY_OTP: '/driver/verify-otp',
    REFRESH_TOKEN: '/driver/refresh',
    LOGOUT: '/driver/logout',
    SAVE_FCM_TOKEN: '/auth/save-fcm-token',
    DELETE_ACCOUNT: '/auth/delete-account',
  },

  // Driver
  DRIVER: {
    PROFILE: '/driver/profile',
    UPDATE_PROFILE: '/driver/profile',
    UPDATE_STATUS: '/driver/status',
    DOCUMENTS: '/driver/documents',
    RATING: '/driver/rating',
    VEHICLE: '/driver-vehicle/my',
    REFERRALS: '/driver/referrals',
  },

  // Ride
  RIDE: {
    ACCEPT: (rideId: string) => `/ride/${rideId}/accept`,
    REJECT: (rideId: string) => `/ride/${rideId}/reject`,
    START: (rideId: string) => `/ride/${rideId}/start`,
    STATUS: (rideId: string) => `/ride/${rideId}/status`,
    COMPLETE: (rideId: string) => `/ride/${rideId}/complete`,
    CANCEL: (rideId: string) => `/ride/${rideId}/cancel`,
    ARRIVED: (rideId: string) => `/ride/${rideId}/arrive`,
    HISTORY: '/ride/history',
    ACTIVE: '/ride/active',
    DRIVER_MY: '/ride/driver/my',
    DRIVER_ACTIVE: '/ride/driver/active',
    FIRST_TWO: '/ride/driver/my/first-two',
    CREATE_DYNAMIC_QR:'/recharge/create-dynamic-qr',
  },

  // Earnings
  EARNINGS: {
    TODAY: '/earnings/today',
    WEEKLY: '/earnings/weekly',
    HISTORY: '/earnings/history',
    SUMMARY: '/earnings/summary',
  },

  // Location
  LOCATION: {
    UPDATE: '/location/update',
    NEARBY_RIDES: '/location/nearby-rides',
  },

  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
  },

  // Review
  REVIEW: {
    CREATE: '/review',
  },

  // Incentive
  INCENTIVE: {
    SUMMARY: (serviceId: string) => `/driver-incentive/service/${serviceId}/summary`,
  },

  // Rate Card
  RATE_CARD: {
    BY_SERVICE: (serviceId: string) => `/rate-card/service/${serviceId}`,
  },

  // Packages
  PACKAGES: {
    LIST: '/packages',
    BUY: (id: string) => `/packages/buy/${id}`,
    VALIDATE_USER: '/packages/validate-user',
  },

  // Referral Earn
  REFERRAL_EARN: {
    LIST: '/driver-referral-earn/',
  },

  // User
  USER: {
    REFERRAL_SUMMARY: '/user/referral-summary',
  },

  // Transactions
  TRANSACTIONS: {
    HISTORY: '/transaction-history/me',
  },

  // Popup
  POPUP: {
    GET_ACTIVE: '/popup',
  },

  // Alert
  ALERT: {
    BY_TYPE: (userType: string) => `/alert/type/${userType}`,
  },
} as const;
