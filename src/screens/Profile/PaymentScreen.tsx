import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Alert, Dimensions, ActivityIndicator, StyleSheet, RefreshControl, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { ROUTES } from '../../constants/routes';
import { fetchPayoutMethodThunk } from '../../redux/slices/payoutSlice';
import { fetchPackagesThunk, buyPackageThunk } from '../../redux/slices/packageSlice';
import { fetchDriverProfileThunk, fetchMyVehicleThunk } from '../../redux/slices/driverSlice';
import { validateUserPackageThunk } from '../../redux/slices/rideSlice';
import { useThemePalette } from '../../utils/theme';
import { Images } from '../../utils/images/images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48; // adjusted for side margins

const getPackageStyles = (id: string, index: number, palette: any, isDark: boolean) => {
  const key = id ? id.toLowerCase() : '';
  if (key.includes('daily') || index % 3 === 0) {
    return {
      color: palette.destructive,
      gradient: isDark ? ['#3F0712', palette.surface] : ['#FFF5F5', palette.surface],
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
      badgeBg: 'rgba(239, 68, 68, 0.12)',
      badgeText: palette.destructive,
      icon: 'flash-outline',
    };
  } else if (key.includes('weekly') || index % 3 === 1) {
    return {
      color: palette.primary,
      gradient: isDark ? ['#1E1B4B', palette.surface] : ['#EFF6FF', palette.surface],
      borderColor: isDark ? 'rgba(79, 70, 229, 0.3)' : 'rgba(79, 70, 229, 0.2)',
      badgeBg: 'rgba(79, 70, 229, 0.12)',
      badgeText: palette.primary,
      icon: 'calendar-outline',
    };
  } else {
    return {
      color: palette.success,
      gradient: isDark ? ['#064E3B', palette.surface] : ['#ECFDF5', palette.surface],
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
      badgeBg: 'rgba(34, 197, 94, 0.12)',
      badgeText: palette.success,
      icon: 'trophy-outline',
    };
  }
};

