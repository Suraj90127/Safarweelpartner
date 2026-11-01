import React from 'react';
import {Modal, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppSelector} from '../redux/hooks';

export type AlertType = 'error' | 'warning' | 'info' | 'success';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const typeConfig: Record<
  AlertType,
  {icon: string; iconColor: string; wrapperBg: string; iconBg: string}
> = {
  error: {
    icon: 'close-circle',
    iconColor: '#ef4444',
    wrapperBg: '#fef2f2',
    iconBg: '#fee2e2',
  },
  warning: {
    icon: 'warning',
    iconColor: '#f59e0b',
    wrapperBg: '#fffbeb',
    iconBg: '#fef3c7',
  },
  info: {
    icon: 'information-circle',
    iconColor: '#3b82f6',
    wrapperBg: '#eff6ff',
    iconBg: '#dbeafe',
  },
  success: {
    icon: 'checkmark-circle',
    iconColor: '#22c55e',
    wrapperBg: '#f0fdf4',
    iconBg: '#dcfce7',
  },
};

const darkTypeConfig: Record<
  AlertType,
  {wrapperBg: string; iconBg: string}
> = {
  error: {wrapperBg: '#450a0a', iconBg: '#7f1d1d'},
  warning: {wrapperBg: '#451a03', iconBg: '#78350f'},
  info: {wrapperBg: '#172554', iconBg: '#1e3a8a'},
  success: {wrapperBg: '#052e16', iconBg: '#14532d'},
};

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onDismiss,
}) => {
  const isDark = useAppSelector(state => state.theme.isDark);

  const cfg = typeConfig[type];
  const darkCfg = darkTypeConfig[type];
  const wrapperBg = isDark ? darkCfg.wrapperBg : cfg.wrapperBg;
  const iconBg = isDark ? darkCfg.iconBg : cfg.iconBg;

  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{text: 'OK', onPress: onDismiss ?? (() => {}), style: 'default'}];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View
        style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
        className="flex-1 items-center justify-center px-6">
        <View
          style={{backgroundColor: isDark ? '#1e293b' : '#ffffff'}}
          className="w-full rounded-[28px] overflow-hidden shadow-2xl">
          {/* Coloured top strip with icon */}
          <View
            style={{backgroundColor: wrapperBg}}
            className="items-center pt-7 pb-5">
            <View
              style={{backgroundColor: iconBg, width: 64, height: 64, borderRadius: 32}}
              className="items-center justify-center">
              <Icon name={cfg.icon} size={34} color={cfg.iconColor} />
            </View>
          </View>

          {/* Content */}
          <View className="px-6 pt-5 pb-2">
            <Text
              style={{color: isDark ? '#f1f5f9' : '#0f172a'}}
              className="text-center text-[18px] font-bold">
              {title}
            </Text>
            <Text
              style={{color: isDark ? '#94a3b8' : '#64748b'}}
              className="mt-2 text-center text-sm leading-5">
              {message}
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{backgroundColor: isDark ? '#334155' : '#f1f5f9'}}
            className="mx-6 my-4 h-px"
          />

          {/* Buttons */}
          <View
            className={`flex-row px-6 pb-6 gap-3 ${
              resolvedButtons.length === 1 ? 'justify-center' : 'justify-end'
            }`}>
            {resolvedButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';

              let bgColor = cfg.iconColor;
              if (isCancel) {bgColor = isDark ? '#334155' : '#e2e8f0';}
              if (isDestructive) {bgColor = '#ef4444';}

              const textColor = isCancel
                ? isDark
                  ? '#cbd5e1'
                  : '#475569'
                : '#ffffff';

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={btn.onPress}
                  style={{
                    flex: resolvedButtons.length === 1 ? undefined : 1,
                    minWidth: resolvedButtons.length === 1 ? 140 : undefined,
                    backgroundColor: bgColor,
                    borderRadius: 14,
                    paddingVertical: 13,
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{color: textColor, fontWeight: '600', fontSize: 15}}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;
