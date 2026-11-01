import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenHeader from '../../components/ScreenHeader';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchMyVehicleThunk } from '../../redux/slices/driverSlice';

const VehicleSetupViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const driver = useAppSelector(state => state.driver.profile);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const isLoading = useAppSelector(state => state.driver.isLoading);
  const isDark = useAppSelector(state => state.theme.isDark);

  useEffect(() => {
    dispatch(fetchMyVehicleThunk());
  }, [dispatch]);

  const isUploaded = !!(
    vehicle?.numberPlate ||
    driver?.vehicle?.licensePlate ||
    (vehicle?.vehicleImages && vehicle.vehicleImages.length > 0)
  );
  const vehicleName = isUploaded
    ? vehicle?.vehicleName || 'Vehicle'
    : 'Not Uploaded';
  const numberPlate = isUploaded
    ? vehicle?.numberPlate || driver?.vehicle?.licensePlate || 'Not Uploaded'
    : 'Not Uploaded';
  const seatCount = isUploaded
    ? vehicle?.seatCount || driver?.vehicle?.year || '—'
    : '—';
  const rawStatus = vehicle?.status;
  const status = !isUploaded ? 'not_uploaded' : rawStatus || 'pending';
  const images = vehicle?.vehicleImages || [];

  const handleDownload = (imageUrl?: string) => {
    if (!imageUrl) {
      Alert.alert('Error', 'No image file available to download.');
      return;
    }
    Linking.canOpenURL(imageUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(imageUrl);
        } else {
          Alert.alert('Document URL', imageUrl);
        }
      })
      .catch(() => {
        Linking.openURL(imageUrl);
      });
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Vehicle Details" />

      {isLoading && !vehicle ? (
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-textLightSecondary dark:text-textDarkSecondary mt-3 text-sm">
            Loading vehicle details...
          </Text>
        </View>
      ) : (
        <ScrollView
          className="p-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Alert */}
          {status === 'approved' || status === 'verified' ? (
            <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <Icon name="checkmark-circle" size={20} color={COLORS.success} />
              <Text className="text-sm font-bold flex-1 text-emerald-800 dark:text-emerald-400">
                Verified & Approved
              </Text>
            </View>
          ) : status === 'pending' || status === 'submitted' ? (
            <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Icon name="hourglass" size={20} color={COLORS.warning} />
              <Text className="text-sm font-bold flex-1 text-amber-800 dark:text-amber-400">
                Verification Pending
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <Icon name="alert-circle" size={20} color="#EF4444" />
              <Text className="text-sm font-bold flex-1 text-red-800 dark:text-red-400">
                Vehicle Details Not Uploaded
              </Text>
            </View>
          )}

          {/* Info Box */}
          <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder shadow-sm mb-5">
            <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3">
              Vehicle Info
            </Text>

            <View className="mb-4">
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                Vehicle Model / Name
              </Text>
              <Text className="text-base font-extrabold text-textLight dark:text-textDark mt-1">
                {vehicleName}
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                License Plate / Vehicle Number
              </Text>
              <Text className="text-base font-extrabold text-textLight dark:text-textDark mt-1 uppercase">
                {numberPlate}
              </Text>
            </View>

            <View>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                Capacity / Seats
              </Text>
              <Text className="text-base font-bold text-textLight dark:text-textDark mt-1">
                {seatCount}
              </Text>
            </View>
          </View>

          {/* Vehicle Images */}
          <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 ml-1">
            Vehicle Photos
          </Text>

          {images.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {images.map((img: any, idx: number) => {
                const imgUri = img.url || img;
                return (
                  <View
                    key={idx}
                    className="w-[48%] h-36 rounded-2xl bg-lightCard dark:bg-darkCard border border-lightBorder dark:border-darkBorder overflow-hidden mb-3 relative"
                  >
                    <Image
                      source={{ uri: imgUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg border border-white/20 flex-row items-center gap-1"
                      onPress={() => handleDownload(imgUri)}
                      activeOpacity={0.8}
                    >
                      <Icon name="download-outline" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-6 border border-lightBorder dark:border-darkBorder items-center mb-6">
              <Icon
                name="car-outline"
                size={48}
                color={
                  isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary
                }
              />
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2 text-center">
                No vehicle photos uploaded yet
              </Text>
            </View>
          )}

          {!isUploaded && (
            <TouchableOpacity
              className="w-full py-4 bg-primary rounded-2xl items-center justify-center shadow-sm mb-6"
              onPress={() => navigation.navigate(ROUTES.VEHICLE_SETUP)}
              activeOpacity={0.8}
            >
              <Text className="text-white font-extrabold text-base">
                Setup Vehicle Details
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default VehicleSetupViewScreen;
