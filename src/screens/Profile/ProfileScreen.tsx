import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { logoutThunk } from '../../redux/slices/authSlice';
import { formatRating } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';
import { fetchMyVehicleThunk, fetchDriverProfileThunk } from '../../redux/slices/driverSlice';
import CustomAlert from '../../components/CustomAlert';
import { useThemePalette } from '../../utils/theme';

// Static menu config
const MENU_SECTIONS = [
  {
    title: 'Account & Verification',
    items: [
      { id: ROUTES.DRIVER_INFO, name: 'Profile Info', icon: 'person-outline', color: 'bg-blue-500' },
      { id: ROUTES.ID_CARD, name: 'Safarweel ID Card', icon: 'card-outline', color: 'bg-amber-500' },
      { id: ROUTES.DOCUMENTS, name: 'Documents', icon: 'document-text-outline', color: 'bg-indigo-500' },
    ],
  },
  {
    title: 'Finance & Earnings',
    items: [
      { id: ROUTES.EARNING, name: 'Earnings', icon: 'wallet-outline', color: 'bg-emerald-500' },
      { id: ROUTES.INCENTIVE, name: 'Incentives', icon: 'trophy-outline', color: 'bg-rose-500' },
      { id: ROUTES.CLAIM, name: 'Claims', icon: 'receipt-outline', color: 'bg-teal-500' },
      { id: ROUTES.PAYMENT, name: 'Payments', icon: 'cash-outline', color: 'bg-cyan-500' },
      { id: ROUTES.PAYMENT_HISTORY, name: 'Payment History', icon: 'time-outline', color: 'bg-violet-500' },
      { id: ROUTES.RATE_CARD, name: 'Rate Card', icon: 'list-outline', color: 'bg-orange-500' },
      { id: ROUTES.REFERRAL, name: 'Refer & Earn', icon: 'share-social-outline', color: 'bg-indigo-500' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: ROUTES.NOTIFICATIONS, name: 'Notifications', icon: 'notifications-outline', color: 'bg-indigo-500' },
      { id: ROUTES.SETTINGS, name: 'Settings', icon: 'settings-outline', color: 'bg-slate-500' },
      { id: ROUTES.LIVE_CHAT, name: 'Support', icon: 'headset-outline', color: 'bg-amber-500' },
    ],
  },
];

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette } = useThemePalette();

  const isOnline = useAppSelector(state => state.driver.isOnline);
  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const rating = driver?.rating ?? 0;
  const [showLogoutAlert, setShowLogoutAlert] = React.useState(false);

  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchMyVehicleThunk());
      dispatch(fetchDriverProfileThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  const handleLogout = () => {
    setShowLogoutAlert(true);
  };

  const confirmLogout = () => {
    setShowLogoutAlert(false);
    dispatch(logoutThunk());
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

      {/* Premium Driver Profile Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16) + 12,
          backgroundColor: palette.surface,
          borderColor: palette.border,
        }}
        className="px-5 pb-8 rounded-b-[36px] border-b"
      >
        {/* Top Row: Greeting + Status */}
        <View className="flex-row items-center justify-between mb-5">
          <Text style={{ color: palette.mutedText }} className="text-sm font-medium">
            Welcome back 👋
          </Text>
          {isOnline ? (
            <View className="flex-row items-center bg-emerald-500/15 px-3 py-1.5 rounded-full">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5" />
              <Text className="text-emerald-500 text-xs font-semibold">
                Online
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center bg-rose-500/15 px-3 py-1.5 rounded-full">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-1.5" />
              <Text className="text-rose-500 text-xs font-semibold">
                Offline
              </Text>
            </View>
          )}
        </View>

        {/* Profile Card */}
        <View
          style={{
            backgroundColor: palette.background,
            borderColor: palette.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
          className="rounded-3xl p-4 flex-row items-center border"
        >
          {/* Avatar */}
          <View
            style={{ backgroundColor: palette.surface }}
            className="w-16 h-16 rounded-2xl overflow-hidden mr-3 border border-lightBorder dark:border-darkBorder"
          >
            {driver?.profile_image_id ? (
              <Image
                source={{ uri: driver.profile_image_id }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 justify-center items-center bg-slate-800 dark:bg-slate-700">
                <Text className="text-xl font-bold text-white">
                  {driver?.name?.[0]?.toUpperCase() ?? 'D'}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View className="flex-1 ml-3.5">
            <Text style={{ color: palette.text }} className="text-[17px] font-bold">
              {driver?.name ?? 'Safarweel Partner'}
            </Text>
            <Text style={{ color: palette.mutedText }} className="text-xs mt-0.5">
              {driver?.phone ?? '+91 XXXXX XXXXX'}
            </Text>

            <View className="flex-row items-center mt-2">
              <Icon name="checkmark-circle" size={18} color={palette.success} />
              <Text style={{ color: palette.success }} className="ml-1 text-[11px] font-semibold">
                Verified Partner
              </Text>
            </View>
          </View>

          {/* Rating Pill */}
          <TouchableOpacity
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="items-center border rounded-2xl px-3.5 py-2.5 active:opacity-80"
            // onPress={() => (navigation as any).navigate(ROUTES.RATING)}
          >
            <View className="flex-row items-center">
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={{ color: palette.text }} className="ml-1 text-base font-bold">
                {formatRating(rating)}
              </Text>
            </View>
            <Text style={{ color: palette.mutedText }} className="text-[10px] font-medium mt-0.5">
              Rating
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs List */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {MENU_SECTIONS.map((section, sIdx) => (
          <View key={sIdx} className="mt-5">
            {/* Section Header */}
            <Text style={{ color: palette.mutedText }} className="text-xs font-bold uppercase tracking-wider mb-2 ml-1">
              {section.title}
            </Text>

            {/* Section Items Container */}
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              className="rounded-2xl border overflow-hidden"
            >
              {section.items.map((tab, index) => {
                const isLastItem = index === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={!isLastItem ? { borderBottomWidth: 1, borderBottomColor: palette.border } : undefined}
                    className="flex-row items-center justify-between p-4 active:opacity-80"
                    onPress={() => (navigation as any).navigate(tab.id)}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-8 h-8 rounded-full ${tab.color} items-center justify-center mr-3 shadow-sm`}>
                        <Icon name={tab.icon} size={16} color="white" />
                      </View>
                      <Text style={{ color: palette.text }} className="text-sm font-semibold">{tab.name}</Text>
                    </View>
                    <Icon name="chevron-forward" size={16} color={palette.mutedText} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={{
            backgroundColor: palette.primary,
            borderColor: palette.primary,
            // shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            // shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
          className="border rounded-2xl py-4 items-center justify-center flex-row mt-6 active:opacity-85"
          onPress={handleLogout}
        >
          <Icon name="log-out-outline" size={18} color={"#fff"} className="mr-2" />
          <Text style={{ color: "#fff" }} className="font-bold text-base ml-1">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <CustomAlert
        visible={showLogoutAlert}
        title="Sign Out"
        message="Are you sure you want to sign out from your account?"
        type="warning"
        buttons={[
          {
            text: 'Cancel',
            onPress: () => setShowLogoutAlert(false),
            style: 'cancel',
          },
          {
            text: 'Sign Out',
            onPress: confirmLogout,
            style: 'destructive',
          },
        ]}
        onDismiss={() => setShowLogoutAlert(false)}
      />
    </View>
  );
};

export default ProfileScreen;