import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, TouchableOpacity, Switch, StatusBar, Platform, Modal } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setThemeMode } from '../../redux/slices/themeSlice';
import { deleteAccountThunk } from '../../redux/slices/authSlice';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import CustomAlert from '../../components/CustomAlert';

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'हिन्दी (Hindi)',
  en: 'English',
  te: 'తెలుగు (Telugu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ta: 'தமிழ் (Tamil)',
  bn: 'বাংলা (Bengali)',
  mr: 'मराठी (Marathi)',
  ml: 'മലയാളം (Malayalam)',
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(s => s.theme.isDark);
  const mode = useAppSelector(s => s.theme.mode);

  const [rideRequests, setRideRequests] = useState(() => mmkvService.getBoolean(STORAGE_KEYS.RIDE_REQUESTS_NOTIF) ?? true);
  const [earningsUpdates, setEarningsUpdates] = useState(() => mmkvService.getBoolean(STORAGE_KEYS.EARNINGS_UPDATES_NOTIF) ?? true);
  const [soundEnabled, setSoundEnabled] = useState(() => mmkvService.getBoolean(STORAGE_KEYS.SOUND_ENABLED) ?? true);
  const [currentLanguage, setCurrentLanguage] = useState('English');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleRideRequestsToggle = (value: boolean) => {
    setRideRequests(value);
    mmkvService.setBoolean(STORAGE_KEYS.RIDE_REQUESTS_NOTIF, value);
  };

  const handleEarningsUpdatesToggle = (value: boolean) => {
    setEarningsUpdates(value);
    mmkvService.setBoolean(STORAGE_KEYS.EARNINGS_UPDATES_NOTIF, value);
  };
  const [deleteAlertState, setDeleteAlertState] = useState<{ visible: boolean; title: string; message: string; type: 'error' | 'success' | 'info' | 'warning' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (isFocused) {
      const langCode = mmkvService.getString(STORAGE_KEYS.LANGUAGE) || 'en';
      setCurrentLanguage(LANGUAGE_NAMES[langCode] || 'English');
    }
  }, [isFocused]);

  const handleSoundToggle = (value: boolean) => {
    setSoundEnabled(value);
    mmkvService.setBoolean(STORAGE_KEYS.SOUND_ENABLED, value);
  };

  const handleDeleteAccount = () => {
    setShowDeleteAlert(true);
  };

  const confirmDeleteAccount = async () => {
    setShowDeleteAlert(false);
    try {
      const result = await dispatch(deleteAccountThunk());
      if (deleteAccountThunk.fulfilled.match(result)) {
        setDeleteAlertState({
          visible: true,
          title: 'Success',
          message: 'Your account has been deleted.',
          type: 'success',
        });
      } else {
        setDeleteAlertState({
          visible: true,
          title: 'Error',
          message: (result.payload as string) || 'Failed to delete account.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setDeleteAlertState({
        visible: true,
        title: 'Error',
        message: err.message || 'An unexpected error occurred.',
        type: 'error',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Settings" />

      <ScrollView className="p-4">
        {/* Appearance */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-2 mt-2 ml-1">Appearance</Text>
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          <View className="flex-row justify-between items-center py-2">
            <View>
              <Text className="text-sm font-bold text-textLight dark:text-textDark">Dark Mode</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">Current: {mode}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={v => {
                dispatch(setThemeMode(v ? 'dark' : 'light'));
              }}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>
        </View>

        {/* Notifications */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-2 mt-2 ml-1">Notifications</Text>
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          <View className="flex-row justify-between items-center py-2 border-b border-lightBorder dark:border-darkBorder">
            <View>
              <Text className="text-sm font-bold text-textLight dark:text-textDark">Ride Requests</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">Get alerted for new rides</Text>
            </View>
            <Switch
              value={rideRequests}
              onValueChange={handleRideRequestsToggle}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>

          <View className="flex-row justify-between items-center py-2 mt-2">
            <View>
              <Text className="text-sm font-bold text-textLight dark:text-textDark">Earnings Updates</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">Daily summary notifications</Text>
            </View>
            <Switch
              value={earningsUpdates}
              onValueChange={handleEarningsUpdatesToggle}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>
        </View>

        {/* Preferences */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-2 mt-2 ml-1">Preferences</Text>
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          {/* Sound Alert Toggle */}
          <View className="flex-row justify-between items-center py-2 border-b border-lightBorder dark:border-darkBorder">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-bold text-textLight dark:text-textDark">Voice Navigation</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">Hear routing instructions and alerts</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
            />
          </View>

          {/* App Language */}
          <TouchableOpacity
            className="flex-row justify-between items-center py-2.5 mt-2"
            onPress={() => navigation.navigate(ROUTES.LANGUAGE, { isChanging: true })}
          >
            <View>
              <Text className="text-sm font-bold text-textLight dark:text-textDark">App Language</Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-0.5">Change application language</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm text-textLightSecondary dark:text-textDarkSecondary font-bold mr-1.5">{currentLanguage}</Text>
              <Icon name="chevron-forward" size={16} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-2 mt-2 ml-1">About</Text>
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          <View className="flex-row justify-between items-center py-2 border-b border-lightBorder dark:border-darkBorder">
            <Text className="text-sm font-bold text-textLight dark:text-textDark">App Version</Text>
            <Text className="text-sm text-textLightSecondary dark:text-textDarkSecondary font-bold">1.0.0</Text>
          </View>

          <TouchableOpacity
            className="flex-row justify-between items-center py-2.5 border-b border-lightBorder dark:border-darkBorder mt-2"
            onPress={() => (navigation as any).navigate(ROUTES.PRIVACY_POLICY)}
          >
            <Text className="text-sm font-bold text-textLight dark:text-textDark">Privacy Policy</Text>
            <Icon name="chevron-forward" size={16} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row justify-between items-center py-2.5 border-b border-lightBorder dark:border-darkBorder mt-2"
            onPress={() => (navigation as any).navigate(ROUTES.TERMS_OF_SERVICE)}
          >
            <Text className="text-sm font-bold text-textLight dark:text-textDark">Terms of Service</Text>
            <Icon name="chevron-forward" size={16} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row justify-between items-center py-2.5 mt-2"
            onPress={() => (navigation as any).navigate(ROUTES.SOCIAL_LINKS)}
          >
            <View className="flex-row items-center">
              <Text className="text-sm font-bold text-textLight dark:text-textDark">Social Media Links</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <TouchableOpacity
          className="mt-6 mx-1 bg-rose-500/10 border border-rose-200/20 rounded-2xl py-4 flex-row items-center justify-center mb-8 active:opacity-90"
          onPress={handleDeleteAccount}
        >
          <Icon name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text className="text-red-500 font-extrabold text-sm">Delete Account </Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={showDeleteAlert}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action is permanent and cannot be undone."
        type="warning"
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteAlert(false),
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: confirmDeleteAccount,
            style: 'destructive',
          },
        ]}
        onDismiss={() => setShowDeleteAlert(false)}
      />

      <CustomAlert
        visible={deleteAlertState.visible}
        title={deleteAlertState.title}
        message={deleteAlertState.message}
        type={deleteAlertState.type}
        buttons={[{ text: 'OK', onPress: () => setDeleteAlertState(prev => ({ ...prev, visible: false })) }]}
        onDismiss={() => setDeleteAlertState(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};


export default SettingsScreen;
