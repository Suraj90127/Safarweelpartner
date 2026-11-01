import React, {forwardRef} from 'react';
import MapView, {MapViewProps, PROVIDER_GOOGLE} from 'react-native-maps';
import {useTheme} from '../hooks/useTheme';
import {lightMapStyle, darkMapStyle} from '../constants/mapStyles';

export type ThemedMapViewProps = Omit<MapViewProps, 'customMapStyle'> & {
  lightMapStyle?: MapViewProps['customMapStyle'];
  darkMapStyle?: MapViewProps['customMapStyle'];
  customMapStyle?: MapViewProps['customMapStyle'];
};

export const ThemedMapView = forwardRef<MapView, ThemedMapViewProps>(
  (
    {
      lightMapStyle: overrideLightMapStyle,
      darkMapStyle: overrideDarkMapStyle,
      customMapStyle,
      provider,
      ...props
    },
    ref,
  ) => {
    const {isDark} = useTheme();
    const defaultLight = overrideLightMapStyle ?? lightMapStyle;
    const defaultDark = overrideDarkMapStyle ?? darkMapStyle;
    const selectedStyle = customMapStyle ?? (isDark ? defaultDark : defaultLight);

    return (
      <MapView
        ref={ref}
        provider={provider ?? PROVIDER_GOOGLE}
        customMapStyle={selectedStyle}
        {...props}
      />
    );
  },
);

ThemedMapView.displayName = 'ThemedMapView';
