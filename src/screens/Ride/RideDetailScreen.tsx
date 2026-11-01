import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { driverApi } from '../../api/driverApi';
import RatingModal from '../../components/RatingModal';
import ScreenHeader from '../../components/ScreenHeader';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';
import { ROUTES } from '../../constants/routes';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency, formatCurrency2 } from '../../utils/formatters';
import { useThemePalette } from '../../utils/theme';

const RideDetailScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.RIDE_DETAIL>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.RIDE_DETAIL>>();
  const { palette } = useThemePalette();
  const driver = useAppSelector(
    state => state.driver.profile || state.auth.driver,
  );

  const { rideId, rideData } = route.params;
  const [showRating, setShowRating] = useState(false);

  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: ToastType;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const hideToast = useCallback(
    () => setToast(prev => ({ ...prev, visible: false })),
    [],
  );

  const showToast = useCallback(
    (title: string, message: string = '', type: ToastType = 'info') => {
      setToast({ visible: true, title, message, type });
    },
    [],
  );

  // Fallback static details if not passed
  const ride = rideData || {
    _id: rideId || 'RIDE-101',
    rideNo: 101,
    status: 'completed',
    createdAt: '2026-06-11T09:00:00.000Z',
    pickupLocation: { address: 'Indiranagar, Bengaluru' },
    dropLocation: { address: 'Koramangala, Bengaluru' },
    stops: [
      {
        address: 'HSR Layout, Bengaluru',
        coordinates: { latitude: 12.9116, longitude: 77.6389 },
      },
    ],
    payment: {
      fare: 60,
      zoneCharge: 50,
      totalFare: 250,
    },
    distanceMeters: 8500,
    durationMinutes: 24,
    userId: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
    },
  };

  const isCompleted = ride.status === 'completed';

  const handleRatingSubmit = async (ratingVal: number, commentVal: string) => {
    const riderIdVal =
      ride?.userId?._id ||
      (typeof ride?.userId === 'string' ? ride.userId : null) ||
      ride?.customer?._id ||
      ride?.customerId;
    const driverIdVal =
      ride?.driverId?._id ||
      (typeof ride?.driverId === 'string' ? ride.driverId : null) ||
      driver?._id ||
      driver?.id;
    const reviewRideId = ride?._id || rideId;

    if (!driverIdVal || !riderIdVal || !reviewRideId) {
      showToast('Error', 'Missing ride details to submit review.', 'error');
      setShowRating(false);
      return;
    }

    try {
      const response = await driverApi.createReview({
        rideId: reviewRideId,
        driverId: driverIdVal,
        riderId: riderIdVal,
        rating: ratingVal,
        review: commentVal || 'No comment',
        targetType: 'rider',
      });
      if (response && response.success) {
        showToast('Success', 'Thank you for rating the rider!', 'success');
      } else {
        showToast(
          'Submitted',
          response?.message || 'Rating submitted successfully.',
          'success',
        );
      }
    } catch (error: any) {
      console.error('[RideDetailScreen] Failed to submit review:', error);
      showToast(
        'Error',
        error.message || 'Failed to submit rating. Please try again.',
        'error',
      );
    } finally {
      setShowRating(false);
    }
  };

  const formattedDate = ride.createdAt
    ? new Date(ride.createdAt).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    : ride.requestedAt
      ? new Date(ride.requestedAt).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      : 'N/A';

  const fareTotal = ride.payment?.totalFare || ride.payment?.fare || 0;
  const platformFeePercent = ride.payment?.platformFee || 0;
  const taxPercent = ride.payment?.tax || 0;
  const waitingCharges = ride.payment?.waitingFare || 0;
  const driverEarnings = ((fareTotal - ride.payment?.cancellationCharge || 0) * (100 - (platformFeePercent + taxPercent))) / 100;

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
        title="Ride Details"
        rightElement={
          <TouchableOpacity
            style={styles.headerRightBtn}
            onPress={() => navigation.navigate(ROUTES.RIDE_GUIDE as any)}
          >
            <Icon name="help-circle-outline" size={24} color={palette.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <View style={styles.statusHeaderRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isCompleted
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isCompleted
                      ? palette.success
                      : palette.destructive,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isCompleted ? palette.success : palette.destructive,
                  },
                ]}
              >
                {isCompleted ? 'COMPLETED' : 'CANCELLED'}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: palette.mutedText }]}>
              {formattedDate}
            </Text>
          </View>

          <Text style={[styles.rideIdText, { color: palette.mutedText }]}>
            ID: {ride.rideNo ? `RIDE-${ride.rideNo}` : ride._id || 'N/A'}
          </Text>
          <Text style={[styles.bigFareText, { color: palette.text }]}>
            {formatCurrency(fareTotal)}
          </Text>
        </View>

        {/* Cancellation Details (if cancelled) */}
        {!isCompleted && (
          <View
            style={[
              styles.cancelCard,
              {
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.25)',
              },
            ]}
          >
            <View style={styles.cancelTitleRow}>
              <Icon name="close-circle" size={18} color={palette.destructive} />
              <Text
                style={[styles.cancelTitleText, { color: palette.destructive }]}
              >
                Cancellation Info (रद्द करने की जानकारी)
              </Text>
            </View>

            <View
              style={[
                styles.cancelRow,
                { borderBottomColor: 'rgba(239, 68, 68, 0.15)' },
              ]}
            >
              <Text style={[styles.cancelLabel, { color: palette.mutedText }]}>
                Cancelled By
              </Text>
              <View
                style={[
                  styles.cancelBadge,
                  { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.cancelBadgeText,
                    { color: palette.destructive },
                  ]}
                >
                  Customer
                </Text>
              </View>
            </View>

            <View style={styles.cancelRow}>
              <Text style={[styles.cancelLabel, { color: palette.mutedText }]}>
                Reason
              </Text>
              <Text
                style={[styles.cancelValueText, { color: palette.destructive }]}
              >
                {ride.cancelReason || 'Changed mind / plan changed'}
              </Text>
            </View>
          </View>
        )}

        {/* Customer Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>
            CUSTOMER DETAILS
          </Text>

          <View style={styles.customerRow}>
            <View
              style={[
                styles.customerAvatar,
                { backgroundColor: palette.primary },
              ]}
            >
              <Text style={styles.avatarText}>
                {ride.userId?.name?.[0]?.toUpperCase() || 'C'}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={[styles.customerName, { color: palette.text }]}>
                {ride.userId?.name || 'Customer'}
              </Text>
              <Text
                style={[styles.customerPhone, { color: palette.mutedText }]}
              >
                {ride.userId?.phone || ''}
              </Text>
            </View>
            {isCompleted && (
              <View style={styles.tripMetrics}>
                <Text style={[styles.metricValue, { color: palette.text }]}>
                  {ride.distanceMeters
                    ? `${(ride.distanceMeters / 1000).toFixed(1)} km`
                    : '0 km'}
                </Text>
                <Text
                  style={[styles.metricLabel, { color: palette.mutedText }]}
                >
                  {ride.durationMinutes
                    ? `${ride.durationMinutes} mins`
                    : '0 mins'}
                </Text>
              </View>
            )}
          </View>

          {isCompleted && (
            <Button
              label="Rate this Customer"
              onPress={() => setShowRating(true)}
              height={46}
              borderRadius={12}
              style={{ marginTop: 16 }}
              rightSlot={
                <View style={styles.starRow}>
                  <Icon name="star" size={14} color="#fff" />
                  <Icon name="chevron-forward" size={14} color="#fff" />
                </View>
              }
              textStyle={styles.rateButtonText}
            />
          )}
        </View>

        {/* Route Details Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>
            ROUTE MAP
          </Text>

          {/* Pickup Point */}
          <View style={styles.routeRow}>
            <View
              style={[styles.routeDot, { backgroundColor: palette.success }]}
            />
            <View style={styles.routeContent}>
              <Text style={[styles.routeTag, { color: palette.mutedText }]}>
                PICKUP
              </Text>
              <Text style={[styles.routeAddress, { color: palette.text }]}>
                {ride.pickupLocation?.address || ride.pickup?.address || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Intermediate Stops */}
          {ride.stops &&
            ride.stops.length > 0 &&
            ride.stops.map((stop: any, idx: number) => (
              <React.Fragment key={idx}>
                <View
                  style={[
                    styles.routeConnector,
                    { backgroundColor: palette.border },
                  ]}
                />
                <View style={styles.routeRow}>
                  <View
                    style={[
                      styles.routeDot,
                      { backgroundColor: palette.warning },
                    ]}
                  />
                  <View style={styles.routeContent}>
                    <Text style={[styles.routeTag, { color: palette.warning }]}>
                      STOP {idx + 1}
                    </Text>
                    <Text
                      style={[styles.routeAddress, { color: palette.text }]}
                    >
                      {stop.address || stop.title || 'N/A'}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}

          <View
            style={[styles.routeConnector, { backgroundColor: palette.border }]}
          />

          {/* Drop Point */}
          <View style={styles.routeRow}>
            <View
              style={[
                styles.routeDot,
                { backgroundColor: palette.destructive },
              ]}
            />
            <View style={styles.routeContent}>
              <Text style={[styles.routeTag, { color: palette.mutedText }]}>
                DROP
              </Text>
              <Text style={[styles.routeAddress, { color: palette.text }]}>
                {ride.dropLocation?.address || ride.drop?.address || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown (Only for completed rides) */}
        {isCompleted && (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>
              FARE DETAILS
            </Text>
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: palette.mutedText }]}>
                {' '}
                Fare
              </Text>
              <Text style={[styles.fareValue, { color: palette.text }]}>
                {formatCurrency2(ride.payment.fare)}
              </Text>
            </View>

            {waitingCharges > 0 && (
              <View style={styles.fareRow}>
                <Text style={[styles.fareLabel, { color: palette.mutedText }]}>
                  Waiting Charges
                </Text>
                <Text style={[styles.fareValue, { color: palette.text }]}>
                  +{formatCurrency2(waitingCharges)}
                </Text>
              </View>
            )}

            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: palette.mutedText }]}>
                Total Fare
              </Text>
              <Text style={[styles.fareValue, { color: palette.text }]}>
                {formatCurrency2(fareTotal)}
              </Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                Platform Fee
              </Text>
              <Text className="text-xs font-extrabold text-amber-500 dark:text-textDark">
                ({ride.payment?.platformFee}%) -
                {formatCurrency2(
                  ((ride.payment?.platformFee || 0) *
                    (ride.payment?.fare || 0)) /
                  100,
                )}
              </Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                Tax
              </Text>
              <Text className="text-xs font-extrabold text-amber-500 dark:text-textDark">
                ({ride.payment?.tax}%) -
                {formatCurrency2(
                  ((ride.payment?.tax || 0) * (ride.payment?.fare || 0)) / 100,
                )}
              </Text>
            </View>
            {ride.payment?.cancellationCharge > 0 && (
              <View className="flex-row justify-between mb-3">
                <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary">
                  Customer Cancellation Charge
                </Text>
                <Text className="text-xs font-extrabold text-amber-500 dark:text-textDark">
                  {formatCurrency2(ride.payment?.cancellationCharge || 0)}
                </Text>
              </View>
            )}

            <View style={[styles.totalRow, { borderTopColor: palette.border }]}>
              <Text style={[styles.totalLabel, { color: palette.text }]}>
                Total Driver Earnings
              </Text>
              <Text style={[styles.totalValue, { color: palette.success }]}>
                {formatCurrency2(driverEarnings)}
              </Text>
            </View>
          </View>
        )}

        {/* Help Center CTA */}
        <Button
          variant="outline"
          label="Help with this Ride"
          leftSlot={
            <Icon
              name="chatbubbles-outline"
              size={20}
              color={palette.text}
              style={{ marginRight: 8 }}
            />
          }
          onPress={() => navigation.navigate(ROUTES.LIVE_CHAT as any)}
          height={52}
          borderRadius={14}
          style={{ marginBottom: 20 }}
          textStyle={{ color: palette.text, fontWeight: '700', fontSize: 14 }}
        />
      </ScrollView>

      {/* Rating Modal component */}
      <RatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        customerName={ride.userId?.name ?? 'Rider'}
        onSubmit={handleRatingSubmit}
      />

      {/* Toast Notification Banner */}
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 4,
    // elevation: 1.5,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rideIdText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  bigFareText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  cancelCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cancelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelTitleText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginLeft: 6,
  },
  cancelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cancelLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cancelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cancelValueText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  customerPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  tripMetrics: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  rateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  routeConnector: {
    width: 1.5,
    height: 20,
    marginLeft: 4,
    marginVertical: 3,
  },
  routeContent: {
    flex: 1,
  },
  routeTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  fareValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  helpCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  helpCtaText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RideDetailScreen;
