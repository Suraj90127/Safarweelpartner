import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { driverApi } from '../../api/driverApi';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { ROUTES } from '../../constants/routes';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { registerProfileThunk } from '../../redux/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import mmkvService from '../../services/storage/mmkvService';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';

const YEARS = Array.from({ length: 60 }, (_, i) =>
  (new Date().getFullYear() - 18 - i).toString(),
);
const DAYS = Array.from({ length: 31 }, (_, i) =>
  (i + 1).toString().padStart(2, '0'),
);
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const ProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const iconGray = palette.mutedText;

  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const hideToast = useCallback(
    () => setToast(prev => ({ ...prev, visible: false })),
    [],
  );

  const showToast = useCallback(
    (title: string, message: string = '', type: ToastType = 'info') => {
      setToast({ visible: true, title, message, type });
    },
    [],
  );

  const [fullName, setFullName] = useState('');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieAsset, setSelfieAsset] = useState<any | null>(null);

  // Get driver info from Redux and MMKV to fetch phone number
  const driver = useAppSelector(
    state => state.driver.profile || state.auth.driver,
  );
  const phone =
    mmkvService.getString(STORAGE_KEYS.PHONE) || driver?.phone || '';

  // Custom Date of Birth Picker states
  const [dob, setDob] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('01');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState('2000');

  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [isGenderDropdownVisible, setIsGenderDropdownVisible] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [isReferralChecked, setIsReferralChecked] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isCityPickerVisible, setIsCityPickerVisible] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  // console.log("cities", cities)
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const getCityName = () => {
    const found = cities.find(
      c => c._id === selectedCityId || c.name === selectedCityId,
    );
    return found ? found.name : selectedCityId;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch dynamic cities — deferred so navigation animation completes first.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      const fetchCities = async () => {
        setIsLoadingCities(true);
        try {
          const response = await driverApi.getCities();
          // console.log("get city response", response)
          let cityData = [];
          if (response.data?.success || response.success) {
            cityData = response.data?.docs || response.data || [];
          } else {
            cityData = response.data || response || [];
          }

          // console.log("city data", cityData)

          if (Array.isArray(cityData)) {
            const normalized = cityData.map((c: any) => {
              if (typeof c === 'string') {
                return { _id: c, name: c };
              }
              return {
                _id: c._id || c.id || c.name || '',
                name: c.name || c.cityName || String(c),
              };
            });
            setCities(normalized);
          }
        } catch (error) {
          console.log('Failed to fetch cities from API', error);
        } finally {
          setIsLoadingCities(false);
        }
      };
      fetchCities();
    });
    return () => task.cancel();
  }, []);

  const hasHydrated = useRef(false);

  // Pre-populate fields from driver Redux state first
  useEffect(() => {
    if (driver && !hasHydrated.current) {
      if (driver.name) setFullName(driver.name);
      if (driver.gender) setGender(driver.gender as any);
      if (driver.dob) {
        setDob(driver.dob);
        const parts = driver.dob.split('-');
        if (parts.length === 3) {
          setSelectedDay(parts[0]);
          setSelectedMonth(parts[1]);
          setSelectedYear(parts[2]);
        }
      }
      if (driver.profilePhoto) {
        setSelfieUri(driver.profilePhoto);
      } else if (driver.profile_image_id) {
        setSelfieUri(driver.profile_image_id);
      }
      if (driver.city) {
        const cityVal =
          typeof driver.city === 'object' && driver.city
            ? (driver.city as any)._id || (driver.city as any).id
            : driver.city;
        setSelectedCityId(cityVal);
      }
      hasHydrated.current = true;
    }
  }, [driver]);

  const handleEditPhoto = () => {
    navigation.navigate(ROUTES.SELFIE_CAMERA, {
      onSelfieCaptured: (uri: string, asset: any) => {
        setSelfieUri(uri);
        setSelfieAsset(asset);
      },
    });
  };

  const handleConfirmDob = () => {
    const formattedDob = `${selectedDay}-${selectedMonth}-${selectedYear}`;
    setDob(formattedDob);
    setIsDatePickerVisible(false);
  };

  const handleSelectGender = (value: 'Male' | 'Female') => {
    setGender(value);
    setIsGenderDropdownVisible(false);
  };

  const isFormValid = () => {
    return (
      fullName.trim().length > 2 &&
      dob !== '' &&
      gender !== null &&
      selfieUri !== null &&
      selectedCityId !== ''
    );
  };

  const handleSubmit = async () => {
    if (!selfieUri) {
      showToast(
        'Profile Photo Required',
        'Please upload a clear profile photo of your face.',
        'warning',
      );
      return;
    }
    if (!fullName.trim() || fullName.trim().length <= 2) {
      showToast(
        'Full Name Required',
        'Please enter your full name (at least 3 characters).',
        'warning',
      );
      return;
    }
    if (!dob) {
      showToast(
        'Date of Birth Required',
        'Please select your Date of Birth.',
        'warning',
      );
      return;
    }
    if (!gender) {
      showToast('Gender Required', 'Please select your Gender.', 'warning');
      return;
    }
    if (!selectedCityId) {
      showToast(
        'City Required',
        'Please select the city where you operate.',
        'warning',
      );
      return;
    }
    if (isReferralChecked && !referralCode.trim()) {
      showToast(
        'Referral Code Required',
        'Please enter a referral code or turn off the checkbox.',
        'warning',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let avatarUrl = selfieUri;

      // Upload selfie to S3 if it is a local URI
      if (
        selfieUri &&
        (selfieUri.startsWith('file://') || selfieUri.startsWith('content://'))
      ) {
        const formData = new FormData();
        if (selfieAsset) {
          formData.append('avatar', {
            uri:
              Platform.OS === 'android'
                ? selfieAsset.uri
                : selfieAsset.uri?.replace('file://', ''),
            type: selfieAsset.type || 'image/jpeg',
            name: selfieAsset.fileName || 'avatar.jpg',
          } as any);
        } else {
          formData.append('avatar', {
            uri:
              Platform.OS === 'android'
                ? selfieUri
                : selfieUri?.replace('file://', ''),
            type: 'image/jpeg',
            name: 'avatar.jpg',
          } as any);
        }

        const uploadRes = await driverApi.uploadAvatar(formData);

        if (uploadRes.success || uploadRes.data?.success) {
          avatarUrl = uploadRes.data?.url || (uploadRes as any).url;
        } else {
          showToast(
            'Upload Failed',
            uploadRes.message || 'Failed to upload profile photo to S3.',
            'error',
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Determine if profile is already setup or exists to decide between register and update
      const hasExistingProfile = !!(
        driver?.name ||
        driver?.dob ||
        driver?.gender ||
        driver?.city
      );
      const isProfileSetup =
        mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE) ||
        hasExistingProfile;
      const payload: {
        name?: string;
        dob?: string;
        gender?: string;
        profile_image_id?: string;
        phone?: string;
        city?: string;
        referral_code?: string;
      } = {
        name: fullName.trim(),
        dob,
        gender: gender || undefined,
        profile_image_id: avatarUrl || undefined,
        phone: phone || undefined,
        city: selectedCityId || undefined,
      };

      if (isReferralChecked && referralCode.trim()) {
        payload.referral_code = referralCode.trim();
      }

      if (isProfileSetup) {
        await driverApi.updateProfile(payload);
      } else {
        await dispatch(registerProfileThunk(payload)).unwrap();
      }

      // A resolved API call means the save succeeded; its response body may be empty.
      mmkvService.setBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE, true);

      showToast(
        'Success',
        'Profile setup completed successfully!',
        'success',
      );
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DOCUMENT_CENTER }],
        });
      }, 1200);
    } catch (error: any) {
      console.log('Profile setup error:', error);
      showToast(
        'Error',
        error.message || 'Failed to save profile details.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader
        title={
          <View className="items-center">
            <Text className="text-base font-extrabold text-textLight dark:text-textDark">
              Profile Setup
            </Text>
            <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium mt-0.5">
              Complete your profile to get verified
            </Text>
          </View>
        }

        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace(ROUTES.DOCUMENT_CENTER);
          }
        }}
        borderBottom={true}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoadingProfile ? (
          <View className="py-15 justify-center items-center">
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : (
          <>
            {/* Why we need your profile? Banner */}
            <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl p-4 flex-row items-center mb-2 mx-4 mt-4">
              {/* Left Mock Profile Card Graphic */}
              <View className="w-[76px] h-[50px] bg-white dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-md p-1 justify-between shadow-sm relative">
                <View className="flex-row items-center">
                  <View className="w-[18px] h-[18px] rounded-full bg-primary/20 justify-center items-center">
                    <Icon name="person" size={10} color={palette.primary} />
                  </View>
                  <View className="ml-1.5 flex-1">
                    <View className="w-8 h-1 bg-lightBorder dark:bg-darkBorder rounded mb-0.5" />
                    <View className="w-5 h-1 bg-lightBorder dark:bg-darkBorder rounded" />
                  </View>
                </View>
                <View className="w-full h-[1px] bg-lightBorder dark:bg-darkBorder my-1" />
                <View className="flex-row items-center justify-between">
                  <View className="w-10 h-2 bg-lightBorder dark:bg-darkBorder rounded" />
                  <View className="w-3.5 h-3.5 bg-emerald-500 rounded-full items-center justify-center border border-white dark:border-darkCard">
                    <Icon
                      name="checkmark"
                      size={8}
                      color={isDark ? '#000000' : '#FFFFFF'}
                    />
                  </View>
                </View>
                {/* Left top shield icon */}
                <View className="absolute top-[-4px] left-[-4px] bg-primary w-4.5 h-4.5 rounded-full items-center justify-center border border-white dark:border-darkCard">
                  <Icon name="shield-checkmark" size={10} color="#000000" />
                </View>
              </View>

              {/* Center Text */}
              <View className="flex-1 ml-4 mr-2">
                <Text className="text-xs font-bold text-textLight dark:text-textDark">
                  Why we need your profile?
                </Text>
                <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-1 leading-[13px]">
                  This helps riders know who they're riding with and builds
                  trust.
                </Text>
              </View>

              {/* Right Scan Graphic */}
              <View className="w-12 h-12 items-center justify-center relative">
                <View className="w-10 h-10 border border-dashed border-primary rounded-lg items-center justify-center">
                  <Icon name="person" size={24} color={palette.primary} />
                </View>
                <Text className="absolute top-0 right-0 text-primary text-[10px]">
                  ✦
                </Text>
                <Text className="absolute bottom-1 left-0 text-primary text-[8px]">
                  ✦
                </Text>
              </View>
            </View>

            {/* Profile Photo Card */}
            <TouchableOpacity
              onPress={handleEditPhoto}
              activeOpacity={0.8}
              className="mx-4 bg-white dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-xl p-3 mb-5 shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="relative">
                  <View className="w-[60px] h-[60px] rounded-full border-2 border-lightBorder dark:border-darkBorder p-0.5 justify-center items-center bg-lightBg dark:bg-darkBg">
                    {selfieUri ? (
                      <Image
                        source={{ uri: selfieUri }}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <View className="w-full h-full rounded-full justify-center items-center bg-lightBg dark:bg-darkBg">
                        <Icon name="person" size={44} color={iconGray} />
                      </View>
                    )}
                  </View>
                  {/* Camera icon badge overlay */}
                  <View className="absolute bottom-0 right-0 bg-primary w-7 h-7 rounded-full items-center justify-center border-2 border-white dark:border-darkCard">
                    <Icon name="camera" size={13} color="#000000" />
                  </View>
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-bold text-textLight dark:text-textDark">
                    Profile Photo
                  </Text>
                  {selfieUri ? (
                    <View className="flex-row items-center bg-[#ECFDF5] dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-[#D1FAE5] dark:border-emerald-900/30 self-start mt-1.5">
                      <Text className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mr-1">
                        Uploaded
                      </Text>
                      <Icon name="checkmark" size={10} color="#10B981" />
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30 self-start mt-1.5">
                      <Text className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mr-1">
                        Pending
                      </Text>
                      <Icon name="time" size={10} color="#D97706" />
                    </View>
                  )}
                  <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-2 leading-[13px]">
                    Use a clear photo of your face. Avoid sunglasses or hats.
                  </Text>
                </View>
              </View>

              {/* Right Action Chevron/Icon */}
              <View className="w-8 h-8 rounded-full bg-lightBg dark:bg-darkBg items-center justify-center border border-lightBorder dark:border-darkBorder">
                <Icon
                  name={selfieUri ? 'create-outline' : 'chevron-forward'}
                  size={16}
                  color={palette.primary}
                />
              </View>
            </TouchableOpacity>

            {/* Form Fields Card */}
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
              className="mx-4 border rounded-xl p-5 mb-5 shadow-sm"
            >
              {/* Full Name */}
              <View className="flex-row mb-5">
                <View className="flex-1">
                  <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <View
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center border rounded-xl bg-white dark:bg-darkBg py-2.5 px-3.5 pl-2"
                  >
                    <Icon name="person" size={20} color={palette.primary} />
                    <TextInput
                      className="flex-1 text-md font-semibold text-textLight dark:text-textDark py-1"
                      placeholder="Enter Your Name"
                      value={fullName}
                      onChangeText={setFullName}
                      placeholderTextColor={iconGray}
                    />
                    {fullName.trim().length > 2 && (
                      <Icon
                        name="checkmark-circle"
                        size={20}
                        color={palette.success}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Phone Number */}
              <View className="flex-row mb-5">
                <View className="flex-1">
                  <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                    Phone Number
                  </Text>
                  <View
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center border rounded-xl bg-lightBg/80 dark:bg-darkBg/50 py-2 px-3.5 opacity-80"
                  >
                    <Icon name="call" size={20} color={palette.primary} />
                    <TextInput
                      className="flex-1 text-sm font-extrabold text-textLightSecondary dark:text-textDarkSecondary py-2"
                      value={phone}
                      editable={false}
                    />
                    <Icon name="lock-closed" size={16} color={iconGray} />
                  </View>
                  <View className="flex-row items-center mt-1.5 ml-1">
                    <Icon
                      name="information-circle-outline"
                      size={13}
                      color={iconGray}
                    />
                    <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary ml-1">
                      You cannot change your phone number
                    </Text>
                  </View>
                </View>
              </View>

              {/* DOB & Gender Row */}
              <View className="flex-row mb-5">
                <View className="flex-1 flex-row gap-3">
                  {/* DOB */}
                  <View className="flex-1">
                    <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                      Date of Birth <Text className="text-red-500">*</Text>
                    </Text>
                    <TouchableOpacity
                      style={{ borderColor: palette.border }}
                      className="flex-row items-center border rounded-xl bg-white dark:bg-darkBg py-3 px-3"
                      onPress={() => setIsDatePickerVisible(true)}
                    >
                      <Text
                        className={`flex-1 text-sm font-extrabold ${
                          dob
                            ? 'text-textLight dark:text-textDark'
                            : 'text-textLightSecondary dark:text-textDarkSecondary'
                        }`}
                      >
                        {dob || '15-08-1998'}
                      </Text>
                      <Icon
                        name="calendar-outline"
                        size={18}
                        color={iconGray}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Gender */}
                  <View className="flex-1">
                    <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                      Gender <Text className="text-red-500">*</Text>
                    </Text>
                    <TouchableOpacity
                      style={{ borderColor: palette.border }}
                      className="flex-row items-center border rounded-xl bg-white dark:bg-darkBg py-3 px-3"
                      onPress={() =>
                        setIsGenderDropdownVisible(prev => !prev)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`flex-1 text-sm font-extrabold ${
                          gender
                            ? 'text-textLight dark:text-textDark'
                            : 'text-textLightSecondary dark:text-textDarkSecondary'
                        }`}
                      >
                        {gender || 'Select Gender'}
                      </Text>
                      <Icon
                        name={
                          isGenderDropdownVisible
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={16}
                        color={iconGray}
                      />
                    </TouchableOpacity>

                    {isGenderDropdownVisible && (
                      <View
                        style={{
                          borderColor: palette.border,
                          backgroundColor: palette.surface,
                        }}
                        className="mt-1 border rounded-xl overflow-hidden"
                      >
                        <TouchableOpacity
                          className="py-2.5 px-3"
                          onPress={() => handleSelectGender('Male')}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              gender === 'Male'
                                ? 'text-emerald-500'
                                : 'text-textLight dark:text-textDark'
                            }`}
                          >
                            Male
                          </Text>
                        </TouchableOpacity>

                        <View
                          style={{ borderTopWidth: 1, borderTopColor: palette.border }}
                        />

                        <TouchableOpacity
                          className="py-2.5 px-3"
                          onPress={() => handleSelectGender('Female')}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              gender === 'Female'
                                ? 'text-emerald-500'
                                : 'text-textLight dark:text-textDark'
                            }`}
                          >
                            Female
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* City */}
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                    City <Text className="text-red-500">*</Text>
                  </Text>
                  <TouchableOpacity
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center border rounded-xl bg-white dark:bg-darkBg py-3 px-3.5"
                    onPress={() => setIsCityPickerVisible(true)}
                  >
                    <Icon name="location" size={20} color={palette.primary} />
                    <Text
                      className={`flex-1 text-sm font-extrabold ${
                        selectedCityId
                          ? 'text-textLight dark:text-textDark'
                          : 'text-textLightSecondary dark:text-textDarkSecondary'
                      }`}
                    >
                      {getCityName() || 'Select City'}
                    </Text>
                    <Icon name="chevron-down" size={18} color={iconGray} />
                  </TouchableOpacity>
                  {/* Green tip box */}
                  <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 rounded-xl px-3 py-2 mt-3">
                    <Icon
                      name="shield-checkmark"
                      size={14}
                      color={palette.success}
                    />
                    <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium ml-2 flex-1">
                      Select the city where you usually operate.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Referral code optional */}
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
              className="mx-4 border rounded-xl p-4 mb-5 shadow-sm"
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsReferralChecked(prev => !prev)}
                className="flex-row items-center"
              >
                <View
                  className="h-5 w-5 rounded border items-center justify-center mr-3"
                  style={{
                    borderColor: isReferralChecked
                      ? palette.primary
                      : palette.border,
                    backgroundColor: isReferralChecked
                      ? palette.primary
                      : 'transparent',
                  }}
                >
                  {isReferralChecked && (
                    <Icon name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text className="text-[12px] font-bold text-textLight dark:text-textDark flex-1">
                  I have a referral code
                </Text>
              </TouchableOpacity>

              {isReferralChecked && (
                <View className="mt-3">
                  <Text className="text-[11px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                    Referral Code
                  </Text>
                  <View
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center border rounded-xl bg-white dark:bg-darkBg py-2.5 px-3.5"
                  >
                    <Icon
                      name="gift-outline"
                      size={18}
                      color={palette.primary}
                    />
                    <TextInput
                      className="flex-1 ml-2 text-sm font-semibold text-textLight dark:text-textDark"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChangeText={setReferralCode}
                      autoCapitalize="characters"
                      placeholderTextColor={iconGray}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Tips banner */}
            <View className="mx-4 bg-amber-50 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center mr-2">
                  <Icon name="bulb-outline" size={15} color={palette.primary} />
                </View>
                <Text className="text-xs font-black text-textLight dark:text-textDark">
                  Tips for a great profile
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center w-[30%] px-0.5">
                  <Icon
                    name="checkmark-circle-outline"
                    size={13}
                    color={palette.success}
                  />
                  <Text className="text-[9px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1">
                    Use real photo
                  </Text>
                </View>
                <View className="w-[1px] h-4 bg-lightBorder dark:bg-darkBorder" />
                <View className="flex-row items-center w-[35%] px-0.5">
                  <Icon
                    name="checkmark-circle-outline"
                    size={13}
                    color={palette.success}
                  />
                  <Text className="text-[9px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1">
                    Enter correct details
                  </Text>
                </View>
                <View className="w-[1px] h-4 bg-lightBorder dark:bg-darkBorder" />
                <View className="flex-row items-center w-[30%] px-0.5">
                  <Icon
                    name="checkmark-circle-outline"
                    size={13}
                    color={palette.success}
                  />
                  <Text className="text-[9px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1">
                    Keep updated
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom button */}
      <View
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.border,
        }}
        className="bottom-0 left-0 right-0 px-4 pb-6 pt-3 border-t"
      >
        <Button
          label="Save & Continue"
          showArrow
          isLoading={isSubmitting}
          onPress={handleSubmit}
          borderRadius={14}
          leftSlot={
            <Icon
              name="shield-checkmark-outline"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
          }
        />

        {/* Secure disclaimer */}
        <View className="flex-row items-center justify-center mt-2.5">
          <Icon name="lock-closed-outline" size={12} color={iconGray} />
          <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium ml-1.5">
            Your information is secure and encrypted
          </Text>
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            style={{ backgroundColor: palette.surface }}
            className="rounded-t-[24px] p-6 max-h-[60%]"
          >
            <Text className="text-lg font-bold text-textLight dark:text-textDark text-center mb-5">
              Select Date of Birth
            </Text>

            <View className="flex-row justify-between h-[200px] mb-6">
              {/* Day Selection */}
              <View
                style={{
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }}
                className="flex-1 items-center border rounded-lg mx-1 py-1.5"
              >
                <Text className="text-xs font-semibold text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                  Day
                </Text>
                <ScrollView
                  className="w-full"
                  showsVerticalScrollIndicator={false}
                >
                  {DAYS.map(day => (
                    <TouchableOpacity
                      key={day}
                      className={`py-2.5 items-center w-full ${
                        selectedDay === day ? 'bg-primary/10' : ''
                      }`}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        className={`text-[15px] ${
                          selectedDay === day
                            ? 'text-primary font-bold'
                            : 'text-textLight dark:text-textDark font-semibold'
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Selection */}
              <View
                style={{
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }}
                className="flex-1 items-center border rounded-lg mx-1 py-1.5"
              >
                <Text className="text-xs font-semibold text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                  Month
                </Text>
                <ScrollView
                  className="w-full"
                  showsVerticalScrollIndicator={false}
                >
                  {MONTHS.map(month => (
                    <TouchableOpacity
                      key={month.value}
                      className={`py-2.5 items-center w-full ${
                        selectedMonth === month.value ? 'bg-primary/10' : ''
                      }`}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text
                        className={`text-[15px] ${
                          selectedMonth === month.value
                            ? 'text-primary font-bold'
                            : 'text-textLight dark:text-textDark font-semibold'
                        }`}
                      >
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Selection */}
              <View
                style={{
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                }}
                className="flex-1 items-center border rounded-lg mx-1 py-1.5"
              >
                <Text className="text-xs font-semibold text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
                  Year
                </Text>
                <ScrollView
                  className="w-full"
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS.map(year => (
                    <TouchableOpacity
                      key={year}
                      className={`py-2.5 items-center w-full ${
                        selectedYear === year ? 'bg-primary/10' : ''
                      }`}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        className={`text-[15px] ${
                          selectedYear === year
                            ? 'text-primary font-bold'
                            : 'text-textLight dark:text-textDark font-semibold'
                        }`}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View className="flex-row justify-between">
              <Button
                variant="outline"
                label="Cancel"
                style={{ flex: 1, marginRight: 8 }}
                height={46}
                borderRadius={10}
                onPress={() => setIsDatePickerVisible(false)}
              />
              <Button
                label="Confirm"
                style={{ flex: 1, marginLeft: 8 }}
                height={46}
                borderRadius={10}
                onPress={handleConfirmDob}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal
        visible={isCityPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCityPickerVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            style={{ backgroundColor: palette.surface }}
            className="rounded-t-[24px] p-6 max-h-[60%]"
          >
            <Text className="text-lg font-bold text-textLight dark:text-textDark text-center mb-5">
              Select City
            </Text>

            {isLoadingCities ? (
              <View className="py-8 justify-center items-center">
                <ActivityIndicator size="large" color={palette.primary} />
              </View>
            ) : cities.length === 0 ? (
              <View className="py-8 justify-center items-center">
                <Text className="text-textLightSecondary dark:text-textDarkSecondary text-base">
                  No cities available
                </Text>
              </View>
            ) : (
              <ScrollView
                className="w-full mb-6"
                showsVerticalScrollIndicator={false}
              >
                {cities.map(item => (
                  <TouchableOpacity
                    key={item._id}
                    style={{ borderColor: palette.border }}
                    className={`py-3.5 px-4 items-center w-full border-b ${
                      selectedCityId === item._id ? 'bg-primary/10' : ''
                    }`}
                    onPress={() => {
                      setSelectedCityId(item._id);
                      setIsCityPickerVisible(false);
                    }}
                  >
                    <Text
                      className={`text-base ${
                        selectedCityId === item._id
                          ? 'text-primary font-bold'
                          : 'text-textLight dark:text-textDark'
                      }`}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Button
              variant="outline"
              label="Cancel"
              height={46}
              borderRadius={10}
              onPress={() => setIsCityPickerVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Floating Animated Toast Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

export default ProfileSetupScreen;
