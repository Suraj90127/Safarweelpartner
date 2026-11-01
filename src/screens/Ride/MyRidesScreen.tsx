import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StatusBar,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import type { AppNavProp } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { getMyDriverRidesThunk } from '../../redux/slices/rideSlice';
import { useThemePalette } from '../../utils/theme';
import Images from '../../utils/images';

const MyRidesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<AppNavProp<typeof ROUTES.MAIN_TABS>>();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const [activeTab, setActiveTab] = useState<'completed' | 'cancelled'>('completed');

  const rawRides = useAppSelector(state => state.ride.rideHistory);
  const isLoading = useAppSelector(state => state.ride.isLoading);

  const fetchRides = useCallback((status: 'completed' | 'cancelled') => {
    dispatch(getMyDriverRidesThunk({ status, limit: 50 }));
  }, [dispatch]);

  useEffect(() => {
    fetchRides(activeTab);
  }, [activeTab, fetchRides]);

  const handleRefresh = useCallback(() => {
    fetchRides(activeTab);
  }, [activeTab, fetchRides]);

  const renderRideItem = useCallback(({ item }: { item: any }) => {
    const isCompleted = item.status === 'completed';
    const pickupAddr = item.pickupLocation?.address || item.pickup?.address || 'Pickup point';
    const dropAddr = item.dropLocation?.address || item.drop?.address || 'Drop point';
    const stopsCount = item.stops?.length ?? 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
        onPress={() => navigation.navigate(ROUTES.RIDE_DETAIL, { rideId: item.id, rideData: item })}
        activeOpacity={0.85}
      >
        {/* Card Top Bar: Ride #, Timestamp & Status Pill */}
        <View style={[styles.cardHeader, { borderBottomColor: palette.border }]}>
          <View style={styles.rideNoWrapper}>
            <View style={[styles.rideTag, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <Text style={[styles.rideNoText, { color: palette.primary }]}>#{item.rideNo || item.id?.slice(-6) || 'RIDE'}</Text>
            </View>
            <Text style={[styles.dateText, { color: palette.mutedText }]}>{formatDateTime(item.createdAt)}</Text>
          </View>

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
                { backgroundColor: isCompleted ? palette.success : palette.destructive },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isCompleted ? palette.success : palette.destructive },
              ]}
            >
              {isCompleted ? 'Completed' : 'Cancelled'}
            </Text>
          </View>
        </View>

        {/* Route Timeline & Details */}
        <View style={styles.cardBody}>
          <View style={styles.timelineRow}>
            {/* Timeline Line & Dots */}
            <View style={styles.timelineGraphic}>
              <View style={[styles.dotCircle, { backgroundColor: palette.success }]} />
              <View style={[styles.verticalLine, { backgroundColor: palette.border }]} />
              <View style={[styles.dotCircle, { backgroundColor: palette.destructive }]} />
            </View>

            {/* Addresses */}
            <View style={styles.addressContainer}>
              {/* Pickup */}
              <View style={styles.addressBlock}>
                <Text style={[styles.addressLabel, { color: palette.mutedText }]}>PICKUP</Text>
                <Text style={[styles.addressText, { color: palette.text }]} numberOfLines={1}>
                  {pickupAddr}
                </Text>
              </View>

              {/* Stops Tag (if available) */}
              {stopsCount > 0 && (
                <View style={[styles.stopsBadge, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <Icon name="location-outline" size={12} color={palette.warning} />
                  <Text style={[styles.stopsBadgeText, { color: palette.warning }]}>
                    {stopsCount} {stopsCount === 1 ? 'Intermediate Stop' : 'Stops'}
                  </Text>
                </View>
              )}

              {/* Drop */}
              <View style={[styles.addressBlock, { marginTop: stopsCount > 0 ? 6 : 10 }]}>
                <Text style={[styles.addressLabel, { color: palette.mutedText }]}>DROP</Text>
                <Text style={[styles.addressText, { color: palette.text }]} numberOfLines={1}>
                  {dropAddr}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Footer: Fare Amount & Action Arrow */}
        <View style={[styles.cardFooter, { borderTopColor: palette.border }]}>
          <View style={styles.footerInfo}>
            {item.distanceKm ? (
              <View style={[styles.infoChip, { backgroundColor: palette.background }]}>
                <Icon name="navigate-outline" size={12} color={palette.mutedText} style={{ marginRight: 4 }} />
                <Text style={[styles.infoChipText, { color: palette.mutedText }]}>{item.distanceKm} km</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fareContainer}>
            {isCompleted ? (
              <Text style={[styles.fareAmount, { color: palette.text }]}>
                {formatCurrency(item.payment?.totalFare || item.fare?.total || 0)}
              </Text>
            ) : (
              <Text style={[styles.cancelledText, { color: palette.destructive }]}>₹0.00</Text>
            )}
            <Icon name="chevron-forward" size={18} color={palette.mutedText} style={{ marginLeft: 6 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [palette, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />

      {/* Screen Header */}
      <View style={[styles.header, { backgroundColor: palette.background, borderColor: palette.border }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>My Rides</Text>
      </View>

      {/* Custom Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'completed' && [styles.activeTabButton, { backgroundColor: palette.background }],
          ]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.88}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'completed' ? palette.text : palette.mutedText },
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'cancelled' && [styles.activeTabButton, { backgroundColor: palette.background }],
          ]}
          onPress={() => setActiveTab('cancelled')}
          activeOpacity={0.88}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'cancelled' ? palette.text : palette.mutedText },
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rides List Section */}
      {isLoading && rawRides.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : rawRides.length > 0 ? (
        <FlatList
          data={rawRides}
          renderItem={renderRideItem}
          keyExtractor={item => item.id || (item as any)._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
        >
          <Image
            source={isDark ? Images.noRidesDark : Images.noRides}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>No Rides History</Text>
          <Text style={[styles.emptySubtitle, { color: palette.mutedText }]}>
            You don't have any {activeTab} rides in your log yet.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 14,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.06,
    // shadowRadius: 6,
    // elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  rideNoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rideTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  rideNoText: {
    fontSize: 12,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
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
  cardBody: {
    paddingVertical: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  timelineGraphic: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 16,
    paddingVertical: 4,
    marginRight: 12,
  },
  dotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  verticalLine: {
    flex: 1,
    width: 1.5,
    marginVertical: 4,
  },
  addressContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  addressBlock: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  stopsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginVertical: 4,
    gap: 4,
  },
  stopsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MyRidesScreen;
