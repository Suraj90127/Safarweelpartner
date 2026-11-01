import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { ROUTES } from '../constants/routes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, NativeModules } from 'react-native';
import { useThemePalette } from '../utils/theme';

// Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ActiveRideScreen from '../screens/Ride/ActiveRideScreen';
import MyRidesScreen from '../screens/Ride/MyRidesScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const BottomTabNavigator: React.FC = () => {
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const { PermissionModule } = NativeModules;
      if (PermissionModule && PermissionModule.setNavigationBarColor) {
        PermissionModule.setNavigationBarColor(palette.surface, !isDark);
      }
    }
  }, [palette.surface, isDark]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    freezeOnBlur: true,
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderTopColor: palette.border,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 8,
      paddingTop: 8,
    },
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.mutedText,
  }), [palette.surface, palette.border, palette.primary, palette.mutedText, insets.bottom]);

  return (
    <Tab.Navigator
      backBehavior="initialRoute"
      screenOptions={screenOptions}
      screenListeners={({ route }) => ({
        tabPress: () => {
          console.log(`📱 [TabSwitch] Navigating to Tab ➡️ "${route.name}"`);
        },
      })}>
      <Tab.Screen
        name={ROUTES.HOME_TAB}
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.ACTIVE_RIDE_TAB}
        component={ActiveRideScreen}
        options={{
          tabBarLabel: 'Active Ride',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'car' : 'car-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.MY_RIDES_TAB}
        component={MyRidesScreen}
        options={{
          tabBarLabel: 'My Ride',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE_TAB}
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
