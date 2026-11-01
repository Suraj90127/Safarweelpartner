import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Platform,
  Modal,
  PermissionsAndroid,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { ROUTES } from '../../constants/routes';
import { driverApi } from '../../api/driverApi';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchDriverDocumentsThunk } from '../../redux/slices/driverSlice';
import { useThemePalette } from '../../utils/theme';
import { getDriverDocumentStatus } from '../../utils/driverDocumentStatus';

const DrivingLicenseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const iconGray = palette.mutedText;

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

  const driverDocument = useAppSelector(state => state.driver.driverDocument);
  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const isVerified = (driver?.isVerified || (driver as any)?.is_verified) ?? false;
  const isDlUploaded = mmkvService.getBoolean(STORAGE_KEYS.DL_UPLOADED);

  const [dlNumber, setDlNumber] = useState('');
  const [dlError, setDlError] = useState<string | null>(null);
  const [licenseType, setLicenseType] = useState('LMV (4 Wheeler)');
  const [frontImage, setFrontImage] = useState<Asset | null>(null);
  const [backImage, setBackImage] = useState<Asset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [remoteFront, setRemoteFront] = useState<string | null>(null);
  const [remoteBack, setRemoteBack] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back' | null>(null);

  const isEditable = !documentStatus || documentStatus === 'rejected';
  const isFrontRejected = !!remoteFront &&
    getDriverDocumentStatus([driverDocument?.dl?.front?.status]) === 'rejected';
  const isBackRejected = !!remoteBack &&
    getDriverDocumentStatus([driverDocument?.dl?.back?.status]) === 'rejected';
  const canEditFront = isEditable && (!remoteFront || isFrontRejected);
  const canEditBack = isEditable && (!remoteBack || isBackRejected);

