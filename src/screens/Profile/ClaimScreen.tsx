import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';

const ClaimScreen: React.FC = () => {
  const navigation = useNavigation();
  const { palette } = useThemePalette();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader title="Claims" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Claim Rules & Vehicle Limits (T&C) */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.cardHeaderRow}>
            <Icon name="information-circle" size={20} color={palette.primary} />
            <Text style={[styles.cardTitleText, { color: palette.text }]}>Claim Policy & Limits</Text>
          </View>

          <Text style={[styles.cardSubtext, { color: palette.mutedText }]}>
            Different vehicle categories have predefined maximum reimbursement limits for tolls and fare-related claims.
          </Text>

          {/* Limits Breakdown */}
          <View style={styles.limitsList}>
            {/* Bike */}
            <View style={[styles.limitItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.limitLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Icon name="bicycle-outline" size={16} color="#3B82F6" />
                </View>
                <View>
                  <Text style={[styles.vehicleTitle, { color: palette.text }]}>Bike</Text>
                  <Text style={[styles.vehicleSubtitle, { color: palette.mutedText }]}>Two Wheeler</Text>
                </View>
              </View>
              <View style={styles.limitRight}>
                <Text style={[styles.limitMaxText, { color: '#3B82F6' }]}>Max ₹50/trip</Text>
                <Text style={[styles.limitDailyText, { color: palette.mutedText }]}>Daily Max ₹150</Text>
              </View>
            </View>

            {/* E-Rickshaw / Auto */}
            <View style={[styles.limitItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.limitLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Icon name="car-sport-outline" size={16} color="#D97706" />
                </View>
                <View>
                  <Text style={[styles.vehicleTitle, { color: palette.text }]}>E-Rickshaw & Auto</Text>
                  <Text style={[styles.vehicleSubtitle, { color: palette.mutedText }]}>Three Wheeler</Text>
                </View>
              </View>
              <View style={styles.limitRight}>
                <Text style={[styles.limitMaxText, { color: '#D97706' }]}>Max ₹80/trip</Text>
                <Text style={[styles.limitDailyText, { color: palette.mutedText }]}>Daily Max ₹240</Text>
              </View>
            </View>

            {/* Car */}
            <View style={[styles.limitItem, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={styles.limitLeft}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Icon name="car-outline" size={16} color={palette.success} />
                </View>
                <View>
                  <Text style={[styles.vehicleTitle, { color: palette.text }]}>Car & Cab</Text>
                  <Text style={[styles.vehicleSubtitle, { color: palette.mutedText }]}>Four Wheeler</Text>
                </View>
              </View>
              <View style={styles.limitRight}>
                <Text style={[styles.limitMaxText, { color: palette.success }]}>Max ₹150/trip</Text>
                <Text style={[styles.limitDailyText, { color: palette.mutedText }]}>Daily Max ₹450</Text>
              </View>
            </View>
          </View>

          {/* Terms Checklist */}
          <View style={[styles.termsSection, { borderTopColor: palette.border }]}>
            <Text style={[styles.termsHeaderTitle, { color: palette.text }]}>Terms & Conditions</Text>

            <View style={styles.termRow}>
              <Icon name="checkmark-circle-outline" size={15} color={palette.success} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Submit claims within <Text style={[styles.boldTermText, { color: palette.text }]}>24 hours</Text> of trip completion.
              </Text>
            </View>

            <View style={styles.termRow}>
              <Icon name="checkmark-circle-outline" size={15} color={palette.success} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Valid receipt or digital payment proof with date & time match is mandatory.
              </Text>
            </View>

            <View style={styles.termRow}>
              <Icon name="checkmark-circle-outline" size={15} color={palette.success} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Approved amount credited directly to driver wallet in 24-48 hours.
              </Text>
            </View>
          </View>
        </View>

        {/* Accidental & Life Insurance Coverage (T&C) */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.cardHeaderRow}>
            <Icon name="shield-checkmark" size={20} color={palette.primary} />
            <Text style={[styles.cardTitleText, { color: palette.text }]}>Accidental Insurance</Text>
          </View>

          <Text style={[styles.cardSubtext, { color: palette.mutedText }]}>
            Free insurance coverage is provided to all active Partners during an ongoing ride/trip.
          </Text>

          {/* Insurance Limits Breakdown */}
          <View style={styles.insuranceList}>
            {/* Bike Insurance */}
            <View style={[styles.insuranceCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.insuranceHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.insuranceTitleLeft}>
                  <View style={[styles.miniIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Icon name="bicycle" size={14} color="#3B82F6" />
                  </View>
                  <Text style={[styles.insuranceCategoryTitle, { color: palette.text }]}>Bike Partners</Text>
                </View>
                <View style={[styles.activeInsurancePill, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Text style={[styles.activeInsurancePillText, { color: '#3B82F6' }]}>Active Insurance</Text>
                </View>
              </View>

              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Death / Disability:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>₹2,00,000</Text>
              </View>
              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Hospitalization:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>Up to ₹50,000</Text>
              </View>
            </View>

            {/* E-Rickshaw / Auto Insurance */}
            <View style={[styles.insuranceCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.insuranceHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.insuranceTitleLeft}>
                  <View style={[styles.miniIconCircle, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                    <Icon name="car-sport" size={14} color="#D97706" />
                  </View>
                  <Text style={[styles.insuranceCategoryTitle, { color: palette.text }]}>E-Rickshaw & Auto</Text>
                </View>
                <View style={[styles.activeInsurancePill, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Text style={[styles.activeInsurancePillText, { color: '#D97706' }]}>Active Insurance</Text>
                </View>
              </View>

              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Death / Disability:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>₹3,00,000</Text>
              </View>
              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Hospitalization:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>Up to ₹75,000</Text>
              </View>
            </View>

            {/* Car / Cab Insurance */}
            <View style={[styles.insuranceCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
              <View style={[styles.insuranceHeader, { borderBottomColor: palette.border }]}>
                <View style={styles.insuranceTitleLeft}>
                  <View style={[styles.miniIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Icon name="car" size={14} color={palette.success} />
                  </View>
                  <Text style={[styles.insuranceCategoryTitle, { color: palette.text }]}>Car & Cab Partners</Text>
                </View>
                <View style={[styles.activeInsurancePill, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Text style={[styles.activeInsurancePillText, { color: palette.success }]}>Active Insurance</Text>
                </View>
              </View>

              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Death / Disability:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>₹5,00,000</Text>
              </View>
              <View style={styles.insuranceDetailRow}>
                <Text style={[styles.insuranceDetailLabel, { color: palette.mutedText }]}>Accidental Hospitalization:</Text>
                <Text style={[styles.insuranceDetailValue, { color: palette.text }]}>Up to ₹1,00,000</Text>
              </View>
            </View>
          </View>

          {/* Insurance T&C */}
          <View style={[styles.termsSection, { borderTopColor: palette.border }]}>
            <Text style={[styles.termsHeaderTitle, { color: palette.text }]}>Insurance Claim Process</Text>

            <View style={styles.termRow}>
              <Icon name="help-circle-outline" size={15} color={palette.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Claims must be registered within <Text style={[styles.boldTermText, { color: palette.text }]}>7 days</Text> of the accident.
              </Text>
            </View>

            <View style={styles.termRow}>
              <Icon name="help-circle-outline" size={15} color={palette.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Official Police FIR copy and Hospital Discharge Summary are mandatory.
              </Text>
            </View>

            <View style={styles.termRow}>
              <Icon name="help-circle-outline" size={15} color={palette.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.termText, { color: palette.mutedText }]}>
                Contact Support immediately or email documents to <Text style={[styles.boldTermText, { color: palette.primary }]}>insurance@safarweel.com</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.cardHeaderRow}>
            <Icon name="chatbubbles-outline" size={20} color={palette.warning} />
            <Text style={[styles.cardTitleText, { color: palette.text }]}>Need Help?</Text>
          </View>
          <Text style={[styles.cardSubtext, { color: palette.mutedText }]}>
            Have questions regarding claim limits, payouts, or need help with a recent accident claim? Our support team is here 24/7.
          </Text>

          <Button
            label="Contact Support"
            leftSlot={<Icon name="headset-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
            onPress={() => (navigation as any).navigate(ROUTES.LIVE_CHAT as any)}
            height={48}
            borderRadius={14}
            textStyle={styles.supportBtnText}
          />
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
    borderWidth: 0.5,
    marginBottom: 16,

  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
  cardSubtext: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  limitsList: {
    marginBottom: 16,
    gap: 10,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  limitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  vehicleSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  limitRight: {
    alignItems: 'flex-end',
  },
  limitMaxText: {
    fontSize: 12,
    fontWeight: '900',
  },
  limitDailyText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  termsSection: {
    borderTopWidth: 1,
    paddingTop: 14,
  },
  termsHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  termText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  boldTermText: {
    fontWeight: '800',
  },
  insuranceList: {
    marginBottom: 16,
    gap: 10,
  },
  insuranceCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  insuranceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  insuranceTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  insuranceCategoryTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeInsurancePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeInsurancePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  insuranceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  insuranceDetailLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  insuranceDetailValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  supportBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});

export default ClaimScreen;
