import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import ScreenHeader from '../../components/ScreenHeader';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchIncentiveSummaryThunk,
  fetchMyVehicleThunk,
} from '../../redux/slices/driverSlice';
import { Images } from '../../utils/images/images';
import { useThemePalette } from '../../utils/theme';

const IncentiveScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const vehicle = useAppSelector(state => state.driver.vehicle);
  const incentives = useAppSelector(state => state.driver.incentives);
  const incentivesLoading = useAppSelector(
    state => state.driver.incentivesLoading,
  );
  const incentivesError = useAppSelector(state => state.driver.incentivesError);

  const serviceId = React.useMemo(() => {
    if (!vehicle) return null;
    const sId = vehicle.serviceId || (vehicle as any)?.service_id;
    if (!sId) return null;
    return typeof sId === 'object' ? sId._id || sId.id || null : String(sId);
  }, [vehicle]);

  React.useEffect(() => {
    if (!vehicle) {
      dispatch(fetchMyVehicleThunk());
    }
  }, [vehicle, dispatch]);

  React.useEffect(() => {
    if (serviceId) {
      dispatch(fetchIncentiveSummaryThunk(serviceId));
    }
  }, [serviceId, dispatch]);

  const handleRetry = () => {
    if (!vehicle) {
      dispatch(fetchMyVehicleThunk());
    } else if (serviceId) {
      dispatch(fetchIncentiveSummaryThunk(serviceId));
    }
  };

  const incentiveList = React.useMemo(() => {
    if (!incentives) return [];

    let list: any[] = [];
    if (Array.isArray(incentives)) {
      list = [...incentives];
    } else {
      const obj = incentives as any;
      if (obj.daily) list.push({ ...obj.daily, type: 'daily' });
      if (obj.weekly) list.push({ ...obj.weekly, type: 'weekly' });
      if (obj.monthly) list.push({ ...obj.monthly, type: 'monthly' });
    }

    const getPriority = (item: any) => {
      const typeStr = (item.type || item.incentiveType || '').toLowerCase();
      if (typeStr.includes('daily')) return 1;
      if (typeStr.includes('weekly')) return 2;
      if (typeStr.includes('monthly')) return 3;
      return 4;
    };

    return list.sort((a, b) => getPriority(a) - getPriority(b));
  }, [incentives]);

  const getIncentiveStyle = (type: string) => {
    const lowerType = (type || '').toLowerCase();
    if (lowerType.includes('daily')) {
      return {
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        color: palette.destructive,
        label: 'Daily Bonus',
      };
    } else if (lowerType.includes('weekly')) {
      return {
        badgeBg: 'rgba(79, 70, 229, 0.12)',
        color: palette.primary,
        label: 'Weekly Star',
      };
    } else {
      return {
        badgeBg: 'rgba(34, 197, 94, 0.12)',
        color: palette.success,
        label: type
          ? type.charAt(0).toUpperCase() + type.slice(1) + ' Incentive'
          : 'Incentive',
      };
    }
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
      <ScreenHeader title="Incentives" />

      {incentivesLoading && !incentives ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.mutedText }]}>
            Loading incentives...
          </Text>
        </View>
      ) : incentivesError ? (
        <View style={styles.centerContainer}>
          <Icon
            name="alert-circle-outline"
            size={50}
            color={palette.destructive}
          />
          <Text style={[styles.errorTitle, { color: palette.text }]}>
            Failed to Load Incentives
          </Text>
          <Text style={[styles.errorSubtext, { color: palette.mutedText }]}>
            {incentivesError}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: palette.primary }]}
            onPress={handleRetry}
            activeOpacity={0.88}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {incentiveList.length === 0 ? (
            <View style={styles.emptyContainerInScroll}>
              <Icon name="trophy-outline" size={44} color={palette.mutedText} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                No Active Daily Targets
              </Text>
              <Text style={[styles.emptySubtext, { color: palette.mutedText }]}>
                Check the incentive plan below for reward slabs and criteria!
              </Text>
            </View>
          ) : (
            incentiveList.map(item => {
              const incStyle = getIncentiveStyle(item.type);
              const target = item.targetRides || item.targetTrips || 1;
              const completed = item.ridesInPeriod || item.completedTrips || 0;
              const progressPercent = Math.min(100, (completed / target) * 100);
              const remaining = Math.max(0, target - completed);

              return (
                <View
                  key={
                    item._id || item.id || `${item.type}-${item.targetTrips}`
                  }
                  style={[
                    styles.card,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.badgePill,
                        { backgroundColor: incStyle.badgeBg },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: incStyle.color }]}
                      >
                        {item.incentiveType || incStyle.label}
                      </Text>
                    </View>
                    <Text
                      style={[styles.amountText, { color: incStyle.color }]}
                    >
                      ₹{item.incentiveAmount || item.rewardAmount || 0}
                    </Text>
                  </View>

                  <Text style={[styles.titleText, { color: palette.text }]}>
                    {item.description || `Complete ${target} Rides`}
                  </Text>

                  {item.subText || item.description ? (
                    <Text
                      style={[styles.subtext, { color: palette.mutedText }]}
                    >
                      {item.subText ||
                        `Get ₹${item.rewardAmount || item.incentiveAmount || 0
                        } extra reward after completion.`}
                    </Text>
                  ) : null}

                  {/* Progress bar */}
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: palette.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: incStyle.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.progressFooter}>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: palette.mutedText },
                      ]}
                    >
                      {completed} of {target} rides done
                    </Text>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: palette.mutedText },
                      ]}
                    >
                      {remaining > 0 ? `${remaining} left` : 'Completed'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {/* Incentive Banner */}
          {/* <View style={styles.bannerWrapper}>
            <Image
              source={Images.incentiveBanner}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </View> */}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    marginBottom: 16,

  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '900',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainerInScroll: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bannerWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#000000',
    shadowColor: '#000',
    height: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: 450,
    borderRadius: 16,
  },
});

export default IncentiveScreen;
