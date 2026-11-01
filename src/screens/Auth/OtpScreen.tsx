import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
  NativeModules,
  NativeEventEmitter,
  Image,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { verifyOtpThunk, sendOtpThunk, clearError } from '../../redux/slices/authSlice';
import { isValidOtp } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';
import type { AuthNavProp, AuthRouteProp } from '../../navigation/types';
import Images from '../../utils/images';

const { SmsConsentModule } = NativeModules;
const smsConsentEmitter = SmsConsentModule ? new NativeEventEmitter(SmsConsentModule) : null;

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 30;

const OtpScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavProp<typeof ROUTES.OTP>>();
  const route = useRoute<AuthRouteProp<typeof ROUTES.OTP>>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);
  const isDark = useAppSelector(state => state.theme.isDark);
  const { phone, countryCode } = route.params;

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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

  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const shakeX = useSharedValue(0);
  const checkScale = useSharedValue(1);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  useEffect(() => {
    startCountdown();

    if (Platform.OS === 'android' && SmsConsentModule) {
      SmsConsentModule.startSmsListener()
        .then(() => {
          console.log('SMS consent listener started');
        })
        .catch((err: any) => {
          console.log('Failed to start SMS consent listener:', err);
        });

      const otpReceiverSubscription = smsConsentEmitter?.addListener(
        'onOtpReceived',
        (event: { otp: string }) => {
          console.log('Received OTP from SMS:', event.otp);
          setOtp(event.otp);
          setTimeout(() => {
            handleVerifyWithOtp(event.otp);
          }, 400);
        }
      );

      const otpErrorSubscription = smsConsentEmitter?.addListener(
        'onOtpError',
        (event: { error: string }) => {
          console.log('SMS Consent error:', event.error);
        }
      );

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        SmsConsentModule.stopSmsListener();
        otpReceiverSubscription?.remove();
        otpErrorSubscription?.remove();
      };
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COUNTDOWN);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const restartSmsListener = () => {
    if (Platform.OS === 'android' && SmsConsentModule) {
      SmsConsentModule.stopSmsListener();
      SmsConsentModule.startSmsListener()
        .then(() => console.log('SMS listener restarted'))
        .catch((err: any) => console.log('Failed to restart SMS listener', err));
    }
  };

  const handleVerifyWithOtp = async (otpValue: string) => {
    console.log('[OtpScreen] handleVerifyWithOtp called with:', otpValue);
    dispatch(clearError());
    if (!isValidOtp(otpValue)) {
      console.log('[OtpScreen] Invalid OTP format length');
      triggerShake();
      showToast('Invalid OTP', 'Please enter a 6-digit OTP code', 'warning');
      return;
    }
    checkScale.value = withSequence(withSpring(0.94), withSpring(1));
    try {
      const result = await dispatch(verifyOtpThunk({ phone, otp: otpValue }));
      if (verifyOtpThunk.fulfilled.match(result)) {
        console.log('[OtpScreen] verifyOtpThunk fulfilled!');
      } else if (verifyOtpThunk.rejected.match(result)) {
        triggerShake();
        showToast('Verification Failed', (result.payload as string) || 'Invalid OTP', 'error');
      }
    } catch (err: any) {
      triggerShake();
      showToast('Error', err.message || 'Verification error', 'error');
    }
  };

  const handleVerify = async () => {
    await handleVerifyWithOtp(otp);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    dispatch(clearError());
    const result = await dispatch(sendOtpThunk({ phone, countryCode, channel: 'sms' }));
    if (sendOtpThunk.fulfilled.match(result)) {
      setOtp('');
      startCountdown();
      restartSmsListener();
      showToast('OTP Sent', 'A new OTP has been sent to your phone.', 'success');
    } else if (sendOtpThunk.rejected.match(result)) {
      showToast('Resend Failed', (result.payload as string) || 'Could not resend OTP', 'error');
    }
  };

  const handleResendWhatsApp = async () => {
    if (countdown > 0) return;
    dispatch(clearError());
    const result = await dispatch(sendOtpThunk({ phone, countryCode, channel: 'whatsapp' }));
    if (sendOtpThunk.fulfilled.match(result)) {
      setOtp('');
      startCountdown();
      restartSmsListener();
      showToast('WhatsApp OTP Sent', 'OTP has been sent to your WhatsApp number.', 'success');
    } else if (sendOtpThunk.rejected.match(result)) {
      showToast('Resend Failed', (result.payload as string) || 'Could not send WhatsApp OTP', 'error');
    }
  };

  const maskedPhone = `${countryCode} ${'*'.repeat(5)}${phone.slice(-5)}`;

  // Render OTP boxes
  const renderBoxes = () =>
    Array.from({ length: OTP_LENGTH }).map((_, i) => {
      return (
        <View
          key={i}
          style={[
            styles.otpBox,
            {
              backgroundColor: palette.surface,
              borderColor: otp.length === i ? palette.primary : palette.border,
            },
          ]}
        >
          <Text
            style={[
              styles.otpDigitText,
              { color: palette.text },
            ]}
          >
            {otp[i] || ''}
          </Text>
        </View>
      );
    });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.background }}
      edges={['top', 'bottom']}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={palette.statusBarStyle}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="" image={isDark ? Images.splashDark : Images.splash} borderBottom={false} />

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.contentContainer,
            isKeyboardVisible && styles.keyboardOpenContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top OTP Illustration Image */}
          {!isKeyboardVisible && (
            <View style={styles.topImageWrapper}>
              <Image
                source={isDark ? Images.otpDarkpng : Images.otpVerify}
                style={styles.topImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Header Content */}
          <View
            style={[
              styles.headerBlock,
              isKeyboardVisible && styles.keyboardOpenHeader,
            ]}
          >
            <Text style={[styles.headingText, { color: palette.text }]}>
              Verify your number
            </Text>
            <Text style={[styles.subHeadingText, { color: palette.mutedText }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={[styles.phoneHighlight, { color: palette.primary }]}>
                {maskedPhone}
              </Text>
            </Text>
          </View>

          {/* OTP Input Container with Overlaid Invisible TextInput */}
          <View style={{ position: 'relative' }}>
            <Animated.View
              style={[styles.boxesRow, shakeStyle, { backgroundColor: palette.background }]}
              pointerEvents="none"
            >
              {renderBoxes()}
            </Animated.View>

            <TextInput
              ref={inputRef}
              style={styles.hiddenTextInput}
              value={otp}
              onChangeText={text => {
                const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
                setOtp(digits);
                if (error) dispatch(clearError());
                if (digits.length === OTP_LENGTH) {
                  handleVerifyWithOtp(digits);
                }
              }}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
              caretHidden
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Verify Button */}
          <Animated.View
            style={{ marginTop: isKeyboardVisible ? 4 : 12 }}
          >
            <Button
              label="Verify & Continue"
              showArrow
              isLoading={isLoading}
              disabled={otp.length < OTP_LENGTH}
              onPress={handleVerify}
              height={54}
              borderRadius={16}
            />
          </Animated.View>

          {/* WhatsApp OTP Button */}
          {/* <TouchableOpacity
            style={[
              styles.whatsappButton,
              {
                borderColor: countdown > 0 ? palette.border : '#25D366',
                opacity: countdown > 0 ? 0.6 : 1,
              },
            ]}
            onPress={handleResendWhatsApp}
            disabled={countdown > 0 || isLoading}
            activeOpacity={0.88}
          >
            <Icon
              name="logo-whatsapp"
              size={20}
              color={countdown > 0 ? palette.mutedText : '#25D366'}
            />
            <Text
              style={[
                styles.whatsappButtonText,
                { color: countdown > 0 ? palette.mutedText : '#25D366' },
              ]}
            >
              Send OTP on WhatsApp
            </Text>
          </TouchableOpacity> */}

          {/* Resend OTP */}
          <TouchableOpacity
            style={styles.resendTouch}
            onPress={handleResend}
            disabled={countdown > 0}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.resendText,
                { color: countdown > 0 ? palette.mutedText : palette.primary },
              ]}
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Animated Toast Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  keyboardOpenContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  contentScroll: {
    flex: 1,
  },
  topImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  topImage: {
    width: 400,
    height: 200,
  },
  headerBlock: {
    marginTop: 8,
    marginBottom: 24,
  },
  keyboardOpenHeader: {
    marginTop: 2,
    marginBottom: 10,
  },
  headingText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subHeadingText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  phoneHighlight: {
    fontWeight: '800',
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenTextInput: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  verifyButton: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    marginTop: 16,
    gap: 8,
  },
  whatsappButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  resendTouch: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default OtpScreen;
