import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
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

type IdType = 'aadhaar' | 'pan';

const AadhaarPanScreen: React.FC = () => {
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

  // ID Selection State
  const [idType, setIdType] = useState<IdType>('aadhaar');

  // Input states
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Local picked images
  const [aadhaarFrontImg, setAadhaarFrontImg] = useState<Asset | null>(null);
  const [aadhaarBackImg, setAadhaarBackImg] = useState<Asset | null>(null);
  const [panImg, setPanImg] = useState<Asset | null>(null);

  // Remote image URLs
  const [remoteAadhaarFront, setRemoteAadhaarFront] = useState<string | null>(null);
  const [remoteAadhaarBack, setRemoteAadhaarBack] = useState<string | null>(null);
  const [remotePan, setRemotePan] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeSide, setActiveSide] = useState<'aadhaar_front' | 'aadhaar_back' | 'pan' | null>(null);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchDriverDocumentsThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  // Hydrate data from driver documents
  useEffect(() => {
    if (driverDocument) {
      const doc = driverDocument;

      if (doc.aadhaar?.front?.url) {
        setRemoteAadhaarFront(doc.aadhaar.front.url);
      }
      if (doc.aadhaar?.back?.url) {
        setRemoteAadhaarBack(doc.aadhaar.back.url);
      }
      if (doc.aadhaar?.front?.number) {
        setAadhaarNumber(doc.aadhaar.front.number);
      }

      if (doc.pan?.url) {
        setRemotePan(doc.pan.url);
        if (doc.pan?.number) {
          setPanNumber(doc.pan.number);
        }
      }

      const savedType = mmkvService.getString(STORAGE_KEYS.SELECTED_ID_TYPE) as IdType | undefined;
      const aadhaarStatus = getDriverDocumentStatus([
        doc.aadhaar?.front?.url ? doc.aadhaar.front.status : undefined,
        doc.aadhaar?.back?.url ? doc.aadhaar.back.status : undefined,
      ]);
      const panStatus = getDriverDocumentStatus(doc.pan?.url ? [doc.pan.status] : []);
      if (aadhaarStatus === 'rejected') {
        setIdType('aadhaar');
      } else if (panStatus === 'rejected') {
        setIdType('pan');
      } else if (savedType === 'aadhaar' || savedType === 'pan') {
        setIdType(savedType);
      } else {
        if (doc.pan?.url && !doc.aadhaar?.front?.url && !doc.aadhaar?.back?.url) {
          setIdType('pan');
        } else if (doc.aadhaar?.front?.url || doc.aadhaar?.back?.url) {
          setIdType('aadhaar');
        }
      }
    }
  }, [driverDocument]);

  const getDocumentDetails = () => {
    if (!driverDocument) {
      return { status: null, editable: true };
    }
    const doc = driverDocument;
    if (idType === 'aadhaar') {
      const hasFront = !!doc.aadhaar?.front?.url;
      const hasBack = !!doc.aadhaar?.back?.url;
      const status = hasFront || hasBack
        ? getDriverDocumentStatus([
            hasFront ? doc.aadhaar?.front?.status : undefined,
            hasBack ? doc.aadhaar?.back?.status : undefined,
          ])
        : null;
      return { status, editable: !status || status === 'rejected' };
    } else {
      const hasUrl = !!doc.pan?.url;
      const status = hasUrl ? getDriverDocumentStatus([doc.pan?.status]) : null;
      return { status, editable: !status || status === 'rejected' };
    }
  };

  const { status: currentStatus, editable: currentEditable } = getDocumentDetails();
  const isAadhaarFrontRejected = !!remoteAadhaarFront &&
    getDriverDocumentStatus([driverDocument?.aadhaar?.front?.status]) === 'rejected';
  const isAadhaarBackRejected = !!remoteAadhaarBack &&
    getDriverDocumentStatus([driverDocument?.aadhaar?.back?.status]) === 'rejected';
  const isPanRejected = !!remotePan &&
    getDriverDocumentStatus([driverDocument?.pan?.status]) === 'rejected';
  const canEditAadhaarFront = currentEditable && (!remoteAadhaarFront || isAadhaarFrontRejected);
  const canEditAadhaarBack = currentEditable && (!remoteAadhaarBack || isAadhaarBackRejected);
  const canEditPan = currentEditable && (!remotePan || isPanRejected);

  const getStatusBoxConfig = () => {
    if (currentStatus === 'verified') {
      return {
        label: 'Approved',
        subtext: 'Your Aadhaar / PAN card has been verified successfully.',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
        borderColor: 'border-emerald-200 dark:border-emerald-900/30',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        labelColor: 'text-emerald-600',
        icon: 'checkmark-circle',
        iconColor: palette.success,
      };
    }
    if (currentStatus === 'rejected') {
      const rejectedImages = idType === 'aadhaar'
        ? [
            isAadhaarFrontRejected ? 'front image' : null,
            isAadhaarBackRejected ? 'back image' : null,
          ].filter(Boolean).join(' and ')
        : isPanRejected ? 'PAN image' : 'document image';
      return {
        label: 'Rejected',
        subtext: `The ${rejectedImages} was rejected. Replace it to continue.`,
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-900/30',
        textColor: 'text-red-700 dark:text-red-400',
        labelColor: 'text-red-600',
        icon: 'close-circle',
        iconColor: palette.destructive,
      };
    }
    if (currentStatus === 'pending' || currentStatus === 'submitted') {
      return {
        label: 'Under Review',
        subtext: "We'll notify you once your Aadhaar / PAN is verified.",
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
      subtext: 'Please upload Aadhaar or PAN to start verification.',
      bgColor: 'bg-gray-50 dark:bg-darkCard',
      borderColor: 'border-lightBorder dark:border-darkBorder',
      textColor: 'text-textLightSecondary dark:text-textDarkSecondary',
      labelColor: 'text-textLightSecondary',
      icon: 'information-circle',
      iconColor: iconGray,
    };
  };

  const isAadhaarUploaded = !!(
    remoteAadhaarFront ||
    remoteAadhaarBack ||
    aadhaarFrontImg ||
    aadhaarBackImg
  );
  const isPanUploaded = !!(remotePan || panImg);
  const isDocUploaded = idType === 'aadhaar' ? isAadhaarUploaded : isPanUploaded;

  const getStepIndex = () => {
    if (isVerified) return 3;
    if (currentStatus === 'pending') return 1;
    if (currentStatus === 'verified') return 2;
    if (isDocUploaded) return 1;
    return 0;
  };

  const currentStep = getStepIndex();

  const handleTabChange = (type: IdType) => {
    setIdType(type);
    mmkvService.setString(STORAGE_KEYS.SELECTED_ID_TYPE, type);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Rapido Driver needs access to your camera to capture documents.',
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

  const handleCaptureImage = async (side: 'aadhaar_front' | 'aadhaar_back' | 'pan') => {
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
          if (side === 'aadhaar_front') {
            setAadhaarFrontImg(asset);
          } else if (side === 'aadhaar_back') {
            setAadhaarBackImg(asset);
          } else {
            setPanImg(asset);
          }
        }
      }
    );
  };

  const handleSelectFromGallery = (side: 'aadhaar_front' | 'aadhaar_back' | 'pan') => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          showToast('Error', response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (side === 'aadhaar_front') {
            setAadhaarFrontImg(asset);
          } else if (side === 'aadhaar_back') {
            setAadhaarBackImg(asset);
          } else {
            setPanImg(asset);
          }
        }
      }
    );
  };

  const showUploaderOptions = (side: 'aadhaar_front' | 'aadhaar_back' | 'pan') => {
    if (!currentEditable) {
      showToast('Read Only', 'This document is already submitted or approved.', 'info');
      return;
    }
    setActiveSide(side);
    setPickerModalVisible(true);
  };

  const validateAadhaar = (num: string) => {
    const raw = num.replace(/\s+/g, '');
    return /^\d{12}$/.test(raw);
  };

  const validatePan = (num: string) => {
    const raw = num.replace(/\s+/g, '').toUpperCase();
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(raw);
  };

  const formatAadhaar = (text: string) => {
    const clean = text.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += clean[i];
    }
    return formatted.slice(0, 14);
  };

  const formatPan = (text: string) => {
    return text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
  };

  const handleInputChange = (text: string) => {
    if (idType === 'aadhaar') {
      setAadhaarNumber(formatAadhaar(text));
    } else {
      setPanNumber(formatPan(text));
    }
  };

  const handleUpload = async () => {
    if (!currentEditable) return;

    if (idType === 'aadhaar') {
      const rawNum = aadhaarNumber.replace(/\s+/g, '');
      if (!validateAadhaar(rawNum)) {
        showToast('Invalid Number', 'Please enter a valid 12-digit Aadhaar number.', 'warning');
        return;
      }
      if (!aadhaarFrontImg && !remoteAadhaarFront) {
        showToast('Missing Image', 'Please upload the front side of your Aadhaar card.', 'warning');
        return;
      }
      if (!aadhaarBackImg && !remoteAadhaarBack) {
        showToast('Missing Image', 'Please upload the back side of your Aadhaar card.', 'warning');
        return;
      }
    } else {
      const rawNum = panNumber.trim().toUpperCase();
      if (!validatePan(rawNum)) {
        showToast('Invalid Number', 'Please enter a valid PAN Card number (e.g. ABCDE1234F).', 'warning');
        return;
      }
      if (!panImg && !remotePan) {
        showToast('Missing Image', 'Please upload the front side of your PAN card.', 'warning');
        return;
      }
    }

    setIsUploading(true);
    try {
      const formData = new FormData();

      if (idType === 'aadhaar') {
        formData.append('aadhaar_number', aadhaarNumber.replace(/\s+/g, ''));

        if (aadhaarFrontImg) {
          formData.append('aadhaar_front', {
            uri: aadhaarFrontImg.uri,
            type: aadhaarFrontImg.type || 'image/jpeg',
            name: aadhaarFrontImg.fileName || 'aadhaar_front.jpg',
          } as any);
        }
        if (aadhaarBackImg) {
          formData.append('aadhaar_back', {
            uri: aadhaarBackImg.uri,
            type: aadhaarBackImg.type || 'image/jpeg',
            name: aadhaarBackImg.fileName || 'aadhaar_back.jpg',
          } as any);
        }
      } else {
        formData.append('pan_number', panNumber.trim().toUpperCase());

        if (panImg) {
          formData.append('pan', {
            uri: panImg.uri,
            type: panImg.type || 'image/jpeg',
            name: panImg.fileName || 'pan.jpg',
          } as any);
        }
      }

      const response = await driverApi.uploadAadhaarPan(formData);

      if (response.success || response.data?.success) {
        dispatch(fetchDriverDocumentsThunk());
        mmkvService.setBoolean(STORAGE_KEYS.AADHAAR_PAN_UPLOADED, true);
        mmkvService.setString(STORAGE_KEYS.SELECTED_ID_TYPE, idType);

        showToast('Success', 'Verification document submitted successfully!', 'success');
        setTimeout(() => {
          navigation.replace(ROUTES.DOCUMENT_CENTER);
        }, 1200);
      } else {
        showToast('Upload Failed', response.message || 'Something went wrong.', 'error');
      }
    } catch (error: any) {
      console.log('Document Upload Error:', error);
      showToast('Error', error.message || 'Failed to connect to the server.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = () => {
    if (!currentEditable) return false;
    if (idType === 'aadhaar') {
      const isNumOk = validateAadhaar(aadhaarNumber);
      const isFrontOk = !!(aadhaarFrontImg || remoteAadhaarFront);
      const isBackOk = !!(aadhaarBackImg || remoteAadhaarBack);
      return isNumOk && isFrontOk && isBackOk;
    } else {
      const isNumOk = validatePan(panNumber);
      const isFrontOk = !!(panImg || remotePan);
      return isNumOk && isFrontOk;
    }
  };

  const isAadhaarValid = validateAadhaar(aadhaarNumber);
  const isPanValid = validatePan(panNumber);

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader
        title="Aadhaar or PAN Card"
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

      <ScrollView contentContainerStyle={{ padding: 10, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
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
                desc: isDocUploaded
                  ? driverDocument?.aadhaar?.front?.updatedAt || driverDocument?.pan?.updatedAt
                    ? new Date(
                      driverDocument.aadhaar?.front?.updatedAt || driverDocument?.pan?.updatedAt
                    ).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Submitted'
                  : 'Pending',
                icon: 'document-text',
              },
              {
                label: 'Under Review',
                desc: currentStep >= 1 ? (currentStatus === 'rejected' ? 'Failed' : 'In progress') : 'Pending',
                icon: 'time',
              },
              { label: 'Verified', desc: currentStep >= 2 ? 'Verified' : 'Pending', icon: 'person' },
              { label: 'Active', desc: isVerified ? 'Active' : 'After approval', icon: 'checkmark' },
            ].map((step, idx) => {
              const isActive = currentStep >= idx;
              const isRejectedStep = currentStatus === 'rejected' && idx === 1;
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

        {/* Title selector */}
        <Text className="text-sm font-bold text-textLight dark:text-textDark mb-2.5 px-1">
          Choose document type
        </Text>

        {/* Radio option row */}
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            style={{
              backgroundColor: palette.surface,
              borderColor: idType === 'aadhaar' ? palette.primary : palette.border,
            }}
            className="flex-1 flex-row items-center justify-between px-3.5 py-3 border rounded-xl"
            onPress={() => handleTabChange('aadhaar')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Icon
                name="card-outline"
                size={18}
                color={idType === 'aadhaar' ? palette.primary : iconGray}
                className="mr-2"
              />
              <Text
                className="text-[13px] font-bold"
                style={{ color: idType === 'aadhaar' ? palette.primary : palette.mutedText }}
              >
                Aadhaar Card
              </Text>
              {isAadhaarFrontRejected || isAadhaarBackRejected ? (
                <Text className="ml-2 text-[9px] font-extrabold text-red-600 dark:text-red-400">
                  Rejected
                </Text>
              ) : null}
            </View>
            <Icon
              name={idType === 'aadhaar' ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={idType === 'aadhaar' ? palette.primary : iconGray}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: palette.surface,
              borderColor: idType === 'pan' ? palette.primary : palette.border,
            }}
            className="flex-1 flex-row items-center justify-between px-3.5 py-3 border rounded-xl"
            onPress={() => handleTabChange('pan')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Icon
                name="document-text-outline"
                size={18}
                color={idType === 'pan' ? palette.primary : iconGray}
                className="mr-2"
              />
              <Text
                className="text-[13px] font-bold"
                style={{ color: idType === 'pan' ? palette.primary : palette.mutedText }}
              >
                PAN Card
              </Text>
              {isPanRejected ? (
                <Text className="ml-2 text-[9px] font-extrabold text-red-600 dark:text-red-400">
                  Rejected
                </Text>
              ) : null}
            </View>
            <Icon
              name={idType === 'pan' ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={idType === 'pan' ? palette.primary : iconGray}
            />
          </TouchableOpacity>
        </View>

        {/* Choose Document Info Box */}
        <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/20 rounded-xl px-3 py-2.5 mb-5">
          <Icon name="information-circle-outline" size={16} color={palette.primary} />
          <Text className="text-[10px] text-textLight dark:text-textDark font-medium ml-2 flex-1 leading-[13px]">
            You can upload either Aadhaar Card or PAN Card
          </Text>
        </View>

        {/* ID Details Card */}
        <View
          style={{ backgroundColor: palette.surface, borderColor: palette.border }}
          className="border rounded-2xl p-4 mb-5 shadow-sm"
        >
          {/* Card Title Header */}
          <View
            style={{ borderColor: palette.border }}
            className="flex-row items-center border-b pb-2.5 mb-4"
          >
            <Icon name="document-text" size={16} color={palette.primary} />
            <Text className="text-xs font-bold text-textLight dark:text-textDark ml-2">
              {idType === 'aadhaar' ? 'Aadhaar Card Details' : 'PAN Card Details'}
            </Text>
          </View>

          {/* Label */}
          <Text className="text-[10px] font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-1.5">
            {idType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'} <Text className="text-red-500">*</Text>
          </Text>

          {/* Input field */}
          <View
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="flex-row items-center border rounded-xl h-[52px] px-3 overflow-hidden"
          >
            <Icon name="person-outline" size={16} color={palette.primary} className="mr-2" />
            <TextInput
              className={`flex-1 text-sm font-extrabold py-2 ${currentEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                }`}
              value={idType === 'aadhaar' ? aadhaarNumber : panNumber}
              onChangeText={handleInputChange}
              placeholder={idType === 'aadhaar' ? '1234 5678 9012' : 'ABCDE1234F'}
              placeholderTextColor={iconGray}
              keyboardType={idType === 'aadhaar' ? 'numeric' : 'default'}
              autoCapitalize={idType === 'aadhaar' ? 'none' : 'characters'}
              editable={currentEditable}
            />
            {idType === 'aadhaar' && isAadhaarValid && (
              <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">Valid</Text>
                <Icon name="checkmark" size={8} color={palette.success} />
              </View>
            )}
            {idType === 'pan' && isPanValid && (
              <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">Valid</Text>
                <Icon name="checkmark" size={8} color={palette.success} />
              </View>
            )}
          </View>
        </View>

        {/* Upload Title */}
        <Text className="text-textLight dark:text-textDark text-sm font-bold mb-3 px-1">
          {idType === 'aadhaar' ? 'Upload Aadhaar Card Images' : 'Upload PAN Card Image'}
        </Text>

        {/* Upload Grid */}
        <View className="mb-5">
          {idType === 'aadhaar' ? (
            <View className="flex-row justify-between">
              {/* Front Side */}
              {(() => {
                const isUploaded = !!(aadhaarFrontImg || remoteAadhaarFront);
                const imgUri = aadhaarFrontImg ? aadhaarFrontImg.uri : remoteAadhaarFront;
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                    className="w-[48%] border rounded-2xl overflow-hidden shadow-sm"
                    onPress={() => showUploaderOptions('aadhaar_front')}
                    activeOpacity={0.8}
                    disabled={!canEditAadhaarFront}
                  >
                    <View
                      style={{ borderColor: palette.border }}
                      className="flex-row items-center justify-between p-3 border-b bg-lightBg/50 dark:bg-darkBg/50"
                    >
                      <Text className="text-[11px] font-black text-textLight dark:text-textDark">
                        Front Side <Text className="text-red-500">*</Text>
                      </Text>
                      {isAadhaarFrontRejected ? (
                        <Text className="text-[8px] font-extrabold text-red-600 dark:text-red-400">
                          Rejected · replace
                        </Text>
                      ) : isUploaded && (
                        <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                          <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">Uploaded</Text>
                          <Icon name="checkmark" size={8} color={palette.success} />
                        </View>
                      )}
                    </View>

                    <View className="h-32 bg-lightBg dark:bg-darkBg justify-center items-center relative">
                      {isUploaded && imgUri ? (
                        <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="contain" />
                      ) : (
                        <View className="items-center justify-center p-3">
                          <Icon name="camera-outline" size={24} color={palette.primary} />
                          <Text className="text-[9.5px] text-center font-bold mt-1" style={{ color: palette.text }}>Tap to upload</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* Back Side */}
              {(() => {
                const isUploaded = !!(aadhaarBackImg || remoteAadhaarBack);
                const imgUri = aadhaarBackImg ? aadhaarBackImg.uri : remoteAadhaarBack;
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                    className="w-[48%] border rounded-2xl overflow-hidden shadow-sm"
                    onPress={() => showUploaderOptions('aadhaar_back')}
                    activeOpacity={0.8}
                    disabled={!canEditAadhaarBack}
                  >
                    <View
                      style={{ borderColor: palette.border }}
                      className="flex-row items-center justify-between p-3 border-b bg-lightBg/50 dark:bg-darkBg/50"
                    >
                      <Text className="text-[11px] font-black text-textLight dark:text-textDark">
                        Back Side <Text className="text-red-500">*</Text>
                      </Text>
                      {isAadhaarBackRejected ? (
                        <Text className="text-[8px] font-extrabold text-red-600 dark:text-red-400">
                          Rejected · replace
                        </Text>
                      ) : isUploaded && (
                        <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                          <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">Uploaded</Text>
                          <Icon name="checkmark" size={8} color={palette.success} />
                        </View>
                      )}
                    </View>

                    <View className="h-32 bg-lightBg dark:bg-darkBg justify-center items-center relative">
                      {isUploaded && imgUri ? (
                        <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="contain" />
                      ) : (
                        <View className="items-center justify-center p-3">
                          <Icon name="camera-outline" size={24} color={palette.primary} />
                          <Text className="text-[9.5px] text-center font-bold mt-1" style={{ color: palette.text }}>Tap to upload</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })()}
            </View>
          ) : (
            /* PAN card Upload */
            <View>
              {(() => {
                const isUploaded = !!(panImg || remotePan);
                const imgUri = panImg ? panImg.uri : remotePan;
                return (
                  <TouchableOpacity
                    style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                    className="w-full border rounded-2xl overflow-hidden shadow-sm"
                    onPress={() => showUploaderOptions('pan')}
                    activeOpacity={0.8}
                    disabled={!canEditPan}
                  >
                    <View
                      style={{ borderColor: palette.border }}
                      className="flex-row items-center justify-between p-3 border-b bg-lightBg/50 dark:bg-darkBg/50"
                    >
                      <Text className="text-[11px] font-black text-textLight dark:text-textDark">
                        PAN Card Front Side <Text className="text-red-500">*</Text>
                      </Text>
                      {isPanRejected ? (
                        <Text className="text-[8px] font-extrabold text-red-600 dark:text-red-400">
                          Rejected · replace
                        </Text>
                      ) : isUploaded && (
                        <View className="flex-row items-center bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/30">
                          <Text className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mr-0.5">Uploaded</Text>
                          <Icon name="checkmark" size={8} color={palette.success} />
                        </View>
                      )}
                    </View>

                    <View className="h-36 bg-lightBg dark:bg-darkBg justify-center items-center relative">
                      {isUploaded && imgUri ? (
                        <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="contain" />
                      ) : (
                        <View className="items-center justify-center p-3">
                          <Icon name="camera-outline" size={32} color={palette.primary} />
                          <Text className="text-[10.5px] text-center font-bold mt-1" style={{ color: palette.text }}>Tap to upload PAN Card</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </View>

        {/* Tips for better verification Banner */}
        <View className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center mr-2">
              <Icon name="bulb-outline" size={15} color={palette.primary} />
            </View>
            <Text className="text-xs font-black text-textLight dark:text-textDark">
              Tips for better verification
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between">
            <View className="flex-row items-center mb-2 w-[48%] px-1">
              <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
              <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                Use original document
              </Text>
            </View>
            <View className="flex-row items-center mb-2 w-[48%] px-1">
              <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
              <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                All details visible
              </Text>
            </View>
            <View className="flex-row items-center mb-2 w-[48%] px-1">
              <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
              <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                Good lighting
              </Text>
            </View>
            <View className="flex-row items-center mb-2 w-[48%] px-1">
              <Icon name="checkmark-circle-outline" size={13} color="#10B981" />
              <Text className="text-[10px] font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1.5">
                No glare or blur
              </Text>
            </View>
          </View>
        </View>

        {/* Reference Mockup Card Visual */}
        <View className="items-center mb-6">
          {idType === 'aadhaar' ? (
            <View
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
              className="w-full border rounded-2xl p-4 shadow-sm"
            >
              <View
                style={{ borderColor: palette.border }}
                className="flex-row items-center mb-3 border-b pb-2.5"
              >
                <View className="w-6 h-6 rounded-full bg-amber-500 items-center justify-center mr-2">
                  <Text className="text-white text-[8px] font-bold">A</Text>
                </View>
                <View>
                  <Text className="text-[11px] font-black text-textLight dark:text-textDark">भारत सरकार</Text>
                  <Text className="text-[8px] font-semibold text-textLightSecondary dark:text-textDarkSecondary">GOVERNMENT OF INDIA</Text>
                </View>
              </View>
              <View className="flex-row">
                <View
                  style={{ backgroundColor: palette.background, borderColor: palette.border }}
                  className="w-[50px] h-[60px] rounded-lg justify-center items-center mr-3 border"
                >
                  <Icon name="person-outline" size={24} color={iconGray} />
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[9px] font-black text-textLight dark:text-textDark">NAME : RAMESH KUMAR</Text>
                  <Text className="text-[9px] font-semibold text-textLightSecondary dark:text-textDarkSecondary mt-0.5">DOB : 01/01/1990</Text>

                  <View className="flex-row items-center mt-1.5 relative">
                    <Text className="text-[14px] font-black text-textLight dark:text-textDark tracking-wider">XXXX XXXX 9012</Text>
                    <View className="flex-row items-center absolute right-[10%] bottom-[-5px]">
                      <Icon name="arrow-back-outline" size={14} color={palette.primary} style={{ transform: [{ rotate: '45deg' }] }} className="mr-0.5" />
                      <Text className="text-[8px] font-bold text-primary">Aadhaar Number</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View
              style={{ backgroundColor: palette.surface, borderColor: palette.border }}
              className="w-full border rounded-2xl p-4 shadow-sm"
            >
              <View
                style={{ borderColor: palette.border }}
                className="flex-row items-center mb-3 border-b pb-2.5"
              >
                <View className="w-6 h-6 rounded-full bg-emerald-600 items-center justify-center mr-2">
                  <Text className="text-white text-[8px] font-bold">P</Text>
                </View>
                <View>
                  <Text className="text-[11px] font-black text-textLight dark:text-textDark">आयकर विभाग</Text>
                  <Text className="text-[8px] font-semibold text-textLightSecondary dark:text-textDarkSecondary">INCOME TAX DEPARTMENT</Text>
                </View>
              </View>
              <View className="flex-row">
                <View
                  style={{ backgroundColor: palette.background, borderColor: palette.border }}
                  className="w-[50px] h-[60px] rounded-lg justify-center items-center mr-3 border"
                >
                  <Icon name="person-outline" size={24} color={iconGray} />
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[9px] font-black text-textLight dark:text-textDark">NAME : RAMESH KUMAR</Text>
                  <Text className="text-[9px] font-semibold text-textLightSecondary dark:text-textDarkSecondary mt-0.5">DOB : 01/01/1990</Text>

                  <View className="flex-row items-center mt-1.5 relative">
                    <Text className="text-[14px] font-black text-textLight dark:text-textDark tracking-wider">ABCDE1234F</Text>
                    <View className="flex-row items-center absolute right-[10%] bottom-[-5px]">
                      <Icon name="arrow-back-outline" size={14} color={palette.success} style={{ transform: [{ rotate: '45deg' }] }} className="mr-0.5" />
                      <Text className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">PAN Number</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Secure disclaimer */}
        <View className="flex-row items-center justify-center mb-6">
          <Icon name="lock-closed-outline" size={12} color={iconGray} />
          <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium ml-1.5">
            Your information is secure and encrypted
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Button */}
      <View
        style={{ backgroundColor: palette.surface, borderColor: palette.border }}
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 border-t"
      >
        <Button
          label={currentStatus === 'rejected' ? 'Update & Resubmit' : 'Save & Submit for Verification'}
          leftSlot={<Icon name="cloud-upload-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
          isLoading={isUploading}
          disabled={!currentEditable || isUploading}
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
              Upload Document
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

export default AadhaarPanScreen;
