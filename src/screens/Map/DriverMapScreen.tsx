import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Linking,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, {
  AnimatedRegion,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemedMapView } from '../../components/ThemedMapView';
import { useAppSelector } from '../../redux/hooks';

import Tts from 'react-native-tts';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AppNavProp, AppRouteProp } from '../../navigation/types';
import mmkvService from '../../services/storage/mmkvService';
import logger from '../../utils/logger';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LatLng } from '../../types/location.types';
import { parseLatLng, parseStops } from '../../utils/helpers';
import {
  extractRoadName,
  fetchGoogleRoute,
  getBearingFromPolyline,
  getManeuverDetails,
  GoogleStep,
  splitRouteAtLocation,
} from '../../utils/mapUtils';

const TAG = 'DriverMapScreen';

const SAFE_TOP = Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ?? 24;
const SAFE_BOTTOM = Platform.OS === 'ios' ? 34 : 16;

const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

interface LocationState {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number;
}

// ─── Distance Calculator (Haversine Formula) ───────────────────────────
function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
    Math.cos(phi2) *
    Math.sin(deltaLambda / 2) *
    Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ─── Google Directions duration to Arrival Time Calculator ────────────
function getArrivalTime(durationStr: string | undefined): string {
  if (!durationStr) return '--:--';
  let totalMinutes = 0;
  const hourMatch = durationStr.match(/(\d+)\s*(hour|hr|h)/i);
  const minMatch = durationStr.match(/(\d+)\s*(minute|min|m)/i);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1]);
  } else if (!hourMatch) {
    const numMatch = durationStr.match(/\d+/);
    if (numMatch) {
      totalMinutes = parseInt(numMatch[0]);
    }
  }

  const now = new Date();
  now.setMinutes(now.getMinutes() + totalMinutes);
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ─── Driver Car Marker (With Smooth Native Ref Transition Support) ────────────
const DriverMarker = memo(
  React.forwardRef<
    any,
    {
      latitude: number;
      longitude: number;
      heading: number;
      vehicleMapIcon?: string | null;
    }
  >(({ latitude, longitude, heading, vehicleMapIcon }, ref) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const animatedCoordinate = useRef(
      new AnimatedRegion({ latitude, longitude }),
    ).current;

    useEffect(() => {
      animatedCoordinate
        .timing({
          latitude,
          longitude,
          duration: 1000,
          useNativeDriver: false,
        })
        .start();
    }, [animatedCoordinate, latitude, longitude]);

    useEffect(() => {
      setTracksViewChanges(true);
    }, [vehicleMapIcon]);

    const handleImageLoaded = useCallback(() => {
      setTracksViewChanges(true);
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 500);
      return () => clearTimeout(timer);
    }, []);

    // Sanitize heading: GPS returns -1 when heading is unavailable; a
    // negative or non-finite value would rotate the marker to a wrong angle.
    const safeRotation =
      heading >= 0 && Number.isFinite(heading) ? heading : 0;

    return (
      <Marker.Animated
        ref={ref}
        coordinate={animatedCoordinate}
        anchor={{ x: 0.5, y: 0.5 }}
        flat
        rotation={safeRotation}
        tracksViewChanges={tracksViewChanges}
      >
        {/* Glow ring + vehicle icon */}
        <View
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {vehicleMapIcon ? (
            <Image
              source={{ uri: vehicleMapIcon }}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
              onLoad={handleImageLoaded}
              onError={() => setTracksViewChanges(false)}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FACC15',
                borderWidth: 2,
                borderColor: '#0F172A',
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
              }}
            >
              <Icon name="car-sport" size={20} color="#0F172A" />
            </View>
          )}
        </View>
      </Marker.Animated>
    );
  }),
);

DriverMarker.displayName = 'DriverMarker';

