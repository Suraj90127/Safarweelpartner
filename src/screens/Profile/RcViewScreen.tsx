import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchDriverDocumentsThunk } from '../../redux/slices/driverSlice';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { getDriverDocumentStatus } from '../../utils/driverDocumentStatus';

const RcViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const isDark = useAppSelector(state => state.theme.isDark);
  const driver = useAppSelector(state => state.driver.profile);
  const vehicle = useAppSelector(state => state.driver.vehicle);
  const driverDocument = useAppSelector(state => state.driver.driverDocument);

  useEffect(() => {
    dispatch(fetchDriverDocumentsThunk());
  }, [dispatch]);

  const rc = driverDocument?.rc;

  const isUploaded = !!(
    rc?.front?.url ||
    rc?.back?.url ||
    rc?.front?.number ||
    vehicle?.numberPlate
  );
  const num = (rc?.front?.number || vehicle?.numberPlate || driver?.vehicle?.licensePlate) || 'Not Uploaded';
  const status = !isUploaded
    ? 'not_uploaded'
    : getDriverDocumentStatus([
        rc?.front?.url ? rc.front.status : undefined,
        rc?.back?.url ? rc.back.status : undefined,
      ]);
  const frontUrl = rc?.front?.url;
  const backUrl = rc?.back?.url;

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
      <ScreenHeader title="Vehicle RC" />

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {/* Status Alert */}
        {status === 'verified' ? (
          <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <Icon name="checkmark-circle" size={20} color={COLORS.success} />
            <Text className="text-sm font-bold flex-1 text-emerald-800 dark:text-emerald-400">
              Verified & Approved
            </Text>
          </View>
        ) : status === 'rejected' ? (
          <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <Icon name="close-circle" size={20} color={COLORS.danger} />
            <Text className="text-sm font-bold flex-1 text-red-800 dark:text-red-400">
              Rejected
            </Text>
          </View>
        ) : status === 'pending' ? (
          <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <Icon name="hourglass" size={20} color={COLORS.warning} />
            <Text className="text-sm font-bold flex-1 text-amber-800 dark:text-amber-400">
              Under review
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <Icon name="alert-circle" size={20} color="#EF4444" />
            <Text className="text-sm font-bold flex-1 text-red-800 dark:text-red-400">
              Document Not Uploaded
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder shadow-sm mb-5">
          <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3">Vehicle RC Details</Text>
          
          <View className="mb-4">
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">RC / License Plate Number</Text>
            <Text className="text-base font-extrabold text-textLight dark:text-textDark mt-1 uppercase">{num}</Text>
          </View>

          <View>
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">Vehicle Model</Text>
            <Text className="text-base font-bold text-textLight dark:text-textDark mt-1">
              {vehicle?.vehicleName || '—'} 
            </Text>
          </View>
        </View>

        {/* Images */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 ml-1">Document Images</Text>
        
        {/* Front */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-textLight dark:text-textDark">Front Side</Text>
            {frontUrl ? (
              <TouchableOpacity
                className="flex-row items-center bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 gap-1"
                onPress={() => handleDownload(frontUrl)}
                activeOpacity={0.7}
              >
                <Icon name="download-outline" size={14} color={COLORS.primary} />
                <Text className="text-xs font-bold text-primary">Download</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View className="w-full h-48 rounded-xl bg-lightBg dark:bg-darkBg border border-lightBorder dark:border-darkBorder overflow-hidden justify-center items-center">
            {frontUrl ? (
              <Image source={{ uri: frontUrl }} className="w-full h-full" resizeMode="contain" />
            ) : (
              <View className="items-center p-4">
                <Icon name="image-outline" size={48} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
                <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2 text-center">No front RC image uploaded</Text>
              </View>
            )}
          </View>
        </View>

        {/* Back */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-textLight dark:text-textDark">Back Side</Text>
            {backUrl ? (
              <TouchableOpacity
                className="flex-row items-center bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 gap-1"
                onPress={() => handleDownload(backUrl)}
                activeOpacity={0.7}
              >
                <Icon name="download-outline" size={14} color={COLORS.primary} />
                <Text className="text-xs font-bold text-primary">Download</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View className="w-full h-48 rounded-xl bg-lightBg dark:bg-darkBg border border-lightBorder dark:border-darkBorder overflow-hidden justify-center items-center">
            {backUrl ? (
              <Image source={{ uri: backUrl }} className="w-full h-full" resizeMode="contain" />
            ) : (
              <View className="items-center p-4">
                <Icon name="image-outline" size={48} color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary} />
                <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2 text-center">No back RC image uploaded</Text>
              </View>
            )}
          </View>
        </View>

        {!isUploaded && (
          <TouchableOpacity
            className="w-full py-4 bg-primary rounded-2xl items-center justify-center shadow-sm mb-6"
            onPress={() => navigation.navigate(ROUTES.VEHICLE_NUMBER)}
            activeOpacity={0.8}
          >
            <Text className="text-white font-extrabold text-base">Upload Vehicle RC</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RcViewScreen;
