import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchDriverProfileThunk, fetchDriverDocumentsThunk } from '../../redux/slices/driverSlice';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import { driverApi } from '../../api/driverApi';
import { useEffect } from 'react';
import { getDriverDocumentStatus } from '../../utils/driverDocumentStatus';

const LICENSE_TYPES = [
  'MCWG',
  'LMV',
  'MCWG / LMV',
  'HMV',
  'HPMV',
  'Transport',
  'Non-Transport',
];

const DlViewScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const isDark = useAppSelector(state => state.theme.isDark);
  const driverDocument = useAppSelector(state => state.driver.driverDocument);


  const dl = driverDocument?.dl;

  const dlNumber = dl?.front?.number || 'N/A';
  const isUploaded = !!(dl?.front?.url || dl?.back?.url);
  const status = isUploaded
    ? getDriverDocumentStatus([
        dl?.front?.url ? dl.front.status : undefined,
        dl?.back?.url ? dl.back.status : undefined,
      ])
    : 'not_uploaded';
  const frontUrl = dl?.front?.url;
  const backUrl = dl?.back?.url;

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(dl?.licenseType || '');
  const [saving, setSaving] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Sync local selected type state when remote dl object updates
  useEffect(() => {
    if (dl?.licenseType) {
      setSelectedType(dl.licenseType);
    }
  }, [dl]);

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

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert('Validation', 'Please select a license type');
      return;
    }
    try {
      setSaving(true);
      await driverApi.updateDlInfo({ licenseType: selectedType });
      await dispatch(fetchDriverDocumentsThunk());
      await dispatch(fetchDriverProfileThunk());
      setIsEditing(false);
      Alert.alert('Success', 'License type updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update license type');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedType(dl?.licenseType || '');
    setIsEditing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Driving License" />

      <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
        {/* Status Alert */}
        <View
          className={`flex-row items-center p-3.5 rounded-xl border mb-4 gap-2 ${
            status === 'verified'
              ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
              : status === 'rejected'
                ? 'bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                : status === 'pending'
                  ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-50/20 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800'
          }`}
        >
          <Icon
            name={
              status === 'verified'
                ? 'checkmark-circle'
                : status === 'rejected'
                  ? 'close-circle'
                  : status === 'pending'
                    ? 'hourglass'
                    : 'alert-circle'
            }
            size={20}
            color={
              status === 'verified'
                ? COLORS.success
                : status === 'rejected'
                  ? COLORS.danger
                  : status === 'pending'
                    ? COLORS.warning
                    : COLORS.textLightSecondary
            }
          />
          <Text
            className={`text-sm font-bold flex-1 ${
              status === 'verified'
                ? 'text-emerald-800 dark:text-emerald-400'
                : status === 'rejected'
                  ? 'text-red-800 dark:text-red-400'
                  : status === 'pending'
                    ? 'text-amber-800 dark:text-amber-400'
                    : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {status === 'verified'
              ? 'Verified & Approved'
              : status === 'rejected'
                ? 'Rejected'
                : status === 'pending'
                  ? 'Under review'
                  : 'Document Not Uploaded'}
          </Text>
        </View>

        {/* DL Info Block */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder shadow-sm mb-5">
          <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3">
            License Details
          </Text>

          {/* License Number */}
          <View className="mb-4">
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
              License Number
            </Text>
            <Text className="text-base font-extrabold text-textLight dark:text-textDark mt-1 uppercase">
              {dlNumber}
            </Text>
          </View>

          {/* License Type — editable */}
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                License Type
              </Text>
              {!isEditing ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedType(dl?.licenseType || '');
                    setIsEditing(true);
                  }}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-lg bg-primary/10"
                >
                  <Icon name="pencil" size={13} color={COLORS.primary} />
                  <Text className="text-xs font-bold text-primary">Edit</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="px-3 py-1 rounded-lg bg-lightBg dark:bg-darkBg border border-lightBorder dark:border-darkBorder"
                  >
                    <Text className="text-xs font-bold text-textLight dark:text-textDark">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className="px-3 py-1 rounded-lg bg-primary"
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditing ? (
              /* Dropdown trigger */
              <TouchableOpacity
                onPress={() => setDropdownVisible(true)}
                className="mt-2 flex-row items-center justify-between px-4 py-3 rounded-xl border border-primary bg-primary/5"
              >
                <Text className="text-base font-bold text-textLight dark:text-textDark">
                  {selectedType || 'Select license type…'}
                </Text>
                <Icon name="chevron-down" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              <Text className="text-base font-bold text-textLight dark:text-textDark mt-1">
                {dl?.licenseType || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Documents Gallery */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 ml-1">
          Document Images
        </Text>

        {/* Front Side */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-textLight dark:text-textDark">
              Front Side
            </Text>
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
              <View className="items-center">
                <Icon
                  name="image-outline"
                  size={48}
                  color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
                />
                <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2">
                  No front image uploaded
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Back Side */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder shadow-sm mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-textLight dark:text-textDark">
              Back Side
            </Text>
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
              <View className="items-center">
                <Icon
                  name="image-outline"
                  size={48}
                  color={isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary}
                />
                <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2">
                  No back image uploaded
                </Text>
              </View>
            )}
          </View>
        </View>

    
      </ScrollView>

      {/* License Type Picker Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        />
        <View className="bg-lightCard dark:bg-darkCard rounded-t-3xl p-6">
          <Text className="text-base font-extrabold text-textLight dark:text-textDark mb-4">
            Select License Type
          </Text>
          <FlatList
            data={LICENSE_TYPES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedType(item);
                  setDropdownVisible(false);
                }}
                className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mb-2 border ${
                  selectedType === item
                    ? 'border-primary bg-primary/10'
                    : 'border-lightBorder dark:border-darkBorder bg-lightBg dark:bg-darkBg'
                }`}
              >
                <Text
                  className={`text-base font-bold ${
                    selectedType === item
                      ? 'text-primary'
                      : 'text-textLight dark:text-textDark'
                  }`}
                >
                  {item}
                </Text>
                {selectedType === item && (
                  <Icon name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};


export default DlViewScreen;
