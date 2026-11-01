import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ROUTES } from '../../constants/routes';
import { COLORS } from '../../constants/colors';
import mmkvService from '../../services/storage/mmkvService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useAppSelector } from '../../redux/hooks';
import { useThemePalette } from '../../utils/theme';
import { Button } from '../../components/Button';

const LANGUAGES = [
  // { id: 'hi', name: 'हिन्दी', native: 'हिन्दी', englishName: 'HINDI' },
  { id: 'en', name: 'English', native: 'English', englishName: 'ENGLISH' },
  // { id: 'te', name: 'తెలుగు', native: 'తెలుగు', englishName: 'TELUGU' },
  // { id: 'kn', name: 'ಕನ್ನಡ', native: 'ಕನ್ನಡ', englishName: 'KANNADA' },
  // { id: 'ta', name: 'தமிழ்', native: 'தமிழ்', englishName: 'TAMIL' },
  // { id: 'bn', name: 'বাংলা', native: 'বাংলা', englishName: 'BENGALI' },
  // { id: 'mr', name: 'मराठी', native: 'मराठी', englishName: 'MARATHI' },
  // { id: 'ml', name: 'മലയാളം', native: 'മലയാളം', englishName: 'MALAYALAM' },
];

const LanguageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isChanging = route.params?.isChanging;
  const [selectedLang, setSelectedLang] = useState('en');
  const { palette } = useThemePalette();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  React.useEffect(() => {
    if (isChanging || !isAuthenticated) return;
    const hasLang = mmkvService.getString(STORAGE_KEYS.LANGUAGE);
    if (hasLang) {
      const isOnboardingComplete = mmkvService.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE);
      const isProfileSetup = mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE);
      const isDlUploaded = mmkvService.getBoolean(STORAGE_KEYS.DL_UPLOADED);

      if (!isProfileSetup) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.PROFILE_SETUP }]
        });
      } else if (!isDlUploaded) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DL_UPLOAD }]
        });
      } else if (!isOnboardingComplete) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DOCUMENT_CENTER }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.MAIN_TABS }]
        });
      }
    }
  }, [navigation, isChanging, isAuthenticated]);

  const handleSelectLanguage = (langId: string) => {
    setSelectedLang(langId);
  };

  const handleConfirm = () => {
    mmkvService.setString(STORAGE_KEYS.LANGUAGE, selectedLang);

    if (isChanging && navigation.canGoBack()) {
      navigation.goBack();
    } else if (!isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.WELCOME }]
      });
    } else {
      const isOnboardingComplete = mmkvService.getBoolean(STORAGE_KEYS.ONBOARDING_COMPLETE);
      const isProfileSetup = mmkvService.getBoolean(STORAGE_KEYS.PROFILE_SETUP_COMPLETE);
      const isDlUploaded = mmkvService.getBoolean(STORAGE_KEYS.DL_UPLOADED);

      if (!isProfileSetup) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.PROFILE_SETUP }]
        });
      } else if (!isDlUploaded) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DL_UPLOAD }]
        });
      } else if (!isOnboardingComplete) {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DOCUMENT_CENTER }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.MAIN_TABS }]
        });
      }
    }
  };

  const selectedLanguageData = LANGUAGES.find(l => l.id === selectedLang) || LANGUAGES[0];

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle="light-content" backgroundColor={palette.primary} />

      <View style={[styles.hero, { backgroundColor: palette.primary }]}>
        <View style={styles.heroDecoration} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <View style={styles.heroIcon}>
            <Icon name="globe-outline" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Choose your language</Text>
          <Text style={styles.heroSubtitle}>
            Select the language you want to use in the app
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
            APP LANGUAGE
          </Text>

          {LANGUAGES.map(lang => {
            const isSelected = selectedLang === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: isSelected ? palette.primary : palette.border,
                  },
                ]}
                onPress={() => handleSelectLanguage(lang.id)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <View style={[styles.languageIcon, { backgroundColor: `${palette.primary}16` }]}>
                  <Icon name="language-outline" size={23} color={palette.primary} />
                </View>
                <View style={styles.languageText}>
                  <Text style={[styles.languageName, { color: palette.text }]}>
                    {lang.name}
                  </Text>
                  <Text style={[styles.languageDescription, { color: palette.mutedText }]}>
                    {lang.englishName} · App display language
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: isSelected ? palette.primary : palette.border,
                      backgroundColor: isSelected ? palette.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Icon name="checkmark" size={15} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.note}>
            <Icon name="information-circle-outline" size={18} color={palette.mutedText} />
            <Text style={[styles.noteText, { color: palette.mutedText }]}>
              You can change your language later in Settings.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Button
            label="Confirm & Continue"
            showArrow
            onPress={handleConfirm}
            borderRadius={27}
            accessibilityLabel={`Continue in ${selectedLanguageData.name}`}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    minHeight: 270,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroDecoration: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -78,
    top: -95,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroContent: {
    alignItems: 'center',
    marginTop: 16,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  content: {
    flex: 1,
    marginTop: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  languageCard: {
    minHeight: 88,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  languageIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: {
    flex: 1,
    marginLeft: 13,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '700',
  },
  languageDescription: {
    fontSize: 11,
    marginTop: 4,
  },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 2,
  },
  noteText: {
    fontSize: 12,
    marginLeft: 7,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmButton: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 9,
  },
});

export default LanguageScreen;
