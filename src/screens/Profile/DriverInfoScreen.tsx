import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenHeader from '../../components/ScreenHeader';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateDriverProfileThunk } from '../../redux/slices/driverSlice';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';

const DriverInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const driver = useAppSelector(state => state.driver.profile);
  const vehicle = useAppSelector(state => state.driver.vehicle);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState(driver?.name ?? '');
  const [lastName, setLastName] = useState(driver?.last_name ?? '');
  const [phone, setPhone] = useState(driver?.phone ?? '');
  const [email, setEmail] = useState(driver?.email ?? '');
  const [dob, setDob] = useState(driver?.dob ?? '');

  React.useEffect(() => {
    console.log('vehicle', vehicle);
    if (driver) {
      setFirstName(driver.name || '');
      setLastName(driver.last_name || '');
      setPhone(driver.phone || '');
      setEmail(driver.email || '');
      setDob(driver.dob || '');
    }
  }, [driver]);

  const handleSave = () => {
    if (!firstName.trim() || !phone.trim()) {
      Alert.alert('Error', 'First Name and Phone Number cannot be empty.');
      return;
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsSaving(true);
    dispatch(
      updateDriverProfileThunk({
        name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        dob: dob.trim(),
        email: email.trim(),
      }),
    )
      .unwrap()
      .then(() => {
        setIsEditing(false);
        Alert.alert('Success', 'Profile details updated successfully!');
      })
      .catch((err: any) => {
        Alert.alert('Error', err || 'Failed to update profile.');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleCancel = () => {
    setFirstName(driver?.name ?? '');
    setLastName(driver?.last_name ?? '');
    setPhone(driver?.phone ?? '');
    setEmail(driver?.email ?? '');
    setDob(driver?.dob ?? '');
    setIsEditing(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={palette.statusBarStyle}
        backgroundColor={palette.background}
      />

      <ScreenHeader
        title="Driver Info"
        rightElement={
          !isEditing ? (
            <TouchableOpacity
              style={[
                styles.editBadge,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Icon name="create-outline" size={16} color={palette.primary} />
              <Text style={[styles.editBadgeText, { color: palette.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>
            DRIVER PROFILE
          </Text>

          {/* First & Last Name */}
          {isEditing ? (
            <View style={styles.rowTwoCols}>
              <View style={styles.colFlex}>
                <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
                  First Name
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor={palette.mutedText}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />
              </View>
              <View style={styles.colFlex}>
                <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
                  Last Name
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor={palette.mutedText}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.rowTwoCols}>
              <View style={styles.colFlex}>
                <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
                  First Name
                </Text>
                <Text style={[styles.valueTextBold, { color: palette.text }]}>
                  {driver?.name || 'Captain'}
                </Text>
              </View>
              <View style={styles.colFlex}>
                <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
                  Last Name
                </Text>
                <Text style={[styles.valueTextBold, { color: palette.text }]}>
                  {driver?.last_name || '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Phone Number */}
          <View style={styles.fieldMargin}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Phone Number
            </Text>
            <Text style={[styles.valueTextBold, { color: palette.text }]}>
              {driver?.phone ?? '—'}
            </Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldMargin}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Date of Birth
            </Text>
            {isEditing ? (
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD (e.g. 1995-12-10)"
                placeholderTextColor={palette.mutedText}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            ) : (
              <Text style={[styles.valueTextBold, { color: palette.text }]}>
                {driver?.dob || '—'}
              </Text>
            )}
          </View>

          {/* Email Address */}
          <View style={styles.fieldMargin}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Email Address
            </Text>
            {isEditing ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={palette.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
              />
            ) : (
              <Text style={[styles.valueTextBold, { color: palette.text }]}>
                {driver?.email || '—'}
              </Text>
            )}
          </View>

          {/* Partner ID */}
          <View style={styles.fieldMarginLast}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Driver Partner ID
            </Text>
            <Text style={[styles.partnerIdText, { color: palette.primary }]}>
              MXD-{driver?.id?.substring(0, 6)?.toUpperCase() || '62981'}
            </Text>
          </View>
        </View>

        {isEditing && (
          <View style={styles.editActionRow}>
            <Button
              variant="outline"
              label="Cancel"
              onPress={handleCancel}
              disabled={isSaving}
              height={48}
              borderRadius={14}
              style={{
                flex: 1,
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
              textStyle={[styles.cancelBtnText, { color: palette.text }]}
            />

            <Button
              label="Save Details"
              onPress={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
              height={48}
              borderRadius={14}
              style={{ flex: 2 }}

            />
          </View>
        )}

        {/* Vehicle Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>
            VEHICLE DETAILS
          </Text>

          <View style={styles.fieldMargin}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Vehicle Name
            </Text>
            <Text style={[styles.valueTextBold, { color: palette.text }]}>
              {vehicle?.vehicleName ||
                `${driver?.vehicle?.make ?? 'Hero'} ${driver?.vehicle?.model ?? 'Splendor'
                }`}
            </Text>
          </View>

          <View style={styles.fieldMargin}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              License Plate Number
            </Text>
            <Text style={[styles.plateNumberText, { color: palette.text }]}>
              {vehicle?.numberPlate ||
                driver?.vehicle?.licensePlate ||
                'UP-16-AB-1234'}
            </Text>
          </View>

          <View style={styles.fieldMarginLast}>
            <Text style={[styles.inputLabel, { color: palette.mutedText }]}>
              Service Category
            </Text>
            <Text style={[styles.valueTextBold, { color: palette.success }]}>
              {vehicle?.serviceId?.name || ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    marginBottom: 16,

  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  colFlex: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  valueTextBold: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldMargin: {
    marginBottom: 16,
  },
  fieldMarginLast: {
    marginBottom: 4,
  },
  partnerIdText: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  plateNumberText: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
});

export default DriverInfoScreen;
