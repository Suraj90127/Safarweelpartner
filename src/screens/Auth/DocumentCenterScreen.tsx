import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { logoutThunk } from '../../redux/slices/authSlice';
import { fetchDriverProfileThunk, fetchDriverDocumentsThunk } from '../../redux/slices/driverSlice';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { useThemePalette } from '../../utils/theme';
import { getDriverDocumentStatus, getDriverDocumentStatusLabel } from '../../utils/driverDocumentStatus';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { post } from '../../api/httpClient';
import logger from '../../utils/logger';

function getApprovedSubtitle(id: string): string {
  if (id === 'vehicle') return 'Vehicle details approved successfully.';
  if (id === 'dl') return 'DL verified successfully.';
  if (id === 'profile') return 'Profile photo and name verified.';
  if (id === 'vehicle_number') return 'RC verified.';
  return 'Document verified.';
}

function getNotSubmittedSubtitle(id: string): string {
  if (id === 'vehicle') return 'Vehicle details not submitted.';
  if (id === 'dl') return 'DL not submitted.';
  if (id === 'profile') return 'Profile photo and name not set up.';
  if (id === 'vehicle_number') return 'RC not submitted.';
  return 'Document not submitted.';
}

type DocStatus = 'verified' | 'rejected' | 'pending' | 'not_uploaded';

interface DocumentItem {
  id: string;
  title: string;
  subtitle: string;
  status: DocStatus;
  statusText: string;
  route?: string;
  actionLabel?: string;
  iconName: string;
}

const DocumentCenterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const isLoadingProfile = useAppSelector(state => state.driver.isLoading);
  const isVerified = (driver?.isVerified || (driver as any)?.is_verified) ?? false;
  const driverDocument = useAppSelector(state => state.driver.driverDocument);

  const [refreshing, setRefreshing] = useState(false);
  const [bypassModalVisible, setBypassModalVisible] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: ToastType }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const hideToast = useCallback(() => setToast(prev => ({ ...prev, visible: false })), []);

  const showToast = useCallback((title: string, message: string = '', type: ToastType = 'info') => {
    setToast({ visible: true, title, message, type });
  }, []);

  const statusConfig = useMemo(
    () => ({
      verified: {
        label: 'Verified',
        bg: isDark ? 'rgba(32, 177, 73, 0.2)' : 'rgba(32, 177, 73, 0.1)',
        text: palette.success,
        icon: 'checkmark-circle',
      },
      rejected: {
        label: 'Rejected',
        bg: isDark ? 'rgba(255, 75, 75, 0.2)' : 'rgba(255, 75, 75, 0.1)',
        text: palette.destructive,
        icon: 'close-circle',
      },
      pending: {
        label: 'Under review',
        bg: isDark ? 'rgba(255, 180, 0, 0.2)' : 'rgba(255, 180, 0, 0.1)',
        text: palette.warning,
        icon: 'time-outline',
      },
      not_uploaded: {
        label: 'Not uploaded',
        bg: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.1)',
        text: palette.mutedText,
        icon: 'cloud-upload-outline',
      },
    }),
    [isDark, palette]
  );

  // Memoize MMKV reads so they don't run on every render.
  const {
    isDlUploaded,
    isProfileSetup,
    isVehicleUploaded,
    isRcUploaded,
    isAadhaarPanUploaded,
  } = useMemo(
    () => ({
      isDlUploaded: mmkvService.getBoolean(STORAGE_KEYS.DL_UPLOADED) ?? false,
      isProfileSetup: mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE) ?? false,
      isVehicleUploaded: mmkvService.getBoolean(STORAGE_KEYS.VEHICLE_UPLOADED) ?? false,
      isRcUploaded: mmkvService.getBoolean(STORAGE_KEYS.RC_UPLOADED) ?? false,
      isAadhaarPanUploaded: mmkvService.getBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED) ?? false,
    }),
    [refreshing]
  );

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await dispatch(fetchDriverProfileThunk(true)).unwrap();
      if (profile) {
        const isVerifiedDriver = Boolean(
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
          isVerifiedDriver ||
          mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE)
        );

        mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, hasProfileInfo);

        if (isVerifiedDriver) {
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
    } catch (error) {
      console.log('Failed to fetch driver profile:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isDlUploaded) return;
    fetchProfile();
  }, [fetchProfile, isDlUploaded]);

  useEffect(() => {
    const initFCM = async () => {
      try {
        if (!driver?.id) return;
        let hasPermission = false;
        if (Platform.OS === 'android') {
          const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
          hasPermission = result === RESULTS.GRANTED;
        } else {
          hasPermission = true;
        }
        if (!hasPermission) {
          logger.warn('DocumentCenterScreen', 'Notification permission denied');
          return;
        }
        const mockFcmToken = `fcm-token-mock-rapido-${driver.id}`;
        const response = await post<{ success: boolean }>('/auth/save-fcm-token', {
          fcm_token: mockFcmToken,
        });
        if (response.success)
          logger.info(
            'DocumentCenterScreen',
            'FCM Token saved successfully during document setup'
          );
      } catch (err: any) {
        logger.error('DocumentCenterScreen', 'FCM registration error: ' + err.message);
      }
    };
    initFCM();
  }, [driver?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), dispatch(fetchDriverDocumentsThunk())]);
    setRefreshing(false);
  }, [fetchProfile, dispatch]);

  const documents: DocumentItem[] = useMemo(() => {
    const getDocumentState = (
      id: string,
      isUploadedLocal: boolean
    ): { status: DocStatus; statusText: string; subtitle: string; actionLabel: string } => {
      if (isVerified && (id === 'vehicle' || id === 'profile')) {
        return {
          status: 'verified',
          statusText: 'Verified',
          subtitle: getApprovedSubtitle(id),
          actionLabel: 'View',
        };
      }

      if (id === 'vehicle') {
        return {
          status: isVehicleUploaded ? 'verified' : 'not_uploaded',
          statusText: isVehicleUploaded ? 'Verified' : 'Not uploaded',
          subtitle: isVehicleUploaded
            ? 'Vehicle details approved successfully.'
            : 'Vehicle details not submitted.',
          actionLabel: isVehicleUploaded ? 'View' : 'Upload',
        };
      }

      if (id === 'profile') {
        return {
          status: isProfileSetup ? 'verified' : 'pending',
          statusText: isProfileSetup ? 'Verified' : 'Pending',
          subtitle: isProfileSetup
            ? 'Profile photo and name verified.'
            : 'Profile photo and name not set up.',
          actionLabel: isProfileSetup ? 'View' : 'Upload',
        };
      }

      if (!driverDocument) {
        return {
          status: isUploadedLocal ? 'verified' : 'not_uploaded',
          statusText: isUploadedLocal ? 'Verified' : 'Not uploaded',
          subtitle: isUploadedLocal ? getApprovedSubtitle(id) : getNotSubmittedSubtitle(id),
          actionLabel: isUploadedLocal ? 'View' : 'Upload',
        };
      }

      if (id === 'dl') {
        const dl = driverDocument.dl;
        if (!dl?.front?.url && !dl?.back?.url) {
          return {
            status: 'not_uploaded',
            statusText: 'Not uploaded',
            subtitle: 'DL not submitted.',
            actionLabel: 'Upload',
          };
        }
        const s = getDriverDocumentStatus([
          dl.front.url ? dl.front.status : undefined,
          dl.back?.url ? dl.back.status : undefined,
        ]);
        return {
          status: s,
          statusText: getDriverDocumentStatusLabel(s),
          subtitle:
            s === 'verified'
              ? 'DL verified successfully.'
              : s === 'rejected'
                ? 'DL verification rejected.'
                : 'DL verification is pending review.',
          actionLabel: s === 'rejected' ? 'Upload Again' : 'View',
        };
      }

      if (id === 'vehicle_number') {
        const rc = driverDocument.rc;
        if (!rc?.front?.url && !rc?.back?.url) {
          return {
            status: 'not_uploaded',
            statusText: 'Not uploaded',
            subtitle: 'RC not submitted.',
            actionLabel: 'Upload',
          };
        }
        const s = getDriverDocumentStatus([
          rc.front.url ? rc.front.status : undefined,
          rc.back?.url ? rc.back.status : undefined,
        ]);
        return {
          status: s,
          statusText: getDriverDocumentStatusLabel(s),
          subtitle:
            s === 'verified'
              ? 'RC verified successfully.'
              : s === 'rejected'
                ? 'RC verification rejected.'
                : 'RC verification is pending review.',
          actionLabel: s === 'rejected' ? 'Upload Again' : 'View',
        };
      }

      if (id === 'aadhaar_pan') {
        const aadhaar = driverDocument.aadhaar;
        const pan = driverDocument.pan;
        const hasAadhaar = !!(aadhaar?.front?.url || aadhaar?.back?.url);
        const hasPan = !!pan?.url;
        if (!hasAadhaar && !hasPan) {
          return {
            status: 'not_uploaded',
            statusText: 'Not uploaded',
            subtitle: 'Aadhaar or PAN not submitted.',
            actionLabel: 'Upload',
          };
        }
        const as_ = hasAadhaar
          ? getDriverDocumentStatus([
              aadhaar?.front?.url ? aadhaar.front.status : undefined,
              aadhaar?.back?.url ? aadhaar.back.status : undefined,
            ])
          : undefined;
        const ps = hasPan ? getDriverDocumentStatus([pan?.status]) : undefined;
        let finalStatus: DocStatus = 'pending';
        if ((hasAadhaar && as_ === 'verified') || (hasPan && ps === 'verified'))
          finalStatus = 'verified';
        else if (as_ === 'rejected' || ps === 'rejected') finalStatus = 'rejected';
        return {
          status: finalStatus,
          statusText:
            finalStatus === 'verified'
              ? 'Verified'
              : getDriverDocumentStatusLabel(finalStatus),
          subtitle:
            finalStatus === 'verified'
              ? 'Aadhaar or PAN verified.'
              : finalStatus === 'rejected'
                ? 'Aadhaar or PAN rejected.'
                : 'Verification pending review.',
          actionLabel: finalStatus === 'rejected' ? 'Upload Again' : 'View',
        };
      }

      return {
        status: 'not_uploaded',
        statusText: 'Not uploaded',
        subtitle: 'Not submitted.',
        actionLabel: 'Upload',
      };
    };

    return [
      {
        id: 'vehicle',
        title: 'Vehicle Details',
        ...getDocumentState('vehicle', isVehicleUploaded),
        route: ROUTES.VEHICLE_SETUP,
        iconName: 'car-outline',
      },
      {
        id: 'dl',
        title: 'Driving License',
        ...getDocumentState('dl', isDlUploaded),
        route: ROUTES.DL_UPLOAD,
        iconName: 'id-card-outline',
      },
      {
        id: 'profile',
        title: 'Photo and name',
        ...getDocumentState('profile', isProfileSetup),
        route: ROUTES.PROFILE_SETUP,
        iconName: 'person-outline',
      },
      {
        id: 'vehicle_number',
        title: 'Rc Number',
        ...getDocumentState('vehicle_number', isRcUploaded),
        route: ROUTES.VEHICLE_NUMBER,
        iconName: 'keypad-outline',
      },
      {
        id: 'aadhaar_pan',
        title: 'Aadhaar or PAN card',
        ...getDocumentState('aadhaar_pan', isAadhaarPanUploaded),
        route: ROUTES.AADHAAR_PAN,
        iconName: 'document-text-outline',
      },
    ] as DocumentItem[];
  }, [
    isVerified,
    driverDocument,
    isDlUploaded,
    isProfileSetup,
    isVehicleUploaded,
    isRcUploaded,
    isAadhaarPanUploaded,
  ]);

  const approvedCount = documents.filter(d => d.status === 'verified').length;
  const totalCount = documents.length;
  const progressPercent = Math.round((approvedCount / totalCount) * 100);

  const handleAction = useCallback(
    (item: DocumentItem) => {
      if (item.route) navigation.navigate(item.route);
    },
    [navigation]
  );

  const handleComplete = () => {
    if (!isVerified) {
      // setBypassModalVisible(true);
      return;
    }
    proceedToDashboard();
  };

  const proceedToDashboard = () => {
    setBypassModalVisible(false);
    mmkvService.setBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN_TABS }],
    });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutThunk());
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg" edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScreenHeader
        title="Verification Center"
        rightElement={
          <TouchableOpacity
            className="w-8 h-8 rounded-full border border-lightBorder dark:border-darkBorder justify-center items-center mr-2.5 bg-white dark:bg-darkCard"
            onPress={() => navigation.navigate(ROUTES.LANGUAGE, { isChanging: true })}
          >
            <Icon name="language" size={16} color={palette.text} />
          </TouchableOpacity>
        }
        borderBottom={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 84 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {/* Verification Progress Card */}
        <View
          style={{ backgroundColor: palette.surface, borderColor: palette.border }}
          className="mx-4 mt-4 rounded-2xl p-5 border shadow-sm"
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className="text-[16px] font-extrabold text-textLight dark:text-textDark mb-3">
                Verification Progress
              </Text>

              {/* Custom Progress Bar */}
              <View className="h-2.5 bg-lightBg dark:bg-darkBg rounded-full overflow-hidden mb-3 border border-lightBorder dark:border-darkBorder">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: palette.primary }}
                />
              </View>

              <Text className="text-[14px] font-extrabold mb-1" style={{ color: palette.primary }}>
                <Text className="text-[18px] font-black">{approvedCount}</Text> of {totalCount}{' '}
                Completed
              </Text>
              <Text className="text-[12px] text-textLightSecondary dark:text-textDarkSecondary leading-[18px]">
                Upload remaining documents to activate your account.
              </Text>
            </View>

            {/* Graphic Illustration */}
            <View className="w-[84px] h-[92px] bg-primary/10 dark:bg-primary/20 rounded-2xl justify-center items-center border border-primary/20 relative">
              <View className="w-12 h-[64px] bg-white dark:bg-darkBg rounded-xl p-1.5 justify-around shadow-sm border border-lightBorder dark:border-darkBorder">
                <View className="flex-row items-center gap-1.5">
                  <Icon name="checkmark-circle" size={10} color={palette.success} />
                  <View className="h-1 bg-emerald-400 rounded-full flex-1" />
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Icon name="checkmark-circle" size={10} color={palette.success} />
                  <View className="h-1 bg-emerald-400 rounded-full flex-1" />
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Icon name="ellipse-outline" size={10} color={palette.mutedText} />
                  <View className="h-1 bg-lightBorder dark:bg-darkBorder rounded-full flex-1" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Document Checklist List */}
        <View className="px-4 mt-4 gap-3">
          {documents.map(item => {
            const cfg = statusConfig[item.status];
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleAction(item)}
                activeOpacity={0.8}
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                className="rounded-xl border shadow-sm"
              >
                <View className="flex-row items-center p-3.5">
                  {/* Document Icon */}
                  <View className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 justify-center items-center mr-3">
                    <Icon name={item.iconName} size={22} color={palette.primary} />
                  </View>

                  {/* Document Title & Subtitle */}
                  <View className="flex-1 mr-2">
                    <Text className="text-[15px] font-bold text-textLight dark:text-textDark leading-snug">
                      {item.title}
                    </Text>
                    <Text
                      className="text-[12px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5"
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  {/* Status Pill */}
                  <View
                    className="flex-row items-center gap-1 px-2.5 py-1 rounded-full mr-2"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <Icon name={cfg.icon} size={11} color={cfg.text} />
                    <Text className="text-[11px] font-bold" style={{ color: cfg.text }}>
                      {cfg.label}
                    </Text>
                  </View>

                  {/* Action Chevron */}
                  <View className="flex-row items-center gap-0.5">
                    <Text
                      className="text-[13px] font-extrabold"
                      style={{
                        color: item.status === 'rejected' ? palette.destructive : palette.primary,
                      }}
                    >
                      {item.actionLabel}
                    </Text>
                    <Icon
                      name="chevron-forward"
                      size={14}
                      color={item.status === 'rejected' ? palette.destructive : palette.primary}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Support Section card */}
        <View className="mx-4 mt-4 mb-10 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
          <View className="flex-row items-center p-4">
            <View
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
              className="w-10 h-10 rounded-xl justify-center items-center mr-3 border"
            >
              <Icon name="headset-outline" size={20} color={palette.primary} />
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-[14px] font-extrabold text-textLight dark:text-textDark">
                Need Help?
              </Text>
              <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5 leading-[15px]">
                Our team usually verifies documents within 24 hours.
              </Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-0.5"
              onPress={() => navigation.navigate(ROUTES.SUPPORT)}
              activeOpacity={0.7}
            >
              <Text className="text-[13px] font-extrabold" style={{ color: palette.primary }}>
                Contact Support
              </Text>
              <Icon name="chevron-forward" size={14} color={palette.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer Proceed / Upload button */}
      <View
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.border,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 12,
        }}
        className="absolute bottom-0 left-0 right-0 px-4 border-t"
      >
        <Button
          variant="outline"
          label="Sign Out"
          leftSlot={<Icon name="log-out-outline" size={18} color={palette.destructive} style={{ marginRight: 6 }} />}
          textStyle={{ color: palette.destructive }}
          onPress={handleLogout}
          height={48}
          borderRadius={14}
          style={{ marginBottom: isVerified ? 10 : 0 }}
        />

        {isVerified && (
          <Button
            label="Go to Dashboard"
            leftSlot={<Icon name="rocket-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
            onPress={handleComplete}
            height={54}
            borderRadius={14}
          />
        )}
      </View>

      {/* Bypass Verification Confirmation Modal */}
      <Modal
        visible={bypassModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBypassModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setBypassModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
            className="rounded-t-[28px] p-6 border-t"
          >
            <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full self-center mb-4" />

            <View className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/40 justify-center items-center self-center mb-3">
              <Icon name="shield-half-outline" size={32} color={palette.warning} />
            </View>

            <Text className="text-xl font-extrabold text-textLight dark:text-textDark text-center mb-2">
              Verification Pending
            </Text>

            <Text className="text-sm text-textLightSecondary dark:text-textDarkSecondary text-center mb-6 leading-5 px-2">
              Your profile is currently under review by our admin team. Would you like to bypass verification and enter the app dashboard directly?
            </Text>

            <View className="gap-3">
              <Button
                label="Bypass & Go to Dashboard"
                leftSlot={<Icon name="rocket-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
                onPress={proceedToDashboard}
                height={52}
                borderRadius={14}
              />

              <Button
                variant="outline"
                label="Cancel"
                onPress={() => setBypassModalVisible(false)}
                height={48}
                borderRadius={14}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Animated Toast */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

export default DocumentCenterScreen;