// ─── Location Permission ──────────────────────────────────────────────────────
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'App needs your location to show you on the map.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'Allow',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DriverMapScreen: React.FC = () => {
  const navigation = useNavigation<AppNavProp<typeof ROUTES.DRIVER_MAP>>();
  const route = useRoute<AppRouteProp<typeof ROUTES.DRIVER_MAP>>();

  const isFocused = useIsFocused();
  const isDark = useAppSelector(state => state.theme.isDark);

  const isOnline = useAppSelector(s => s.driver.isOnline);
  const vehicle = useAppSelector(state => state.driver.vehicle);

  console.log('vehicle on driver map', vehicle);

  const params = route.params;
  const pickupParam = useMemo(
    () => (params?.pickup ? parseLatLng(params.pickup) : null),
    [params?.pickup],
  );
  const dropParam = useMemo(
    () => (params?.drop ? parseLatLng(params.drop) : null),
    [params?.drop],
  );
  const stopsParam = params?.stops;

  const targetLatLng = useMemo(() => {
    if (dropParam && !pickupParam) {
      return dropParam;
    }
    if (pickupParam) {
      return pickupParam;
    }
    if (dropParam) {
      return dropParam;
    }
    return null;
  }, [pickupParam, dropParam]);

  const isHeadingToDrop = !pickupParam && !!dropParam;

  const [gps, setGps] = useState<LocationState | null>(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeDistance, setRouteDistance] = useState<string | undefined>(
    undefined,
  );
  const [routeDuration, setRouteDuration] = useState<string | undefined>(
    undefined,
  );
  const [routeSteps, setRouteSteps] = useState<GoogleStep[]>([]);
  const [navigationActive, setNavigationActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return mmkvService.getBoolean(STORAGE_KEYS.SOUND_ENABLED) ?? true;
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    mmkvService.setBoolean(STORAGE_KEYS.SOUND_ENABLED, newVal);
    if (!newVal) {
      try {
        Tts.stop();
      } catch (err) {
        logger.warn(TAG, 'Failed to stop TTS on toggle: ' + err);
      }
    }
  };

  // ── Hardware Back Handler (Return to previous/Home cleanly) ──────────────────
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate(ROUTES.MAIN_TABS as any);
        }
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  const openExternalGoogleMaps = () => {
    if (!targetLatLng) return;

    const destLat = targetLatLng.latitude;
    const destLng = targetLatLng.longitude;

    const origin = gps ? `${gps.latitude},${gps.longitude}` : '';
    const destination = `${destLat},${destLng}`;

    // Collect all intermediate stops (waypoints) if heading to drop
    const waypointsList =
      isHeadingToDrop && stopLatLngs.length > 0
        ? stopLatLngs.map(s => `${s.latitude},${s.longitude}`).join('|')
        : '';

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    if (origin) {
      url += `&origin=${origin}`;
    }
    if (waypointsList) {
      url += `&waypoints=${encodeURIComponent(waypointsList)}`;
    }

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://maps.google.com/?q=${destination}`);
        }
      })
      .catch(err => {
        logger.error(TAG, 'Error opening Google Maps:', err);
        Linking.openURL(`https://maps.google.com/?q=${destination}`);
      });
  };

  const mapRef = useRef<MapView>(null);
  const markerRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const hasCentered = useRef(false);
  const lastProgressIndexRef = useRef<number>(0);
  const lastHeadingRef = useRef<number>(0);
  const lastRouteBearingRef = useRef<number>(0);
  const lastRerouteTimeRef = useRef<number>(0);
  const previousGpsRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const previousGpsTimestampRef = useRef<number>(0);
  const gpsMovementCandidateRef = useRef<{
    latitude: number;
    longitude: number;
    speed: number;
    count: number;
  } | null>(null);

  // Animated values

  const onlinePulse = useSharedValue(1);

  // Pulse ring when online
  useEffect(() => {
    if (isOnline) {
      onlinePulse.value = withTiming(1.5, { duration: 800 }, () => {
        onlinePulse.value = withTiming(1, { duration: 800 });
      });
    }
  }, [isOnline]);

  // ── GPS Watch (With Low-Pass Speed & Angle Stabilizer) ─────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await requestLocationPermission();
      if (!ok) {
        Alert.alert(
          'Location Denied',
          'Enable location in Settings to use the map.',
        );
        return;
      }

      const updateLocationState = (pos: any) => {
        if (!mounted) return;
        const rawHeading = pos.coords.heading ?? -1;
        const speed = Math.max(0, pos.coords.speed ?? 0);
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const accuracy = pos.coords.accuracy ?? Infinity;
        const timestamp = pos.timestamp ?? Date.now();
        const previousGps = previousGpsRef.current;
        const previousTimestamp = previousGpsTimestampRef.current;

        if (previousGps && (!Number.isFinite(accuracy) || accuracy > 20)) {
          gpsMovementCandidateRef.current = null;
          return;
        }

        if (previousGps) {
          const movedMeters = getDistanceInMeters(
            previousGps.latitude,
            previousGps.longitude,
            latitude,
            longitude,
          );
          const elapsedSeconds = Math.max(
            1,
            (timestamp - previousTimestamp) / 1000,
          );
          const plausibleMovement = Math.max(
            35,
            speed * elapsedSeconds * 3 + accuracy * 2,
          );

          if (movedMeters > plausibleMovement) {
            logger.debug(TAG, `Ignoring GPS jump of ${Math.round(movedMeters)}m`);
            gpsMovementCandidateRef.current = null;
            return;
          }

          const stationaryThreshold = Math.max(15, accuracy * 1.5);
          if (speed < 1.5 || movedMeters <= stationaryThreshold) {
            gpsMovementCandidateRef.current = null;
            return;
          }

          const candidate = gpsMovementCandidateRef.current;
          const candidateConsistencyThreshold = Math.max(10, accuracy);
          if (
            !candidate ||
            getDistanceInMeters(
              candidate.latitude,
              candidate.longitude,
              latitude,
              longitude,
            ) > candidateConsistencyThreshold
          ) {
            gpsMovementCandidateRef.current = {
              latitude,
              longitude,
              speed,
              count: 1,
            };
            return;
          }

          const confirmedCount = candidate.count + 1;
          if (confirmedCount < 2 || candidate.speed < 1.5) {
            gpsMovementCandidateRef.current = {
              latitude,
              longitude,
              speed,
              count: confirmedCount,
            };
            return;
          }
        }

        // Prefer the direction the driver is actually moving. Device compass
        // heading can point elsewhere when the phone is mounted at an angle.
        // Only compute bearing from movement when speed is above noise floor.
        let desiredHeading = rawHeading;
        if (speed > 2.0 && previousGps && (pos.coords.accuracy ?? 0) <= 35) {
          const movedMeters = getDistanceInMeters(
            previousGps.latitude,
            previousGps.longitude,
            latitude,
            longitude,
          );
          if (movedMeters > 2) {
            const lat1 = (previousGps.latitude * Math.PI) / 180;
            const lat2 = (latitude * Math.PI) / 180;
            const deltaLng = ((longitude - previousGps.longitude) * Math.PI) / 180;
            const y = Math.sin(deltaLng) * Math.cos(lat2);
            const x =
              Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
            desiredHeading = (Math.atan2(y, x) * 180) / Math.PI;
            if (desiredHeading < 0) desiredHeading += 360;
          }
        }

        // Ignore unreliable course while nearly stationary and smooth across
        // the 0/360 degree boundary so the icon never spins the long way round.
        // Threshold raised to 2 m/s (~7 km/h): GPS noise commonly reports
        // 0.5-2 m/s when parked, which previously caused jitter.
        let heading = lastHeadingRef.current;
        if (desiredHeading >= 0 && Number.isFinite(desiredHeading) && speed > 2.0) {
          const delta = ((desiredHeading - heading + 540) % 360) - 180;
          heading = (heading + delta * 0.65 + 360) % 360;
        }
        lastHeadingRef.current = heading;
        previousGpsRef.current = { latitude, longitude };
        previousGpsTimestampRef.current = timestamp;
        gpsMovementCandidateRef.current = null;

        setGps({
          latitude,
          longitude,
          heading: heading,
          speed: speed,
          accuracy: Number.isFinite(accuracy) ? accuracy : 0,
        });
        setGpsReady(true);
      };

      // Quick first fix
      Geolocation.getCurrentPosition(
        updateLocationState,
        err => logger.warn(TAG, `First fix error: ${err.message}`),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
          forceRequestLocation: true,
        },
      );

      // Continuous watch
      watchId.current = Geolocation.watchPosition(
        updateLocationState,
        err => logger.warn(TAG, `Watch error: ${err.message}`),
        {
          enableHighAccuracy: true,
          distanceFilter: 3,
          interval: 1500,
          fastestInterval: 1000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    })();
    return () => {
      mounted = false;
      if (watchId.current !== null) Geolocation.clearWatch(watchId.current);
    };
  }, []);

  // ── Smart Dynamic Zoom Camera Follow (No jumpy shifts) ───────────────────
  useEffect(() => {
    if (!gps || !mapRef.current) return;

    if (!hasCentered.current) {
      mapRef.current.animateToRegion(
        {
          latitude: gps.latitude,
          longitude: gps.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        700,
      );
      hasCentered.current = true;
      return;
    }

    const zoomLevel = targetLatLng ? 18 : 17;
    const pitchVal = targetLatLng ? 45 : 0;
    mapRef.current.animateCamera(
      {
        center: { latitude: gps.latitude, longitude: gps.longitude },
        zoom: zoomLevel,
        // Use road-aligned bearing from polyline instead of noisy GPS compass
        heading: routeHeading,
        pitch: pitchVal,
      },
      { duration: 850 },
    );
  }, [gps?.latitude, gps?.longitude, targetLatLng, routeHeading]);

  const navigationInstructions = useMemo(() => {
    if (
      !gps ||
      routeCoords.length === 0 ||
      !targetLatLng ||
      routeSteps.length === 0
    ) {
      return {
        instruction: 'Calculating route...',
        roadName: 'Navigating...',
        icon: 'navigate',
        thenIcon: 'arrow-up',
        thenText: 'Straight',
        distanceText: '',
        remainingDistance: Infinity,
        maneuverKey: '',
      };
    }

    // 1. Find the step index that the user is currently closest to
    let currentStepIdx = 0;
    let minDistanceToRoute = Infinity;

    for (let i = 0; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      for (const pt of step.coordinates) {
        const d = getDistanceInMeters(
          gps.latitude,
          gps.longitude,
          pt.latitude,
          pt.longitude,
        );
        if (d < minDistanceToRoute) {
          minDistanceToRoute = d;
          currentStepIdx = i;
        }
      }
    }

    // 2. Compute exact remaining distance on current step
    let remainingDistance = 0;
    const currentStep = routeSteps[currentStepIdx];
    if (currentStep && currentStep.coordinates.length > 0) {
      let closestPtIdx = 0;
      let minPtDist = Infinity;
      for (let i = 0; i < currentStep.coordinates.length; i++) {
        const d = getDistanceInMeters(
          gps.latitude,
          gps.longitude,
          currentStep.coordinates[i].latitude,
          currentStep.coordinates[i].longitude,
        );
        if (d < minPtDist) {
          minPtDist = d;
          closestPtIdx = i;
        }
      }

      // Distance from user's current GPS to the closest polyline point on current step
      remainingDistance += getDistanceInMeters(
        gps.latitude,
        gps.longitude,
        currentStep.coordinates[closestPtIdx].latitude,
        currentStep.coordinates[closestPtIdx].longitude,
      );

      // Add distance from the closest point to the end of the current step
      for (let i = closestPtIdx; i < currentStep.coordinates.length - 1; i++) {
        remainingDistance += getDistanceInMeters(
          currentStep.coordinates[i].latitude,
          currentStep.coordinates[i].longitude,
          currentStep.coordinates[i + 1].latitude,
          currentStep.coordinates[i + 1].longitude,
        );
      }
    }

    const distanceVal = Math.round(remainingDistance);
    const distanceText =
      distanceVal >= 1000
        ? `${(distanceVal / 1000).toFixed(1)} km`
        : `${distanceVal}m`;

    // 3. Determine primary maneuver (usually the NEXT step's action, executed at the end of the current step)
    let iconName = 'arrow-up';
    let turnAction = 'Keep straight';
    let roadName = 'Main Road';

    const nextStep = routeSteps[currentStepIdx + 1];

    if (nextStep) {
      const details = getManeuverDetails(
        nextStep.maneuver,
        nextStep.html_instructions,
      );
      iconName = details.icon;
      turnAction = details.text;
      roadName = extractRoadName(nextStep.html_instructions);
    } else {
      // No next step: we are on the final leg
      iconName = 'flag';
      turnAction = 'Arrive at destination';
      const lastStep = routeSteps[currentStepIdx];
      roadName = lastStep
        ? extractRoadName(lastStep.html_instructions)
        : 'Destination';
    }

    // 4. Determine secondary maneuver ("Then...")
    let thenIcon = 'arrow-up';
    let thenText = 'Straight';

    const nextNextStep = routeSteps[currentStepIdx + 2];
    if (nextNextStep) {
      const details = getManeuverDetails(
        nextNextStep.maneuver,
        nextNextStep.html_instructions,
      );
      thenIcon = details.icon;
      thenText = details.text;
    } else if (nextStep) {
      thenIcon = 'flag';
      thenText = 'Arrive';
    } else {
      thenIcon = 'flag';
      thenText = 'Arrive';
    }

    return {
      instruction: `${turnAction} in ${distanceText}`,
      roadName: roadName,
      icon: iconName,
      thenIcon: thenIcon,
      thenText: `Then ${thenText.toLowerCase()}`,
      distanceText: distanceText,
      remainingDistance,
      // Keep the spoken prompt tied to a maneuver, not to changing GPS/map renders.
      maneuverKey: `${nextStep?.html_instructions ?? 'destination'}:${turnAction}:${roadName}`,
    };
  }, [
    gps?.latitude,
    gps?.longitude,
    routeCoords.length,
    targetLatLng,
    routeSteps,
  ]);

  // ── Text to Speech (TTS) — Google Maps Style Navigation Voice ───────────
  const spokenManeuverRef = useRef('');
  const spokenDistanceLevelRef = useRef(-1);

  // Configure TTS engine once on mount for clear navigation speech
  useEffect(() => {
    try {
      Tts.setDefaultLanguage('en-IN');
      Tts.setDefaultRate(0.5);
      Tts.setDefaultPitch(1.0);
    } catch (err) {
      logger.warn(TAG, 'TTS config failed: ' + err);
    }
  }, []);

  // Stop speech when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      try { Tts.stop(); } catch (err) {
        logger.warn(TAG, 'Failed to stop TTS on blur: ' + err);
      }
    }
  }, [isFocused]);

  useEffect(() => {
    return () => {
      try { Tts.stop(); } catch (err) {
        logger.warn(TAG, 'Failed to stop TTS on unmount: ' + err);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      try { Tts.stop(); } catch (err) {
        logger.warn(TAG, 'Failed to stop TTS when unfocused: ' + err);
      }
      return;
    }

    if (!soundEnabled || !targetLatLng || !navigationActive) return;
    if (navigationInstructions.instruction === 'Calculating route...') return;

    const dist = navigationInstructions.remainingDistance;
    const turnAction = navigationInstructions.instruction.split(' in ')[0];
    const road = navigationInstructions.roadName;
    const isArriving = turnAction === 'Arrive at destination';

    // 4-tier Google Maps style announcements:
    // Tier 0 (<=1000m): "In 1 kilometer, turn left onto MG Road"
    // Tier 1 (<=500m):  "In 500 meters, turn left"
    // Tier 2 (<=200m):  "In 200 meters, turn left onto MG Road"
    // Tier 3 (<=50m):   "Turn left now"  /  "You have arrived"
    const TIERS = [
      {
        threshold: 1000,
        build: (d: string, t: string, r: string) =>
          r && r !== 'Main Road' && r !== 'Navigating...'
            ? `In ${d}, ${t.toLowerCase()} onto ${r}`
            : `In ${d}, ${t.toLowerCase()}`,
      },
      {
        threshold: 500,
        build: (d: string, t: string, _r: string) =>
          `In ${d}, ${t.toLowerCase()}`,
      },
      {
        threshold: 200,
        build: (d: string, t: string, r: string) =>
          r && r !== 'Main Road' && r !== 'Navigating...'
            ? `In ${d}, ${t.toLowerCase()} onto ${r}`
            : `In ${d}, ${t.toLowerCase()}`,
      },
      {
        threshold: 50,
        build: (_d: string, t: string, _r: string) =>
          isArriving ? 'You have arrived at your destination' : `${t} now`,
      },
    ];

    // Find the most urgent (highest-index) tier we are within
    let tierIdx = -1;
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (dist <= TIERS[i].threshold) {
        tierIdx = i;
        break;
      }
    }
    if (tierIdx < 0) return;

    // Reset tier tracking when the maneuver changes
    if (spokenManeuverRef.current !== navigationInstructions.maneuverKey) {
      spokenManeuverRef.current = navigationInstructions.maneuverKey;
      spokenDistanceLevelRef.current = -1;
    }
    if (tierIdx <= spokenDistanceLevelRef.current) return;
    spokenDistanceLevelRef.current = tierIdx;

    // Human-friendly distance string
    const distStr =
      dist >= 1000
        ? `${(dist / 1000).toFixed(1).replace('.0', '')} kilometer${dist >= 2000 ? 's' : ''}`
        : `${Math.round(dist)} meters`;

    const speechText = TIERS[tierIdx].build(distStr, turnAction, road);

    try {
      Tts.stop();
      Tts.speak(speechText);
    } catch (err) {
      logger.warn(TAG, 'TTS Speech playback failed: ' + err);
    }
  }, [
    isFocused,
    navigationInstructions.instruction,
    navigationInstructions.remainingDistance,
    navigationInstructions.maneuverKey,
    navigationInstructions.roadName,
    targetLatLng,
    navigationActive,
    soundEnabled,
  ]);

  const parsedStops = useMemo(() => {
    return parseStops(stopsParam);
  }, [stopsParam]);

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
    if (!targetLatLng || !gpsReady || !gps) {
      setRouteCoords([]);
      setRouteDistance(undefined);
      setRouteDuration(undefined);
      setRouteSteps([]);
      return;
    }
    setNavigationActive(true);
    let active = true;

    const waypoints = isHeadingToDrop ? stopLatLngs : [];

    // map
    fetchGoogleRoute(
      { latitude: gps.latitude, longitude: gps.longitude },
      targetLatLng,
      waypoints,
    ).then(res => {
      if (active) {
        setRouteCoords(res.coordinates);
        setRouteDistance(res.distance);
        setRouteDuration(res.timeWithTraffic || res.normalTime);

        setRouteSteps(res.steps || []);
        if (mapRef.current) {
          mapRef.current.animateCamera(
            {
              center: { latitude: gps.latitude, longitude: gps.longitude },
              zoom: 18,
              // routeHeading memo hasn't recomputed yet at this point, so read
              // the ref directly — it holds the same value the memo will return.
              heading: lastRouteBearingRef.current,
              pitch: 45,
            },
            { duration: 800 },
          );
        }
      }
    });
    return () => {
      active = false;
    };
  }, [targetLatLng, gpsReady, stopLatLngs, isHeadingToDrop]);

  useEffect(() => {
    lastProgressIndexRef.current = 0;
  }, [targetLatLng?.latitude, targetLatLng?.longitude]);

  // Dynamically trim routeCoords as driver coordinates update:
  // Show only remainingCoords ahead of driver towards target (traversed path is removed)
  const { remainingCoords, distanceToRoute } = useMemo(() => {
    if (routeCoords.length === 0 || !gps) {
      return { remainingCoords: routeCoords, distanceToRoute: 0 };
    }
    const res = splitRouteAtLocation(
      routeCoords,
      { latitude: gps.latitude, longitude: gps.longitude },
      lastProgressIndexRef.current,
    );
    lastProgressIndexRef.current = res.closestSegmentIndex;
    return {
      remainingCoords: res.remaining.length >= 2 ? res.remaining : routeCoords,
      distanceToRoute: res.distanceToRoute,
    };
  }, [routeCoords, gps?.latitude, gps?.longitude]);

  // ── Road-aligned heading from polyline (replaces noisy GPS compass) ────────
  // Finds the closest road segment and returns its forward bearing (0–360°).
  // A 70/30 low-pass prevents abrupt jumps at route segment boundaries.
  const routeHeading = useMemo(() => {
    if (!gps) return lastRouteBearingRef.current;
    const raw = getBearingFromPolyline(remainingCoords, {
      latitude: gps.latitude,
      longitude: gps.longitude,
    });
    if (raw === null) return lastRouteBearingRef.current;
    const prev = lastRouteBearingRef.current;
    const delta = ((raw - prev + 540) % 360) - 180;
    const smoothed = (prev + delta * 0.3 + 360) % 360;
    lastRouteBearingRef.current = smoothed;
    return smoothed;
  }, [remainingCoords, gps?.latitude, gps?.longitude]);

  // ── Auto-Reroute: re-fetch when driver goes >80m off the current route ───
  // Bypasses the 5-minute route cache so the new route is always fresh.
  useEffect(() => {
    if (!targetLatLng || !gps || routeCoords.length === 0) return;
    if (gps.accuracy > 20 || gps.speed < 2.5) return;
    const now = Date.now();
    if (distanceToRoute > 100 && now - lastRerouteTimeRef.current > 20000) {
      lastRerouteTimeRef.current = now;
      lastProgressIndexRef.current = 0;
      const waypoints = isHeadingToDrop ? stopLatLngs : [];
      fetchGoogleRoute(
        { latitude: gps.latitude, longitude: gps.longitude },
        targetLatLng,
        waypoints,
        true, // bypassCache — always get a fresh route when rerouting
      ).then(res => {
        if (res.coordinates.length > 0) {
          setRouteCoords(res.coordinates);
          setRouteDistance(res.distance);
          setRouteDuration(res.timeWithTraffic || res.normalTime);
          setRouteSteps(res.steps || []);
          logger.info(TAG, `Auto-rerouted: driver was ${Math.round(distanceToRoute)}m off route`);
        }
      });
    }
  }, [distanceToRoute, gps, targetLatLng, isHeadingToDrop, stopLatLngs, routeCoords.length]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View className="flex-1 bg-lightBg dark:bg-darkBg">
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />

        {/* ── NATIVE GOOGLE MAP ─────────────────────────────────────────── */}
        <ThemedMapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE} // Google Map Provider Set kiya
          style={MAP_STYLE}
          initialRegion={DEFAULT_REGION}
          showsCompass={false}
          showsScale={false}
          rotateEnabled
          pitchEnabled={false}
          moveOnMarkerPress={false}
          showsUserLocation={false}
          loadingEnabled={!gpsReady}
          loadingBackgroundColor={isDark ? COLORS.darkBg : '#0F172A'}
          loadingIndicatorColor={COLORS.primary}
        >
          {/* OSM UrlTile ko hata diya hai, ab direct original Google Map load hoga */}

          {gps && (
            <DriverMarker
              ref={markerRef}
              latitude={gps.latitude}
              longitude={gps.longitude}
              // heading={
              //   // Use road-aligned bearing from polyline instead of noisy GPS compass
              //   routeHeading
              // }
               heading={0}
              vehicleMapIcon={
                vehicle?.vehicleMapIcon ||
                vehicle?.serviceId?.vehicleMapIcon ||
                vehicle?.vehicleImage ||
                vehicle?.serviceId?.vehicleImage
              }
            />
          )}

          {targetLatLng && (
            <Marker
              coordinate={targetLatLng}
              title={isHeadingToDrop ? 'Drop Location' : 'Pickup Location'}
              description={params?.drop?.address || params?.pickup?.address}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View className="items-center">
                <View
                  className={`px-2 py-0.5 rounded-full border border-white flex-row items-center gap-1 shadow-md mb-0.5 ${isHeadingToDrop ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                >
                  <Text className="text-[10px] font-black text-white">
                    {isHeadingToDrop ? 'DROP' : 'PICKUP'}
                  </Text>
                </View>
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-lg ${isHeadingToDrop ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                >
                  <Icon
                    name={isHeadingToDrop ? 'flag' : 'location'}
                    size={16}
                    color="white"
                  />
                </View>
              </View>
            </Marker>
          )}

          {/* Stops Markers */}
          {parsedStops.length > 0 &&
            parsedStops.map((stop: any, idx: number) => {
              if (!stop.latitude || !stop.longitude) return null;
              return (
                <Marker
                  key={`driver-map-stop-${idx}-${stop.latitude}-${stop.longitude}`}
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

          {/* Active route ahead to destination (previous traversed route removed, stable key prevents ghost polylines) */}
          {remainingCoords.length >= 2 && (
            <Polyline
              key="driver-map-active-polyline"
              coordinates={remainingCoords}
              strokeColor="#10B981"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </ThemedMapView>

        {/* ── GPS acquiring overlay ─────────────────────────────────────────────────────── */}
        {!gpsReady && (
          <Animated.View
            entering={FadeIn}
            className="absolute self-center z-30 bg-slate-900/90 rounded-2xl px-4 py-2.5 flex-row items-center gap-2.5"
            style={{ top: SAFE_TOP + 14 }}
          >
            <View className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <Text className="text-white text-xs font-semibold tracking-wide">
              Getting your location…
            </Text>
          </Animated.View>
        )}

        {/* ── TOP BAR ───────────────────────────────────────────────────── */}
        <View
          className="absolute left-0 top-2 right-4 z-20 flex-row items-center justify-between"
          // style={{ top: SAFE_TOP }}
          pointerEvents="box-none"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-11 h-11 rounded-full bg-slate-900/80 items-center justify-center border border-slate-700/60 shadow-lg active:opacity-80"
          >
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Route HUD if navigation target active */}
          {targetLatLng && navigationActive && (
            /* Route direction pill */
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="flex-1 ml-3 rounded-2xl p-4 flex-row items-center gap-4.5 bg-emerald-800 border border-emerald-700 relative"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
                marginBottom: 20,
              }}
            >
              {/* Left: Turn Arrow Icon */}
              <View className="w-12 h-12 rounded-xl bg-emerald-950/45 items-center justify-center border border-emerald-700/50">
                <Icon
                  name={`${navigationInstructions.icon}-outline`}
                  size={28}
                  color="#FFFFFF"
                />
              </View>

              {/* Center: Instruction and Road Name */}
              <View className="flex-1">
                <Text className="text-[11px] font-black text-emerald-200 uppercase tracking-wider">
                  {navigationInstructions.instruction}
                </Text>
                <Text
                  className="text-base font-black text-white mt-0.5"
                  numberOfLines={2}
                >
                  {navigationInstructions.roadName}
                </Text>
              </View>

              {/* Bottom floating 'Then' Pill */}
              <View className="absolute -bottom-6 left-4 bg-emerald-900 border border-emerald-700 px-3 py-1 rounded-lg flex-row items-center gap-1.5 shadow-sm">
                <Text className="text-[10px] font-black text-emerald-200 uppercase">
                  {navigationInstructions.thenText}
                </Text>
                <Icon
                  name={`${navigationInstructions.thenIcon}-outline`}
                  size={11}
                  color="#A7F3D0"
                />
              </View>
            </Animated.View>
          )}
        </View>

        {/* ── BOTTOM SHEET ─────────────────────────────────────────────── */}
        <View
          className={
            targetLatLng && navigationActive
              ? 'absolute left-0 right-0 bottom-0 z-20'
              : 'absolute left-4 right-4 z-20'
          }
          style={{ bottom: targetLatLng && navigationActive ? 0 : SAFE_BOTTOM }}
          pointerEvents="box-none"
        >
          {targetLatLng && navigationActive && (
            /* ── Google Maps style navigation bottom sheet ── */
            <View className="bg-lightBg dark:bg-darkCard border-t border-lightBorder dark:border-darkBorder rounded-t-[32px] pt-4 pb-8 px-6 flex-row items-center justify-between shadow-2xl">
              {/* Round Close 'X' Button */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-12 h-12 rounded-full bg-lightCard dark:bg-darkBg items-center justify-center border border-lightBorder dark:border-darkBorder active:opacity-80"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Icon
                  name="close"
                  size={24}
                  color={isDark ? COLORS.textDark : COLORS.textLight}
                />
              </TouchableOpacity>

              {/* Stats Column */}
              <View className="flex-1 items-center justify-center">
                {/* Drag handle */}
                <View className="w-10 h-1 bg-lightBorder dark:bg-darkBorder rounded-full mb-2" />

                <Text className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                  {routeDuration || '-- min'}
                </Text>

                <Text className="text-xs font-extrabold text-textLightSecondary dark:text-textDarkSecondary mt-1">
                  {routeDistance || '-- km'} • {getArrivalTime(routeDuration)}
                </Text>
              </View>

              {/* Google Maps Direct Navigation Button */}
              <TouchableOpacity
                onPress={openExternalGoogleMaps}
                activeOpacity={0.8}
                className="w-12 h-12 rounded-full bg-emerald-600 dark:bg-emerald-500 items-center justify-center border border-emerald-400 shadow-md"
                style={{
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Icon name="navigate" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── GOOGLE MAPS FLOATING PILL BUTTON ── */}
        {targetLatLng && (
          <Animated.View
            entering={FadeInDown.delay(200)}
            className="absolute left-4 z-20"
            style={{
              bottom: targetLatLng && navigationActive ? 210 : SAFE_BOTTOM + 80,
            }}
          >
            <TouchableOpacity
              onPress={openExternalGoogleMaps}
              activeOpacity={0.8}
              className="flex-row items-center gap-2 bg-emerald-600 px-4 py-3 rounded-full border-2 border-white dark:border-slate-800 shadow-xl"
              style={{
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 5,
                elevation: 5,
              }}
            >
              <Icon name="navigate" size={18} color="#FFFFFF" />
              <Text className="text-white text-xs font-black uppercase tracking-wider">
                Google Maps
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── SOUND TOGGLE BADGE (Floating above Bottom Sheet / Speedometer) ── */}
        {targetLatLng && navigationActive && (
          <Animated.View
            entering={FadeInDown.delay(300)}
            className="absolute left-4 z-20"
            style={{
              bottom: targetLatLng && navigationActive ? 140 : SAFE_BOTTOM + 16,
            }}
          >
            <TouchableOpacity
              onPress={toggleSound}
              className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 items-center justify-center border-2 border-lightBorder dark:border-darkBorder shadow-xl active:opacity-80"
            >
              <Icon
                name={soundEnabled ? 'volume-medium' : 'volume-mute'}
                size={24}
                color={soundEnabled ? '#10B981' : '#EF4444'}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── RE-CENTER MY LOCATION BUTTON ── */}
        {gps && (
          <Animated.View
            entering={FadeInDown.delay(100)}
            className="absolute right-4 z-20"
            style={{
              bottom:
                targetLatLng && navigationActive ? 230 : SAFE_BOTTOM + 110,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if (mapRef.current && gps) {
                  mapRef.current.animateCamera(
                    {
                      center: {
                        latitude: gps.latitude,
                        longitude: gps.longitude,
                      },
                      zoom: 18,
                      heading:
                        gps.heading >= 0 ? gps.heading : lastHeadingRef.current,
                      pitch: 0,
                    },
                    { duration: 600 },
                  );
                }
              }}
              className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 items-center justify-center border-2 border-slate-200 dark:border-slate-800 shadow-xl active:opacity-80"
            >
              <Icon name="locate" size={26} color="#3B82F6" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── GPS ACCURACY / SPEEDOMETER BADGE (Floating above Bottom Sheet) ── */}
        {gps && (
          <Animated.View
            entering={FadeInDown.delay(200)}
            className="absolute right-4 z-20"
            style={{
              bottom: targetLatLng && navigationActive ? 140 : SAFE_BOTTOM + 16,
            }}
          >
            <View className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 border-4 border-emerald-500 items-center justify-center shadow-xl">
              <Text className="text-[24px] font-black text-textLight dark:text-textDark">
                {/* Clamp GPS noise: show 0 when speed is below 2 m/s (≈7 km/h) */}
                {gps.speed >= 2.0 ? Math.round(gps.speed * 3.6) : 0}
              </Text>

              <Text className="text-[9px] font-bold text-slate-500 uppercase -mt-1">
                km/h
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};
const MAP_STYLE = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export default DriverMapScreen;
