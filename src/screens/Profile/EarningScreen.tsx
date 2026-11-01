import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, ActivityIndicator, StatusBar, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { driverApi } from '../../api/driverApi';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency } from '../../utils/formatters';
import { useThemePalette } from '../../utils/theme';

const EarningScreen: React.FC = () => {
  const { palette } = useThemePalette();

  const earnings = useAppSelector(state => state.driver.earnings);

  const { data, isLoading } = useQuery({
    queryKey: ['earnings', 'summary'],
    queryFn: () => driverApi.getEarnings().then(r => r.data),
    staleTime: 60_000,
    placeholderData: earnings ?? undefined,
  });

  const summary = data ?? earnings;

  const StatBlock = ({ label, value, textColor }: { label: string; value: string; textColor?: string }) => (
    <View style={styles.statBlockItem}>
      <Text style={[styles.statValueText, { color: textColor || palette.text }]}>{value}</Text>
      <Text style={[styles.statLabelText, { color: palette.mutedText }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader title="Earnings" />

      {isLoading && !summary ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={[styles.loadingText, { color: palette.mutedText }]}>Loading earnings summary...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Hero Card */}
          <View
            style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={[styles.glowCircleBg, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]} />

            <Text style={[styles.heroLabel, { color: palette.mutedText }]}>TOTAL EARNED (THIS MONTH)</Text>
            <Text style={[styles.heroAmount, { color: palette.text }]}>
              {formatCurrency(summary?.monthly ?? 0)}
            </Text>

            <View style={[styles.heroFooter, { borderTopColor: palette.border }]}>
              <View style={[styles.payoutBadge, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <Icon name="trending-up" size={14} color={palette.success} />
                <Text style={[styles.payoutBadgeText, { color: palette.success }]}>Payout Safe</Text>
              </View>
              <Text style={[styles.payoutSubtext, { color: palette.mutedText }]}>Automatic settlement every Monday</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <StatBlock
              label="Today"
              value={formatCurrency(summary?.today ?? 0)}
              textColor={palette.success}
            />
            <View style={[styles.verticalDivider, { backgroundColor: palette.border }]} />
            <StatBlock
              label="Weekly"
              value={formatCurrency(summary?.weekly ?? 0)}
              textColor={palette.primary}
            />
            <View style={[styles.verticalDivider, { backgroundColor: palette.border }]} />
            <StatBlock
              label="Total Trips"
              value={String(summary?.totalTrips ?? 0)}
              textColor={palette.text}
            />
          </View>

          {/* Average Rating & Performance */}
          <View style={[styles.ratingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.ratingLeft}>
              <View style={[styles.starIconBadge, { backgroundColor: palette.background }]}>
                <Icon name="star" size={20} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.ratingTitle, { color: palette.text }]}>Average Rating</Text>
                <Text style={[styles.ratingSubtext, { color: palette.mutedText }]}>Based on rated trips</Text>
              </View>
            </View>
            <Text style={[styles.ratingBigValue, { color: palette.text }]}>
              {summary?.avgRating?.toFixed(1) ?? '5.0'}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,

  },
  glowCircleBg: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 8,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  payoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  payoutBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  payoutSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 10,
  },
  statsCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    marginBottom: 16,
  },
  statBlockItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  statValueText: {
    fontSize: 17,
    fontWeight: '900',
  },
  statLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  verticalDivider: {
    width: 1,
    height: 32,
  },
  ratingCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    marginBottom: 16,

  },
  ratingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  ratingSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  ratingBigValue: {
    fontSize: 24,
    fontWeight: '900',
  },
});

export default EarningScreen;
