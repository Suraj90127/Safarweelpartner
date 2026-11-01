import React, { useEffect, useRef } from 'react';
import { View, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchDriverProfileThunk } from '../../redux/slices/driverSlice';
import { clearAuth } from '../../redux/slices/authSlice';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import type { RootNavProp } from '../../navigation/types';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const navigation = useNavigation<RootNavProp<typeof ROUTES.SPLASH>>();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isDark = useAppSelector(state => state.theme.isDark);
  const hasNavigated = useRef(false);
  const isFetching = useRef(false);

  const initializeAndNavigate = async () => {
    if (hasNavigated.current || isFetching.current) return;
    isFetching.current = true;
    if (isAuthenticated) {
      try {
        const profile = await dispatch(fetchDriverProfileThunk(true)).unwrap();
        if (profile) {
          const isVerified = Boolean(
            profile.isVerified ||
            (profile as any).is_verified ||
            profile.status === 'available' ||
            profile.status === 'on_ride' ||
            profile.status === 'offline'
          );

          const hasProfileInfo = Boolean(
            (profile.name && profile.name.trim().length > 0) ||
            profile.gender ||
            profile.dob ||
            profile.city ||
            profile.profile_image_id ||
            profile.documents?.profileSetupComplete ||
            isVerified ||
            mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE)
          );

          mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, hasProfileInfo);

          if (isVerified) {
            mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
            mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
            mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
          } else if (profile.documents) {
            if (profile.documents.dlUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);
            }
            if (profile.documents.profileSetupComplete) {
              mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);
            }
            if (profile.documents.vehicleUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);
            }
            if (profile.documents.rcUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);
            }
            if (profile.documents.aadhaarPanUploaded) {
              mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
            }
          }
        }
      } catch (error: any) {
        console.log('SplashScreen: Failed to fetch profile on start:', error);
        isFetching.current = false;
        // If the session is invalid or unauthorized, logout to reset auth state
        const isUnauthorized =
          error === 'Invalid token.' ||
          error === 'Invalid or expired session.' ||
          error === 'Access denied. No token provided.' ||
          (typeof error === 'string' && (
            error.toLowerCase().includes('401') ||
            error.toLowerCase().includes('unauthorized') ||
            error.toLowerCase().includes('jwt')
          ));

        if (isUnauthorized) {
          mmkvService.clearTokens();
          mmkvService.clearAll();
          dispatch(clearAuth());
          setTimeout(() => {
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              if (onFinish) {
                onFinish();
              } else {
                navigation.replace(ROUTES.AUTH);
              }
            }
          }, 50);
          return;
        }
      }
    }
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      if (onFinish) {
        onFinish();
      } else {
        navigation.replace(isAuthenticated ? ROUTES.APP : ROUTES.AUTH);
      }
    }
  };

  useEffect(() => {
    initializeAndNavigate();
    const forceTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        console.log('SplashScreen: Forcing navigation after 5s limit');
        hasNavigated.current = true;
        if (onFinish) {
          onFinish();
        } else {
          navigation.replace(isAuthenticated ? ROUTES.APP : ROUTES.AUTH);
        }
      }
    }, 3000);

    return () => {
      clearTimeout(forceTimer);
    };
  }, [isAuthenticated, onFinish, navigation]);

  return (
    <View
      className="flex-1"
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View className="absolute inset-0 w-full h-full" >
        <Image
          source={require('../../assets/images/splashDriver.png')}
          className="w-full h-full"
          resizeMode="cover"
          fadeDuration={0}
        />
      </View>
    </View>
  );
};

export default SplashScreen;
