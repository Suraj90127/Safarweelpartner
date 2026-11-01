import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StatusBar, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { completeRideThunk, fetchFirstTwoRidesThunk, validateUserPackageThunk } from '../../redux/slices/rideSlice';
import { emitRideCompleted } from '../../services/socket/socketManager';
import { ROUTES } from '../../constants/routes';
import { formatCurrency } from '../../utils/formatters';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';
import { useThemePalette } from '../../utils/theme';

const EndRideScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.END_RIDE>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.END_RIDE>>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const ride = useAppSelector(state => state.ride.activeRide) as any;
  const { rideId, fare } = route.params;
  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);

  const handleCompleteRideCash = useCallback(async (paymentMethod: 'cash' | 'wallet' = 'cash') => {
    const customerNameVal = ride?.userId?.name || ride?.customer?.name || 'Customer';
    const riderIdVal = ride?.userId?._id || (typeof ride?.userId === 'string' ? ride.userId : null) || ride?.userId?._id || ride?.userId;
    const driverIdVal = ride?.driverId?._id || (typeof ride?.driverId === 'string' ? ride.driverId : null) || driver?._id || driver?.id;


    const result = await dispatch(completeRideThunk({ rideId, fare, paymentMethod }));
    if (completeRideThunk.fulfilled.match(result)) {
      emitRideCompleted({ rideId });
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
      Alert.alert(
        'Error',
        typeof result.payload === 'string'
          ? result.payload
          : 'Failed to complete the ride on server. Please try again.',
      );
    }
  }, [dispatch, rideId, fare, navigation, ride, driver]);

  const handleCompleteRideOnline = () => {
    navigation.navigate(ROUTES.ONLINE_PAYMENT, { rideId, fare });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>End Ride & Payment</Text>
      </View>

      <View style={styles.mainContent}>
        {/* Main Fare Card */}
        <View
          style={[
            styles.fareCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.fareLabel, { color: palette.mutedText }]}>TOTAL FARE </Text>
          <Text style={[styles.fareAmountText, { color: palette.text }]}>{formatCurrency(fare)}</Text>

          {/* Rider Quick Details */}
          {ride && (
            <View style={[styles.passengerBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.avatarCircle, { backgroundColor: palette.accent }]}>
                <Text style={styles.avatarText}>
                  {(ride.userId?.name || ride.customer?.name || 'C')?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerLabel, { color: palette.mutedText }]}>Passenger (यात्री)</Text>
                <Text style={[styles.passengerName, { color: palette.text }]}>
                  {ride.userId?.name || ride.customer?.name || 'Customer'}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.paymentSection, { borderTopColor: palette.border }]}>
            <Text style={[styles.selectMethodTitle, { color: palette.text }]}>Collect Payment</Text>
            <Text style={[styles.selectMethodSubtext, { color: palette.mutedText }]}>
              Choose how the passenger will pay for this ride.
            </Text>

            {/* <TouchableOpacity
              style={[styles.collectPaymentButton, { backgroundColor: palette.success }]}
              onPress={() => handleCompleteRideCash('wallet')}
              activeOpacity={0.88}
            >
              <Icon name="wallet" size={20} color="#FFFFFF" />
              <Text style={styles.collectPaymentButtonText}>Collect Payment by Customer</Text>
            </TouchableOpacity> */}

            {/* Cash Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: palette.background, borderColor: palette.border }]}
              onPress={() => handleCompleteRideCash('cash')}
              activeOpacity={0.88}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="cash" size={20} color={palette.success} />
              </View>
              <View style={styles.optionTextFlex}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Cash Payment </Text>
                <Text style={[styles.optionSubtext, { color: palette.mutedText }]}>Collect cash directly from the rider.</Text>
              </View>
              <Icon name="chevron-forward" size={16} color={palette.mutedText} />
            </TouchableOpacity>

            {/* Online Option */}
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: palette.background, borderColor: palette.border }]}
              onPress={handleCompleteRideOnline}
              activeOpacity={0.88}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
                <Icon name="qr-code" size={20} color={palette.primary} />
              </View>
              <View style={styles.optionTextFlex}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>Online Payment </Text>
                <Text style={[styles.optionSubtext, { color: palette.mutedText }]}>Show UPI QR Code to the rider.</Text>
              </View>
              <Icon name="chevron-forward" size={16} color={palette.mutedText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.88}
        >
          <Text style={[styles.cancelBtnText, { color: palette.mutedText }]}>Cancel </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  fareCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  fareAmountText: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 20,
  },
  passengerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  passengerName: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  selectMethodTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  paymentSection: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  collectPaymentButton: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  collectPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  selectMethodSubtext: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextFlex: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  cancelBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});

export default EndRideScreen;
