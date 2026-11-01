import React, { useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { sendOtpThunk, clearError } from '../../redux/slices/authSlice';
import { isValidPhone, sanitizePhone } from '../../utils/validators';
import { ROUTES } from '../../constants/routes';
import { useThemePalette } from '../../utils/theme';
import type { AuthNavProp } from '../../navigation/types';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavProp<typeof ROUTES.LOGIN>>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);

  const [phone, setPhone] = useState('');
  const [countryCode] = useState('+91');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  const handleSendOtp = async () => {
    dispatch(clearError());
    const cleaned = sanitizePhone(phone);
    if (!isValidPhone(cleaned)) {
      showToast('Invalid Phone Number', 'Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    const result = await dispatch(sendOtpThunk({ phone: cleaned, countryCode }));
    if (sendOtpThunk.fulfilled.match(result)) {
      navigation.navigate(ROUTES.OTP, { phone: cleaned, countryCode });
    } else if (sendOtpThunk.rejected.match(result)) {
      showToast('OTP Failed', (result.payload as string) || 'Could not send OTP', 'error');
    }
  };

  const isProceedDisabled = !phone || phone.length < 10;

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
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {/* Header Row */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Icon name="arrow-back" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={{ flexGrow: 1, paddingHorizontal: 20, position: 'relative' }}>
              {/* Background Illustration */}
              <Image
                source={require('../../assets/images/login-image.png')}
                style={styles.backgroundImage}
                resizeMode="contain"
              />

              {/* Brand Icon Badge */}
              <View style={{ marginTop: 16, zIndex: 2 }}>
                <Image
                  source={require('../../assets/images/login-icon.png')}
                  style={styles.loginIcon}
                  resizeMode="contain"
                />
              </View>

              {/* Headings */}
              <View style={[styles.headingBlock, { zIndex: 2 }]}>
                <Text style={[styles.headingText, { color: palette.text }]}>
                  Enter your{'\n'}
                  <Text style={{ color: palette.primary }}>Phone Number</Text>{'\n'}
                  to Partner
                </Text>
                <Text style={[styles.subHeadingText, { color: palette.mutedText }]}>
                  We'll send you a 6-digit OTP to verify your number
                </Text>
              </View>

              {/* Input Card */}
              <View
                style={[
                  styles.inputCard,
                  {
                    backgroundColor: palette.background,
                    borderColor: isFocused ? palette.primaryGray : palette.border,
                  },
                  { zIndex: 2 },
                ]}
              >
                <Image
                  source={{ uri: 'https://flagcdn.com/w40/in.png' }}
                  style={styles.flagIcon}
                  resizeMode="cover"
                />
                <Text style={[styles.countryCode, { color: palette.text }]}>+91</Text>
                {/* <View style={[styles.inputDivider, { backgroundColor: palette.primary }]} /> */}
                <TextInput
                  ref={inputRef}
                  style={[styles.textInput, { color: palette.text }]}
                  value={phone}
                  onChangeText={text => {
                    setPhone(text.replace(/\D/g, ''));
                    if (error) dispatch(clearError());
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Enter mobile number"
                  placeholderTextColor={palette.mutedText}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  selectionColor={palette.primary}
                  autoFocus
                />
              </View>

              {/* Validation Message */}
              {error || (phone.length > 0 && phone.length < 10) ? (
                <Text style={styles.errorText}>
                  {error || 'Please enter a valid 10-digit mobile number'}
                </Text>
              ) : null}

              {/* Notice Row */}
              <View style={[styles.noticeRow, { zIndex: 2 }]}>
                <View style={[styles.noticeIconCircle, { backgroundColor: palette.surface }]}>
                  <Icon name="shield-checkmark" size={13} color={palette.primary} />
                </View>
                <Text style={[styles.noticeText, { color: palette.mutedText }]}>
                  Please read our{' '}
                  <Text
                    style={{ color: palette.primary, fontWeight: '700' }}
                    onPress={() => navigation.navigate(ROUTES.TERMS_OF_SERVICE)}
                  >
                    Terms & Conditions
                  </Text>{' '}
                  before proceeding
                </Text>
              </View>
            </View>

            {/* Action / Footer Area */}
            <View
              style={[
                styles.footer,
                { paddingBottom: Platform.OS === 'ios' ? 16 : 12 },
              ]}
            >
              {/* Proceed Button */}
              <Button
                label="Proceed"
                subTitle="We'll send you a 6-digit OTP"
                showArrow
                isLoading={isLoading}
                disabled={isProceedDisabled}
                onPress={handleSendOtp}
                height={56}
                borderRadius={28}
              />

              {/* Footer Badge */}
              <View style={styles.footerBadge}>
                <Icon name="shield-checkmark" size={14} color={palette.success} style={{ marginRight: 6 }} />
                <Text style={[styles.footerBadgeText, { color: palette.mutedText }]}>
                  100% Secure & Trusted   •   Your data is protected
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Floating Animated Toast Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  footer: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backgroundImage: {
    position: 'absolute',
    right: -30,
    top: 40,
    width: 230,
    height: 180,
    opacity: 0.85,
    zIndex: 1,
  },
  loginIcon: {
    width: 72,
    height: 72,
  },
  headingBlock: {
    marginTop: 16,
    marginBottom: 24,
  },
  headingText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subHeadingText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    maxWidth: '85%',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  flagIcon: {
    width: 24,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  inputDivider: {
    width: 1,
    height: 24,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  noticeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    flex: 1,
  },
  proceedButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 3,
    shadowColor: '#fe4c01',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  proceedText: {
    fontSize: 16,
    fontWeight: '700',
  },
  proceedSubtext: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  arrowCircle: {
    position: 'absolute',
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  footerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default LoginScreen;
