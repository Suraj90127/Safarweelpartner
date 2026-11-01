import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../constants/colors';
import { useThemePalette } from '../utils/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

export interface ButtonProps extends TouchableOpacityProps {
  label?: string;
  title?: string;
  subTitle?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  rightIcon?: string;
  showArrow?: boolean;
  variant?: ButtonVariant;
  gradientColors?: string[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  subTextStyle?: StyleProp<TextStyle>;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export const Button = ({
  label,
  title,
  subTitle,
  children,
  isLoading = false,
  disabled = false,
  leftSlot,
  rightSlot,
  rightIcon,
  showArrow = false,
  variant = 'primary',
  gradientColors = COLORS.buttonGradient,
  style,
  contentStyle,
  textStyle,
  subTextStyle,
  height = 54,
  borderRadius = 16,
  activeOpacity = 0.85,
  ...rest
}: ButtonProps) => {
  const { palette } = useThemePalette();
  const buttonText = label || title;

  const resolvedRightSlot =
    rightSlot ||
    (rightIcon || showArrow ? (
      <Icon
        name={rightIcon || 'arrow-forward'}
        size={18}
        color={variant === 'primary' ? '#FFFFFF' : palette.text}
        style={{ marginLeft: 8 }}
      />
    ) : null);

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={disabled || isLoading}
        style={[
          styles.primaryShadow,
          {
            borderRadius,
            opacity: disabled && !isLoading ? 0.6 : 1,
          },
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.gradientContainer,
            {
              height,
              borderRadius,
            },
            contentStyle,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : children ? (
            children
          ) : (
            <View style={styles.centerContainer}>
              <View style={styles.row}>
                {leftSlot}
                {!!buttonText && (
                  <Text style={[styles.primaryText, textStyle]}>{buttonText}</Text>
                )}
                {resolvedRightSlot}
              </View>
              {!!subTitle && (
                <Text style={[styles.subText, subTextStyle]}>{subTitle}</Text>
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Secondary / Ghost / Outline variants
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  const bgColor = isSecondary
    ? palette.surfaceMuted
    : isGhost
      ? 'transparent'
      : 'transparent';

  const borderColor = isOutline ? palette.border : 'transparent';

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={disabled || isLoading}
      style={[
        styles.standardContainer,
        {
          height,
          borderRadius,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: isOutline ? 1.5 : 0,
          opacity: disabled && !isLoading ? 0.6 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : children ? (
        children
      ) : (
        <View style={styles.centerContainer}>
          <View style={styles.row}>
            {leftSlot}
            {!!buttonText && (
              <Text style={[styles.standardText, { color: palette.text }, textStyle]}>
                {buttonText}
              </Text>
            )}
            {resolvedRightSlot}
          </View>
          {!!subTitle && (
            <Text style={[styles.standardSubText, { color: palette.mutedText }, subTextStyle]}>
              {subTitle}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryShadow: {
    shadowColor: COLORS.buttonShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
  },
  gradientContainer: {
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  standardContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  standardText: {
    fontSize: 15,
    fontWeight: '600',
  },
  standardSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default Button;