const STATE_CODE_MAP: Record<string, string> = {
  AN: 'Andaman & Nicobar',
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CT: 'Chhattisgarh',
  CH: 'Chandigarh',
  DD: 'Daman & Diu',
  DL: 'Delhi',
  DN: 'Dadra & Nagar Haveli',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JH: 'Jharkhand',
  JK: 'Jammu & Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TG: 'Telangana',
  TS: 'Telangana',
  TN: 'Tamil Nadu',
  TR: 'Tripura',
  UA: 'Uttarakhand',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
};

  const formatDlNumber = useCallback((text: string): string => {
    const clean = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    let formatted = '';
    for (let i = 0; i < clean.length; i++) {
      if (i === 4 || i === 8) {
        formatted += ' ';
      }
      formatted += clean[i];
    }
    return formatted;
  }, []);

  const validateDlNumber = useCallback((num: string): boolean => {
    const clean = num.replace(/[\s-/]/g, '').toUpperCase();
    if (!clean || clean.length < 13 || clean.length > 16) return false;
    const stateCode = clean.slice(0, 2);
    if (!/^[A-Z]{2}$/.test(stateCode)) return false;

    // Standard MoRTH Parivahan format (e.g. DL1220180001234, MH0220200012345, UP1420170009999, KA0120191234567)
    const standardFormat = /^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/;
    // Flexible format supporting all Indian States & UTs and legacy DL formats (13 to 16 alphanumeric)
    const flexibleFormat = /^[A-Z]{2}\d{11,14}$/;

    return standardFormat.test(clean) || flexibleFormat.test(clean);
  }, []);

  const getDetectedState = (num: string): string | null => {
    const clean = num.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length >= 2) {
      const code = clean.slice(0, 2);
      return STATE_CODE_MAP[code] || null;
    }
    return null;
  };

  const detectedState = getDetectedState(dlNumber);
  const isDlValid = validateDlNumber(dlNumber);

  const handleDlChange = (text: string) => {
    const formatted = formatDlNumber(text);
    setDlNumber(formatted);
    if (dlError) {
      const clean = formatted.replace(/[\s-/]/g, '');
      if (clean.length === 0 || validateDlNumber(formatted)) {
        setDlError(null);
      }
    }
  };

  const handleDlBlur = () => {
    if (!dlNumber.trim()) return;
    if (!validateDlNumber(dlNumber)) {
      setDlError('Invalid DL format. Example: DL12 2018 0001234 or MH02 2020 0012345');
    } else {
      setDlError(null);
    }
  };

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchDriverDocumentsThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  useEffect(() => {
    if (driverDocument?.dl) {
      const dl = driverDocument.dl;
      if (dl.front?.url) setRemoteFront(dl.front.url);
      if (dl.back?.url) setRemoteBack(dl.back.url);
      if (dl.front?.number) setDlNumber(formatDlNumber(dl.front.number));
      if (dl.licenseType) setLicenseType(dl.licenseType);
      const hasFront = !!dl.front?.url;
      const hasBack = !!dl.back?.url;
      const status = getDriverDocumentStatus([
        hasFront ? dl.front?.status : undefined,
        hasBack ? dl.back?.status : undefined,
      ]);
      setDocumentStatus(hasFront || hasBack ? status : null);
    }
  }, [driverDocument, formatDlNumber]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Rapido Driver needs access to your camera to take a picture of your DL.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleCaptureImage = async (side: 'front' | 'back') => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Permission Denied', 'Camera permission is required to capture documents.', 'warning');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        saveToPhotos: false,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          showToast('Error', response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (side === 'front') {
            setFrontImage(asset);
          } else {
            setBackImage(asset);
          }
        }
      }
    );
  };

  const handleSelectFromGallery = (side: 'front' | 'back') => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          showToast('Error', response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (side === 'front') {
            setFrontImage(asset);
          } else {
            setBackImage(asset);
          }
        }
      }
    );
  };

  const handleUpload = async () => {
    if (!isEditable) return;
    if (!dlNumber.trim()) {
      setDlError('Driving License Number is required');
      showToast('Required Field', 'Please enter your Driving License Number.', 'warning');
      return;
    }
    if (!validateDlNumber(dlNumber)) {
      setDlError('Invalid DL format. Example: DL12 2018 0001234');
      showToast('Invalid DL Number', 'Please enter a valid 15-character Driving License number (e.g. DL12 2018 0001234).', 'warning');
      return;
    }
    if (!frontImage && !remoteFront) {
      showToast('Required Upload', 'Please capture or select the Front Side of your DL.', 'warning');
      return;
    }
    if (!backImage && !remoteBack) {
      showToast('Required Upload', 'Please capture or select the Back Side of your DL.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('dl_number', dlNumber.trim());
      formData.append('licenseType', licenseType.trim());

      if (frontImage) {
        formData.append('dl_front', {
          uri: frontImage.uri,
          type: frontImage.type || 'image/jpeg',
          name: frontImage.fileName || 'dl_front.jpg',
        } as any);
      }

      if (backImage) {
        formData.append('dl_back', {
          uri: backImage.uri,
          type: backImage.type || 'image/jpeg',
          name: backImage.fileName || 'dl_back.jpg',
        } as any);
      }

      const response = await driverApi.uploadDl(formData);

      if (response.success) {
        dispatch(fetchDriverDocumentsThunk());
        mmkvService.setBoolean(STORAGE_KEYS.DL_UPLOADED, true);

        showToast('Success', 'Driving License uploaded successfully!', 'success');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.DOCUMENT_CENTER }],
          });
        }, 1200);
      } else {
        showToast('Upload Failed', response.message || 'Something went wrong.', 'error');
      }
    } catch (error: any) {
      console.log('DL Upload Error:', error);
      showToast('Error', error.message || 'Failed to connect to the server.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const showUploaderOptions = (side: 'front' | 'back') => {
    if (!isEditable) {
      showToast('Read Only', 'This document is already submitted or approved.', 'info');
      return;
    }
    setActiveSide(side);
    setPickerModalVisible(true);
  };

  const getStepIndex = () => {
    if (documentStatus === 'rejected') return 1;
    if (isVerified) return 3;
    if (documentStatus === 'pending') return 1;
    if (documentStatus === 'verified' || documentStatus === 'approved') return 2;
    if (isDlUploaded) return 1;
    return 0;
  };

  const currentStep = getStepIndex();

  const getStatusBoxConfig = () => {
    if (documentStatus === 'approved' || documentStatus === 'verified') {
      return {
        label: 'Approved',
        subtext: 'Your Driving License has been verified successfully.',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-900/30',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        labelColor: 'text-emerald-600',
        icon: 'checkmark-circle',
        iconColor: palette.success,
      };
    }
    if (documentStatus === 'rejected') {
      const rejectedSides = [
        isFrontRejected ? 'front image' : null,
        isBackRejected ? 'back image' : null,
      ].filter(Boolean).join(' and ');
      return {
        label: 'Rejected',
        subtext: `The ${rejectedSides || 'document image'} was rejected. Replace it to continue.`,
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-900/30',
        textColor: 'text-red-700 dark:text-red-400',
        labelColor: 'text-red-600',
        icon: 'close-circle',
        iconColor: palette.destructive,
      };
    }
    if (documentStatus === 'pending' || documentStatus === 'submitted') {
      return {
        label: 'Under Review',
        subtext: "We'll notify you once your DL is verified.",
        bgColor: 'bg-amber-50 dark:bg-amber-950/20',
        borderColor: 'border-amber-200 dark:border-amber-900/30',
        textColor: 'text-amber-700 dark:text-amber-400',
        labelColor: 'text-amber-600',
        icon: 'time',
        iconColor: palette.warning,
      };
    }
    return {
      label: 'Not Submitted',
      subtext: 'Please upload DL images to start verification.',
      bgColor: 'bg-gray-50 dark:bg-darkCard',
      borderColor: 'border-lightBorder dark:border-darkBorder',
      textColor: 'text-textLightSecondary dark:text-textDarkSecondary',
      labelColor: 'text-textLightSecondary',
      icon: 'information-circle',
      iconColor: iconGray,
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg" edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScreenHeader
        title="Driving License"
        rightElement={
          <TouchableOpacity
            className="flex-row items-center bg-white dark:bg-darkCard px-3.5 py-1.5 rounded-full border border-lightBorder dark:border-darkBorder"
            onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            activeOpacity={0.7}
          >
            <Icon name="headset-outline" size={16} color={palette.primary} className="mr-1.5" />
            <Text className="text-xs font-bold text-textLight dark:text-textDark">Help</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Verification Status Stepper Box */}
        <View
          style={{ backgroundColor: palette.surface, borderColor: palette.border }}
          className="mx-4 mt-4 rounded-xl p-5 border shadow-sm"
        >
          {(() => {
            const config = getStatusBoxConfig();
            return (
              <View className={`flex-row items-center ${config.bgColor} border ${config.borderColor} rounded-xl p-4 mb-5`}>
                <Icon name={config.icon} size={26} color={config.iconColor} style={{ marginRight: 12 }} />
                <View className="flex-1">
                  <Text className={`text-[11px] ${config.labelColor} font-bold uppercase tracking-wider`}>
                    Verification Status
                  </Text>
                  <Text className={`text-[15px] font-extrabold ${config.textColor}`}>
                    {config.label}
                  </Text>
                  <Text className={`text-[11px] ${config.labelColor} mt-0.5`}>{config.subtext}</Text>
                </View>
              </View>
            );
          })()}

          {/* Horizontal Stepper Row */}
          <View className="flex-row justify-between items-start mb-2">
            {[
              { label: 'Submitted', desc: isDlUploaded ? 'Submitted' : 'Pending', icon: 'document-text' },
              { label: 'Under Review', desc: currentStep >= 1 ? 'In progress' : 'Pending', icon: 'time' },
              { label: 'Verified', desc: currentStep >= 2 ? 'Verified' : 'Pending', icon: 'person' },
              { label: 'Active', desc: isVerified ? 'After approval' : 'After approval', icon: 'checkmark' },
            ].map((step, idx) => {
              const isActive = currentStep >= idx;
              return (
                <View key={idx} className="items-center flex-1 relative">
                  {idx < 3 && (
                    <View
                      className="absolute top-5 left-[50%] right-[-50%] h-[3px] z-0"
                      style={{
                        backgroundColor: currentStep > idx ? palette.primary : palette.border,
                      }}
                    />
                  )}
                  <View
                    className="w-10 h-10 rounded-full justify-center items-center z-10 mb-2 border-2"
                    style={{
                      backgroundColor: isActive ? palette.primary : palette.surface,
                      borderColor: isActive ? palette.primary : palette.border,
                    }}
                  >
                    <Icon name={step.icon} size={18} color={isActive ? '#FFFFFF' : iconGray} />
                  </View>
                  <Text
                    className="text-[12px] font-bold text-center"
                    style={{ color: isActive ? palette.primary : iconGray }}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Form Fields */}
        <View className="px-4 mt-5">
          <View className="w-full">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wide">
                Driving License Number <Text className="text-red-500">*</Text>
              </Text>
              {isDlValid ? (
                <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                  <Icon name="checkmark-circle" size={12} color="#10B981" style={{ marginRight: 3 }} />
                  <Text className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    {detectedState ? `${detectedState} • ` : ''}Valid DL ✓
                  </Text>
                </View>
              ) : detectedState ? (
                <View className="flex-row items-center bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  <Text className="text-[10px] font-extrabold text-primary">📍 {detectedState}</Text>
                </View>
              ) : null}
            </View>
            <View
              style={{
                backgroundColor: palette.surface,
                borderColor: dlError ? palette.destructive : isDlValid ? '#10B981' : palette.border,
              }}
              className="flex-row items-center border rounded-xl px-3.5 h-[52px]"
            >
              <Icon
                name="id-card-outline"
                size={20}
                color={dlError ? palette.destructive : isDlValid ? '#10B981' : palette.primary}
                className="mr-2"
              />
              <TextInput
                className={`flex-1 text-[15px] font-bold py-2 ${
                  isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                }`}
                placeholder="DL12 2018 0001234"
                placeholderTextColor={iconGray}
                value={dlNumber}
                onChangeText={handleDlChange}
                onBlur={handleDlBlur}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={isEditable}
                maxLength={17}
              />
              {isDlValid && <Icon name="checkmark-circle" size={20} color="#10B981" />}
            </View>
            {dlError ? (
              <View className="flex-row items-center mt-1.5 ml-1">
                <Icon name="alert-circle" size={14} color={palette.destructive} style={{ marginRight: 4 }} />
                <Text className="text-xs font-semibold text-red-500">{dlError}</Text>
              </View>
            ) : (
              <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mt-1.5 ml-1">
                Supports all 36 Indian States & UTs (e.g. DL12 2018 0001234, MH02 2020 0012345)
              </Text>
            )}
          </View>
        </View>

        {/* Upload Cards section header */}
        <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest px-4 mt-6 mb-3">
          Upload Driving License Images
        </Text>

        {/* Two Upload Cards side by side */}
        <View className="px-4 flex-row gap-3">
          {/* Front Side Card */}
          <TouchableOpacity
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="flex-1 rounded-2xl border overflow-hidden p-3.5"
            onPress={() => showUploaderOptions('front')}
            disabled={!canEditFront}
            activeOpacity={0.8}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-bold text-textLight dark:text-textDark">
                Front Side <Text className="text-red-500">*</Text>
              </Text>
              {isFrontRejected ? (
                <Text className="text-[9px] font-extrabold text-red-600 dark:text-red-400">
                  Rejected · replace
                </Text>
              ) : (frontImage || remoteFront) && (
                <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex-row items-center gap-0.5">
                  <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Uploaded ✓</Text>
                </View>
              )}
            </View>

            <View className="h-32 w-full rounded-xl bg-lightBg dark:bg-darkBg border border-dashed border-lightBorder dark:border-darkBorder justify-center items-center">
              {frontImage ? (
                <Image source={{ uri: frontImage.uri }} className="w-full h-full rounded-xl" resizeMode="contain" />
              ) : remoteFront ? (
                <Image source={{ uri: remoteFront }} className="w-full h-full rounded-xl" resizeMode="contain" />
              ) : (
                <View className="items-center">
                  <Icon name="camera-outline" size={24} color={palette.primary} />
                  <Text className="text-[11px] font-bold mt-1" style={{ color: palette.text }}>
                    Capture Front
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Back Side Card */}
          <TouchableOpacity
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="flex-1 rounded-2xl border overflow-hidden p-3.5"
            onPress={() => showUploaderOptions('back')}
            disabled={!canEditBack}
            activeOpacity={0.8}
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-bold text-textLight dark:text-textDark">
                Back Side <Text className="text-red-500">*</Text>
              </Text>
              {isBackRejected ? (
                <Text className="text-[9px] font-extrabold text-red-600 dark:text-red-400">
                  Rejected · replace
                </Text>
              ) : (backImage || remoteBack) && (
                <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex-row items-center gap-0.5">
                  <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Uploaded ✓</Text>
                </View>
              )}
            </View>

            <View className="h-32 w-full rounded-xl bg-lightBg dark:bg-darkBg border border-dashed border-lightBorder dark:border-darkBorder justify-center items-center">
              {backImage ? (
                <Image source={{ uri: backImage.uri }} className="w-full h-full rounded-xl" resizeMode="contain" />
              ) : remoteBack ? (
                <Image source={{ uri: remoteBack }} className="w-full h-full rounded-xl" resizeMode="contain" />
              ) : (
                <View className="items-center">
                  <Icon name="camera-outline" size={24} color={palette.primary} />
                  <Text className="text-[11px] font-bold mt-1" style={{ color: palette.text }}>
                    Capture Back
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Verification Tips section */}
        <View className="mx-4 mt-5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/30">
          <View className="flex-row items-center mb-3">
            <Icon name="information-circle" size={18} color={palette.primary} className="mr-2" />
            <Text className="text-sm font-extrabold text-textLight dark:text-textDark">
              Tips for better verification
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {['Use original documents', 'Ensure all details are visible', 'Avoid glare and blur'].map(
              (tip, idx) => (
                <View key={idx} className="flex-row items-center w-[48%] gap-1.5">
                  <Icon name="checkmark-circle-outline" size={14} color="#10B981" />
                  <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary font-medium">
                    {tip}
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom button */}
      <View
        style={{ backgroundColor: palette.surface, borderColor: palette.border }}
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 border-t"
      >
        <Button
          label={documentStatus === 'rejected' ? 'Update & Resubmit' : 'Save & Submit for Verification'}
          leftSlot={<Icon name="cloud-upload-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
          isLoading={isUploading}
          disabled={!isEditable || isUploading}
          onPress={handleUpload}
          height={54}
          borderRadius={16}
        />
        <Text className="text-center text-[11px] text-textLightSecondary dark:text-textDarkSecondary mt-2">
          We'll review and update you soon
        </Text>
      </View>

      {/* Custom Image Picker Options Bottom Sheet Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="rounded-t-[28px] p-6 border-t"
          >
            <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full self-center mb-4" />
            <Text className="text-lg font-extrabold text-textLight dark:text-textDark text-center mb-1">
              Upload DL {activeSide === 'front' ? 'Front Side' : 'Back Side'}
            </Text>
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary text-center mb-6">
              Choose an option to upload document photo
            </Text>

            <View className="gap-3 mb-4">
              <TouchableOpacity
                style={{ backgroundColor: palette.background, borderColor: palette.border }}
                className="flex-row items-center p-4 rounded-2xl border"
                onPress={() => {
                  setPickerModalVisible(false);
                  if (activeSide) handleCaptureImage(activeSide);
                }}
                activeOpacity={0.8}
              >
                <View className="w-10 h-10 rounded-xl bg-primary/10 justify-center items-center mr-3">
                  <Icon name="camera" size={22} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-textLight dark:text-textDark">
                    Take Photo
                  </Text>
                  <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                    Use camera to snap document
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={iconGray} />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: palette.background, borderColor: palette.border }}
                className="flex-row items-center p-4 rounded-2xl border"
                onPress={() => {
                  setPickerModalVisible(false);
                  if (activeSide) handleSelectFromGallery(activeSide);
                }}
                activeOpacity={0.8}
              >
                <View className="w-10 h-10 rounded-xl bg-primary/10 justify-center items-center mr-3">
                  <Icon name="images" size={22} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-textLight dark:text-textDark">
                    Select from Gallery
                  </Text>
                  <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                    Choose existing photo from device
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={iconGray} />
              </TouchableOpacity>
            </View>

            <Button
              variant="outline"
              label="Cancel"
              onPress={() => setPickerModalVisible(false)}
              height={48}
              borderRadius={16}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Animated Toast Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

export default DrivingLicenseScreen;
