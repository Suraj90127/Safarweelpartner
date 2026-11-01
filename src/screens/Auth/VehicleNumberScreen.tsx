import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  PermissionsAndroid,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { ROUTES } from '../../constants/routes';
import { driverApi } from '../../api/driverApi';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchDriverDocumentsThunk } from '../../redux/slices/driverSlice';
import { useThemePalette } from '../../utils/theme';
import { getDriverDocumentStatus } from '../../utils/driverDocumentStatus';

const VehicleNumberScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();
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

  const [rcNumber, setRcNumber] = useState('');
  const [frontImage, setFrontImage] = useState<Asset | null>(null);
  const [backImage, setBackImage] = useState<Asset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const driverDocument = useAppSelector(state => state.driver.driverDocument);
  const [isEditable, setIsEditable] = useState(true);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back' | null>(null);

  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);
  const isVerified = (driver?.isVerified || (driver as any)?.is_verified) ?? false;
  const isRcUploaded = !!(
    frontImage ||
    backImage ||
    driverDocument?.rc?.front?.url ||
    driverDocument?.rc?.back?.url
  );
  const isRcFrontRejected = !!driverDocument?.rc?.front?.url &&
    getDriverDocumentStatus([driverDocument.rc.front.status]) === 'rejected';
  const isRcBackRejected = !!driverDocument?.rc?.back?.url &&
    getDriverDocumentStatus([driverDocument.rc.back.status]) === 'rejected';
  const canEditRcFront = isEditable && (!driverDocument?.rc?.front?.url || isRcFrontRejected);
  const canEditRcBack = isEditable && (!driverDocument?.rc?.back?.url || isRcBackRejected);

  const getStepIndex = () => {
    if (documentStatus === 'rejected') return 1;
    if (isVerified) return 3;
    if (documentStatus === 'pending') return 1;
    if (documentStatus === 'verified') return 2;
    if (isRcUploaded) return 1;
    return 0;
  };

  const currentStep = getStepIndex();

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchDriverDocumentsThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  useEffect(() => {
    if (driverDocument?.rc) {
      const rcDoc = driverDocument.rc;
      if (rcDoc.front?.number) {
        setRcNumber(rcDoc.front.number);
      }

      const hasFront = !!rcDoc.front?.url;
      const hasBack = !!rcDoc.back?.url;
      const status = getDriverDocumentStatus([
        hasFront ? rcDoc.front?.status : undefined,
        hasBack ? rcDoc.back?.status : undefined,
      ]);
      setDocumentStatus(hasFront || hasBack ? status : null);
      setIsEditable(status === 'rejected' || (!hasFront && !hasBack));
    }
  }, [driverDocument]);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Rapido Driver needs access to your camera to take a picture of your RC.',
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

  const showUploaderOptions = (side: 'front' | 'back') => {
    if (!isEditable) {
      showToast('Read Only', 'This document is already submitted or approved.', 'info');
      return;
    }
    setActiveSide(side);
    setPickerModalVisible(true);
  };

  const handleUpload = async () => {
    if (!isEditable) return;
    if (!rcNumber.trim()) {
      showToast('Required Field', 'Please enter your Registration Certificate (RC) / Vehicle Number.', 'warning');
      return;
    }

    const hasFront = !!(frontImage || driverDocument?.rc?.front?.url);
    if (!hasFront) {
      showToast('Required Upload', 'Please capture or select the Front Side of your RC.', 'warning');
      return;
    }

    const hasBack = !!(backImage || driverDocument?.rc?.back?.url);
    if (!hasBack) {
      showToast('Required Upload', 'Please capture or select the Back Side of your RC.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('rc_number', rcNumber.trim().toUpperCase());

      if (frontImage) {
        formData.append('rc_front', {
          uri: frontImage.uri,
          type: frontImage.type || 'image/jpeg',
          name: frontImage.fileName || 'rc_front.jpg',
        } as any);
      }

      if (backImage) {
        formData.append('rc_back', {
          uri: backImage.uri,
          type: backImage.type || 'image/jpeg',
          name: backImage.fileName || 'rc_back.jpg',
        } as any);
      }

      const response = await driverApi.uploadRc(formData);

      if (response.success || response.data?.success) {
        dispatch(fetchDriverDocumentsThunk());
        mmkvService.setBoolean(STORAGE_KEYS.RC_UPLOADED, true);

        showToast('Success', 'Vehicle Number submitted successfully!', 'success');
        setTimeout(() => {
          navigation.replace(ROUTES.DOCUMENT_CENTER);
        }, 1200);
      } else {
        showToast('Upload Failed', response.message || 'Something went wrong.', 'error');
      }
    } catch (error: any) {
      console.log('RC Upload Error:', error);
      showToast('Error', error.message || 'Failed to connect to the server.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBoxConfig = () => {
    if (documentStatus === 'approved' || documentStatus === 'verified') {
      return {
        label: 'Approved',
        subtext: 'Your Vehicle Number has been verified successfully.',
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
        isRcFrontRejected ? 'front image' : null,
        isRcBackRejected ? 'back image' : null,
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
        subtext: "We'll notify you once your Vehicle Number is verified.",
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
      subtext: 'Please upload RC images to start verification.',
      bgColor: 'bg-gray-50 dark:bg-darkCard',
      borderColor: 'border-lightBorder dark:border-darkBorder',
      textColor: 'text-textLightSecondary dark:text-textDarkSecondary',
      labelColor: 'text-textLightSecondary',
      icon: 'information-circle',
      iconColor: iconGray,
    };
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader
        title="RC / Vehicle Number"
        rightElement={
          <TouchableOpacity
            className="flex-row items-center border border-lightBorder dark:border-darkBorder rounded-full px-3 py-1.5 bg-white dark:bg-darkCard shadow-sm"
            onPress={() => navigation.navigate(ROUTES.SUPPORT)}
            activeOpacity={0.7}
          >
            <Icon name="help-circle-outline" size={16} color={palette.primary} className="mr-1" />
            <Text className="text-xs font-bold text-textLight dark:text-textDark">Help</Text>
          </TouchableOpacity>
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 10, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Verification Status Stepper Box */}
          <View
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="mt-4 rounded-xl p-2 border shadow-sm mb-5"
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
                {
                  label: 'Submitted',
                  desc: isRcUploaded
                    ? driverDocument?.rc?.updatedAt
                      ? new Date(driverDocument.rc.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      : 'Submitted'
                    : 'Pending',
                  icon: 'document-text',
                },
                {
                  label: 'Under Review',
                  desc: currentStep >= 1 ? (documentStatus === 'rejected' ? 'Failed' : 'In progress') : 'Pending',
                  icon: 'time',
                },
                { label: 'Verified', desc: currentStep >= 2 ? 'Verified' : 'Pending', icon: 'person' },
                { label: 'Active', desc: isVerified ? 'Active' : 'After approval', icon: 'checkmark' },
              ].map((step, idx) => {
                const isActive = currentStep >= idx;
                const isRejectedStep = documentStatus === 'rejected' && idx === 1;
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
                        backgroundColor: isRejectedStep
                          ? palette.destructive
                          : isActive
                            ? palette.primary
                            : palette.surface,
                        borderColor: isRejectedStep
                          ? palette.destructive
                          : isActive
                            ? palette.primary
                            : palette.border,
                      }}
                    >
                      <Icon
                        name={isRejectedStep ? 'close' : step.icon}
                        size={18}
                        color={isActive || isRejectedStep ? '#FFFFFF' : iconGray}
                      />
                    </View>
                    <Text
                      className="text-[12px] font-bold text-center"
                      style={{
                        color: isRejectedStep
                          ? palette.destructive
                          : isActive
                            ? palette.primary
                            : iconGray,
                      }}
                    >
                      {isRejectedStep ? 'Rejected' : step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Label & Input Box */}
          <View
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="mb-5 border rounded-xl p-2 shadow-sm"
          >
            <Text className="text-textLight dark:text-textDark text-xs font-black uppercase tracking-wider mb-2.5">
              RC / Vehicle Number <Text className="text-red-500">*</Text>
            </Text>
            <View
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
              className="flex-row items-center border rounded-xl h-[54px] overflow-hidden"
            >
              <View
                style={{ borderColor: palette.border }}
                className="bg-lightBg dark:bg-darkBg px-3 h-full justify-center border-r"
              >
                <Text className="text-xs font-black text-primary">IND</Text>
              </View>
              <TextInput
                className={`flex-1 text-sm font-extrabold py-2 px-4 ${isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                  }`}
                placeholder="DL 1S AB 1234"
                placeholderTextColor={iconGray}
                value={rcNumber}
                onChangeText={setRcNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={isEditable}
              />
            </View>

            {/* Info Box */}
            <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/20 rounded-xl px-3 py-2.5 mt-3">
              <Icon name="information-circle-outline" size={16} color={palette.primary} />
              <Text className="text-[10px] text-textLight dark:text-textDark font-medium ml-2 flex-1 leading-[13px]">
                Enter your registration number as shown on RC
              </Text>
            </View>
          </View>

          {/* Section Upload Title */}
          <Text className="text-textLight dark:text-textDark text-sm font-bold mb-3 px-1">
            Upload RC Images
          </Text>

          {/* Side-by-side Upload Cards */}
          <View className="flex-row justify-between mb-5">
            {/* Front Card */}
            {(() => {
              const isUploaded = !!(frontImage || driverDocument?.rc?.front?.url);
              const imgUri = frontImage ? frontImage.uri : driverDocument?.rc?.front?.url;
              return (
                <TouchableOpacity
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="w-[48%] border rounded-2xl overflow-hidden shadow-sm"
                  onPress={() => showUploaderOptions('front')}
                  activeOpacity={0.8}
                  disabled={!canEditRcFront}
                >
                  <View
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center justify-between p-3 border-b bg-lightBg/50 dark:bg-darkBg/50"
                  >
                    <Text className="text-[11px] font-black text-textLight dark:text-textDark">
                      RC Front Side <Text className="text-red-500">*</Text>
                    </Text>
                    {isRcFrontRejected ? (
                      <Text className="text-[8px] font-extrabold text-red-600 dark:text-red-400">
                        Rejected · replace
                      </Text>
                    ) : isUploaded && (
                      <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                        <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">
                          Uploaded
                        </Text>
                        <Icon name="checkmark" size={8} color={palette.success} />
                      </View>
                    )}
                  </View>

                  <View className="h-32 bg-lightBg dark:bg-darkBg justify-center items-center relative">
                    {isUploaded && imgUri ? (
                      <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <View className="items-center justify-center p-3">
                        <Icon name="camera-outline" size={26} color={palette.primary} />
                        <Text className="text-[9.5px] text-center font-bold mt-1" style={{ color: palette.text }}>
                          Tap to select or snap
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Back Card */}
            {(() => {
              const isUploaded = !!(backImage || driverDocument?.rc?.back?.url);
              const imgUri = backImage ? backImage.uri : driverDocument?.rc?.back?.url;
              return (
                <TouchableOpacity
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="w-[48%] border rounded-2xl overflow-hidden shadow-sm"
                  onPress={() => showUploaderOptions('back')}
                  activeOpacity={0.8}
                  disabled={!canEditRcBack}
                >
                  <View
                    style={{ borderColor: palette.border }}
                    className="flex-row items-center justify-between p-3 border-b bg-lightBg/50 dark:bg-darkBg/50"
                  >
                    <Text className="text-[11px] font-black text-textLight dark:text-textDark">
                      RC Back Side <Text className="text-red-500">*</Text>
                    </Text>
                    {isRcBackRejected ? (
                      <Text className="text-[8px] font-extrabold text-red-600 dark:text-red-400">
                        Rejected · replace
                      </Text>
                    ) : isUploaded && (
                      <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                        <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">
                          Uploaded
                        </Text>
                        <Icon name="checkmark" size={8} color={palette.success} />
                      </View>
                    )}
                  </View>

                  <View className="h-32 bg-lightBg dark:bg-darkBg justify-center items-center relative">
                    {isUploaded && imgUri ? (
                      <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="contain" />
                    ) : (
                      <View className="items-center justify-center p-3">
                        <Icon name="camera-outline" size={26} color={palette.primary} />
                        <Text className="text-[9.5px] text-center font-bold mt-1" style={{ color: palette.text }}>
                          Tap to select or snap
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>

          {/* Tips for Better Verification Banner */}
          <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center mr-2">
                <Icon name="shield-checkmark" size={15} color={palette.primary} />
              </View>
              <Text className="text-xs font-black text-textLight dark:text-textDark">
                Tips for better verification
              </Text>
            </View>
            <View className="flex-row flex-wrap justify-between">
              <View className="flex-row items-center mb-2 w-[48%] px-1">
                <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
                <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                  Capture clearly
                </Text>
              </View>
              <View className="flex-row items-center mb-2 w-[48%] px-1">
                <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
                <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                  All corners visible
                </Text>
              </View>
              <View className="flex-row items-center mb-2 w-[48%] px-1">
                <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
                <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                  No glare or blur
                </Text>
              </View>
              <View className="flex-row items-center mb-2 w-[48%] px-1">
                <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
                <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                  Original documents
                </Text>
              </View>
            </View>
          </View>

          {/* Secure Disclaimer */}
          <View className="flex-row items-center justify-center mb-6">
            <Icon name="lock-closed-outline" size={12} color={iconGray} />
            <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium ml-1.5">
              Your information is secure and encrypted
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Button */}
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
              Upload RC {activeSide === 'front' ? 'Front Side' : 'Back Side'}
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

export default VehicleNumberScreen;
