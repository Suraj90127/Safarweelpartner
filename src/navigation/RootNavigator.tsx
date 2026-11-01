import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { ROUTES } from '../constants/routes';
import { useAppSelector } from '../redux/hooks';
import SplashScreen from '../screens/Splash/SplashScreen';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { navigationRef } from './navigationRef';
import RNOtpVerify from 'react-native-otp-verify';

const Stack = createNativeStackNavigator<RootStackParamList>();



const RootNavigator: React.FC = () => {

  React.useEffect(() => {
    RNOtpVerify.getHash()
      .then(hash => {
        console.log("Driver Hash code for otp template", hash);
      })
      .catch(console.log);
  }, []);

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const [isSplashCompleted, setIsSplashCompleted] = useState(false);
  const routeNameRef = React.useRef<string | undefined>(undefined);

  const handleSplashFinish = React.useCallback(() => {
    setIsSplashCompleted(true);
  }, []);




  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const currentRoute = navigationRef.getCurrentRoute();
        routeNameRef.current = currentRoute?.name;
        if (__DEV__) {
          console.log(`🧭 [Navigation] Ready 📍 Active Screen/Tab: "${currentRoute?.name}"`);
        }
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRoute = navigationRef.getCurrentRoute();
        const currentRouteName = currentRoute?.name;

        if (currentRouteName && previousRouteName !== currentRouteName) {
          if (__DEV__) {
            console.log(
              `🧭 [Navigation] Navigated to 📍 "${currentRouteName}"` +
              (previousRouteName ? ` (from: "${previousRouteName}")` : '')
            );
          }
          routeNameRef.current = currentRouteName;
        }
      }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isSplashCompleted ? (
          <Stack.Screen name={ROUTES.SPLASH}>
            {props => <SplashScreen {...props} onFinish={handleSplashFinish} />}
          </Stack.Screen>
        ) : isAuthenticated ? (
          <Stack.Screen
            name={ROUTES.APP}
            component={AppNavigator}
            options={{ animation: 'fade' }}
          />
        ) : (
          <Stack.Screen
            name={ROUTES.AUTH}
            component={AuthNavigator}
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

