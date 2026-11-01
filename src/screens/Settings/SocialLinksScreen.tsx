import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../redux/hooks';
import { COLORS } from '../../constants/colors';

interface SocialLinkItem {
  id: string;
  name: string;
  handle: string;
  url: string;
  description: string;
  hindiDescription: string;
  icon: string;
  accentColor: string;
  lightBg: string;
  darkBg: string;
  actionText: string;
}

const SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@GODROPSERVICE-2025',
    url: 'https://www.youtube.com/@GODROPSERVICE-2025',
    description: 'Watch official driver training, tutorials & update videos.',
    hindiDescription: 'ट्रेनिंग वीडियो और जरूरी अपडेट्स देखें',
    icon: 'logo-youtube',
    accentColor: '#FF0000',
    lightBg: 'rgba(255, 0, 0, 0.08)',
    darkBg: 'rgba(255, 0, 0, 0.16)',
    actionText: 'Subscribe Channel',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@godrop.service2025',
    url: 'https://www.instagram.com/godrop.service2025?igsi=MXNrY215Y3JyaHAwYQ==',
    description: 'Follow for announcements, driver highlights & stories.',
    hindiDescription: 'लेटेस्ट ऑफर्स, राइडर स्टोरीज और अपडेट्स',
    icon: 'logo-instagram',
    accentColor: '#E1306C',
    lightBg: 'rgba(225, 48, 108, 0.08)',
    darkBg: 'rgba(225, 48, 108, 0.16)',
    actionText: 'Follow on Instagram',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Safarweel Service',
    url: 'https://www.facebook.com/share/15ynSnrTWd/',
    description: 'Join our official driver community on Facebook.',
    hindiDescription: 'ऑफिशियल पार्टनर कम्युनिटी से जुड़ें',
    icon: 'logo-facebook',
    accentColor: '#1877F2',
    lightBg: 'rgba(24, 119, 242, 0.08)',
    darkBg: 'rgba(24, 119, 242, 0.16)',
    actionText: 'Visit Facebook Page',
  },
];

const SocialLinksScreen: React.FC = () => {
  const isDark = useAppSelector(s => s.theme.isDark);

  const handleOpenLink = async (url: string, platformName: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert(
        'Unable to open link',
        `Could not open ${platformName}. Please ensure you have an active internet connection.`,
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <ScreenHeader title="Social Media Links" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header Card */}
        <View className="bg-lightCard dark:bg-darkCard rounded-2xl p-5 border border-lightBorder dark:border-darkBorder  mb-5">
          <View className="flex-row items-center mb-2.5">
            <View className="w-10 h-10 rounded-full bg-primary/10 dark:bg-accent/20 items-center justify-center mr-3">
              <Icon name="share-social" size={20} color={isDark ? COLORS.secondary : COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-textLight dark:text-textDark">
                Official Social Media
              </Text>
              <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary font-medium">
                सोशल मीडिया से जुड़े रहें
              </Text>
            </View>
          </View>
          <Text className="text-xs text-textLightSecondary dark:text-textDarkSecondary leading-relaxed">
            Follow Safarweel's official channels to receive real-time news, incentive updates, driver guidelines, and training resources.
          </Text>
        </View>

        {/* Social Link Cards */}
        <Text className="text-xs font-bold text-textLightSecondary dark:text-textDarkSecondary uppercase tracking-wider mb-3 ml-1">
          Official Channels
        </Text>

        {SOCIAL_LINKS.map(item => {
          const bgTint = isDark ? item.darkBg : item.lightBg;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              onPress={() => handleOpenLink(item.url, item.name)}
              className="bg-lightCard dark:bg-darkCard rounded-2xl p-4 border border-lightBorder dark:border-darkBorder  mb-4"
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center flex-1 pr-2">
                  <View
                    style={{ backgroundColor: bgTint }}
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                  >
                    <Icon name={item.icon} size={26} color={item.accentColor} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-extrabold text-textLight dark:text-textDark mr-1.5">
                        {item.name}
                      </Text>
                      <Icon name="checkmark-circle" size={14} color="#3B82F6" />
                    </View>
                    <Text
                      style={{ color: item.accentColor }}
                      className="text-xs font-bold mt-0.5"
                    >
                      {item.handle}
                    </Text>
                  </View>
                </View>

                <View
                  style={{ backgroundColor: bgTint }}
                  className="w-8 h-8 rounded-full items-center justify-center"
                >
                  <Icon name="open-outline" size={16} color={item.accentColor} />
                </View>
              </View>

              <Text className="text-xs text-textLight dark:text-textDark leading-relaxed mb-1.5">
                {item.description}
              </Text>
              <Text className="text-[11px] text-textLightSecondary dark:text-textDarkSecondary font-medium mb-3">
                {item.hindiDescription}
              </Text>

              {/* Action Button */}
              <View
                style={{ borderColor: item.accentColor }}
                className="flex-row items-center justify-center py-2.5 px-4 rounded-xl border"
              >
                <Icon name={item.icon} size={16} color={item.accentColor} style={{ marginRight: 6 }} />
                <Text
                  style={{ color: item.accentColor }}
                  className="text-xs font-extrabold"
                >
                  {item.actionText}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Security Notice */}
        <View className="bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl p-4 border border-amber-500/30 mt-2 mb-8">
          <View className="flex-row items-center mb-1.5">
            <Icon name="shield-checkmark" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text className="text-xs font-extrabold text-amber-800 dark:text-amber-400">
              Security Notice (सुरक्षा सूचना)
            </Text>
          </View>
          <Text className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed font-medium">
            Safarweel will never ask for your OTP, password, or direct bank transfer on social media. Always use only the official app for rides and payments.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});

export default SocialLinksScreen;
