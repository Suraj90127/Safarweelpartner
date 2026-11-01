import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  NativeModules,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CustomAlert, { AlertType } from '../../components/CustomAlert';
import Toast, { ToastType } from '../../components/Toast';
import { Button } from '../../components/Button';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemedMapView } from '../../components/ThemedMapView';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  cancelRideThunk,
  clearRide,
  setActiveRide,
} from '../../redux/slices/rideSlice';
import { emitRideRejected } from '../../services/socket/socketManager';
import { markRideDismissed } from '../../services/rideDedup';
import {
  formatCurrency,
  formatDistance,
  formatDuration,
} from '../../utils/formatters';
import { useThemePalette } from '../../utils/theme';
import { parseLatLng, parsePickupLatLng, parseDropLatLng, parseStops } from '../../utils/helpers';

import type { AppNavProp, AppRouteProp } from '../../navigation/types';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LatLng } from '../../types/location.types';
import { fetchGoogleRoute, geocodeAddress } from '../../utils/mapUtils';

const CANCEL_REASONS = [
  { id: 'no_show', label: 'Passenger did not show up' },
  { id: 'requested', label: 'Passenger asked to cancel' },
  { id: 'breakdown', label: 'Vehicle breakdown' },
  { id: 'waiting', label: 'Waited too long' },
  { id: 'other', label: 'Other reason' },
];

const AcceptRideScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.ACCEPT_RIDE>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.ACCEPT_RIDE>>();
  const dispatch = useAppDispatch();
  const { palette, mode } = useThemePalette();
  const isDark = mode === 'dark';

  const reduxRequest = useAppSelector(state => state.ride.incomingRequest);
  const request =
    reduxRequest && reduxRequest.id === route.params?.rideId
      ? reduxRequest
      : route.params?.rideData || reduxRequest;
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: ToastType;
  }>({ visible: false, title: '', message: '', type: 'info' });
  const hideToast = useCallback(
    () => setToast(prev => ({ ...prev, visible: false })),
    [],
  );
  const showToast = useCallback(
    (title: string, message: string = '', type: ToastType = 'info') => {
      setToast({ visible: true, title, message, type });
    },
    [],
  );

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => { },
  });
  const hideAlert = useCallback(
    () => setAlert(prev => ({ ...prev, visible: false })),
    [],
  );
  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertType = 'info',
      onConfirm = () => { },
    ) => {
      setAlert({ visible: true, title, message, type, onConfirm });
    },
    [],
  );

  const [geocodedOrigin, setGeocodedOrigin] = useState<LatLng | null>(null);
  const [geocodedDestination, setGeocodedDestination] = useState<LatLng | null>(null);

  const directOrigin = useMemo(
    () => parsePickupLatLng(request, 0, 0),
    [request],
  );
  const directDestination = useMemo(
    () => parseDropLatLng(request, 0, 0),
    [request],
  );

  const pickupAddr = request?.pickup?.address || request?.pickupAddress || request?.pickupLocation?.address;
  const dropAddr = request?.drop?.address || request?.dropAddress || request?.dropLocation?.address;

  useEffect(() => {
    if (directOrigin.latitude === 0 && directOrigin.longitude === 0 && pickupAddr && typeof pickupAddr === 'string' && pickupAddr.trim().length > 3) {
      let active = true;
      geocodeAddress(pickupAddr.trim()).then(coords => {
        if (active && coords && (coords.latitude !== 0 || coords.longitude !== 0)) {
          setGeocodedOrigin(coords);
        }
      });
      return () => { active = false; };
    }
  }, [directOrigin.latitude, directOrigin.longitude, pickupAddr]);

  useEffect(() => {
    if (directDestination.latitude === 0 && directDestination.longitude === 0 && dropAddr && typeof dropAddr === 'string' && dropAddr.trim().length > 3) {
      let active = true;
      geocodeAddress(dropAddr.trim()).then(coords => {
        if (active && coords && (coords.latitude !== 0 || coords.longitude !== 0)) {
          setGeocodedDestination(coords);
        }
      });
      return () => { active = false; };
    }
  }, [directDestination.latitude, directDestination.longitude, dropAddr]);

  const originLoc = useMemo(() => {
    if (directOrigin.latitude !== 0 || directOrigin.longitude !== 0) return directOrigin;
    if (geocodedOrigin && (geocodedOrigin.latitude !== 0 || geocodedOrigin.longitude !== 0)) return geocodedOrigin;
    return { latitude: 12.971899, longitude: 77.641151 };
  }, [directOrigin, geocodedOrigin]);

  const destinationLoc = useMemo(() => {
    if (directDestination.latitude !== 0 || directDestination.longitude !== 0) return directDestination;
    if (geocodedDestination && (geocodedDestination.latitude !== 0 || geocodedDestination.longitude !== 0)) return geocodedDestination;
    return { latitude: 12.934988, longitude: 77.618388 };
  }, [directDestination, geocodedDestination]);

  const handleAccept = useCallback(async () => {
    if (!request) return;

    if (Platform.OS === 'android' && NativeModules.PermissionModule) {
      NativeModules.PermissionModule.stopSound();
      NativeModules.PermissionModule.hideFloatingRequest();
    }

    dispatch(
      setActiveRide({
        ...request,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        pickup: {
          ...request.pickup,
          coordinates: originLoc,
        },
        drop: {
          ...request.drop,
          coordinates: destinationLoc,
        },
      }),
    );
    showToast('Ride Accepted', 'Starting navigation to pickup...', 'success');
    setTimeout(() => {
      navigation.replace(ROUTES.ACTIVE_RIDE, { rideId: request.id });
    }, 800);
  }, [dispatch, request, originLoc, destinationLoc, navigation, showToast]);

  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.PermissionModule) {
      NativeModules.PermissionModule.stopSound();
      NativeModules.PermissionModule.hideFloatingRequest();
    }
  }, []);

  const handleOpenCancelModal = useCallback(() => {
    setSelectedReason(null);
    setShowCancelModal(true);
  }, []);

  const handleConfirmCancelWithReason = useCallback(async () => {
    if (!selectedReason || !request) return;
    const reasonLabel =
      CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;

    setShowCancelModal(false);

    try {
      markRideDismissed(request.id);
      if (request.id.startsWith('MOCK')) {
        dispatch(clearRide());
        navigation.goBack();
      } else {
        await dispatch(
          cancelRideThunk({
            rideId: request.id,
            cancelReason: reasonLabel,
          }),
        );
        emitRideRejected({ rideId: request.id, reason: reasonLabel });
        dispatch(clearRide());
        navigation.goBack();
      }
    } catch (e) {
      dispatch(clearRide());
      navigation.goBack();
    }
  }, [dispatch, request, navigation, selectedReason]);

  useEffect(() => {
    if (!request) {
      navigation.goBack();
    }
  }, [request, navigation]);



  const parsedStops = useMemo(() => {
    return parseStops(request?.stops || request?.stopPoints || request);
  }, [request]);

  const stopLatLngs = useMemo(() => {
    return parsedStops
      .map((stop: any) => ({
        latitude: stop.latitude,
        longitude: stop.longitude,
      }))
      .filter(
        (loc: any) =>
          !isNaN(loc.latitude) &&
          loc.latitude !== 0 &&
          !isNaN(loc.longitude) &&
          loc.longitude !== 0,
      );
  }, [parsedStops]);

  useEffect(() => {
    if (!request) return;
    let active = true;
    fetchGoogleRoute(originLoc, destinationLoc, stopLatLngs).then(res => {
      if (active) {
        setRouteCoords(res.coordinates);
      }
    });
    return () => {
      active = false;
    };
  }, [
    request?.id,
    originLoc.latitude,
    originLoc.longitude,
    destinationLoc.latitude,
    destinationLoc.longitude,
    stopLatLngs,
  ]);

  if (!request) return null;

  // Reuse already-memoized coords (avoid redundant parseLatLng calls in render).
  const origin = originLoc;
  const destination = destinationLoc;
  const startLat = origin.latitude;
  const startLng = origin.longitude;
  const endLat = destination.latitude;
  const endLng = destination.longitude;

  return (
    <SafeAreaView className="flex-1 bg-lightBg dark:bg-darkBg">
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? COLORS.darkBg : '#F8FAFC'}
      />

      {/* Floating Close Button */}

      {/* Map Section */}
      <View className="flex-1 relative">
        <ThemedMapView
          provider={PROVIDER_GOOGLE}
          style={{ width: '100%', height: '100%' }}
          initialRegion={{
            latitude: (startLat + endLat) / 2,
            longitude: (startLng + endLng) / 2,
            latitudeDelta: Math.abs(startLat - endLat) * 1.5 || 0.05,
            longitudeDelta: Math.abs(startLng - endLng) * 1.5 || 0.05,
          }}
          showsCompass={true}
          showsMyLocationButton={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {/* Pickup Marker */}
          <Marker coordinate={origin} title="Pickup Location">
            <View className="w-5 h-5 rounded-full bg-emerald-500/20 justify-center items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-white" />
            </View>
          </Marker>

          {/* Stops Markers */}
          {parsedStops.length > 0 &&
            parsedStops.map((stop: any, idx: number) => {
              if (!stop.latitude || !stop.longitude) return null;
              return (
                <Marker
                  key={`stop-${idx}-${stop.latitude}-${stop.longitude}`}
                  coordinate={{
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                  }}
                  title={stop.title || `Stop ${idx + 1}`}
                  description={stop.address}
                >
                  <View className="items-center">
                    <View className="bg-amber-500 px-2 py-1 rounded-full border border-white flex-row items-center gap-1 shadow-md">
                      <View className="w-3.5 h-3.5 rounded-full bg-white justify-center items-center">
                        <Text className="text-[9px] font-black text-amber-600">
                          {idx + 1}
                        </Text>
                      </View>
                      <Text
                        className="text-[10px] font-bold text-white max-w-[120px]"
                        numberOfLines={1}
                      >
                        {stop.title || `Stop ${idx + 1}`}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}

          {/* Drop Marker */}
          <Marker coordinate={destination} title="Drop Location">
            <View className="w-5 h-5 rounded-full bg-rose-500/20 justify-center items-center">
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
            </View>
          </Marker>

          {/* Route Line */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#10B981"
              strokeWidth={5}
            />
          )}
        </ThemedMapView>
      </View>

      {/* Details Sheet Card */}
      <View className="bg-lightBg dark:bg-darkCard rounded-t-[24px] p-5">
        {/* Customer Header */}
        <View className="flex-row items-center mb-4">
          <View className="w-12 h-12 rounded-full bg-accent justify-center items-center mr-3">
            <Text className="text-lg font-black text-white">
              {request.customer.name?.[0]?.toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-textLight dark:text-textDark">
              {request.customer.name}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Icon name="star" size={14} color="#EAB308" />
              <Text className="text-xs font-semibold text-textLightSecondary dark:text-textDarkSecondary ml-1">
                {request.customer.rating.toFixed(1)}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-black text-textLight dark:text-textDark">
            {formatCurrency(request.fare.total)}
          </Text>
        </View>

        {/* Info Grid (Time / Distance) */}
        <View className="flex-row border border-lightBorder dark:border-darkBorder rounded-2xl py-3 mb-4 bg-lightCard dark:bg-darkBg">
          <View className="flex-1 flex-row items-center justify-center">
            <Icon
              name="time-outline"
              size={20}
              color={
                isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary
              }
            />
            <View className="ml-2">
              <Text className="text-sm font-extrabold text-textLight dark:text-textDark">
                {formatDuration(request.duration)}
              </Text>
              <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                Travel Time
              </Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-center justify-center border-l border-lightBorder dark:border-darkBorder">
            <Icon
              name="navigate-outline"
              size={20}
              color={
                isDark ? COLORS.textDarkSecondary : COLORS.textLightSecondary
              }
            />
            <View className="ml-2">
              <Text className="text-sm font-extrabold text-textLight dark:text-textDark">
                {formatDistance(request.distance)}
              </Text>
              <Text className="text-[10px] text-textLightSecondary dark:text-textDarkSecondary mt-0.5">
                Distance
              </Text>
            </View>
          </View>
        </View>

        {/* Route Details */}
        <View className="mb-5 px-1">
          {/* Pickup */}
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2.5"
              style={{ backgroundColor: COLORS.success }}
            />
            <Text
              className="text-sm text-textLight dark:text-textDark flex-1"
              numberOfLines={1}
            >
              {request.pickup.address}
            </Text>
          </View>

          {/* Stops (if any) */}
          {parsedStops.length > 0 ? (
            <>
              <View className="h-3.5 w-[1px] bg-lightBorder dark:bg-darkBorder ml-[3.5px] my-0.5" />
              {parsedStops.map((stop: any, idx: number) => (
                <React.Fragment key={`stop-detail-${idx}`}>
                  <View className="flex-row items-center">
                    <View className="w-4 h-4 rounded-full bg-amber-500/20 justify-center items-center mr-2">
                      <Text className="text-[8px] font-black text-amber-600 dark:text-amber-500">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text
                      className="text-sm text-textLight dark:text-textDark flex-1 font-semibold"
                      numberOfLines={1}
                    >
                      {stop.title || stop.address}
                    </Text>
                  </View>
                  <View className="h-3.5 w-[1px] bg-lightBorder dark:bg-darkBorder ml-[7.5px] my-0.5" />
                </React.Fragment>
              ))}
            </>
          ) : (
            <View className="h-3.5 w-[1px] bg-lightBorder dark:bg-darkBorder ml-[3.5px] my-0.5" />
          )}

          {/* Drop */}
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2.5"
              style={{ backgroundColor: COLORS.danger }}
            />
            <Text
              className="text-sm text-textLight dark:text-textDark flex-1"
              numberOfLines={1}
            >
              {request.drop.address}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View className="flex-row gap-3">
          <Button
            variant="outline"
            label="Reject"
            onPress={handleOpenCancelModal}
            height={52}
            borderRadius={16}
            style={{ flex: 1 }}
            textStyle={{ color: palette.mutedText, fontSize: 15, fontWeight: '700' }}
          />
          <Button
            label="Go To Pickup"
            onPress={handleAccept}
            height={52}
            borderRadius={16}
            style={{ flex: 2 }}
            textStyle={{ fontSize: 15, fontWeight: '800' }}
          />
        </View>
      </View>

      {/* Cancellation Reason Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
            }}
            className="w-full rounded-t-[38px] overflow-hidden border-t pb-4"
          >
            <View className="items-center pt-2.5">
              <View
                style={{ backgroundColor: palette.border }}
                className="w-10 h-1 rounded-full"
              />
            </View>

            <View className="px-6 pt-6 pb-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    style={{ color: palette.text }}
                    className="text-[22px] font-black"
                  >
                    Cancel Ride
                  </Text>
                  <Text
                    style={{ color: palette.mutedText }}
                    className="text-[12px] mt-1"
                  >
                    Select a reason before cancelling. This helps improve service quality.
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: palette.background }}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  onPress={() => {
                    setSelectedReason(null);
                    setShowCancelModal(false);
                  }}
                >
                  <Icon name="close" size={18} color={palette.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-5 pt-2 pb-1">
              {CANCEL_REASONS.map(item => {
                const selected = selectedReason === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedReason(item.id)}
                    style={
                      selected
                        ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderColor: '#EF4444',
                        }
                        : {
                          backgroundColor: palette.background,
                          borderColor: palette.border,
                        }
                    }
                    className="mb-2.5 rounded-2xl px-4 py-3.5 flex-row items-center border"
                  >
                    <View
                      className={`w-5 h-5 rounded-full mr-3 items-center justify-center border-2 ${selected
                          ? 'border-red-500 bg-red-500'
                          : 'border-slate-400'
                        }`}
                    >
                      {selected && (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </View>

                    <Text
                      style={
                        selected
                          ? { color: '#EF4444' }
                          : { color: palette.text }
                      }
                      className="flex-1 text-[13px] font-semibold"
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="px-5 pb-3 pt-3 flex-row gap-3">
              <Button
                variant="outline"
                label="Keep Ride"
                onPress={() => {
                  setSelectedReason(null);
                  setShowCancelModal(false);
                }}
                height={48}
                borderRadius={12}
                style={{ flex: 1 }}
                textStyle={{ fontSize: 13, fontWeight: '700' }}
              />

              <Button
                label="Cancel Ride"
                disabled={!selectedReason}
                onPress={handleConfirmCancelWithReason}
                height={48}
                borderRadius={12}
                style={{ flex: 1 }}
                gradientColors={['#EF4444', '#DC2626']}
                textStyle={{ fontSize: 13, fontWeight: '900', color: '#FFFFFF' }}
              />
            </View>
          </View>
        </View>
      </Modal>
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        buttons={[
          {
            text: 'OK',
            onPress: () => {
              hideAlert();
              alert.onConfirm();
            },
          },
        ]}
        onDismiss={hideAlert}
      />
      <Toast {...toast} onDismiss={hideToast} />
    </SafeAreaView>
  );
};

export default AcceptRideScreen;
