import React, {useCallback, useEffect, useRef} from 'react';
import {Animated, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

interface ToastProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: ToastType;
  autoDismissMs?: number;
  onDismiss?: () => void;
}

const CONFIG: Record<ToastType, { icon: string; bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    icon: 'checkmark-circle-outline',
    bg: '#dcfce7',
    border: '#bbf7d0',
    text: '#14532d',
    iconColor: '#15803d',
  },
  error: {
    icon: 'close-circle-outline',
    bg: '#fee2e2',
    border: '#fecaca',
    text: '#7f1d1d',
    iconColor: '#b91c1c',
  },
  warning: {
    icon: 'alert-circle-outline',
    bg: '#fef3c7',
    border: '#fed7aa',
    text: '#78350f',
    iconColor: '#d97706',
  },
  info: {
    icon: 'information-circle-outline',
    bg: '#e0f2fe',
    border: '#bae6fd',
    text: '#0c4a6e',
    iconColor: '#0284c7',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  title,
  message,
  type = 'info',
  autoDismissMs = 1500,
  onDismiss,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {toValue: -100, duration: 260, useNativeDriver: true}),
      Animated.timing(opacity,    {toValue: 0,    duration: 200, useNativeDriver: true}),
    ]).start(() => onDismiss?.());
  }, [onDismiss, opacity, translateY]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 16,
          stiffness: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {toValue: 1, duration: 100, useNativeDriver: true}),
      ]).start();

      if (autoDismissMs > 0) {
        timerRef.current = setTimeout(dismiss, autoDismissMs);
      }
    } else {
      translateY.setValue(-100);
      opacity.setValue(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, autoDismissMs, dismiss, translateY, opacity]);

  if (!visible) {
    return null;
  }

  const cfg = CONFIG[type];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 40,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{translateY}],
        opacity,
      }}
      pointerEvents="box-none">
      <View
        style={{
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          borderWidth: 1,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          gap: 12,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}>
        {/* Left Icon */}
        <Icon name={cfg.icon} size={24} color={cfg.iconColor} />

        {/* Text content */}
        <View style={{flex: 1}}>
          <Text
            style={{
              color: cfg.text,
              fontWeight: '700',
              fontSize: 15,
            }}>
            {title}
          </Text>
          {message ? (
            <Text
              style={{
                color: cfg.text,
                opacity: 0.8,
                fontSize: 13,
                marginTop: 2,
              }}>
              {message}
            </Text>
          ) : null}
        </View>

        {/* Close Button */}
        <TouchableOpacity activeOpacity={0.7} onPress={dismiss} style={{padding: 4}}>
          <Icon name="close" size={20} color={cfg.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default Toast;

