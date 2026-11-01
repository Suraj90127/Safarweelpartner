import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { ROUTES } from '../constants/routes';
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import OtpScreen from '../screens/Auth/OtpScreen';
import SupportScreen from '../screens/Auth/SupportScreen';
import LiveChatScreen from '../screens/Auth/LiveChatScreen';
import TermsOfServiceScreen from '../screens/Settings/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/Settings/PrivacyPolicyScreen';
import LanguageScreen from '../screens/Auth/LanguageScreen';
import mmkvService from '../services/storage/mmkvService';
import { STORAGE_KEYS } from '../constants/storageKeys';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const hasLanguage = mmkvService.getString(STORAGE_KEYS.LANGUAGE);
  const initialRoute = hasLanguage ? ROUTES.WELCOME : ROUTES.LANGUAGE;

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name={ROUTES.LANGUAGE} component={LanguageScreen} />
      <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.OTP} component={OtpScreen} />
      <Stack.Screen name={ROUTES.SUPPORT} component={SupportScreen} />
      <Stack.Screen name={ROUTES.LIVE_CHAT} component={LiveChatScreen} />
      <Stack.Screen name={ROUTES.TERMS_OF_SERVICE} component={TermsOfServiceScreen} />
      <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
