import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { completeRide } from '../../redux/slices/rideSlice';
import { updateEarnings, incrementTripCount } from '../../redux/slices/driverSlice';
import { ROUTES } from '../../constants/routes';
import { formatCurrency } from '../../utils/formatters';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';
import RatingModal from '../../components/RatingModal';
import { driverApi } from '../../api/driverApi';
import { useThemePalette } from '../../utils/theme';

const CompletedRideScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.COMPLETED_RIDE>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.COMPLETED_RIDE>>();
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();
  const driver = useAppSelector(state => state.driver.profile || state.auth.driver);

  const { rideId, fare, customerName, riderId, driverId } = route.params;
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    dispatch(completeRide());
    dispatch(updateEarnings(fare));
    dispatch(incrementTripCount());

    // Auto redirect to Dashboard
    const timer = setTimeout(() => {
      navigation.replace(ROUTES.MAIN_TABS);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

      <View style={styles.mainContent}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.successIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="checkmark-circle" size={68} color={palette.success} />
            </View>
          </View>

          {/* Heading */}
          <Text style={[styles.headingText, { color: palette.text }]}>
            Ride Completed
          </Text>

          <Text style={[styles.subheadingText, { color: palette.mutedText }]}>
            Your trip has been completed successfully. Earnings have been added to your account.
          </Text>

          {/* Earnings Card */}
          <View style={[styles.earningsBox, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.25)' }]}>
            <Text style={[styles.earningsLabel, { color: palette.mutedText }]}>
              TOTAL EARNINGS
            </Text>

            <Text style={[styles.earningsAmountText, { color: palette.success }]}>
              {formatCurrency(fare)}
            </Text>
          </View>

          {/* Trip Summary */}
          <View style={styles.tripSummaryRow}>
            <View style={[styles.summaryItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <Icon name="car-outline" size={22} color={palette.text} />
              <Text style={[styles.summaryLabel, { color: palette.mutedText }]}>
                Status
              </Text>
              <Text style={[styles.summaryValue, { color: palette.text }]}>
                Completed
              </Text>
            </View>

            <View style={[styles.summaryItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <Icon name="cash-outline" size={22} color={palette.success} />
              <Text style={[styles.summaryLabel, { color: palette.mutedText }]}>
                Earned
              </Text>
              <Text style={[styles.summaryValue, { color: palette.success }]}>
                {formatCurrency(fare)}
              </Text>
            </View>
          </View>

          {/* Rate Passenger Card */}
          <TouchableOpacity
            onPress={() => setShowRating(true)}
            activeOpacity={0.7}
            style={[styles.ratePassengerCard, { backgroundColor: 'rgba(79, 70, 229, 0.08)', borderColor: 'rgba(79, 70, 229, 0.2)' }]}
          >
            <View style={styles.rateLeftRow}>
              <Icon name="star-outline" size={18} color={palette.primary} />
              <Text style={[styles.rateTitleText, { color: palette.primary }]}>Rate Passenger (यात्री को रेट करें)</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={palette.primary} />
          </TouchableOpacity>

          {/* Button */}
          <TouchableOpacity
            style={[styles.dashboardBtn, { backgroundColor: palette.primary }]}
            onPress={() => navigation.replace(ROUTES.MAIN_TABS)}
            activeOpacity={0.88}
          >
            <Text style={styles.dashboardBtnText}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Modal Component */}
      <RatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        customerName={customerName ?? 'Rider'}
        onSubmit={async (ratingVal, commentVal) => {
          const finalDriverId = driverId || driver?._id || driver?.id;
          const finalRiderId = riderId;

          if (!finalDriverId || !finalRiderId) {
            Alert.alert('Error', 'Missing ride details to submit review.');
            setShowRating(false);
            return;
          }

          try {
            const response = await driverApi.createReview({
              rideId,
              driverId: finalDriverId,
              riderId: finalRiderId,
              rating: ratingVal,
              review: commentVal || 'No comment',
              targetType: 'rider',
            });
            if (response && response.success) {
              Alert.alert('Success', 'Thank you for your rating!');
            } else {
              Alert.alert('Success', response?.message || 'Rating submitted successfully.');
            }
          } catch (error: any) {
            console.error('[CompletedRideScreen] Failed to submit review:', error);
            Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
          } finally {
            setShowRating(false);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
  },
  subheadingText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  earningsBox: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  earningsAmountText: {
    fontSize: 38,
    fontWeight: '900',
    marginTop: 6,
  },
  tripSummaryRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  ratePassengerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
  },
  rateLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateTitleText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  dashboardBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  dashboardBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
});

export default CompletedRideScreen;