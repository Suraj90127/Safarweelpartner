import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '../../utils/clipboard';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, Alert, Share, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchReferralsThunk, fetchReferralEarnThunk, fetchReferralSummaryThunk } from '../../redux/slices/driverSlice';
import { getRelativeTime } from '../../utils/formatters';
import { useThemePalette } from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface ReferralStep {
  amount: number;
  label: string;
  description: string;
}

interface ReferralPlan {
  id: string;
  vehicleType: string;
  icon: string;
  totalAmount: number;
  steps: ReferralStep[];
  color: string;
  gradient: string[];
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}

const ReferralScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const driver = useAppSelector(state => state.driver.profile);
  const {
    referrals = [],
    referralsLoading = false,
    referralEarn = [],
    referralEarnLoading = false
  } = useAppSelector(state => state.driver);
  const referralCode = driver?.referral_code || '';
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    dispatch(fetchReferralsThunk());
    dispatch(fetchReferralEarnThunk());
    dispatch(fetchReferralSummaryThunk());
  }, [dispatch]);

  const totalReferrals = driver?.totalReferrals ?? 0;
  const referralEarnings = driver?.referralEarnings ?? 0;

  const getThemeForIndex = (index: number) => {
    const themes = [
      {
        color: palette.success,
        gradient: isDark ? ['#064E3B', palette.surface] : ['#ECFDF5', palette.surface],
        borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
        badgeBg: 'rgba(34, 197, 94, 0.12)',
        badgeText: palette.success,
      },
      {
        color: '#3B82F6',
        gradient: isDark ? ['#1E3A8A', palette.surface] : ['#EFF6FF', palette.surface],
        borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
        badgeBg: 'rgba(59, 130, 246, 0.12)',
        badgeText: '#3B82F6',
      },
      {
        color: palette.primary,
        gradient: isDark ? ['#312E81', palette.surface] : ['#EEF2FF', palette.surface],
        borderColor: isDark ? 'rgba(79, 70, 229, 0.25)' : '#C7D2FE',
        badgeBg: 'rgba(79, 70, 229, 0.12)',
        badgeText: palette.primary,
      },
    ];
    return themes[index % themes.length];
  };

  const getIconForName = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bike') || lowerName.includes('bicycle')) {
      return 'bicycle-outline';
    }
    if (lowerName.includes('auto')) {
      return 'car-sport-outline';
    }
    return 'car-outline';
  };

  const referralPlans: ReferralPlan[] = (referralEarn || []).map((earn, idx) => {
    const theme = getThemeForIndex(idx);
    return {
      id: earn._id || String(idx),
      vehicleType: earn.name || 'Captain',
      icon: getIconForName(earn.name || ''),
      totalAmount: earn.amount || (earn.tiers || []).reduce((acc, t) => acc + (t.amount || 0), 0),
      gradient: theme.gradient,
      borderColor: theme.borderColor,
      badgeBg: theme.badgeBg,
      badgeText: theme.badgeText,
      color: theme.color,
      steps: (earn.tiers || []).map(tier => ({
        amount: tier.amount || 0,
        label: tier.title || '',
        description: tier.subtitle || '',
      })),
    };
  });

  const activePlan = referralPlans[activePlanIdx] || referralPlans[0] || null;

  const handleCopyCode = () => {
    if (!referralCode) {
      Alert.alert('Referral code unavailable', 'Your referral code is not available yet.');
      return;
    }

    Clipboard.setString(referralCode);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleShare = async () => {
    try {
      const message = activePlan
        ? `Join Safarweel Partner! Register using my referral code: ${referralCode} and earn up to ₹${activePlan.totalAmount} for ${activePlan.vehicleType} milestones. Download the app now!`
        : `Join Safarweel Partner! Register using my referral code: ${referralCode}. Download the app now!`;
      await Share.share({ message });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader title="Refer & Earn" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Code Box */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>YOUR REFERRAL CODE</Text>
          <View style={[styles.codeBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <Text style={[styles.codeText, { color: palette.text }]}>{referralCode}</Text>
            <TouchableOpacity onPress={handleCopyCode} style={[styles.copyBtn, { backgroundColor: palette.surface }]}>
              <Icon
                name={isCopied ? "checkmark-circle" : "copy-outline"}
                size={18}
                color={isCopied ? palette.success : palette.text}
              />
            </TouchableOpacity>
          </View>

          <Button
            label={`Share ${activePlan ? `${activePlan.vehicleType} ` : ''}Invite`}
            leftSlot={<Icon name="share-social-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
            onPress={handleShare}
            height={48}
            borderRadius={14}
          />
        </View>

        {referralEarnLoading ? (
          <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 24 }} />
        ) : referralPlans.length > 0 ? (
          <View style={styles.plansSection}>
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
                if (index !== activePlanIdx && index >= 0 && index < referralPlans.length) {
                  setActivePlanIdx(index);
                }
              }}
              scrollEventThrottle={16}
              contentContainerStyle={styles.plansListContainer}
            >
              {referralPlans.map((plan) => (
                <LinearGradient
                  key={plan.id}
                  colors={plan.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.planCard,
                    {
                      width: CARD_WIDTH,
                      borderColor: plan.borderColor,
                      shadowColor: plan.color,
                    },
                  ]}
                >
                  <View>
                    <View style={styles.planCardTop}>
                      <View style={[styles.planBadge, { backgroundColor: plan.badgeBg }]}>
                        <Icon name={plan.icon} size={14} color={plan.badgeText} />
                        <Text style={[styles.planBadgeText, { color: plan.badgeText }]}>{plan.vehicleType}</Text>
                      </View>
                      <Text style={[styles.planAmountText, { color: palette.text }]}>₹{plan.totalAmount}</Text>
                    </View>

                    <Text style={[styles.planTitle, { color: palette.text }]}>
                      Refer a {plan.vehicleType}
                    </Text>
                    <Text style={[styles.planDesc, { color: palette.mutedText }]}>
                      Earn up to ₹{plan.totalAmount} directly credited to your wallet in verified milestone steps.
                    </Text>
                  </View>
                </LinearGradient>
              ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
              {referralPlans.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === activePlanIdx
                      ? [styles.activeDot, { backgroundColor: palette.primary }]
                      : [styles.inactiveDot, { backgroundColor: palette.border }],
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPlansBox}>
            <Text style={[styles.emptyPlansText, { color: palette.mutedText }]}>No active referral schemes available.</Text>
          </View>
        )}

        {/* Step Timeline Detail */}
        {activePlan && (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              How Rewards are Distributed ({activePlan.vehicleType})
            </Text>

            <View style={styles.timelineWrapper}>
              <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />

              {activePlan.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepCircle,
                      { backgroundColor: activePlan.color, borderColor: palette.surface },
                    ]}
                  >
                    <Text style={styles.stepCircleText}>{idx + 1}</Text>
                  </View>

                  <View style={styles.stepContent}>
                    <View style={styles.stepHeader}>
                      <Text style={[styles.stepLabel, { color: palette.text }]}>{step.label}</Text>
                      <Text style={[styles.stepAmount, { color: activePlan.color }]}>₹{step.amount}</Text>
                    </View>
                    <Text style={[styles.stepDesc, { color: palette.mutedText }]}>
                      {step.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Your Referral Stats</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <Text style={[styles.statBoxLabel, { color: palette.mutedText }]}>TOTAL REFERRALS</Text>
              <Text style={[styles.statBoxValue, { color: palette.text }]}>{totalReferrals}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <Text style={[styles.statBoxLabel, { color: palette.mutedText }]}>TOTAL EARNED</Text>
              <Text style={[styles.statBoxValue, { color: palette.success }]}>₹{referralEarnings}</Text>
            </View>
          </View>

          {/* Referral List */}
          <Text style={[styles.recentReferralsLabel, { color: palette.mutedText }]}>Recent Referrals</Text>

          <View style={[styles.referralsList, { borderTopColor: palette.border }]}>
            {referralsLoading ? (
              <ActivityIndicator size="small" color={palette.primary} style={{ marginVertical: 20 }} />
            ) : referrals.length === 0 ? (
              <View style={styles.emptyReferralsBox}>
                <Text style={[styles.emptyReferralsText, { color: palette.mutedText }]}>
                  No referrals found yet. Share your code to start earning!
                </Text>
              </View>
            ) : (
              referrals.map((item) => {
                const dateStr = getRelativeTime(item.createdAt);

                let statusText = 'Pending Verification';
                let statusBg = 'rgba(245, 158, 11, 0.12)';
                let statusColor = palette.warning;

                if (item.isApproved) {
                  if (item.role === 'rider') {
                    statusText = 'Signup Verified';
                    statusBg = 'rgba(34, 197, 94, 0.12)';
                    statusColor = palette.success;
                  } else {
                    let dailyTarget = 3;
                    let weeklyTarget = 15;

                    if (item.vehicleType === 'auto') {
                      dailyTarget = 5;
                      weeklyTarget = 20;
                    } else if (item.vehicleType === 'car') {
                      dailyTarget = 8;
                      weeklyTarget = 30;
                    }

                    const rides = item.ridesCompleted || 0;
                    if (rides < dailyTarget) {
                      statusText = `(${rides}`;
                      statusBg = 'rgba(245, 158, 11, 0.12)';
                      statusColor = palette.warning;
                    } else if (rides < weeklyTarget) {
                      statusText = `${rides}`;
                      statusBg = 'rgba(79, 70, 229, 0.12)';
                      statusColor = palette.primary;
                    } else {
                      statusText = 'All Milestones Met';
                      statusBg = 'rgba(34, 197, 94, 0.12)';
                      statusColor = palette.success;
                    }
                  }
                }

                return (
                  <View key={item.id} style={[styles.referralItemRow, { borderBottomColor: palette.border }]}>
                    <View style={styles.referralItemLeft}>
                      <Text style={[styles.referralItemName, { color: palette.text }]}>{item.name}</Text>
                      <Text style={[styles.referralItemSubtext, { color: palette.mutedText }]}>
                        Registered: {dateStr} • {item.role === 'driver' ? 'Captain' : 'Rider'}
                      </Text>
                    </View>
                    <View style={[styles.referralStatusPill, { backgroundColor: statusBg }]}>
                      <Text style={[styles.referralStatusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,

  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  copyBtn: {
    padding: 8,
    borderRadius: 10,
  },
  shareBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  plansSection: {
    marginBottom: 16,
  },
  plansListContainer: {
    paddingHorizontal: 8,
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planAmountText: {
    fontSize: 22,
    fontWeight: '900',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
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
  emptyPlansBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyPlansText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 16,
  },
  timelineWrapper: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 8,
    bottom: 24,
    width: 2,
    zIndex: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 3,
  },
  stepCircleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
    marginTop: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepAmount: {
    fontSize: 13,
    fontWeight: '900',
  },
  stepDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  recentReferralsLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  referralsList: {
    borderTopWidth: 1,
  },
  emptyReferralsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyReferralsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  referralItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  referralItemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  referralItemName: {
    fontSize: 13,
    fontWeight: '800',
  },
  referralItemSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  referralStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  referralStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

export default ReferralScreen;