interface PaymentScreenProps {
  navigation: any;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation }) => {
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedEarning, setSelectedEarning] = useState<number>(2000);
  const [refreshing, setRefreshing] = useState(false);
  const driver = useAppSelector(state => state.driver.profile);
  const vehicle = useAppSelector(state => state.driver.vehicle);

  const serviceId = React.useMemo(() => {
    if (!vehicle) return null;
    const sId = vehicle.serviceId || (vehicle as any)?.service_id;
    if (!sId) return null;
    return typeof sId === 'object' ? (sId._id || sId.id || null) : String(sId);
  }, [vehicle]);

  const { bank, upi } = useAppSelector(state => state.payout);
  const { packages: fetchedPackages, loading: packagesLoading, buyLoading } = useAppSelector(
    state => state.package
  );
  const dispatch = useAppDispatch();

  const handleWithdraw = () => {
    navigation.navigate(ROUTES.PAYOUT_METHOD as any, { balance: driver?.wallet ?? 0 });
  };

  const apiPackages = fetchedPackages && fetchedPackages.length > 0 ? fetchedPackages : [];

  const displayPackages = apiPackages.length > 0
    ? apiPackages.map((pkg, index) => {
      const styles = getPackageStyles(pkg.id || '', index, palette, isDark);
      const priceStr = typeof pkg.amount === 'number' || (pkg.amount && !pkg.amount.toString().startsWith('₹'))
        ? `₹${pkg.amount}`
        : pkg.amount || '';
      const commStr = typeof pkg.commission === 'number' || (pkg.commission && typeof pkg.commission === 'string' && !pkg.commission.endsWith('%'))
        ? `${pkg.commission}%`
        : pkg.commission || '';
      return {
        ...pkg,
        amount: priceStr,
        commission: commStr,
        ...styles,
      };
    })
    : [];

  useEffect(() => {
    if (!vehicle) {
      dispatch(fetchMyVehicleThunk());
    }
  }, [vehicle, dispatch]);

  useEffect(() => {
    dispatch(fetchPayoutMethodThunk());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchPackagesThunk(serviceId || undefined));
  }, [serviceId, dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchPayoutMethodThunk()),
        dispatch(fetchPackagesThunk(serviceId || undefined)),
        dispatch(fetchDriverProfileThunk()),
        dispatch(validateUserPackageThunk()),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, serviceId]);

  const handleBuyPackage = (pkgId: string, pkgName: string, pkgAmount: number | string) => {
    if (!pkgId) {
      Alert.alert('Error', 'Invalid package ID.');
      return;
    }

    const walletBalance = driver?.wallet ?? 0;
    const numericAmount = typeof pkgAmount === 'number'
      ? pkgAmount
      : parseFloat(pkgAmount.toString().replace(/[^0-9.]/g, '')) || 0;

    if (walletBalance < numericAmount) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance (₹${walletBalance}) is insufficient to buy this plan (₹${numericAmount}). Please recharge your wallet first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Recharge',
            onPress: () => navigation.navigate(ROUTES.WALLET_RECHARGE as any)
          }
        ]
      );
      return;
    }

    Alert.alert('Activate Plan', `Would you like to activate the ${pkgName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate',
        onPress: async () => {
          try {
            await dispatch(buyPackageThunk(pkgId)).unwrap();
            Alert.alert('Success', `${pkgName} has been activated successfully!`);
            dispatch(fetchDriverProfileThunk());
            dispatch(validateUserPackageThunk());
          } catch (err: any) {
            Alert.alert('Failed to activate plan', err || 'Something went wrong.');
          }
        }
      }
    ]);
  };

  // Commission Calculations for interactive estimator
  const standardCommission = Math.round(selectedEarning * 0.15);
  const dailyPassCost = 49;
  const netSavingsDaily = standardCommission - dailyPassCost;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader
        title="Payments & Passes"
        rightElement={
          <TouchableOpacity style={styles.headerRightBtn} onPress={() => navigation.navigate(ROUTES.PAYMENT_HISTORY as any)}>
            <Icon name="time-outline" size={24} color={palette.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {/* Cash out card - Premium Theme LinearGradient */}
        <LinearGradient
          colors={isDark ? ['#312E81', '#1E1B4B'] : ['#fe4c01', '#E65100']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroSubLabel}>Available Balance</Text>
          <Text style={styles.heroBalanceText}>₹{Number(driver?.wallet ?? 0).toFixed(2)}</Text>

          <View style={styles.accountDetailsRow}>
            <View style={styles.accountBox}>
              <Text style={styles.accountBoxLabel}>BANK ACCOUNT</Text>
              <Text numberOfLines={1} style={styles.accountBoxValue}>{bank?.bankName || '—'}</Text>
            </View>
            <View style={styles.accountBox}>
              <Text style={styles.accountBoxLabel}>UPI ADDRESS</Text>
              <Text numberOfLines={1} style={styles.upiBoxValue}>{upi?.vpa || '—'}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.payoutBtn, { backgroundColor: palette.background }]}
              onPress={handleWithdraw}
              activeOpacity={0.88}
            >
              <Text style={[styles.payoutBtnText, { color: palette.primary }]}>Instant Payout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rechargeBtn, { backgroundColor: palette.background }]}
              onPress={() => navigation.navigate(ROUTES.WALLET_RECHARGE as any)}
              activeOpacity={0.88}
            >
              <Text style={[styles.rechargeBtnText, { color: palette.primary }]}>Add Wallet</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Link to Payment History */}
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.PAYMENT_HISTORY as any)}
          activeOpacity={0.7}
          style={[styles.historyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={styles.historyLeft}>
            <View style={[styles.historyIconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
              <Icon name="receipt-outline" size={18} color={palette.primary} />
            </View>
            <View>
              <Text style={[styles.historyTitleText, { color: palette.text }]}>Transaction History</Text>
              <Text style={[styles.historySubtext, { color: palette.mutedText }]}>View payouts, fares, and pass bills</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={16} color={palette.mutedText} />
        </TouchableOpacity>

        {/* Premium Packages Section */}
        <View style={styles.packagesSection}>
          <View style={styles.packagesHeaderRow}>
            <Text style={[styles.packagesHeaderTitle, { color: palette.text }]}>
              Choose Partner Package
            </Text>
            {packagesLoading && (
              <ActivityIndicator size="small" color={palette.primary} />
            )}
          </View>
          <Text style={[styles.packagesHeaderSubtext, { color: palette.mutedText }]}>
            Slide and activate a pass to reduce ride commissions.
          </Text>

          {displayPackages.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
                snapToAlignment="center"
                disableIntervalMomentum={true}
                onScroll={(event) => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  const index = Math.round(offsetX / (CARD_WIDTH + 16));
                  if (index !== activeSlide && index >= 0 && index < displayPackages.length) {
                    setActiveSlide(index);
                  }
                }}
                scrollEventThrottle={16}
                contentContainerStyle={styles.packagesListContainer}
              >
                {displayPackages.map((pkg) => (
                  <LinearGradient
                    key={pkg.id}
                    colors={pkg.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.packageCard,
                      {
                        width: CARD_WIDTH,
                        borderColor: pkg.borderColor,
                        shadowColor: pkg.color,
                      },
                    ]}
                  >
                    <View>
                      {/* Top row */}
                      <View style={styles.packageCardTop}>
                        <View style={[styles.packageBadge, { backgroundColor: pkg.badgeBg }]}>
                          <Icon name={pkg.icon || 'flash-outline'} size={12} color={pkg.badgeText} />
                          <Text style={[styles.packageBadgeText, { color: pkg.badgeText }]}>{pkg?.duration}{pkg.packageType}</Text>
                        </View>
                        <Text style={[styles.packagePriceText, { color: palette.text }]}>{pkg.amount}</Text>
                      </View>

                      {/* Title & Desc */}
                      <Text style={[styles.packageTitle, { color: palette.text }]}>{pkg.title}</Text>
                      <Text style={[styles.packageDesc, { color: palette.mutedText }]}>{pkg.description}</Text>
                    </View>

                    {/* Percentage details */}
                    <View style={styles.packageBottomSection}>
                      <View style={[styles.commBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                        <View style={styles.commBoxLeft}>
                          <Icon name="trending-down-outline" size={16} color={pkg.color} />
                          <Text style={[styles.commBoxLabel, { color: palette.text }]}>New Commission:</Text>
                        </View>
                        <Text style={[styles.commBoxValue, { color: pkg.color }]}>{pkg.commission}</Text>
                      </View>
                      <View style={styles.saveBadgeRow}>
                        <Icon name="gift-outline" size={12} color={pkg.color} />
                        <Text style={[styles.saveBadgeText, { color: pkg.color }]}>Save 15% commission</Text>
                      </View>

                      {/* Action CTA */}
                      <TouchableOpacity
                        style={[styles.buyPkgBtn, { backgroundColor: pkg.color }]}
                        onPress={() => handleBuyPackage(pkg.id || (pkg as any)._id || '', pkg.title || '', pkg.amount)}
                        disabled={buyLoading}
                        activeOpacity={0.88}
                      >
                        {buyLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.buyPkgBtnText}>Buy / Activate Plan</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </ScrollView>

              {/* Dots Indicator */}
              <View style={styles.dotsContainer}>
                {displayPackages.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === activeSlide
                        ? [styles.activeDot, { backgroundColor: palette.primary }]
                        : [styles.inactiveDot, { backgroundColor: palette.border }],
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyPackagesContainer}>
              <Image
                source={isDark ? Images.noBalanceDark : Images.noBalance}
                style={styles.emptyPackagesImage}
                resizeMode="contain"
              />
              <Text style={[styles.emptyPackagesTitle, { color: palette.text }]}>
                No Packages Available
              </Text>
              <Text style={[styles.emptyPackagesSubtext, { color: palette.mutedText }]}>
                Currently, there are no partner packages available.
              </Text>
            </View>
          )}
        </View>

        {/* Savings Calculator Section */}
        <View style={[styles.calcCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.calcHeaderRow}>
            <View style={[styles.calcIconCircle, { backgroundColor: 'rgba(79, 70, 229, 0.12)' }]}>
              <Icon name="calculator" size={18} color={palette.primary} />
            </View>
            <View style={styles.calcTitleWrapper}>
              <Text style={[styles.calcTitleText, { color: palette.text }]}>
                Commission Savings Calculator
              </Text>
              <Text style={[styles.calcSubtext, { color: palette.mutedText }]}>
                See how much you save with passes based on daily earnings
              </Text>
            </View>
          </View>

          {/* Selector Tabs */}
          <Text style={[styles.selectEarningsLabel, { color: palette.mutedText }]}>
            SELECT EXPECTED DAILY RIDE EARNINGS
          </Text>
          <View style={[styles.calcTabsContainer, { backgroundColor: palette.background, borderColor: palette.border }]}>
            {[1000, 2000, 3000].map((amount) => {
              const isSelected = selectedEarning === amount;
              return (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setSelectedEarning(amount)}
                  style={[
                    styles.calcTabBtn,
                    isSelected && [styles.selectedCalcTabBtn, { backgroundColor: palette.primary }],
                  ]}
                  activeOpacity={0.88}
                >
                  <Text
                    style={[
                      styles.calcTabText,
                      { color: isSelected ? '#fff' : palette.mutedText },
                    ]}
                  >
                    ₹{amount.toLocaleString('en-IN')} / Day
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Comparison Cards */}
          <View style={styles.comparisonList}>
            {/* Standard Commission */}
            <View style={[styles.comparisonItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.comparisonLeft}>
                <View style={[styles.compIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Icon name="close-circle-outline" size={18} color={palette.destructive} />
                </View>
                <View>
                  <Text style={[styles.compTitle, { color: palette.text }]}>Standard Commission</Text>
                  <Text style={[styles.compSubtitle, { color: palette.mutedText }]}>Fixed 15% rate on rides</Text>
                </View>
              </View>
              <Text style={[styles.compValueText, { color: palette.destructive }]}>-₹{standardCommission}</Text>
            </View>

            {/* Daily Pass Cost */}
            <View style={[styles.comparisonItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.comparisonLeft}>
                <View style={[styles.compIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                  <Icon name="checkmark-circle-outline" size={18} color={palette.success} />
                </View>
                <View>
                  <Text style={[styles.compTitle, { color: palette.text }]}>Daily Zero-Comm Pass</Text>
                  <Text style={[styles.compSubtitle, { color: palette.mutedText }]}>₹49 Pass Fee + 0% Commission</Text>
                </View>
              </View>
              <Text style={[styles.compValueText, { color: palette.success }]}>-₹{dailyPassCost}</Text>
            </View>
          </View>

          {/* Net Savings Badge */}
          <View
            style={[
              styles.netSavingsBanner,
              { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.25)' },
            ]}
          >
            <Text style={[styles.netSavingsLabel, { color: palette.success }]}>
              YOUR DAILY NET SAVINGS
            </Text>
            <View style={styles.netSavingsValueRow}>
              <Text style={[styles.netSavingsAmountText, { color: palette.success }]}>
                +₹{netSavingsDaily}
              </Text>
              <Text style={[styles.netSavingsPerDayText, { color: palette.success }]}>
                / Day
              </Text>
            </View>
            <Text style={[styles.netSavingsPercentText, { color: palette.success }]}>
              Saves {Math.round((netSavingsDaily / standardCommission) * 100)}% on commission expenses!
            </Text>
          </View>
        </View>

        {/* Explain calculations details */}
        <View style={[styles.calcCard, { backgroundColor: palette.surface, borderColor: palette.border, marginBottom: 40 }]}>
          <Text style={[styles.calcTitleText, { color: palette.text, marginBottom: 16 }]}>
            How is savings percentage calculated?
          </Text>

          <View style={styles.explanationList}>
            <View style={styles.explanationRow}>
              <View style={[styles.numBadge, { backgroundColor: palette.background }]}>
                <Text style={[styles.numBadgeText, { color: palette.mutedText }]}>1</Text>
              </View>
              <View style={styles.explanationContent}>
                <Text style={[styles.expTitle, { color: palette.text }]}>Standard Rate is 15%</Text>
                <Text style={[styles.expSubtext, { color: palette.mutedText }]}>
                  Normally, for every ₹100 you earn, Safarweel takes ₹15.
                </Text>
              </View>
            </View>

            <View style={styles.explanationRow}>
              <View style={[styles.numBadge, { backgroundColor: palette.background }]}>
                <Text style={[styles.numBadgeText, { color: palette.mutedText }]}>2</Text>
              </View>
              <View style={styles.explanationContent}>
                <Text style={[styles.expTitle, { color: palette.text }]}>0% Comm saves full 15%</Text>
                <Text style={[styles.expSubtext, { color: palette.mutedText }]}>
                  With Daily or Monthly passes, commission drops to 0%. You save the entire 15% rate, keeping 100% of your ride fares.
                </Text>
              </View>
            </View>

            <View style={styles.explanationRow}>
              <View style={[styles.numBadge, { backgroundColor: palette.background }]}>
                <Text style={[styles.numBadgeText, { color: palette.mutedText }]}>3</Text>
              </View>
              <View style={styles.explanationContent}>
                <Text style={[styles.expTitle, { color: palette.text }]}>2% Comm saves 13%</Text>
                <Text style={[styles.expSubtext, { color: palette.mutedText }]}>
                  With Weekly saver plans, commission drops to 2%. You save 13% (15% - 2% = 13%) of your total ride fares.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightBtn: {
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 10,
    marginTop: 16,
    marginBottom: 14,

  },
  heroSubLabel: {
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
    paddingBottom: 5,
    borderStyle: 'dotted',
    fontWeight: '600',
    color: 'white',
    marginBottom: 6,
  },
  heroBalanceText: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  accountDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  accountBox: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  accountBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
  accountBoxValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  upiBoxValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FCD34D',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  payoutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rechargeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeBtnText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyCard: {
    marginHorizontal: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  historySubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  packagesSection: {
    marginBottom: 24,
  },
  packagesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  packagesHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  packagesHeaderSubtext: {
    fontSize: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  packagesListContainer: {
    paddingHorizontal: 10,
    gap: 16,
  },
  packageCard: {
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  packageCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  packageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packageBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  packagePriceText: {
    fontSize: 22,
    fontWeight: '900',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  packageBottomSection: {
    gap: 10,
  },
  commBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  commBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  commBoxValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  saveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  buyPkgBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyPkgBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
  },
  inactiveDot: {
    width: 6,
  },
  emptyPackagesContainer: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyPackagesImage: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  emptyPackagesTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyPackagesSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  calcCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  calcIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcTitleWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  calcTitleText: {
    fontSize: 15,
    fontWeight: '900',
  },
  calcSubtext: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  selectEarningsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  calcTabsContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginBottom: 18,
  },
  calcTabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedCalcTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calcTabText: {
    fontSize: 11,
    fontWeight: '900',
  },
  comparisonList: {
    gap: 10,
    marginBottom: 18,
  },
  comparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  comparisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  compSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  compValueText: {
    fontSize: 14,
    fontWeight: '900',
  },
  netSavingsBanner: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  netSavingsLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  netSavingsValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  netSavingsAmountText: {
    fontSize: 26,
    fontWeight: '900',
  },
  netSavingsPerDayText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  netSavingsPercentText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  explanationList: {
    gap: 14,
  },
  explanationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  numBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  explanationContent: {
    flex: 1,
  },
  expTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  expSubtext: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default PaymentScreen;
