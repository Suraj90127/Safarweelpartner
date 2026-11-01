import React, { useEffect } from 'react';
import { View, Platform, NativeModules, AppState, InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from './types';
import { ROUTES } from '../constants/routes';
import BottomTabNavigator from './BottomTabNavigator';
import GlobalIncomingRequest from '../components/GlobalIncomingRequest';
import DriverMapScreen from '../screens/Map/DriverMapScreen';
import AcceptRideScreen from '../screens/Ride/AcceptRideScreen';
import ActiveRideScreen from '../screens/Ride/ActiveRideScreen';
import OtpRideScreen from '../screens/Ride/OtpRideScreen';
import EndRideScreen from '../screens/Ride/EndRideScreen';
import CompletedRideScreen from '../screens/Ride/CompletedRideScreen';

import SettingsScreen from '../screens/Settings/SettingsScreen';
import PrivacyPolicyScreen from '../screens/Settings/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/Settings/TermsOfServiceScreen';
import SocialLinksScreen from '../screens/Settings/SocialLinksScreen';
import LanguageScreen from '../screens/Auth/LanguageScreen';
import DrivingLicenseScreen from '../screens/Auth/DrivingLicenseScreen';
import ProfileSetupScreen from '../screens/Auth/ProfileSetupScreen';
import SelfieCameraScreen from '../screens/Auth/SelfieCameraScreen';
import DocumentCenterScreen from '../screens/Auth/DocumentCenterScreen';
import VehicleSetupScreen from '../screens/Auth/VehicleSetupScreen';
import VehicleNumberScreen from '../screens/Auth/VehicleNumberScreen';
import AadhaarPanScreen from '../screens/Auth/AadhaarPanScreen';
import PermissionsScreen from '../screens/Auth/PermissionsScreen';
import SupportScreen from '../screens/Auth/SupportScreen';
import LiveChatScreen from '../screens/Auth/LiveChatScreen';
import RideDetailScreen from '../screens/Ride/RideDetailScreen';
import RideChatScreen from '../screens/Ride/RideChatScreen';
import OrdersScreen from '../screens/Ride/OrdersScreen';
import DriverInfoScreen from '../screens/Profile/DriverInfoScreen';
import IdCardScreen from '../screens/Profile/IdCardScreen';
import DocumentsScreen from '../screens/Profile/DocumentsScreen';
import EarningScreen from '../screens/Profile/EarningScreen';
import IncentiveScreen from '../screens/Profile/IncentiveScreen';
import ClaimScreen from '../screens/Profile/ClaimScreen';
import PaymentScreen from '../screens/Profile/PaymentScreen';
import PayoutMethodScreen from '../screens/Profile/PayoutMethodScreen';
import PaymentHistoryScreen from '../screens/Profile/PaymentHistoryScreen';
import WalletRechargeScreen from '../screens/Profile/WalletRechargeScreen';
import ReferralScreen from '../screens/Profile/ReferralScreen';
import RateCardScreen from '../screens/Profile/RateCardScreen';
import RatingScreen from '../screens/Profile/RatingScreen';
import OnlinePaymentScreen from '../screens/Ride/OnlinePaymentScreen';
import RideGuideScreen from '../screens/Ride/RideGuideScreen';
import DlViewScreen from '../screens/Profile/DlViewScreen';
import AadhaarViewScreen from '../screens/Profile/AadhaarViewScreen';
import PanViewScreen from '../screens/Profile/PanViewScreen';
import RcViewScreen from '../screens/Profile/RcViewScreen';
import VehicleSetupViewScreen from '../screens/Profile/VehicleSetupViewScreen';
import NotificationScreen from '../screens/Notification/NotificationScreen';
import mmkvService from '../services/storage/mmkvService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { navigationRef, navigateFromBackground } from './navigationRef';
import { getActiveDriverRideThunk } from '../redux/slices/rideSlice';

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  const isVerified = useAppSelector(state => {
    const d = state.driver.profile || state.auth.driver;
    return Boolean(
      d?.isVerified ||
      (d as any)?.is_verified ||
      d?.status === 'available' ||
      d?.status === 'on_ride' ||
      d?.status === 'offline'
    );
  });

  const isProfileCompleteInDriver = useAppSelector(state => {
    const d = state.driver.profile || state.auth.driver;
    return Boolean(
      (d?.name && d.name.trim().length > 0) ||
      d?.dob ||
      d?.gender ||
      d?.city ||
      d?.profile_image_id ||
      d?.documents?.profileSetupComplete
    );
  });

  const isDlUploadedInDriver = useAppSelector(state => {
    const d = state.driver.profile || state.auth.driver;
    return Boolean(
      d?.documents?.dlUploaded ||
      (d as any)?.dl_uploaded
    );
  });

  const mmkvProfileSetup = mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE);
  const mmkvDlUploaded = mmkvService.getBoolean(STORAGE_KEYS.DL_UPLOADED);
  const mmkvOnboardingComplete = mmkvService.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE);

  // If driver has a name, DOB, gender, city, isVerified, or MMKV flag, profile setup is complete.
  const isProfileSetup = Boolean(
    mmkvProfileSetup ||
    isProfileCompleteInDriver ||
    isVerified
  );

  const isDlUploaded = Boolean(
    mmkvDlUploaded ||
    isDlUploadedInDriver ||
    isVerified
  );

  const isOnboardingComplete = Boolean(
    mmkvOnboardingComplete ||
    isVerified
  );

  let initialRoute: keyof AppStackParamList = ROUTES.MAIN_TABS;
  if (isVerified || isOnboardingComplete) {
    initialRoute = ROUTES.MAIN_TABS;
  } else if (!isProfileSetup) {
    initialRoute = ROUTES.PROFILE_SETUP;
  } else if (!isDlUploaded) {
    initialRoute = ROUTES.DL_UPLOAD;
  } else {
    initialRoute = ROUTES.DOCUMENT_CENTER;
  }

  const navKey = (isOnboardingComplete || isVerified) ? 'dashboard' : 'onboarding';

 
  const dispatch = useAppDispatch();

  const navigateToActiveRide = (ride: any) => {
    const rideId = ride._id || ride.id;
    navigateFromBackground(ROUTES.APP, {
      screen: ROUTES.ACTIVE_RIDE,
      params: { rideId },
    });
  };

  useEffect(() => {
    dispatch(getActiveDriverRideThunk())
      .unwrap()
      .then(ride => {
        if (ride) {
          console.log('[AppNavigator] Redirecting to active ride:', ride._id || ride.id);
          navigateToActiveRide(ride);
        }
      })
      .catch(err => {
        console.log('[AppNavigator] No active ride on mount:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Defer the API call until animations complete so the JS thread stays
        // free for the navigation transition.
        InteractionManager.runAfterInteractions(() => {
          dispatch(getActiveDriverRideThunk())
            .unwrap()
            .then(ride => {
              if (ride) {
                const currentRoute = navigationRef.getCurrentRoute?.();
                const currentRouteName = currentRoute?.name;
                const rideScreens = [
                  ROUTES.ACTIVE_RIDE,
                  ROUTES.OTP_RIDE,
                  ROUTES.END_RIDE,
                  ROUTES.COMPLETED_RIDE,
                  ROUTES.ACCEPT_RIDE,
                  ROUTES.RIDE_CHAT,
                ];
                if (currentRouteName && !(rideScreens as string[]).includes(currentRouteName)) {
                  console.log('[AppNavigator] Redirecting to active ride on resume:', ride._id || ride.id);
                  navigateToActiveRide(ride);
                }
              }
            })
            .catch(err => {
              console.log('[AppNavigator] No active ride on resume:', err);
            });
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOnline = useAppSelector(state => state.driver.isOnline);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    const { PermissionModule } = NativeModules;
    if (!PermissionModule) return;

    PermissionModule.setLoggedIn?.(isAuthenticated);

    if (!isAuthenticated || !isOnline) {
      PermissionModule.setOnlineStatus?.(false);
      PermissionModule.stopFloatingBubble?.();
      PermissionModule.stopFloatingBubbleService?.();
      return;
    }

    PermissionModule.setOnlineStatus?.(true);

    // Show/hide bubble based on app state transitions
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        PermissionModule.showFloatingBubble?.();
      } else if (nextAppState === 'active') {
        PermissionModule.stopFloatingBubble?.();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      PermissionModule.stopFloatingBubble?.();
    };
  }, [isOnline, isAuthenticated]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        key={navKey}
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false,
          freezeOnBlur: true,
        }}>
      <Stack.Screen name={ROUTES.LANGUAGE} component={LanguageScreen} />
      <Stack.Screen name={ROUTES.DL_UPLOAD} component={DrivingLicenseScreen} />
      <Stack.Screen name={ROUTES.PROFILE_SETUP} component={ProfileSetupScreen} />
      <Stack.Screen name={ROUTES.SELFIE_CAMERA} component={SelfieCameraScreen} />
      <Stack.Screen name={ROUTES.DOCUMENT_CENTER} component={DocumentCenterScreen} />
      <Stack.Screen name={ROUTES.VEHICLE_SETUP} component={VehicleSetupScreen} />
      <Stack.Screen name={ROUTES.VEHICLE_NUMBER} component={VehicleNumberScreen} />
      <Stack.Screen name={ROUTES.AADHAAR_PAN} component={AadhaarPanScreen} />
      <Stack.Screen name={ROUTES.PERMISSIONS} component={PermissionsScreen} />
      <Stack.Screen name={ROUTES.MAIN_TABS} component={BottomTabNavigator} />
      <Stack.Screen name={ROUTES.DRIVER_MAP} component={DriverMapScreen} />
      <Stack.Screen
        name={ROUTES.ACCEPT_RIDE}
        component={AcceptRideScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name={ROUTES.ACTIVE_RIDE}
        component={ActiveRideScreen}
        options={{ animation: 'slide_from_right', gestureEnabled: false }}
      />
      <Stack.Screen
        name={ROUTES.OTP_RIDE}
        component={OtpRideScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name={ROUTES.END_RIDE}
        component={EndRideScreen}
        options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name={ROUTES.COMPLETED_RIDE}
        component={CompletedRideScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
   
      <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} />
      <Stack.Screen name={ROUTES.TERMS_OF_SERVICE} component={TermsOfServiceScreen} />
      <Stack.Screen name={ROUTES.SOCIAL_LINKS} component={SocialLinksScreen} />
      <Stack.Screen name={ROUTES.ONLINE_PAYMENT} component={OnlinePaymentScreen} />
      <Stack.Screen name={ROUTES.RIDE_GUIDE} component={RideGuideScreen} />
      <Stack.Screen name={ROUTES.SUPPORT} component={SupportScreen} />
      <Stack.Screen name={ROUTES.LIVE_CHAT} component={LiveChatScreen} />
      <Stack.Screen name={ROUTES.RIDE_CHAT} component={RideChatScreen} />
      <Stack.Screen name={ROUTES.RIDE_DETAIL} component={RideDetailScreen} />
      <Stack.Screen name={ROUTES.ORDERS} component={OrdersScreen} />
      <Stack.Screen name={ROUTES.DRIVER_INFO} component={DriverInfoScreen} />
      <Stack.Screen name={ROUTES.ID_CARD} component={IdCardScreen} />
      <Stack.Screen name={ROUTES.DOCUMENTS} component={DocumentsScreen} />
      <Stack.Screen name={ROUTES.EARNING} component={EarningScreen} />
      <Stack.Screen name={ROUTES.INCENTIVE} component={IncentiveScreen} />
      <Stack.Screen name={ROUTES.CLAIM} component={ClaimScreen} />
      <Stack.Screen name={ROUTES.PAYMENT} component={PaymentScreen} />
      <Stack.Screen name={ROUTES.PAYOUT_METHOD} component={PayoutMethodScreen} />
      <Stack.Screen name={ROUTES.PAYMENT_HISTORY} component={PaymentHistoryScreen} />
      <Stack.Screen name={ROUTES.WALLET_RECHARGE} component={WalletRechargeScreen} />
      <Stack.Screen name={ROUTES.REFERRAL} component={ReferralScreen} />
      <Stack.Screen name={ROUTES.RATE_CARD} component={RateCardScreen} />
      <Stack.Screen name={ROUTES.RATING} component={RatingScreen} />
      <Stack.Screen name={ROUTES.DL_VIEW} component={DlViewScreen} />
      <Stack.Screen name={ROUTES.AADHAAR_VIEW} component={AadhaarViewScreen} />
      <Stack.Screen name={ROUTES.PAN_VIEW} component={PanViewScreen} />
      <Stack.Screen name={ROUTES.RC_VIEW} component={RcViewScreen} />
      <Stack.Screen name={ROUTES.VEHICLE_SETUP_VIEW} component={VehicleSetupViewScreen} />
      <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationScreen} />
    </Stack.Navigator>
    <GlobalIncomingRequest />
  </View>
);
};

export default AppNavigator;
