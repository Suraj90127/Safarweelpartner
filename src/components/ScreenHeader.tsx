import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ImageSourcePropType,
  StyleProp,
  ImageStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../redux/hooks';
import { COLORS } from '../constants/colors';
import Images from '../utils/images';

interface ScreenHeaderProps {
  title?: string | React.ReactNode;
  image?: ImageSourcePropType | boolean;
  imageStyle?: StyleProp<ImageStyle>;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  borderBottom?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = React.memo(({
  title,
  image,
  imageStyle,
  showBackButton = true,
  onBackPress,
  rightElement,
  borderBottom = true,
}) => {
  const navigation = useNavigation();
  const isDark = useAppSelector(state => state.theme.isDark);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onBackPress]);

  const renderCenterContent = () => {
    const hasValidTitle =
      title !== undefined &&
      title !== null &&
      (typeof title !== 'string' || title.trim().length > 0);

    if (hasValidTitle) {
      if (typeof title === 'string') {
        return (
          <Text
            className="text-lg font-extrabold text-textLight dark:text-textDark text-center"
            numberOfLines={1}
          >
            {title}
          </Text>
        );
      }
      return title;
    }

    if (image) {
      const source =
        typeof image === 'boolean'
          ? isDark
            ? Images.splashDark
            : Images.splash
          : image;

      return (
        <Image
          source={source}
          style={[{ width: 110, height: 34 }, imageStyle]}
          resizeMode="contain"
        />
      );
    }

    return null;
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? COLORS.darkBg : COLORS.lightBg}
      />
      <View
        className={`flex-row items-center justify-between px-4 py-2 bg-lightBg dark:bg-darkBg ${
          borderBottom ? 'border-b border-lightBorder dark:border-darkBorder' : ''
        }`}
      >
        {/* Left Area (Back Button or Spacer) */}
        {showBackButton ? (
          <TouchableOpacity className="p-1" onPress={handleBack}>
            <Icon
              name="arrow-back"
              size={26}
              color={isDark ? COLORS.textDark : '#0F172A'}
            />
          </TouchableOpacity>
        ) : (
          <View className="w-8" />
        )}

        {/* Center Area (Title or Image) */}
        <View className="flex-1 items-center justify-center px-2">
          {renderCenterContent()}
        </View>

        {/* Right Area (Right Button or Spacer) */}
        <View className="items-end justify-center min-w-8">
          {rightElement || <View className="w-8" />}
        </View>
      </View>
    </>
  );
});

export default ScreenHeader;
