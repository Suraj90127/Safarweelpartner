import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import {
  saveBankThunk,
  saveUpiThunk,
  setLocalActiveMethod,
  createPayoutThunk
} from '../../redux/slices/payoutSlice';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';


// ─── Inner Component ──────────────────────────────────────────────────────────
interface PayoutMethodScreenInnerProps {
  onGoBack: () => void;
  onSuccessClose: () => void;
}

const PayoutMethodScreenInner: React.FC<PayoutMethodScreenInnerProps> = ({
  onGoBack,
  onSuccessClose }) => {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(state => state.theme.isDark);
  const driver = useAppSelector(state => state.driver.profile);
  const balance = driver?.wallet ?? 0;
  // ── Redux payout state ────────────────────────────────────────────────────
  const { _id, bank, upi, activeMethod, loading, saving } = useAppSelector(
    state => state.payout
  );



  // ── Local UI state ────────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);

  // Bank Modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [tempBankName, setTempBankName] = useState('');
  const [tempHolderName, setTempHolderName] = useState('');
  const [tempAccountNumber, setTempAccountNumber] = useState('');
  const [tempConfirmAccountNumber, setTempConfirmAccountNumber] = useState('');
  const [tempIfscCode, setTempIfscCode] = useState('');

  // UPI Modal
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [tempUpiId, setTempUpiId] = useState('');

  // Validation errors
  const [upiError, setUpiError] = useState<string | null>(null);
  const [bankNameError, setBankNameError] = useState<string | null>(null);
  const [holderNameError, setHolderNameError] = useState<string | null>(null);
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null);
  const [confirmAccountNumberError, setConfirmAccountNumberError] = useState<string | null>(null);
  const [ifscError, setIfscError] = useState<string | null>(null);

  // ── Amount Validation Handler ──────────────────────────────────────────────
  const handleAmountChange = (text: string) => {
    const sanitized = text.replace(/[^0-9.]/g, '');
    setPayoutAmount(sanitized);

    if (!sanitized.trim()) {
      setAmountError('Please enter an amount.');
      return;
    }
    const val = parseFloat(sanitized);
    if (isNaN(val) || val <= 0) {
      setAmountError('Please enter a valid amount.');
    } else if (val < 500) {
      setAmountError('Minimum payout amount is ₹500.');
    } else if (val > balance) {
      setAmountError(`Amount cannot exceed wallet balance (₹${balance.toLocaleString('en-IN')}).`);
    } else {
      setAmountError(null);
    }
  };



  // ── Validation handlers ───────────────────────────────────────────────────
  const handleUpiChange = (text: string) => {
    setTempUpiId(text);
    const t = text.trim();
    if (!t) setUpiError('UPI ID is required.');
    else if (!t.includes('@')) setUpiError('Invalid UPI ID. Must contain "@" (e.g. name@bank)');
    else setUpiError(null);
  };

  const handleHolderNameChange = (text: string) => {
    setTempHolderName(text);
    const t = text.trim();
    if (!t) setHolderNameError('Account holder name is required.');
    else if (t.length < 3) setHolderNameError('Name must be at least 3 characters.');
    else setHolderNameError(null);
  };

  const handleBankNameChange = (text: string) => {
    setTempBankName(text);
    const t = text.trim();
    if (!t) setBankNameError('Bank name is required.');
    else if (t.length < 3) setBankNameError('Bank name must be at least 3 characters.');
    else setBankNameError(null);
  };

  const handleAccountNumberChange = (text: string) => {
    setTempAccountNumber(text);
    const t = text.trim();
    if (!t) setAccountNumberError('Account number is required.');
    else if (t.length < 9) setAccountNumberError('Account number must be at least 9 digits.');
    else setAccountNumberError(null);
    if (tempConfirmAccountNumber && t !== tempConfirmAccountNumber.trim())
      setConfirmAccountNumberError('Account numbers do not match.');
    else setConfirmAccountNumberError(null);
  };

  const handleConfirmAccountNumberChange = (text: string) => {
    setTempConfirmAccountNumber(text);
    if (text.trim() !== tempAccountNumber.trim())
      setConfirmAccountNumberError('Account numbers do not match.');
    else setConfirmAccountNumberError(null);
  };

  const handleIfscChange = (text: string) => {
    const upper = text.toUpperCase();
    setTempIfscCode(upper);
    const t = upper.trim();
    if (!t) setIfscError('IFSC code is required.');
    else if (t.length !== 11) setIfscError('IFSC Code must be exactly 11 characters.');
    else setIfscError(null);
  };

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAddBank = () => {
    setTempBankName(bank.bankName);
    setTempHolderName(bank.holderName);
    setTempAccountNumber(bank.accountNumber);
    setTempConfirmAccountNumber(bank.accountNumber);
    setTempIfscCode(bank.ifscCode);
    setBankNameError(null);
    setHolderNameError(null);
    setAccountNumberError(null);
    setConfirmAccountNumberError(null);
    setIfscError(null);
    setShowBankModal(true);
  };

  const openAddUpi = () => {
    setTempUpiId(upi.vpa);
    setUpiError(null);
    setShowUpiModal(true);
  };

  // ── Save bank ─────────────────────────────────────────────────────────────
  const handleSaveBank = async () => {
    let hasError = false;
    if (!tempHolderName.trim() || tempHolderName.trim().length < 3) {
      setHolderNameError(
        !tempHolderName.trim() ? 'Account holder name is required.' : 'Name must be at least 3 characters.'
      );
      hasError = true;
    }
    if (!tempBankName.trim() || tempBankName.trim().length < 3) {
      setBankNameError(
        !tempBankName.trim() ? 'Bank name is required.' : 'Bank name must be at least 3 characters.'
      );
      hasError = true;
    }
    if (!tempAccountNumber.trim() || tempAccountNumber.trim().length < 9) {
      setAccountNumberError(
        !tempAccountNumber.trim() ? 'Account number is required.' : 'Account number must be at least 9 digits.'
      );
      hasError = true;
    }
    if (tempConfirmAccountNumber.trim() !== tempAccountNumber.trim()) {
      setConfirmAccountNumberError('Account numbers do not match.');
      hasError = true;
    }
    if (!tempIfscCode.trim() || tempIfscCode.trim().length !== 11) {
      setIfscError(
        !tempIfscCode.trim() ? 'IFSC code is required.' : 'IFSC Code must be exactly 11 characters.'
      );
      hasError = true;
    }
    if (hasError) return;

    const result = await dispatch(
      saveBankThunk({
        holderName: tempHolderName.trim(),
        bankName: tempBankName.trim(),
        accountNumber: tempAccountNumber.trim(),
        ifscCode: tempIfscCode.trim().toUpperCase()
      })
    );

    if (saveBankThunk.fulfilled.match(result)) {
      setShowBankModal(false);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to save bank account.');
    }
  };

  // ── Save UPI ──────────────────────────────────────────────────────────────
  const handleSaveUpi = async () => {
    const trimmed = tempUpiId.trim();
    if (!trimmed) { setUpiError('UPI ID is required.'); return; }
    if (!trimmed.includes('@')) {
      setUpiError('Invalid UPI ID. Must contain "@" (e.g. name@bank)');
      return;
    }
    setUpiError(null);

    const result = await dispatch(saveUpiThunk({ vpa: trimmed }));
    if (saveUpiThunk.fulfilled.match(result)) {
      setShowUpiModal(false);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to save UPI ID.');
    }
  };

  // ── Select payout method (local only — no API call) ────────────────────────────────────────────────────
  const selectPayoutMethod = (method: 'bank' | 'upi') => {
    if (method === 'bank' && !bank.accountNumber) { openAddBank(); return; }
    if (method === 'upi' && !upi.vpa) { openAddUpi(); return; }
    dispatch(setLocalActiveMethod(method)); // ✅ just local state, no API
  };

  // ── Initiate Payout ───────────────────────────────────────────────────────
  const handleInitiatePayout = async () => {
    if (!activeMethod || activeMethod === 'none') {
      Alert.alert('Error', 'Please select a payout method.');
      return;
    }
    if (activeMethod === 'bank' && !bank.accountNumber) {
      Alert.alert('Error', 'Please add a bank account first.');
      return;
    }
    if (activeMethod === 'upi' && !upi.vpa) {
      Alert.alert('Error', 'Please add a UPI ID first.');
      return;
    }
    const numericAmount = parseFloat(payoutAmount);
    if (!payoutAmount.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Please enter a valid payout amount.');
      return;
    }
    if (numericAmount < 500) {
      setAmountError('Minimum payout amount is ₹500.');
      return;
    }
    if (numericAmount > balance) {
      setAmountError(`Amount cannot exceed available wallet balance (₹${balance.toLocaleString('en-IN')}).`);
      return;
    }
    setAmountError(null);

    if (!_id) {
      Alert.alert('Error', 'Payout method ID not found. Please try re-saving your payout details.');
      return;
    }
    setIsProcessing(true);
    const result = await dispatch(
      createPayoutThunk({
        payoutMethodId: _id,
        amount: numericAmount,
        type: activeMethod === 'bank' ? 'Bank' : 'Upi'
      })
    );
    setIsProcessing(false);
    if (createPayoutThunk.fulfilled.match(result)) {
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', (result.payload as string) || 'Failed to request payout.');
    }
  };

  const maskAccountNumber = (acc: string) =>
    acc.length <= 4 ? acc : `******${acc.slice(-4)}`;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-sm text-textLightSecondary dark:text-textDarkSecondary mt-3">
          Loading payout info…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Payout Settings" onBackPress={onGoBack} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <LinearGradient
          colors={['#fa9c743e', '#fa9c743e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 24,
            margin: 16,
            borderWidth: 1,
            borderColor: '#fa9c743e'
          }}
        >
          <Text className="text-[10px] font-black text-primary dark:text-indigo-400 uppercase tracking-widest text-center mb-1">
            Wallet Balance
          </Text>
          <Text className="text-3xl font-black text-primary  text-center">
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </LinearGradient>

        {/* ── Amount Input Card ────────────────────────────────────────── */}
        <View className="mx-4 mb-6 p-5 rounded-3xl bg-lightBg dark:bg-darkCard border border-lightBorder dark:border-darkBorder">
          <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest mb-2.5 ml-1">
            Withdrawal Amount
          </Text>

          <View
            className={`flex-row items-center bg-lightCard dark:bg-darkBg border rounded-2xl px-4 py-3 ${amountError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
              }`}
          >
            <Text className="text-xl font-black text-primary dark:text-indigo-400 mr-2">
              ₹
            </Text>
            <TextInput
              value={payoutAmount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="Enter amount (min ₹500)"
              placeholderTextColor="#94A3B8"
              className="flex-1 text-lg font-black text-textLight dark:text-textDark p-0"
            />
            {payoutAmount.length > 0 && (
              <TouchableOpacity onPress={() => handleAmountChange('')} className="p-1">
                <Icon name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {amountError ? (
            <Text className="text-[11px] font-bold text-red-500 mt-2 ml-1">
              {amountError}
            </Text>
          ) : (
            <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-2 ml-1">
              Minimum payout ₹500 • Max available ₹{balance.toLocaleString('en-IN')}
            </Text>
          )}

          {/* Quick Amount Selection Chips */}
          <View className="flex-row flex-wrap gap-2 mt-3.5">
            {[500, 1000, 2000, 5000].map(amt => (
              <TouchableOpacity
                key={amt}
                disabled={amt > balance}
                onPress={() => handleAmountChange(amt.toString())}
                className={`px-3.5 py-2 rounded-xl border ${payoutAmount === amt.toString()
                  ? 'bg-primary border-primary'
                  : amt > balance
                    ? 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-40'
                    : 'bg-lightCard dark:bg-darkBg border-lightBorder dark:border-darkBorder'
                  }`}
              >
                <Text
                  className={`text-xs font-bold ${payoutAmount === amt.toString()
                    ? 'text-white'
                    : 'text-textLight dark:text-textDark'
                    }`}
                >
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
            {balance >= 500 && (
              <TouchableOpacity
                onPress={() => handleAmountChange(Math.floor(balance).toString())}
                className={`px-3.5 py-2 rounded-xl border ${payoutAmount === Math.floor(balance).toString()
                  ? 'bg-primary border-primary'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                  }`}
              >
                <Text
                  className={`text-xs font-black ${payoutAmount === Math.floor(balance).toString()
                    ? 'text-white'
                    : 'text-primary dark:text-indigo-400'
                    }`}
                >
                  Max (₹{Math.floor(balance)})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text className="text-xs font-black text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest ml-5 mb-3">
          Choose Destination
        </Text>

        {/* ── Bank Card ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => selectPayoutMethod('bank')}
          className={`mx-4 mb-4 rounded-3xl p-5 border flex-row items-start justify-between bg-lightBg dark:bg-darkCard ${activeMethod === 'bank'
            ? 'border-primary dark:border-indigo-500'
            : 'border-lightBorder dark:border-darkBorder'
            }`}
          style={
            activeMethod === 'bank'
              ? { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }
              : undefined
          }
        >
          <View className="flex-row items-start flex-1 mr-3">
            <View
              className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${activeMethod === 'bank' ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'
                }`}
            >
              <Icon
                name="business-outline"
                size={20}
                color={activeMethod === 'bank' ? '#4F46E5' : '#6B7280'}
              />
            </View>

            {bank.accountNumber ? (
              <View className="flex-1">
                <Text className="text-sm font-black text-textLight dark:text-textDark">
                  {bank.bankName}
                </Text>
                <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                  {bank.holderName}
                </Text>
                <Text className="text-xs font-bold text-primary dark:text-indigo-400 mt-2">
                  {maskAccountNumber(bank.accountNumber)} • {bank.ifscCode}
                </Text>
              </View>
            ) : (
              <View className="flex-1 justify-center mt-1">
                <Text className="text-sm font-black text-textLight dark:text-textDark">
                  Link Bank Account
                </Text>
                <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                  Withdraw directly to your local bank
                </Text>
              </View>
            )}
          </View>

          <View className="items-end justify-between h-full min-h-[50px]">
            {bank.accountNumber ? (
              <>
                <View className="w-5 h-5 rounded-full border-2 border-primary dark:border-indigo-500 justify-center items-center">
                  {activeMethod === 'bank' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-indigo-500" />
                  )}
                </View>
                <TouchableOpacity onPress={openAddBank} className="mt-4">
                  <Text className="text-xs font-extrabold text-primary dark:text-indigo-400 uppercase tracking-wider">
                    Edit
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={openAddBank}
                className="bg-primary dark:bg-indigo-500 px-3.5 py-2 rounded-xl"
              >
                <Text className="text-white font-extrabold text-[10px] uppercase tracking-wider">
                  Add
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* ── UPI Card ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => selectPayoutMethod('upi')}
          className={`mx-4 mb-8 rounded-3xl p-5 border flex-row items-start justify-between bg-lightBg dark:bg-darkCard ${activeMethod === 'upi'
            ? 'border-primary dark:border-indigo-500'
            : 'border-lightBorder dark:border-darkBorder'
            }`}
          style={
            activeMethod === 'upi'
              ? { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }
              : undefined
          }
        >
          <View className="flex-row items-start flex-1 mr-3">
            <View
              className={`w-10 h-10 rounded-2xl items-center justify-center mr-4 ${activeMethod === 'upi' ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'
                }`}
            >
              <Icon
                name="phone-portrait-outline"
                size={20}
                color={activeMethod === 'upi' ? '#4F46E5' : '#6B7280'}
              />
            </View>

            {upi.vpa ? (
              <View className="flex-1">
                <Text className="text-sm font-black text-textLight dark:text-textDark">
                  UPI ID (VPA)
                </Text>
                <Text className="text-xs font-bold text-primary dark:text-indigo-400 mt-2">
                  {upi.vpa}
                </Text>
              </View>
            ) : (
              <View className="flex-1 justify-center mt-1">
                <Text className="text-sm font-black text-textLight dark:text-textDark">
                  Link UPI Address
                </Text>
                <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                  Instant settlement via any UPI app
                </Text>
              </View>
            )}
          </View>

          <View className="items-end justify-between h-full min-h-[50px]">
            {upi.vpa ? (
              <>
                <View className="w-5 h-5 rounded-full border-2 border-primary dark:border-indigo-500 justify-center items-center">
                  {activeMethod === 'upi' && (
                    <View className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-indigo-500" />
                  )}
                </View>
                <TouchableOpacity onPress={openAddUpi} className="mt-4">
                  <Text className="text-xs font-extrabold text-primary dark:text-indigo-400 uppercase tracking-wider">
                    Edit
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={openAddUpi}
                className="bg-primary dark:bg-indigo-500 px-3.5 py-2 rounded-xl"
              >
                <Text className="text-white font-extrabold text-[10px] uppercase tracking-wider">
                  Add
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Action Button */}
        <View className="px-4">
          <Button
            label="Initiate Instant Payout"
            disabled={!activeMethod || activeMethod === 'none'}
            onPress={handleInitiatePayout}
            height={56}
            borderRadius={16}
          />
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isProcessing && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center z-50">
          <View className="bg-lightBg dark:bg-darkCard rounded-3xl p-8 items-center border border-lightBorder dark:border-darkBorder max-w-[80%]">
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text className="text-base font-black text-textLight dark:text-textDark mt-5 text-center">
              Processing Payout
            </Text>
            <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-2 text-center leading-relaxed">
              We are depositing money into your selected account. Please keep the app open.
            </Text>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-6">
          <View className="bg-lightBg dark:bg-darkCard rounded-[32px] p-6 items-center w-full border border-lightBorder dark:border-darkBorder max-w-sm">
            <View className="w-20 h-20 rounded-full bg-emerald-500/10 items-center justify-center mb-6">
              <Icon name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text className="text-2xl font-black text-textLight dark:text-textDark text-center mb-2">
              Payout Initiated
            </Text>
            <Text className="text-sm font-semibold text-textLightSecondary dark:text-textDarkSecondary text-center leading-relaxed mb-6">
              ₹{(parseFloat(payoutAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been transferred to your{' '}
              {activeMethod === 'bank' ? `${bank.bankName} Account` : `UPI ID (${upi.vpa})`}.
            </Text>
            <Button
              label="Back to Dashboard"
              onPress={onSuccessClose}
              height={52}
              borderRadius={16}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Bank Account Modal ──────────────────────────────────────────── */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-lightBg dark:bg-darkCard rounded-t-[32px] border-t border-lightBorder dark:border-darkBorder p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-black text-textLight dark:text-textDark">
                {bank.accountNumber ? 'Edit Bank Details' : 'Add Bank Details'}
              </Text>
              <TouchableOpacity className="p-1" onPress={() => setShowBankModal(false)}>
                <Icon name="close" size={24} color={isDark ? COLORS.textDark : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Holder Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                  Account Holder Name
                </Text>
                <TextInput
                  value={tempHolderName}
                  onChangeText={handleHolderNameChange}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#94A3B8"
                  className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${holderNameError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                    }`}
                />
                {holderNameError && (
                  <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{holderNameError}</Text>
                )}
              </View>

              {/* Bank Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                  Bank Name
                </Text>
                <TextInput
                  value={tempBankName}
                  onChangeText={handleBankNameChange}
                  placeholder="e.g. State Bank of India"
                  placeholderTextColor="#94A3B8"
                  className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${bankNameError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                    }`}
                />
                {bankNameError && (
                  <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{bankNameError}</Text>
                )}
              </View>

              {/* Account Number */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                  Account Number
                </Text>
                <TextInput
                  value={tempAccountNumber}
                  onChangeText={handleAccountNumberChange}
                  keyboardType="numeric"
                  secureTextEntry
                  placeholder="Enter Bank Account Number"
                  placeholderTextColor="#94A3B8"
                  className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${accountNumberError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                    }`}
                />
                {accountNumberError && (
                  <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{accountNumberError}</Text>
                )}
              </View>

              {/* Confirm Account Number */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                  Confirm Account Number
                </Text>
                <TextInput
                  value={tempConfirmAccountNumber}
                  onChangeText={handleConfirmAccountNumberChange}
                  keyboardType="numeric"
                  placeholder="Re-enter Bank Account Number"
                  placeholderTextColor="#94A3B8"
                  className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${confirmAccountNumberError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                    }`}
                />
                {confirmAccountNumberError && (
                  <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">
                    {confirmAccountNumberError}
                  </Text>
                )}
              </View>

              {/* IFSC */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                  IFSC Code
                </Text>
                <TextInput
                  value={tempIfscCode}
                  onChangeText={handleIfscChange}
                  autoCapitalize="characters"
                  maxLength={11}
                  placeholder="e.g. SBIN0001234"
                  placeholderTextColor="#94A3B8"
                  className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${ifscError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                    }`}
                />
                {ifscError && (
                  <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{ifscError}</Text>
                )}
              </View>

              {/* Actions */}
              <View className="flex-row gap-3 mb-6">
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setShowBankModal(false)}
                  height={50}
                  borderRadius={12}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Save Account"
                  onPress={handleSaveBank}
                  isLoading={saving}
                  height={50}
                  borderRadius={12}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── UPI Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showUpiModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpiModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-lightBg dark:bg-darkCard rounded-t-[32px] border-t border-lightBorder dark:border-darkBorder p-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-black text-textLight dark:text-textDark">
                {upi.vpa ? 'Edit UPI ID' : 'Add UPI ID'}
              </Text>
              <TouchableOpacity className="p-1" onPress={() => setShowUpiModal(false)}>
                <Icon name="close" size={24} color={isDark ? COLORS.textDark : '#0F172A'} />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary mb-1.5 uppercase tracking-wider ml-1">
                UPI Address (VPA)
              </Text>
              <TextInput
                value={tempUpiId}
                onChangeText={handleUpiChange}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="e.g. name@upi"
                placeholderTextColor="#94A3B8"
                className={`bg-lightCard dark:bg-darkBg border rounded-xl px-4 py-3 text-sm font-semibold text-textLight dark:text-textDark ${upiError ? 'border-red-500' : 'border-lightBorder dark:border-darkBorder'
                  }`}
              />
              {upiError && (
                <Text className="text-[10px] font-bold text-red-500 mt-1.5 ml-1">{upiError}</Text>
              )}
            </View>

            <View className="flex-row gap-3 mb-6">
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setShowUpiModal(false)}
                height={50}
                borderRadius={12}
                style={{ flex: 1 }}
              />
              <Button
                label="Save UPI ID"
                onPress={handleSaveUpi}
                isLoading={saving}
                height={50}
                borderRadius={12}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Outer Wrapper ────────────────────────────────────────────────────────────
interface PayoutMethodScreenProps {
  navigation: AppNavProp<typeof ROUTES.PAYOUT_METHOD>;
  route: AppRouteProp<typeof ROUTES.PAYOUT_METHOD>;
}

const PayoutMethodScreen: React.FC<PayoutMethodScreenProps> = ({ navigation }) => {
  return (
    <PayoutMethodScreenInner
      onGoBack={() => navigation.goBack()}
      onSuccessClose={() =>
        navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] })
      }
    />
  );
};

export default PayoutMethodScreen;
