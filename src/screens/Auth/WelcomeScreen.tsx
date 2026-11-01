import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import type { AuthNavProp } from '../../navigation/types';
import { useAppSelector } from '../../redux/hooks';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.64;

// Custom Slide Image Dimensions
const SLIDE_IMAGE_WIDTH = SCREEN_WIDTH;
const SLIDE_IMAGE_HEIGHT = HERO_HEIGHT;

const SLIDES = [
  {
    id: '1',
    image: require('../../assets/splash/one.png'),
    title: 'Drive & Earn',
    subtitle: 'Earn up to ',
    highlight: '₹30,000/',
    suffix: 'month',
  },
  {
    id: '2',
    image: require('../../assets/splash/two.png'),
    title: 'Flexible Hours',
    subtitle: 'Be your ',
    highlight: 'own boss',
    suffix: '',
  },
  {
    id: '3',
    image: require('../../assets/splash/three.png'),
    title: 'Instant Payouts',
    subtitle: 'Get paid ',
    highlight: 'daily',
    suffix: '',
  },
];

// Create an infinite repeated array for seamless looping
const REPEAT_COUNT = 300;
const LOOP_SLIDES = Array.from({ length: REPEAT_COUNT }, (_, repeatIdx) =>
  SLIDES.map(slide => ({
    ...slide,
    uniqueId: `${slide.id}_${repeatIdx}`,
  }))
).flat();

const START_INDEX = Math.floor(REPEAT_COUNT / 2) * SLIDES.length;

const BENEFITS = [
  {
    icon: 'shield-checkmark',
    title: 'Safe & Secure',
    subtitle: 'Your safety is\nour priority',
  },
  {
    icon: 'headset',
    title: '24/7 Support',
    subtitle: "We're here\nto help you",
  },
  {
    icon: 'star',
    title: 'Trusted Brand',
    subtitle: '10M+ Happy\nCaptains',
  },
];

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavProp<typeof ROUTES.WELCOME>>();
  const { palette } = useThemePalette();
  const isDark = useAppSelector(state => state.theme.isDark);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndexRef = useRef(START_INDEX);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // ── Hardware Back Handler (Double tap to exit on Welcome screen) ───────────
  useFocusEffect(
    useCallback(() => {
      let lastBackPress = 0;
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  // Seamless Infinite Auto Loop (every 3 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      currentIndexRef.current += 1;
      flatListRef.current?.scrollToIndex({
        index: currentIndexRef.current,
        animated: true,
      });
      setActiveIndex(currentIndexRef.current % SLIDES.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round(scrollPosition / SCREEN_WIDTH);
    if (rawIndex >= 0 && rawIndex < LOOP_SLIDES.length) {
      currentIndexRef.current = rawIndex;
      const realIndex = rawIndex % SLIDES.length;
      if (realIndex !== activeIndex) {
        setActiveIndex(realIndex);
      }
    }
  };

  const renderSlide = ({ item }: { item: (typeof LOOP_SLIDES)[0] }) => (
    <View style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT, position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={item.image}
        style={{
          width: SLIDE_IMAGE_WIDTH,
          height: SLIDE_IMAGE_HEIGHT,
        }}
        resizeMode="cover"
      />
      {/* Dark Overlay gradient for crisp text visibility */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.42)' }]} />

      {/* Slide Text */}
      <View style={styles.slideTextContainer}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <View style={styles.slideSubtitleRow}>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <Text style={[styles.slideHighlight, { color: palette.primary }]}>{item.highlight}</Text>
          {item.suffix ? <Text style={styles.slideSuffix}>{item.suffix}</Text> : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ─── HERO SLIDER SECTION ─── */}
      <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
        <FlatList
          ref={flatListRef}
          data={LOOP_SLIDES}
          renderItem={renderSlide}
          keyExtractor={item => item.uniqueId}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          initialScrollIndex={START_INDEX}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={{ height: HERO_HEIGHT }}
        />

        {/* Logo Badge */}
        <View
          style={[
            styles.logoBadge,
            {
              backgroundColor: palette.primary,
              top: Platform.OS === 'ios' ? insets.top + 10 : (StatusBar.currentHeight ?? 24) + 12,
            },
          ]}
        >
          <Text style={styles.logoGodrop}>Safarweel</Text>
          <Text style={styles.logoCaptain}>Partner</Text>
        </View>
      </View>

      {/* ─── BOTTOM CONTROLS & CONTENT SECTION ─── */}
      <View style={[styles.bottomSection, { backgroundColor: palette.background }]}>
        {/* Pagination Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: palette.primary }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Start Driving Primary Action Button */}
        <Button
          label="Start Driving"
          showArrow
          onPress={() => navigation.navigate(ROUTES.LOGIN)}
          height={52}
          borderRadius={16}
          style={{ marginVertical: 6 }}
        />

        {/* Customer Card */}
        <TouchableOpacity
          style={[
            styles.customerCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          activeOpacity={0.9}
        >
          <View style={styles.customerCardLeft}>
            <Text style={[styles.customerTitle, { color: palette.text }]}>Customer?</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.bookRideText, { color: palette.primary }]}>Book Ride</Text>
              <Icon name="arrow-forward" size={14} color={palette.primary} />
            </View>
          </View>
          <Image
            source={require('../../assets/images/customer_illustration.png')}
            style={styles.customerImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Benefits Row */}
        <View style={styles.benefitsRow}>
          {BENEFITS.map((benefit, index) => (
            <React.Fragment key={benefit.title}>
              {index > 0 && (
                <View style={[styles.benefitDivider, { backgroundColor: palette.border }]} />
              )}
              <View style={styles.benefitItem}>
                <View
                  style={[
                    styles.benefitIconCircle,
                    { backgroundColor: palette.surface },
                  ]}
                >
                  <Icon name={benefit.icon} size={15} color={palette.text} />
                </View>
                <Text style={[styles.benefitTitle, { color: palette.text }]}>
                  {benefit.title}
                </Text>
                <Text style={[styles.benefitSubtitle, { color: palette.mutedText }]}>
                  {benefit.subtitle}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── HERO ───
  heroContainer: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },

  // Logo badge
  logoBadge: {
    position: 'absolute',
    left: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoGodrop: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    fontStyle: 'italic',
    lineHeight: 12,
  },
  logoCaptain: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 22,
    marginTop: 1,
  },

  // Slide text inside slide item
  slideTextContainer: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
  },
  slideTitle: {
    fontSize: 25,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 26,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  slideSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  slideHighlight: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    marginLeft: 4,
  },
  slideSuffix: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginLeft: 4,
  },

  // ─── BOTTOM CONTROLS & CONTENT ───
  bottomSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    justifyContent: 'space-between',
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
  },
  dotInactive: {
    backgroundColor: 'rgba(150, 150, 150, 0.35)',
  },

  // Button
  startButton: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginVertical: 6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  startButtonChevron: {
    position: 'absolute',
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Customer card
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    paddingRight: 6,
    marginVertical: 6,
  },
  customerCardLeft: {
    paddingLeft: 18,
    paddingVertical: 14,
    flex: 1,
  },
  customerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  bookRideText: {
    fontSize: 13,
    fontWeight: '700',
  },
  customerImage: {
    width: 110,
    height: 75,
  },

  // Benefits
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
  },
  benefitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  benefitTitle: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: 8,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 11,
  },
  benefitDivider: {
    width: 1,
    height: 28,
    alignSelf: 'center',
    marginHorizontal: 2,
  },
});

export default WelcomeScreen;
