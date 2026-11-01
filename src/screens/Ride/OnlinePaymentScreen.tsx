import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StatusBar, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { completeRideThunk, updateActiveRide, fetchFirstTwoRidesThunk, validateUserPackageThunk, createDynamicQRThunk } from '../../redux/slices/rideSlice';
import { emitRideCompleted } from '../../services/socket/socketManager';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { formatCurrency } from '../../utils/formatters';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';

const OnlinePaymentScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.ONLINE_PAYMENT>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.ONLINE_PAYMENT>>();
  const dispatch = useAppDispatch();
  const isDark = useAppSelector(state => state.theme.isDark);
  const ride = useAppSelector(state => state.ride.activeRide) as any;
  const { rideId, fare } = route.params;

  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string>('rzpy.maxify@icici');
  const [loadingQr, setLoadingQr] = useState<boolean>(true);

  useEffect(() => {
    const fetchQR = async () => {
      try {
        setLoadingQr(true);
        const result = await dispatch(createDynamicQRThunk(fare));
        if (createDynamicQRThunk.fulfilled.match(result)) {
          const responseData: any = result.payload;
          if (responseData) {
            console.log("ssss", responseData);
            // responseData might be direct or wrapped inside success/data
            const mainData = responseData.data || responseData;
            const qrString = mainData.qr_code || mainData.qrCode || mainData.upi_url || mainData.payment_url || responseData.qr_code;
            if (qrString) {
              setQrCodeData(qrString);
            }
            const returnedUpiId = mainData.upi_id || mainData.upiId || responseData.upi_id;
            if (returnedUpiId) {
              setUpiId(returnedUpiId);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic QR:', err);
      } finally {
        setLoadingQr(false);
      }
    };
    fetchQR();
  }, [dispatch, fare]);

  const fallbackUpiUrl = `upi://pay?pa=${upiId}&pn=Safarweel&am=${fare}&cu=INR&tn=Ride_${rideId}`;
  const qrImageUrl = qrCodeData || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackUpiUrl)}`;

  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);

  const handleConfirmPayment = async () => {
    setIsVerifying(true);
    const customerNameVal = ride?.userId?.name || ride?.customer?.name || 'Customer';
    const riderIdVal = ride?.userId?._id || (typeof ride?.userId === 'string' ? ride.userId : null) || ride?.customer?._id || ride?.customerId;
    const driverIdVal = ride?.driverId?._id || (typeof ride?.driverId === 'string' ? ride.driverId : null) || driver?._id || driver?.id;
    try {

      const result = await dispatch(completeRideThunk(rideId));
      if (completeRideThunk.fulfilled.match(result)) {
        emitRideCompleted({ rideId });
        // Ride complete hone ke baad eligibility refresh karo
        dispatch(fetchFirstTwoRidesThunk());
        dispatch(validateUserPackageThunk());
        navigation.replace(ROUTES.COMPLETED_RIDE, {
          rideId,
          fare,
          customerName: customerNameVal,
          riderId: riderIdVal,
          driverId: driverIdVal
        });
      } else {
        Alert.alert('Error', 'Failed to complete the ride on server. Please try again.');
      }

    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while completing the ride.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? COLORS.darkBg : COLORS.white} />

      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-lightBorder dark:border-darkBorder bg-lightBg dark:bg-darkCard" >
        <TouchableOpacity className="p-1" onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={26} color={isDark ? COLORS.textDark : '#0F172A'} />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-textLight dark:text-textDark ml-3">Online Payment</Text>
      </View>

      <View className="flex-1 justify-center items-center px-6 pb-8">
        {/* Main Card */}
        <View
          className="bg-lightBg dark:bg-darkCard rounded-3xl p-6 border border-lightBorder dark:border-darkBorder w-full items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
          }}
        >

          {/* Fare Details */}
          <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-widest mb-1">Collect Fare (किराया लें)</Text>
          <Text className="text-4xl font-black text-textLight dark:text-textDark mb-6">{formatCurrency(fare)}</Text>

          {/* QR Code Box */}
          <View className="bg-white dark:bg-white border-2 border-slate-200 dark:border-slate-300 rounded-2xl p-4 mb-5 items-center justify-center w-56 h-56 relative shadow-sm">
            {loadingQr ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <Image
                source={{ uri: qrImageUrl }}
                style={{ width: 180, height: 180 }}
                resizeMode="contain"
              />
            )}

            {/* Corner styling accents */}
            <View className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
            <View className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
            <View className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
            <View className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />
          </View>

          <Text className="text-xs font-bold text-textLight dark:text-textDark text-center mb-1">Scan QR to Pay (स्कैन करके भुगतान करें)</Text>

          {/* Razorpay secured indicator */}
          <View className="flex-row items-center mb-4 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/30">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
            <Text className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Secured by Razorpay QRPay</Text>
          </View>

          <Text className="text-textLightSecondary dark:text-textDarkSecondary text-[11px] text-center leading-relaxed mb-6">
            Ask passenger to scan this QR with any UPI app (GPay, PhonePe, Paytm).

          </Text>

          {/* UPI Id display */}
          <View className="bg-lightCard dark:bg-darkBg rounded-xl px-4 py-2 border border-lightBorder dark:border-darkBorder flex-row items-center mb-6">
            <Text className="text-[11px] font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mr-2">UPI ID:</Text>
            <Text className="text-xs font-extrabold text-textLight dark:text-textDark">{upiId}</Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center w-full flex-row justify-center ${isVerifying ? 'opacity-70' : ''}`}
            style={{
              backgroundColor: COLORS.primary,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}
            onPress={handleConfirmPayment}
            disabled={isVerifying}
          >
            <Icon name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-extrabold text-sm">
              {isVerifying ? 'Verifying...' : 'Confirm Payment Received '}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};


export default OnlinePaymentScreen;
