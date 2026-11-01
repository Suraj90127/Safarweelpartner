import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';
import ENV from '../../config/env';
import { fetchDriverProfileThunk } from '../../redux/slices/driverSlice';
import { post } from '../../api/httpClient';

interface WalletRechargeScreenProps {
  navigation: any;
}

type GatewayType = 'phonepe' | 'razorpay' | 'ccavenue' | 'googlepay' | 'paytm';


const WalletRechargeScreen: React.FC<WalletRechargeScreenProps> = ({ navigation }) => {
  const isDark = useAppSelector(state => state.theme.isDark);
  const driver = useAppSelector(state => state.driver.profile);
  const dispatch = useAppDispatch();

  const [amount, setAmount] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<GatewayType>('razorpay');
  const [loading, setLoading] = useState<boolean>(false);

  // For UPI / CCAvenue Mock Modal Simulation
  const [showMockModal, setShowMockModal] = useState<boolean>(false);
  const [mockStatus, setMockStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const gateways = [
    { id: 'razorpay' as GatewayType, name: 'Razorpay', icon: 'card-outline', color: '#3399FF', badge: 'Popular' },
    // { id: 'phonepe' as GatewayType, name: 'PhonePe', icon: 'flash-outline', color: '#5F259F' },
    // { id: 'googlepay' as GatewayType, name: 'Google Pay', icon: 'logo-google', color: '#4285F4' },
    // { id: 'paytm' as GatewayType, name: 'Paytm', icon: 'wallet-outline', color: '#00B9F2' },
    // { id: 'ccavenue' as GatewayType, name: 'CCAvenue', icon: 'globe-outline', color: '#FF9900', badge: 'Beta' },
  ];

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
  };

  const handleRecharge = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to recharge.');
      return;
    }

    if (parsedAmount < 10) {
      Alert.alert('Minimum Amount', 'Minimum recharge amount is ₹10.');
      return;
    }

    setLoading(true);

    if (selectedGateway === 'razorpay') {
      try {
        // 1. Create order on the backend
        const response = await post<any>('/recharge/create-order', { amount: parsedAmount });
        if (!response.success || !response.data?.order) {
          throw new Error(response.message || 'Failed to create order on server');
        }

        const { order } = response.data;

        // 2. Setup Razorpay configuration options
        const options = {
          description: 'Safarweel Wallet Recharge',
          image: require('../../assets/images/splashDark.png'),
          key: (ENV as any).RAZORPAY_KEY_ID || 'rzp_test_Rn6mAmy8ydPszM',
          amount: order.amount,
          currency: order.currency,
          name: ENV.APP_NAME,
          order_id: order.id,
          prefill: {
            email: driver?.email || 'partner@safarweel.com',
            contact: driver?.phone || '',
            name: driver?.name || 'Driver Partner',
          },
          theme: { color: COLORS.primary },
        };

        // 3. Launch Razorpay Checkout SDK
        RazorpayCheckout.open(options)
          .then(async (data: any) => {
            try {
              // 4. Verify payment on server
              const verifyResponse = await post<any>('/recharge/verify', {
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
              });

              if (verifyResponse.success) {
                dispatch(fetchDriverProfileThunk());
                Alert.alert('Recharge Successful', `₹${parsedAmount} has been added to your wallet successfully!`, [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } else {
                throw new Error(verifyResponse.message || 'Payment verification failed');
              }
            } catch (err: any) {
              Alert.alert('Verification Failed', err.message || 'Something went wrong verifying the payment.');
            }
          })
          .catch(async (error: any) => {
            console.log('[Razorpay Error]', error);
            // Notify server of failed checkout
            try {
              await post<any>('/recharge/fail', {
                razorpay_order_id: order.id,
                reason: error.description || 'Payment cancelled or failed by user',
              });
            } catch (failErr) {
              console.log('[Fail notify error]', failErr);
            }
            Alert.alert('Payment Failed', error.description || 'Recharge was cancelled or could not be completed.');
          });
      } catch (err: any) {
        Alert.alert('Recharge Error', err.message || 'Could not initiate Razorpay checkout.');
      } finally {
        setLoading(false);
      }
    } else {
      // Handle UPI & CCAvenue Mock Flow
      setMockStatus('pending');
      setShowMockModal(true);

      // Deep link initiation (for PhonePe, Google Pay, Paytm)
      if (selectedGateway !== 'ccavenue') {
        const upiSchemeMap: Record<string, string> = {
          phonepe: 'phonepe://upi/pay',
          googlepay: 'tez://upi/pay',
          paytm: 'paytmmp://upi/pay',
        };

        const upiUrl = `${upiSchemeMap[selectedGateway] || 'upi://pay'}?pa=jitendrakumar04445-3@okhdfcbank&pn=jitendra&am=${parsedAmount}&cu=INR&tn=WalletRecharge`;

        Linking.canOpenURL(upiUrl).then(supported => {
          if (supported) {
            Linking.openURL(upiUrl).catch(() => {
              console.log('Error opening deep link');
            });
          } else {
            console.log('App not installed, showing custom mock payment screen instead.');
          }
        });
      }
      setLoading(false);
    }
  };

  const handleConfirmMockSuccess = () => {
    setLoading(true);
    setMockStatus('success');

    // Simulate updating the wallet balance locally for mock gateways
    // We trigger profile refresh to get actual wallet if mock syncs with backend,
    // or let's display success directly and refresh profile
    setTimeout(() => {
      setLoading(false);
      setShowMockModal(false);
      dispatch(fetchDriverProfileThunk());
      Alert.alert(
        'Recharge Complete',
        `Wallet recharge of ₹${amount} is simulated and verified successfully.`,
        [{ text: 'Great', onPress: () => navigation.goBack() }]
      );
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Recharge Wallet" />

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View className="bg-lightCard dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-3xl p-6 mb-6">
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary font-bold mb-1">Current Wallet Balance</Text>
          <Text className="text-3xl font-black text-primary dark:text-primary">₹{Number(driver?.wallet || 0).toFixed(2) || 0}</Text>
        </View>

        {/* Enter Amount Input */}
        <View className="mb-6">
          <Text className="text-sm font-extrabold text-textLight dark:text-textDark mb-3">Enter Recharge Amount</Text>
          <View className="flex-row items-center bg-lightCard dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-2xl px-4 py-1 mb-4">
            <Text className="text-xl font-bold text-textLightSecondary dark:text-textDarkSecondary mr-1">₹</Text>
            <TextInput
              className="flex-1 text-lg font-bold text-textLight dark:text-textDark py-3"
              placeholder="Enter amount (Min ₹10)"
              placeholderTextColor={isDark ? COLORS.textDarkSecondary : '#94A3B8'}
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />
            {amount.length > 0 && (
              <TouchableOpacity onPress={() => setAmount('')} className="p-1">
                <Icon name="close-circle" size={20} color={isDark ? COLORS.textDarkSecondary : '#94A3B8'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Select Buttons */}
          <View className="flex-row gap-3">
            {[100, 200, 500, 1000].map(val => (
              <TouchableOpacity
                key={val}
                onPress={() => handleQuickSelect(val)}
                className={`flex-1 py-3 rounded-xl border items-center ${amount === val.toString()
                  ? 'bg-primary border-primary dark:bg-primary dark:border-primary'
                  : 'bg-lightCard border-lightBorder dark:bg-darkCard dark:border-darkBorder'
                  }`}
              >
                <Text
                  className={`text-xs font-black ${amount === val.toString()
                    ? 'text-white'
                    : 'text-textLightSecondary dark:text-textDarkSecondary'
                    }`}
                >
                  +₹{val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gateway List */}
        <View className="mb-8">
          <Text className="text-sm font-extrabold text-textLight dark:text-textDark mb-3">Select Payment Method</Text>
          <View className="bg-lightCard dark:bg-darkCard border border-lightBorder dark:border-darkBorder rounded-3xl overflow-hidden">
            {gateways.map((gt, idx) => {
              const isSelected = selectedGateway === gt.id;
              return (
                <TouchableOpacity
                  key={gt.id}
                  onPress={() => setSelectedGateway(gt.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center justify-between p-4 border-b border-lightBorder dark:border-darkBorder last:border-b-0 ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                    }`}
                >
                  <View className="flex-row items-center">
                    <View
                      style={{ backgroundColor: isSelected ? gt.color : isDark ? '#1E293B' : '#F1F5F9' }}
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    >
                      <Icon name={gt.icon} size={20} color={isSelected ? '#FFFFFF' : isDark ? COLORS.textDark : '#475569'} />
                    </View>
                    <View>
                      <Text className="text-sm font-extrabold text-textLight dark:text-textDark">{gt.name}</Text>
                      {gt.id === 'razorpay' && (
                        <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium">Pay via Cards, Netbanking or UPI</Text>
                      )}
                      {gt.id !== 'razorpay' && gt.id !== 'ccavenue' && (
                        <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium">Recharge directly using UPI app</Text>
                      )}
                      {gt.id === 'ccavenue' && (
                        <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary font-medium">CCAvenue Gateway Checkout</Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {gt.badge && (
                      <View className="bg-amber-500 rounded-full px-2 py-0.5 mr-2">
                        <Text className="text-[8px] font-extrabold text-white uppercase">{gt.badge}</Text>
                      </View>
                    )}
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary dark:border-primary' : 'border-slate-300 dark:border-slate-700'
                        }`}
                    >
                      {isSelected && (
                        <View className="w-2.5 h-2.5 rounded-full bg-primary dark:bg-primary" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recharge Action CTA */}
        <Button
          label={`Proceed to Pay ₹${amount || '0'}`}
          leftSlot={<Icon name="wallet-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
          isLoading={loading}
          onPress={handleRecharge}
          height={56}
          borderRadius={16}
          style={{ marginBottom: 40 }}
        />
      </ScrollView>

      {/* UPI / CCAvenue Mock Checkout Dialog */}
      <Modal visible={showMockModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-lightBg dark:bg-darkCard rounded-t-3xl p-6 min-h-[350px]">
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mb-6" />

              <View className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/40 items-center justify-center mb-4">
                <Icon name="phone-portrait-outline" size={32} color={COLORS.primary} />
              </View>

              <Text className="text-lg font-black text-textLight dark:text-textDark text-center mb-1">
                Completing Recharge using {gateways.find(g => g.id === selectedGateway)?.name}
              </Text>

              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary text-center px-4 mb-2">
                We have initiated the checkout request of
              </Text>

              <Text className="text-2xl font-black text-primary dark:text-primary mb-6">
                ₹{amount}
              </Text>

              {mockStatus === 'pending' ? (
                <View className="w-full gap-3 px-2">
                  <Button
                    label="Simulate Payment Success"
                    leftSlot={<Icon name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />}
                    onPress={handleConfirmMockSuccess}
                    height={50}
                    borderRadius={12}
                    gradientColors={['#10B981', '#059669']}
                  />

                  <Button
                    label="Cancel Payment"
                    variant="outline"
                    onPress={() => {
                      setShowMockModal(false);
                      Alert.alert('Payment Cancelled', 'Recharge process was cancelled.');
                    }}
                    height={50}
                    borderRadius={12}
                  />
                </View>
              ) : (
                <View className="items-center py-6">
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary mt-4 font-bold">Verifying payment status...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WalletRechargeScreen;
