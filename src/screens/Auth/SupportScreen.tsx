import React, { useState, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { ROUTES } from '../../constants/routes';
import { useThemePalette } from '../../utils/theme';
import { COLORS } from '../../constants/colors';

interface FAQItem {
  id: string;
  question: string;
  subtext: string;
  answer: (palette: any) => React.ReactNode;
  iconName: string;
  iconColor: string;
  iconBg: string;
  darkIconBg: string;
}

const SupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';
  const insets = useSafeAreaInsets();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const faqSectionY = useRef<number>(0);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+18001234567').catch(() => {
      Alert.alert('Error', 'Unable to make calls on this device');
    });
  };

  const handleHelpCenter = () => {
    setSearchQuery('');
    setShowAll(true);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: faqSectionY.current, animated: true });
    }
  };

  const handleVideoTutorials = () => {
    navigation.navigate(ROUTES.RIDE_GUIDE as any);
  };

  const faqItems: FAQItem[] = [
    {
      id: 'register',
      question: 'How can I register as a new Partner?',
      subtext: 'Step by step process to join Safarweel',
      iconName: 'person-add-outline',
      iconColor: palette.primary,
      iconBg: 'rgba(79, 70, 229, 0.12)',
      darkIconBg: 'rgba(79, 70, 229, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>To register as a new Partner, follow these steps:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Enter your mobile number.',
              'Verify your mobile number via OTP.',
              'Enter referral code, if you have one.',
              'Select the city you want to ride in.',
              'Upload your driving license, vehicle RC, Aadhar/PAN card and profile photo.',
              'Wait for 24-48 hours for account verification and activation.',
            ].map((stepText, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{stepText}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.faqBoldHeader, { color: pal.text, marginTop: 14, marginBottom: 6 }]}>Documents checklist:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Driving License (DL)',
              'Vehicle Registration Certificate (RC)',
              'Aadhar Card & PAN Card',
            ].map((docText, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>-</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{docText}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'unable_to_login',
      question: 'I am unable to login',
      subtext: 'Fix login and OTP issues',
      iconName: 'lock-closed-outline',
      iconColor: palette.success,
      iconBg: 'rgba(34, 197, 94, 0.12)',
      darkIconBg: 'rgba(34, 197, 94, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>If you are facing login issues, try the following steps:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Verify that you are using your registered mobile number.',
              'Ensure you have a strong network connection to receive the OTP SMS.',
              'Restart the application and check for updates in the Play Store.',
              'If issues persist, reach out to our helpdesk at support@safarweel.com.',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'documents_rejected',
      question: 'Documents verification failed',
      subtext: 'Reasons and solution',
      iconName: 'document-text-outline',
      iconColor: palette.warning,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      darkIconBg: 'rgba(245, 158, 11, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>Documents are rejected when details are not readable. To resolve this:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Ensure the document is completely inside the camera frame.',
              'Ensure there is no reflection or glare blocking the text.',
              'Please re-upload a clean, bright, and legible picture of the rejected document.',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'payments_faq',
      question: 'How do I receive my payments?',
      subtext: 'Payment cycle and modes',
      iconName: 'wallet-outline',
      iconColor: palette.primary,
      iconBg: 'rgba(79, 70, 229, 0.12)',
      darkIconBg: 'rgba(79, 70, 229, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>
            Safarweel processes payments automatically to your linked bank account.
          </Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Daily payouts are transferred for online payments and bonuses.',
              'Ensure your bank details or UPI ID are correctly set up in the Payout Settings.',
              'Cash payments made by riders are directly retained by you.',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'trip_issues_faq',
      question: 'Facing issues during a trip',
      subtext: 'What to do if something goes wrong',
      iconName: 'alert-circle-outline',
      iconColor: palette.destructive,
      iconBg: 'rgba(239, 68, 68, 0.12)',
      darkIconBg: 'rgba(239, 68, 68, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>If you face any issues during a trip, keep these protocols in mind:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'For safety emergencies, tap the SOS/Emergency button on the map screen immediately.',
              'For vehicle breakdown, inform the passenger, cancel/end the trip, and contact support to arrange a replacement.',
              'For navigation issues, ask the rider for directions or restart your Google Maps navigation.',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'unable_to_upload_documents',
      question: 'I am unable to upload any documents',
      subtext: 'Help with uploading photos and documents',
      iconName: 'cloud-upload-outline',
      iconColor: palette.primary,
      iconBg: 'rgba(79, 70, 229, 0.12)',
      darkIconBg: 'rgba(79, 70, 229, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>If document uploads are failing, check these guidelines:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Make sure the file format is PNG, JPG, or JPEG.',
              'Keep the document image size under 5MB.',
              'Ensure that the app has permission to access your Camera & Storage (go to Device Settings > Apps > Safarweel Partner > Permissions).',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
    {
      id: 'account_not_activated',
      question: 'Account activation troubleshooting',
      subtext: 'Activation timeline and troubleshooting',
      iconName: 'shield-checkmark-outline',
      iconColor: palette.success,
      iconBg: 'rgba(34, 197, 94, 0.12)',
      darkIconBg: 'rgba(34, 197, 94, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.bulletText, { color: pal.mutedText, lineHeight: 20 }]}>
            Normally, review and verification of documents take 24 to 48 hours. If this duration has passed:
            {"\n\n"}
            1. Go back to the Document Center to check if any of your documents have a "rejected" status.
            {"\n"}
            2. If any document is rejected, re-upload it with clear visibility.
            {"\n"}
            3. If all documents show approved and it's still not activated, please click the support button to chat with our verification desk.
          </Text>
        </View>
      ),
    },
    {
      id: 'no_documents',
      question: 'I do not have the required documents',
      subtext: 'What to do if documents are missing',
      iconName: 'ban-outline',
      iconColor: palette.warning,
      iconBg: 'rgba(245, 158, 11, 0.12)',
      darkIconBg: 'rgba(245, 158, 11, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.bulletText, { color: pal.mutedText, lineHeight: 20 }]}>
            To register as a Partner on Safarweel, having a valid Driving License, Vehicle RC, and Aadhaar/PAN Card is mandatory. We cannot activate your account without verifying these legal, government-issued documents.
          </Text>
        </View>
      ),
    },
    {
      id: 'unable_to_view_videos',
      question: 'I am unable to view training videos',
      subtext: 'Fix video loading and playback issues',
      iconName: 'play-circle-outline',
      iconColor: palette.primary,
      iconBg: 'rgba(79, 70, 229, 0.12)',
      darkIconBg: 'rgba(79, 70, 229, 0.25)',
      answer: (pal) => (
        <View>
          <Text style={[styles.faqBoldHeader, { color: pal.text }]}>If training videos fail to play, try the following solutions:</Text>
          <View style={{ paddingLeft: 4 }}>
            {[
              'Check if you have an active internet pack with speed above 2 Mbps.',
              'Try clearing the application\'s cache inside Android settings.',
              'Restart your mobile device and open Safarweel Partner again.',
            ].map((text, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: pal.text }]}>•</Text>
                <Text style={[styles.bulletText, { color: pal.mutedText }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
    },
  ];

  const filteredItems = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtext.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedItems = searchQuery
    ? filteredItems
    : (showAll ? faqItems : faqItems.slice(0, 5));

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Blue Gradient Header */}
        <LinearGradient
          colors={COLORS.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroHeader,
            { paddingTop: insets.top + 8 },
          ]}
        >
          {/* Header Controls */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Icon name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View pointerEvents="none" style={styles.headerTitleAbsolute}>
              <Text style={styles.headerTitleText}>Support</Text>
            </View>

            <View style={{ width: 40, height: 40 }} />
          </View>

          {/* Header Content */}
          <View style={styles.headerContentRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.greetingTitle}>Hi Partner! 👋</Text>
              <Text style={styles.greetingSubtext}>
                How can we help{'\n'}you today?
              </Text>
            </View>
            <Image
              source={require('../../assets/images/support_headphones.png')}
              style={{ width: 100, height: 95 }}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Floating Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Icon name="search-outline" size={20} color={palette.mutedText} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search for help topics..."
              placeholderTextColor={palette.mutedText}
              style={[styles.searchInput, { color: palette.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={palette.mutedText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Help Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Help</Text>
          <TouchableOpacity style={styles.viewAllRow} onPress={handleHelpCenter}>
            <Text style={[styles.viewAllText, { color: palette.primary }]}>View all</Text>
            <Icon name="chevron-forward" size={14} color={palette.primary} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Side-by-Side Quick Help Cards */}
        <View style={styles.quickHelpGrid}>
          {/* Card 1: Chat with us */}
          <TouchableOpacity
            style={[styles.quickHelpCard, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.25)' }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.LIVE_CHAT as any)}
          >
            <View style={[styles.quickHelpIconCircle, { backgroundColor: '#00B050' }]}>
              <Icon name="chatbubble-ellipses" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickHelpTextWrapper}>
              <Text numberOfLines={2} style={[styles.quickHelpTitle, { color: palette.text }]}>
                Chat with us
              </Text>
              <Text numberOfLines={1} style={[styles.quickHelpSubtitle, { color: palette.success }]}>
                Instant support
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Call Support */}
          <TouchableOpacity
            style={[styles.quickHelpCard, { backgroundColor: 'rgba(79, 70, 229, 0.12)', borderColor: 'rgba(79, 70, 229, 0.25)' }]}
            activeOpacity={0.8}
            onPress={handleCallSupport}
          >
            <View style={[styles.quickHelpIconCircle, { backgroundColor: '#fe4c01' }]}>
              <Icon name="call" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickHelpTextWrapper}>
              <Text numberOfLines={2} style={[styles.quickHelpTitle, { color: palette.text }]}>
                Call Support
              </Text>
              <Text numberOfLines={1} style={[styles.quickHelpSubtitle, { color: palette.primary }]}>
                Talk to expert
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Help Center */}
          <TouchableOpacity
            style={[styles.quickHelpCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}
            activeOpacity={0.8}
            onPress={handleHelpCenter}
          >
            <View style={[styles.quickHelpIconCircle, { backgroundColor: '#F97316' }]}>
              <Icon name="document-text" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickHelpTextWrapper}>
              <Text numberOfLines={2} style={[styles.quickHelpTitle, { color: palette.text }]}>
                Help Center
              </Text>
              <Text numberOfLines={1} style={[styles.quickHelpSubtitle, { color: palette.warning }]}>
                Guides & FAQ
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Video Tutorials */}
          <TouchableOpacity
            style={[styles.quickHelpCard, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}
            activeOpacity={0.8}
            onPress={handleVideoTutorials}
          >
            <View style={[styles.quickHelpIconCircle, { backgroundColor: '#2563EB' }]}>
              <Icon name="play" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
            <View style={styles.quickHelpTextWrapper}>
              <Text numberOfLines={2} style={[styles.quickHelpTitle, { color: palette.text }]}>
                Video
              </Text>
              <Text numberOfLines={1} style={[styles.quickHelpSubtitle, { color: '#2563EB' }]}>
                Watch & learn
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Popular Questions Section */}
        <View
          onLayout={(event) => {
            faqSectionY.current = event.nativeEvent.layout.y;
          }}
          style={styles.faqSection}
        >
          <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 12 }]}>
            {searchQuery ? 'Search Results' : 'Popular Questions'}
          </Text>

          {displayedItems.length === 0 ? (
            <View style={[styles.emptyFaqCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Icon name="search-outline" size={32} color={palette.mutedText} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyFaqTitle, { color: palette.text }]}>
                No matching questions found
              </Text>
              <Text style={[styles.emptyFaqSubtext, { color: palette.mutedText }]}>
                Try searching for other terms or view categories
              </Text>
            </View>
          ) : (
            displayedItems.map(item => {
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.faqCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqLeftRow}>
                      <View
                        style={[
                          styles.faqIconCircle,
                          { backgroundColor: isDark ? item.darkIconBg : item.iconBg },
                        ]}
                      >
                        <Icon name={item.iconName} size={20} color={item.iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.faqQuestionText, { color: palette.text }]}>
                          {item.question}
                        </Text>
                        <Text style={[styles.faqSubtext, { color: palette.mutedText }]}>
                          {item.subtext}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={18}
                      color={palette.mutedText}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.faqAnswerBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                      {item.answer(palette)}
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Toggle All Questions button */}
          {!searchQuery && faqItems.length > 5 && (
            <TouchableOpacity
              style={styles.toggleAllBtn}
              onPress={() => setShowAll(prev => !prev)}
            >
              <Text style={[styles.toggleAllBtnText, { color: palette.primary }]}>
                {showAll ? 'View less questions' : 'View all questions'}
              </Text>
              <Icon
                name={showAll ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={palette.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Banner Support Card */}
        <View style={[styles.bannerCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.25)' }]}>
          <View style={styles.bannerLeftRow}>
            <Image
              source={require('../../assets/images/support_agent2.png')}
              style={{ width: 68, height: 68 }}
              resizeMode="contain"
            />
            <View style={styles.bannerTextFlex}>
              <Text style={[styles.bannerTitleText, { color: palette.text }]}>
                Still need help?
              </Text>
              <Text style={[styles.bannerSubtext, { color: palette.mutedText }]}>
                Our support team is here for you 24x7
              </Text>
              <View style={[styles.bannerTimePill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Icon name="time-outline" size={10} color={palette.success} style={{ marginRight: 4 }} />
                <Text style={[styles.bannerTimeText, { color: palette.success }]}>
                  Average reply time: <Text style={{ fontWeight: '800' }}>Under 2 min</Text>
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startChatBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.LIVE_CHAT as any)}
          >
            <Icon name="chatbubble-ellipses" size={14} color="#FFFFFF" />
            <Text style={styles.startChatBtnText}>
              Start Chat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroHeader: {
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerTitleAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  greetingSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickHelpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  quickHelpCard: {
    width: '23%',
    height: 96,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  quickHelpIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  quickHelpTextWrapper: {
    alignItems: 'center',
    marginTop: 4,
  },
  quickHelpTitle: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  quickHelpSubtitle: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  faqSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  emptyFaqCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyFaqTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyFaqSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.04,
    // shadowRadius: 3,
    // elevation: 1,
  },
  faqLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  faqIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  faqSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  faqAnswerBox: {
    padding: 16,
    borderRadius: 16,
    marginTop: 6,
    borderWidth: 1,
  },
  faqBoldHeader: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  toggleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  toggleAllBtnText: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 4,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  bannerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bannerTextFlex: {
    flex: 1,
    marginLeft: 10,
  },
  bannerTitleText: {
    fontSize: 14,
    fontWeight: '900',
  },
  bannerSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  bannerTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  bannerTimeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  startChatBtn: {
    backgroundColor: '#00B050',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startChatBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
  },
});

export default SupportScreen;
