/**
 * Navigation types — fully typed React Navigation v7 param lists
 */

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ROUTES } from '../constants/routes';

// ─── Auth Stack ──────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  [ROUTES.LANGUAGE]: { isChanging?: boolean } | undefined;
  [ROUTES.WELCOME]: undefined;
  [ROUTES.LOGIN]: undefined;
  [ROUTES.OTP]: {
    phone: string;
    countryCode: string;

  };
  [ROUTES.SUPPORT]: undefined;
  [ROUTES.LIVE_CHAT]: undefined;
  [ROUTES.TERMS_OF_SERVICE]: undefined;
  [ROUTES.PRIVACY_POLICY]: undefined;
};

// ─── App Stack ───────────────────────────────────────────────────────────────

export type AppStackParamList = {
  [ROUTES.MAIN_TABS]: undefined;
  [ROUTES.DRIVER_MAP]: {
    pickup?: { latitude: number; longitude: number; address?: string };
    drop?: { latitude: number; longitude: number; address?: string };
    stops?: any[];
  } | undefined;
  [ROUTES.ACCEPT_RIDE]: { rideId: string; rideData?: any };
  [ROUTES.ACTIVE_RIDE]: { rideId: string };
  [ROUTES.OTP_RIDE]: { rideId: string };
  [ROUTES.END_RIDE]: { rideId: string; fare: number };
  [ROUTES.COMPLETED_RIDE]: { rideId: string; fare: number; customerName?: string; riderId?: string; driverId?: string };
  [ROUTES.RIDE_DETAIL]: { rideId: string; rideData?: any };
  [ROUTES.RIDE_CHAT]: undefined;
  [ROUTES.ORDERS]: undefined;
  [ROUTES.EARNINGS]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.DRIVER_INFO]: undefined;
  [ROUTES.ID_CARD]: undefined;
  [ROUTES.DOCUMENTS]: undefined;
  [ROUTES.EARNING]: undefined;
  [ROUTES.INCENTIVE]: undefined;
  [ROUTES.CLAIM]: undefined;
  [ROUTES.PAYMENT]: undefined;
  [ROUTES.PAYOUT_METHOD]: { balance: number } | undefined;
  [ROUTES.PAYMENT_HISTORY]: undefined;
  [ROUTES.WALLET_RECHARGE]: undefined;
  [ROUTES.REFERRAL]: undefined;
  [ROUTES.PRIVACY_POLICY]: undefined;
  [ROUTES.TERMS_OF_SERVICE]: undefined;
  [ROUTES.ONLINE_PAYMENT]: { rideId: string; fare: number };
  [ROUTES.RIDE_GUIDE]: undefined;
  [ROUTES.DL_VIEW]: undefined;
  [ROUTES.AADHAAR_VIEW]: undefined;
  [ROUTES.PAN_VIEW]: undefined;
  [ROUTES.RC_VIEW]: undefined;
  [ROUTES.VEHICLE_SETUP_VIEW]: undefined;
  [ROUTES.LANGUAGE]: { isChanging?: boolean } | undefined;
  [ROUTES.DL_UPLOAD]: undefined;
  [ROUTES.PROFILE_SETUP]: undefined;
  [ROUTES.SELFIE_CAMERA]: { onSelfieCaptured: (uri: string, fileData: any) => void };
  [ROUTES.DOCUMENT_CENTER]: undefined;
  [ROUTES.VEHICLE_SETUP]: undefined;
  [ROUTES.VEHICLE_NUMBER]: undefined;
  [ROUTES.AADHAAR_PAN]: undefined;
  [ROUTES.PERMISSIONS]: undefined;
  [ROUTES.SUPPORT]: undefined;
  [ROUTES.LIVE_CHAT]: undefined;
  [ROUTES.RATE_CARD]: undefined;
  [ROUTES.RATING]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
  [ROUTES.SOCIAL_LINKS]: undefined;
};

// ─── Root Stack ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  [ROUTES.SPLASH]: undefined;
  [ROUTES.AUTH]: undefined;
  [ROUTES.APP]: undefined;
};

// ─── Navigation props ────────────────────────────────────────────────────────

export type AuthNavProp<T extends keyof AuthStackParamList> =
  NativeStackNavigationProp<AuthStackParamList, T>;

export type AppNavProp<T extends keyof AppStackParamList> =
  NativeStackNavigationProp<AppStackParamList, T>;

export type RootNavProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

// ─── Route props ─────────────────────────────────────────────────────────────

export type AuthRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;

export type AppRouteProp<T extends keyof AppStackParamList> = RouteProp<
  AppStackParamList,
  T
>;

// ─── Bottom Tabs ─────────────────────────────────────────────────────────────

export type MainTabParamList = {
  [ROUTES.HOME_TAB]: undefined;
  [ROUTES.ACTIVE_RIDE_TAB]: undefined;
  [ROUTES.MY_RIDES_TAB]: undefined;
  [ROUTES.PROFILE_TAB]: undefined;
};

