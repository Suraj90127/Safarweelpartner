import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  PermissionsAndroid,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { useThemePalette } from '../../utils/theme';
import { driverApi } from '../../api/driverApi';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMyVehicleThunk } from '../../redux/slices/driverSlice';

interface ServiceItem {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
}

interface VehicleTypeItem {
  _id: string;
  name: string;
  serviceId: any;
  maxSeat?: number;
}

const STEPPER_STEPS = [
  { label: 'Submitted', icon: 'car-outline' },
  { label: 'Under Review', icon: 'time-outline' },
  { label: 'Verified', icon: 'person-outline' },
  { label: 'Active', icon: 'checkmark-circle-outline' },
] as const;

type StatusBoxConfig = {
  label: string;
  subtext: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  labelColor: string;
  icon: string;
  iconColor: string;
};

function buildStatusBoxConfig(vehicleStatus: string | null, isDark: boolean): StatusBoxConfig {
  if (vehicleStatus === 'approved')
    return {
      label: 'Approved',
      subtext: 'Your vehicle has been verified successfully.',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200 dark:border-emerald-900/30',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      labelColor: 'text-emerald-600',
      icon: 'checkmark-circle',
      iconColor: COLORS.success,
    };
  if (vehicleStatus === 'rejected')
    return {
      label: 'Rejected',
      subtext: 'Verification failed. Please check details and upload again.',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      labelColor: 'text-red-600',
      icon: 'close-circle',
      iconColor: COLORS.danger,
    };
  if (
    vehicleStatus === 'pending' ||
    vehicleStatus === 'submitted' ||
    vehicleStatus === 'under_review'
  )
    return {
      label: 'Under Review',
      subtext: "We'll notify you once your vehicle is verified.",
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-900/30',
      textColor: 'text-amber-700 dark:text-amber-400',
      labelColor: 'text-amber-600',
      icon: 'time',
      iconColor: COLORS.warning,
    };
  return {
    label: 'Not Submitted',
    subtext: 'Please upload vehicle details to start verification.',
    bgColor: 'bg-gray-50 dark:bg-darkCard',
    borderColor: 'border-lightBorder dark:border-darkBorder',
    textColor: 'text-textLightSecondary dark:text-textDarkSecondary',
    labelColor: 'text-textLightSecondary',
    icon: 'information-circle',
    iconColor: isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary,
  };
}

const VehicleSetupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const vehicle = useAppSelector(state => state.driver.vehicle);
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

  // Form states
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleTypeItem[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<VehicleTypeItem[]>([]);

  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');

  const [numberPlate, setNumberPlate] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [seatCount, setSeatCount] = useState('1');

  const [vehicleImages, setVehicleImages] = useState<Asset[]>([]);
  console.log("setVehicleImages", vehicleImages)
  const [remoteImages, setRemoteImages] = useState<string[]>([]);
  console.log("remoteImages", remoteImages)
  const [vehicleStatus, setVehicleStatus] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  const isEditable = !vehicleStatus || vehicleStatus === 'rejected';

  const statusBoxConfig = useMemo(() => buildStatusBoxConfig(vehicleStatus, isDark), [vehicleStatus, isDark]);
  const currentStep = useMemo(() => {
    if (vehicleStatus === 'approved') return 3;
    if (vehicleStatus === 'pending' || vehicleStatus === 'under_review') return 1;
    if (mmkvService.getBoolean(STORAGE_KEYS.VEHICLE_UPLOADED)) return 1;
    return 0;
  }, [vehicleStatus]);
  const totalUploaded = remoteImages.length + vehicleImages.length;

  // Fetch latest profile and vehicle on mount
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(fetchMyVehicleThunk());
    });
    return () => task.cancel();
  }, [dispatch]);

  // Hydrate vehicle details if already registered
  useEffect(() => {
    if (vehicle) {
      const sId =
        typeof vehicle.serviceId === 'object' && vehicle.serviceId
          ? vehicle.serviceId._id
          : vehicle.serviceId;
      const vtId =
        typeof vehicle.vehicleTypeId === 'object' && vehicle.vehicleTypeId
          ? vehicle.vehicleTypeId._id
          : vehicle.vehicleTypeId;

      if (sId) setSelectedService(sId);
      if (vtId) setSelectedVehicleType(vtId);
      if (vehicle.numberPlate) setNumberPlate(vehicle.numberPlate);
      if (vehicle.vehicleName) setVehicleName(vehicle.vehicleName);
      if (vehicle.seatCount) setSeatCount(vehicle.seatCount.toString());
      if (vehicle.vehicleImages && Array.isArray(vehicle.vehicleImages)) {
       
        const mapped = vehicle.vehicleImages
          .map((img: any) => (typeof img === 'string' ? img : img?.url || img?.uri || ''))
          .filter(Boolean);
        setRemoteImages(mapped);
      }
      if (vehicle.status) setVehicleStatus(vehicle.status);
    }
  }, [vehicle]);

  // Fetch initial services & vehicle types
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMetadata();
    });
    return () => task.cancel();
  }, []);

  // Filter vehicles when service changes
  useEffect(() => {
    if (selectedService) {
      const filtered = allVehicles.filter(v => {
        const serviceIdStr =
          typeof v.serviceId === 'object' && v.serviceId
            ? (v.serviceId as any)._id
            : v.serviceId;
        return serviceIdStr === selectedService;
      });
      setFilteredVehicles(filtered);
      if (!filtered.some(v => v._id === selectedVehicleType)) {
        setSelectedVehicleType('');
      }
    } else {
      setFilteredVehicles([]);
      setSelectedVehicleType('');
    }
  }, [selectedService, allVehicles]);

  const fetchMetadata = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, vehiclesRes] = await Promise.all([
        driverApi.getServices(),
        driverApi.getVehicles(),
      ]);

      if (servicesRes.data?.success || servicesRes.success) {
        setServices(servicesRes.data?.data || servicesRes.data || []);
      } else {
        setServices(servicesRes.data || servicesRes || []);
      }

      if (vehiclesRes.data?.success || vehiclesRes.success) {
        setAllVehicles(vehiclesRes.data?.data || vehiclesRes.data || []);
      } else {
        setAllVehicles(vehiclesRes.data || vehiclesRes || []);
      }
    } catch (error: any) {
      console.log('Error fetching vehicle metadata:', error);
      showToast('Error', 'Failed to load services or vehicle types.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Rapido Driver needs access to your camera to take pictures of your vehicle.',
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

  const handleCaptureImage = async () => {
    if (!isEditable) return;
    const count = remoteImages.length + vehicleImages.length;
    if (count >= 6) {
      showToast('Limit Reached', 'You can upload a maximum of 6 vehicle images.', 'warning');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showToast('Permission Denied', 'Camera permission is required to capture images.', 'warning');
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
          const newAsset = response.assets[0];
          setVehicleImages(prev => [...prev, newAsset]);
        }
      }
    );
  };

  const handleSelectFromGallery = () => {
    if (!isEditable) return;
    const count = remoteImages.length + vehicleImages.length;
    if (count >= 6) {
      showToast('Limit Reached', 'You can upload a maximum of 6 vehicle images.', 'warning');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 6 - count,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          showToast('Error', response.errorMessage, 'error');
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setVehicleImages(prev => [...prev, ...response.assets!]);
        }
      }
    );
  };

  const showImagePickerOptions = () => {
    if (!isEditable) return;
    setPickerModalVisible(true);
  };

  const removeImage = useCallback(
    (index: number, type: 'remote' | 'local') => {
      if (!isEditable) return;
      if (type === 'remote') {
        setRemoteImages(prev => prev.filter((_, i) => i !== index));
      } else {
        setVehicleImages(prev => prev.filter((_, i) => i !== index));
      }
    },
    [isEditable]
  );

  const handleUploadVehicle = async () => {
    if (!isEditable) return;
    if (!selectedService) {
      showToast('Required Field', 'Please select a service type.', 'warning');
      return;
    }
    if (!selectedVehicleType) {
      showToast('Required Field', 'Please select a vehicle type.', 'warning');
      return;
    }
    if (!numberPlate.trim()) {
      showToast('Required Field', 'Please enter your Vehicle License Plate Number.', 'warning');
      return;
    }
    if (!vehicleName.trim()) {
      showToast('Required Field', 'Please enter your Vehicle Name / Model.', 'warning');
      return;
    }
    if (!seatCount.trim() || isNaN(Number(seatCount))) {
      showToast('Required Field', 'Please enter a valid Seat Capacity.', 'warning');
      return;
    }

    const count = remoteImages.length + vehicleImages.length;
    if (count === 0) {
      showToast('Required Upload', 'Please add at least one image of your vehicle.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('serviceId', selectedService);
      formData.append('vehicleTypeId', selectedVehicleType);
      formData.append('numberPlate', numberPlate.trim().toUpperCase());
      formData.append('vehicleName', vehicleName.trim());
      formData.append('seatCount', Number(seatCount));

      vehicleImages.forEach((img, index) => {
        formData.append('vehicleImages', {
          uri: Platform.OS === 'android' ? img.uri : img.uri?.replace('file://', ''),
          type: img.type || 'image/jpeg',
          name: img.fileName || `vehicle_img_${index}.jpg`,
        } as any);
      });

      const response = await driverApi.uploadVehicle(formData);

      if (response.data?.success || response.success) {
        mmkvService.setBoolean(STORAGE_KEYS.VEHICLE_UPLOADED, true);

        showToast('Success', 'Vehicle details submitted successfully.', 'success');
        setTimeout(() => {
          navigation.replace(ROUTES.DOCUMENT_CENTER);
        }, 1200);
      } else {
        throw new Error(response.data?.message || 'Failed to submit vehicle details.');
      }
    } catch (error: any) {
      console.log('Vehicle upload error:', error);
      showToast(
        'Upload Failed',
        error?.response?.data?.message || error.message || 'An error occurred while uploading.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg" edges={['top']}>
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor={palette.background}
      />
      <ScreenHeader
        title="Vehicle Setup"
    
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 95 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper Status Box */}
          <View
            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
            className="mx-4 mt-4 rounded-xl border p-2 shadow-sm"
          >
            <View
              className={`flex-row items-center ${statusBoxConfig.bgColor} border ${statusBoxConfig.borderColor} rounded-xl p-2 mb-5`}
            >
              <Icon
                name={statusBoxConfig.icon}
                size={26}
                color={statusBoxConfig.iconColor}
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text
                  className={`text-[11px] ${statusBoxConfig.labelColor} font-bold uppercase tracking-wider`}
                >
                  Verification Status
                </Text>
                <Text className={`text-[15px] font-extrabold ${statusBoxConfig.textColor}`}>
                  {statusBoxConfig.label}
                </Text>
                <Text className={`text-[11px] ${statusBoxConfig.labelColor} mt-0.5`}>
                  {statusBoxConfig.subtext}
                </Text>
              </View>
            </View>

            {/* Horizontal Stepper */}
            <View className="flex-row justify-between items-start">
              {STEPPER_STEPS.map((step, idx) => {
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
                      <Icon
                        name={step.icon}
                        size={18}
                        color={isActive ? '#FFFFFF' : iconGray}
                      />
                    </View>
                    <Text
                      className="text-[11px] font-bold text-center"
                      style={{ color: isActive ? palette.primary : iconGray }}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Form Fields Section */}
          <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest px-4 mt-6 mb-3">
            Vehicle Information
          </Text>

          <View className="px-4 gap-3.5">
            {/* Row 1: Service Type & Vehicle Type */}
            <View className=" gap-3">
              {/* Service Type selector */}
              <View className="flex-1 relative" style={{ zIndex: showServiceDropdown ? 9999 : 1 }}>
                <Text className="text-xs font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-2">
                  Service Type <Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="flex-row items-center justify-between border rounded-xl px-3.5 h-[52px]"
                  onPress={() => {
                    if (!isEditable) return;
                    setShowServiceDropdown(!showServiceDropdown);
                    setShowVehicleTypeDropdown(false);
                  }}
                  disabled={!isEditable}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1 mr-1">
                    <Icon name="briefcase-outline" size={20} color={palette.primary} className="mr-2" />
                    <Text
                      className={`text-[14px] font-bold ${isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                        }`}
                      numberOfLines={1}
                    >
                      {isLoading
                        ? 'Loading…'
                        : services.find(s => s._id === selectedService)?.name || 'Select Service'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={iconGray} />
                </TouchableOpacity>

                {showServiceDropdown && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 78,
                      left: 0,
                      right: 0,
                      backgroundColor: palette.surface,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: palette.border,
                      zIndex: 10000,
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }}
                  >
                    <View style={{ padding: 4 }}>
                      {services.map(item => (
                        <TouchableOpacity
                          key={item._id}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            marginVertical: 2,
                            backgroundColor:
                              selectedService === item._id
                                ? 'rgba(255, 152, 0, 0.15)'
                                : 'transparent',
                          }}
                          onPress={() => {
                            setSelectedService(item._id);
                            setSelectedVehicleType('');
                            setShowServiceDropdown(false);
                          }}
                        >
                          <Text
                            className={`text-[14px] font-bold ${selectedService === item._id
                              ? 'text-primary'
                              : 'text-textLight dark:text-textDark'
                              }`}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Vehicle Type selector */}
              <View className="flex-1 relative" style={{ zIndex: showVehicleTypeDropdown ? 9999 : 1 }}>
                <Text className="text-xs font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-2">
                  Vehicle Type <Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="flex-row items-center justify-between border rounded-xl px-3.5 h-[52px]"
                  onPress={() => {
                    if (!isEditable) return;
                    if (!selectedService) {
                      showToast('Required', 'Please select service type first.', 'warning');
                      return;
                    }
                    setShowVehicleTypeDropdown(!showVehicleTypeDropdown);
                    setShowServiceDropdown(false);
                  }}
                  disabled={!isEditable}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1 mr-1">
                    <Icon name="bicycle-outline" size={20} color={palette.primary} className="mr-2" />
                    <Text
                      className={`text-[14px] font-bold ${isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                        }`}
                      numberOfLines={1}
                    >
                      {isLoading
                        ? 'Loading…'
                        : allVehicles.find(v => v._id === selectedVehicleType)?.name || 'Select Type'}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={iconGray} />
                </TouchableOpacity>

                {showVehicleTypeDropdown && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 78,
                      left: 0,
                      right: 0,
                      backgroundColor: palette.surface,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: palette.border,
                      zIndex: 10000,
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }}
                  >
                    <View style={{ padding: 4 }}>
                      {filteredVehicles.map(item => (
                        <TouchableOpacity
                          key={item._id}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            marginVertical: 2,
                            backgroundColor:
                              selectedVehicleType === item._id
                                ? 'rgba(255, 152, 0, 0.15)'
                                : 'transparent',
                          }}
                          onPress={() => {
                            setSelectedVehicleType(item._id);
                            if (item.maxSeat) {
                              setSeatCount(item.maxSeat.toString());
                            }
                            setShowVehicleTypeDropdown(false);
                          }}
                        >
                          <Text
                            className={`text-[14px] font-bold ${selectedVehicleType === item._id
                              ? 'text-primary'
                              : 'text-textLight dark:text-textDark'
                              }`}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Row 2: Number Plate & Seat Count */}
            <View className="gap-3">
              {/* Number Plate Input */}
              <View className="flex-1">
                <Text className="text-xs font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-2">
                  Number Plate <Text className="text-red-500">*</Text>
                </Text>
                <View
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="flex-row items-center border rounded-xl px-3 h-[52px]"
                >
                  <View className="bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded border border-primary/30 mr-2">
                    <Text className="text-[10px] font-bold text-primary">IND</Text>
                  </View>
                  <TextInput
                    className={`flex-1 text-[14px] font-bold py-1.5 ${isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                      }`}
                    placeholder="e.g. DL 1S AB 1234"
                    placeholderTextColor={iconGray}
                    value={numberPlate}
                    onChangeText={setNumberPlate}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={isEditable}
                  />
                </View>
              </View>

              {/* Seat Count */}
              <View className="">
                <Text className="text-xs font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-2">
                  Seat Count <Text className="text-red-500">*</Text>
                </Text>
                <View
                  style={{ borderColor: palette.border }}
                  className="flex-row items-center border rounded-xl px-3.5 bg-lightBg/80 dark:bg-darkBg/50 h-[52px]"
                >
                  <Icon name="person-outline" size={20} color={palette.primary} className="mr-2" />
                  <Text className="text-[14px] font-bold text-textLight dark:text-textDark" numberOfLines={1}>
                    {seatCount || '1'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Vehicle Name Input */}
            <View className="flex-1">
              <Text className="text-xs font-black uppercase text-textLightSecondary dark:text-textDarkSecondary mb-2">
                Vehicle Name <Text className="text-red-500">*</Text>
              </Text>
              <View
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                className="flex-row items-center border rounded-xl px-3.5 h-[52px]"
              >
                <Icon name="car-outline" size={20} color={palette.primary} className="mr-2" />
                <TextInput
                  className={`flex-1 text-[14px] font-bold py-1.5 ${isEditable ? 'text-textLight dark:text-textDark' : 'text-textLightSecondary dark:text-textDarkSecondary'
                    }`}
                  placeholder="e.g. Honda Activa 6G"
                  placeholderTextColor={iconGray}
                  value={vehicleName}
                  onChangeText={setVehicleName}
                  editable={isEditable}
                />
              </View>
            </View>
          </View>

          {/* Vehicle Images Header */}
          <View className="flex-row justify-between items-center px-4 mt-6 mb-3">
            <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest">
              Vehicle Images <Text className="text-[11px] text-textLightSecondary lowercase font-medium">(Max 6)</Text>
            </Text>
            <Text className="text-[11px] font-bold text-primary">{totalUploaded} / 6 uploaded</Text>
          </View>

          {/* Horizontal Image Grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            className="mb-5"
          >
            {/* Remote Images */}
            {remoteImages?.map((url, index) => (
              <View
                key={`remote-${index}`}
                style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                className="relative w-[100px] h-[95px] rounded-2xl border p-1 justify-center items-center overflow-hidden"
              >
                <Image
                  source={{ uri: url }}
                  className="w-full h-full rounded-xl"
                  resizeMode="cover"
                />
                {index === 0 && (
                  <View className="absolute top-2 left-2 bg-emerald-500 px-1.5 py-0.5 rounded-full z-10">
                    <Text className="text-[8px] font-bold text-white">Primary</Text>
                  </View>
                )}
                {isEditable && (
                  <TouchableOpacity
                    className="absolute top-1.5 right-1.5 bg-black/60 w-5 h-5 rounded-full justify-center items-center z-10"
                    onPress={() => removeImage(index, 'remote')}
                  >
                    <Icon name="close" size={12} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Local Picked Images */}
            {vehicleImages?.map((img: any, index) => {
              const imageUri = img?.uri || img?.path || (typeof img === 'string' ? img : '');
              return (
                <View
                  key={`local-${index}`}
                  style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  className="relative w-[100px] h-[95px] rounded-2xl border p-1 justify-center items-center overflow-hidden"
                >
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                  {remoteImages.length === 0 && index === 0 && (
                    <View className="absolute top-2 left-2 bg-emerald-500 px-1.5 py-0.5 rounded-full z-10">
                      <Text className="text-[8px] font-bold text-white">Primary</Text>
                    </View>
                  )}
                  {isEditable && (
                    <TouchableOpacity
                      className="absolute top-1.5 right-1.5 bg-black/60 w-5 h-5 rounded-full justify-center items-center z-10"
                      onPress={() => removeImage(index, 'local')}
                    >
                      <Icon name="close" size={12} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Add More Button */}
            {isEditable && totalUploaded < 6 && (
              <TouchableOpacity
                className="w-[100px] h-[95px] rounded-2xl border border-dashed border-primary bg-primary/10 dark:bg-primary/20 justify-center items-center"
                onPress={showImagePickerOptions}
                activeOpacity={0.8}
              >
                <Icon name="camera-outline" size={24} color={palette.primary} />
                <Text className="text-[11px] font-bold text-primary mt-1">Add More</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Verification Tips Section */}
          <View className="mx-4 mt-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/30">
            <View className="flex-row items-center mb-3">
              <Icon name="bulb-outline" size={18} color={palette.primary} className="mr-2" />
              <Text className="text-sm font-extrabold text-textLight dark:text-textDark">
                Tips for better verification
              </Text>
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-2">
              {['Clear photos', 'All angles', 'Good lighting', 'Number plate visible'].map(
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
      </KeyboardAvoidingView>

      {/* Sticky Bottom Button */}
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
          label="Save & Submit for Verification"
          leftSlot={<Icon name="cloud-upload-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
          isLoading={isSubmitting}
          disabled={isSubmitting || !isEditable}
          onPress={handleUploadVehicle}
          height={54}
          borderRadius={16}
        />
        <View className="flex-row items-center justify-center gap-1 mt-2">
          <Icon name="lock-closed" size={11} color={iconGray} />
          <Text className="text-center text-[11px] text-textLightSecondary dark:text-textDarkSecondary">
            Your information is secure and encrypted
          </Text>
        </View>
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
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
            className="rounded-t-[28px] p-6 border-t"
          >
            <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full self-center mb-4" />
            <Text className="text-lg font-extrabold text-textLight dark:text-textDark text-center mb-1">
              Add Vehicle Image
            </Text>
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary text-center mb-6">
              Choose an option to upload vehicle photo
            </Text>

            <View className="gap-3 mb-4">
              <TouchableOpacity
                style={{ backgroundColor: palette.background, borderColor: palette.border }}
                className="flex-row items-center p-4 rounded-2xl border"
                onPress={() => {
                  setPickerModalVisible(false);
                  handleCaptureImage();
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
                    Use camera to snap vehicle photo
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={iconGray} />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: palette.background, borderColor: palette.border }}
                className="flex-row items-center p-4 rounded-2xl border"
                onPress={() => {
                  setPickerModalVisible(false);
                  handleSelectFromGallery();
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

export default VehicleSetupScreen;
