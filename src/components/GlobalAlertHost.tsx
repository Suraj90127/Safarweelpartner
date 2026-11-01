import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';
import CustomAlert, {AlertType} from './CustomAlert';

export interface GlobalAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface GlobalAlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: GlobalAlertButton[];
  onDismiss?: () => void;
}

const CUSTOM_ALERT_EVENT = 'CUSTOM_ALERT_EVENT';

const defaultAlertState: GlobalAlertConfig = {
  title: '',
  message: '',
  type: 'info',
  buttons: [{text: 'OK'}],
};

export const showCustomAlert = (config: GlobalAlertConfig) => {
  DeviceEventEmitter.emit(CUSTOM_ALERT_EVENT, config);
};

const CustomAlertHost: React.FC = () => {
  const [alert, setAlert] = useState<GlobalAlertConfig & {visible: boolean}>(
    {...defaultAlertState, visible: false},
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(CUSTOM_ALERT_EVENT, (config: GlobalAlertConfig) => {
      setAlert({
        ...config,
        visible: true,
        buttons: config.buttons ?? [{text: 'OK'}],
      });
    });

    return () => subscription.remove();
  }, []);

  const handleDismiss = () => {
    alert.onDismiss?.();
    setAlert({...defaultAlertState, visible: false});
  };

  return (
    <CustomAlert
      visible={alert.visible}
      title={alert.title}
      message={alert.message}
      type={alert.type}
      buttons={alert.buttons?.map(button => ({
        text: button.text,
        onPress: () => {
          button.onPress?.();
          setAlert({...defaultAlertState, visible: false});
        },
        style: button.style,
      }))}
      onDismiss={handleDismiss}
    />
  );
};

export default CustomAlertHost;
