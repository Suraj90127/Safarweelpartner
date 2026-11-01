import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import Toast, { ToastType } from '../../components/Toast';
import CustomAlert, { AlertType } from '../../components/CustomAlert';

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { startRideThunk, updateActiveRide } from '../../redux/slices/rideSlice';
import { emitRideStarted } from '../../services/socket/socketManager';
import { ROUTES } from '../../constants/routes';
import type { AppNavProp } from '../../navigation/types';
import { useThemePalette } from '../../utils/theme';

const OtpRideScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.OTP_RIDE>>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();
  const ride = useAppSelector(state => state.ride.activeRide) as any;

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const hiddenInputRef = useRef<TextInput>(null);

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

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });
  const hideAlert = useCallback(() => setAlert(prev => ({ ...prev, visible: false })), []);

  const handleStartRide = useCallback(async () => {
    if (!ride) return;

    const currentRideId = ride._id || ride.id;

    const result = await dispatch(startRideThunk({ rideId: currentRideId, otp: otpCode }));
    if (startRideThunk.fulfilled.match(result)) {
      dispatch(updateActiveRide({ ...ride, status: 'ongoing', startedAt: new Date().toISOString() }));
      emitRideStarted({ rideId: currentRideId });
      showToast('Ride Started', 'Happy riding!', 'success');
      setTimeout(() => {
        navigation.navigate(ROUTES.ACTIVE_RIDE as any, { rideId: currentRideId });
      }, 800);
    } else {
      const errorMsg = (result.payload as string) || 'Invalid OTP. Please try again.';
      setOtpError(errorMsg);
      showToast('Verification Failed', errorMsg, 'error');
    }
  }, [dispatch, ride, otpCode, navigation, showToast]);

  const handleVerifyAndStart = () => {
    if (otpCode.length !== 4) {
      setOtpError('Please enter all 4 digits.');
      showToast('Validation Error', 'Please enter all 4 digits of the OTP.', 'warning');
      return;
    }

    setOtpError('');
    handleStartRide();
  };

  if (!ride) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: palette.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

        {/* Header Bar */}
        <View style={[styles.headerBar, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: palette.surfaceMuted, borderColor: palette.border }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={palette.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            OTP Verification
          </Text>
        </View>

        {/* Scrollable Container with centering flex spacers */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Spacer to push content to center */}
          <View style={{ flex: 1 }} />

          {/* Content Box */}
          <View style={styles.contentBox}>
            {/* Texts */}
            <View style={styles.textContainer}>
              <Text style={[styles.titleText, { color: palette.text }]}>
                Verify Ride Start OTP
              </Text>
              <Text style={[styles.subtitleText, { color: palette.mutedText }]}>
                Ask the passenger for the 4-digit code to begin navigation.
              </Text>
            </View>

            {/* OTP Input Grid */}
            <View style={styles.otpGridContainer}>
              <View style={styles.otpBoxesRow}>
                {/* Real TextInput overlaid on boxes — same size, fully transparent */}
                <TextInput
                  ref={hiddenInputRef}
                  style={styles.hiddenInput}
                  keyboardType="numeric"
                  maxLength={4}
                  value={otpCode}
                  caretHidden={true}
                  onChangeText={(txt) => {
                    setOtpCode(txt.replace(/[^0-9]/g, ''));
                    setOtpError('');
                  }}
                  autoFocus={true}
                />

                {/* Visible OTP boxes underneath */}
                {[0, 1, 2, 3].map((idx) => {
                  const char = otpCode[idx] || '';
                  const isFocused = otpCode.length === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.9}
                      onPress={() => hiddenInputRef.current?.focus()}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: isFocused || char ? palette.background : palette.surfaceMuted,
                          borderColor: isFocused ? palette.accent : char ? palette.mutedText : palette.border,
                        },
                      ]}
                    >
                      <Text style={[styles.otpCharText, { color: palette.text }]}>{char}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {otpError ? (
                <Text style={[styles.errorText, { color: palette.destructive }]}>{otpError}</Text>
              ) : (
                <Text style={[styles.hintText, { color: palette.mutedText }]}>
                  🔒 Security Note: Always verify the 4-digit OTP directly with your passenger before starting the trip.
                </Text>
              )}
            </View>

            {/* Start Ride Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: palette.accent }]}
              onPress={handleVerifyAndStart}
            >
              <Text style={styles.submitButtonText}>Start Ride</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacer to push content to center */}
          <View style={{ flex: 1 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              hideAlert();
              alert.onConfirm();
            },
          },
        ]}
        onDismiss={hideAlert}
      />
      <Toast {...toast} onDismiss={hideToast} />
    </View>
  );
};

export default OtpRideScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 16,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  contentBox: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    padding: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  otpGridContainer: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 32,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 10,
  },
  otpBox: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpCharText: {
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 48,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

