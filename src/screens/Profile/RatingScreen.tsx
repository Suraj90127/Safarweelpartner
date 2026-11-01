import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchDriverRatingThunk } from '../../redux/slices/driverSlice';
import { useThemePalette } from '../../utils/theme';

interface FAQItem {
  question: string;
  answer: string;
}

const RatingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { palette } = useThemePalette();

  const driver = useAppSelector(state => state.driver.profile);
  const ratingDetails = useAppSelector(state => state.driver.ratingDetails);
  const loading = useAppSelector(state => state.driver.ratingLoading);
  const ratingError = useAppSelector(state => state.driver.ratingError);

  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchDriverRatingThunk());
  }, [dispatch]);

  useEffect(() => {
    if (ratingError) {
      Alert.alert('Error', ratingError);
    }
  }, [ratingError]);

  const ratingValue = ratingDetails ? ratingDetails.averageRating : (driver?.rating ?? 5.0);
  const formattedRating = typeof ratingValue === 'number' ? ratingValue.toFixed(1) : '5.0';

  const totalCount = ratingDetails?.totalCount ?? 0;
  const ordersLabel = totalCount > 0
    ? `In Last ${Math.min(totalCount, 10)} Rated Orders`
    : 'No Rated Orders Yet';

  const ratingDistribution = ratingDetails?.distribution ?? [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const faqData: FAQItem[] = [
    {
      question: 'How is my Rating Calculated?',
      answer: 'Your rating is calculated as the average of the customer ratings from your last 10 rated orders. It ranges from 1 star (lowest) to 5 stars (highest).'
    },
    {
      question: 'What happens if my rating falls too low?',
      answer: 'To ensure a high-quality experience, Safarweel Partners should maintain a rating above 4.3. If your rating drops below 4.0, your account may be flagged for review or temporary suspension.'
    },
    {
      question: 'How can I get more 5-star ratings?',
      answer: 'Ensure you always wear your helmet, carry a clean spare helmet for the passenger, follow safety and traffic rules, be polite, and check drop-off preferences.'
    },
  ];

  const handleToggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleWatchVideo = () => {
    setIsVideoModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={palette.statusBarStyle} backgroundColor={palette.background} />
      <ScreenHeader title="Rating" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Rating and Distribution Card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.mutedText }]}>
                Loading rating details...
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.ratingHeaderRow}>
                <Text style={[styles.ratingBigText, { color: palette.text }]}>
                  {formattedRating}
                </Text>
                <Icon name="star" size={32} color="#F59E0B" style={{ marginLeft: 8 }} />
              </View>

              <View style={[styles.distributionSection, { borderTopColor: palette.border }]}>
                <Text style={[styles.ordersLabelText, { color: palette.text }]}>
                  {ordersLabel}
                </Text>

                {/* Progress Bars */}
                <View style={styles.progressList}>
                  {ratingDistribution.map((item) => (
                    <View key={item.stars} style={styles.progressRow}>
                      <View style={styles.starNumLabel}>
                        <Text style={[styles.starNumText, { color: palette.mutedText }]}>
                          {item.stars}
                        </Text>
                        <Icon name="star" size={11} color={palette.mutedText} />
                      </View>

                      <View style={[styles.trackBg, { backgroundColor: palette.background }]}>
                        <View
                          style={[
                            styles.trackFill,
                            { width: `${item.percentage}%`, backgroundColor: palette.primary },
                          ]}
                        />
                      </View>

                      <Text style={[styles.countText, { color: palette.mutedText }]}>
                        {item.count} {item.count === 1 ? 'Order' : 'Orders'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Video Tutorial Card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, padding: 0, overflow: 'hidden' }]}>
          {/* Banner Image */}
          <View style={styles.bannerWrapper}>
            <Image
              source={require('../../assets/images/captain_training_banner.png')}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {/* Play Button Overlay */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleWatchVideo}
              style={styles.playOverlay}
            >
              <View style={styles.playIconBtn}>
                <Icon name="play" size={28} color="#000000" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitleText, { color: palette.text }]}>
              Get More Earnings by becoming the Best Partner!
            </Text>

            <TouchableOpacity
              onPress={handleWatchVideo}
              activeOpacity={0.8}
              style={[styles.watchBtn, { backgroundColor: palette.background, borderColor: palette.primary }]}
            >
              <Text style={[styles.watchBtnText, { color: palette.primary }]}>Watch Video</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Accordion Section */}
        <View style={styles.faqSection}>
          <Text style={[styles.faqSectionTitle, { color: palette.text }]}>
            Important Questions
          </Text>

          <View style={[styles.faqCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {faqData.map((item, index) => {
              const isExpanded = expandedFAQ === index;
              const isLastItem = index === faqData.length - 1;

              return (
                <View
                  key={index}
                  style={!isLastItem ? [styles.faqBorderBottom, { borderBottomColor: palette.border }] : undefined}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleFAQ(index)}
                    style={styles.faqHeaderBtn}
                  >
                    <Text style={[styles.faqQuestionText, { color: palette.text }]}>
                      {item.question}
                    </Text>
                    <Icon
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={palette.mutedText}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.faqAnswerBox, { backgroundColor: palette.background }]}>
                      <Text style={[styles.faqAnswerText, { color: palette.mutedText }]}>
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Video Simulated Modal */}
      <Modal
        visible={isVideoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVideoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.videoModalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {/* Modal Header */}
            <View style={[styles.videoModalHeader, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
              <Text style={[styles.videoModalTitle, { color: palette.text }]}>Safarweel Partner Training</Text>
              <TouchableOpacity onPress={() => setIsVideoModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={22} color={palette.text} />
              </TouchableOpacity>
            </View>

            {/* Video Screen Simulation */}
            <View style={styles.videoSimScreen}>
              <View style={styles.videoSimOverlay}>
                <Icon name="play-circle" size={64} color={palette.primary} />
                <Text style={styles.videoSimText}>
                  Streaming tutorial video...
                </Text>
              </View>
            </View>

            {/* Video Details */}
            <View style={styles.videoModalBody}>
              <Text style={[styles.videoDetailTitle, { color: palette.text }]}>
                5-Star Partner Guidelines
              </Text>
              <Text style={[styles.videoDetailSubtext, { color: palette.mutedText }]}>
                Learn the best communication tips, safety protocols, and route management strategies
                to maintain perfect customer ratings and maximize your daily bonuses.
              </Text>

              <TouchableOpacity
                onPress={() => setIsVideoModalVisible(false)}
                style={[styles.closePlayerBtn, { backgroundColor: palette.primary }]}
                activeOpacity={0.88}
              >
                <Text style={styles.closePlayerBtnText}>Close Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1.5,
  },
  loadingWrapper: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBigText: {
    fontSize: 44,
    fontWeight: '900',
  },
  distributionSection: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  ordersLabelText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  progressList: {
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starNumLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 28,
  },
  starNumText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 2,
  },
  trackBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    width: 68,
    textAlign: 'right',
  },
  bannerWrapper: {
    height: 170,
    position: 'relative',
    backgroundColor: '#000',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    padding: 16,
    alignItems: 'center',
  },
  bannerTitleText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  watchBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  faqSection: {
    marginBottom: 24,
  },
  faqSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    marginLeft: 4,
  },
  faqCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqBorderBottom: {
    borderBottomWidth: 1,
  },
  faqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    paddingRight: 12,
  },
  faqAnswerBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  videoModalCard: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    borderWidth: 1,
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  videoModalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  videoSimScreen: {
    height: 220,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoSimOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSimText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  videoModalBody: {
    padding: 20,
  },
  videoDetailTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  videoDetailSubtext: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  closePlayerBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePlayerBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
});

export default RatingScreen;
