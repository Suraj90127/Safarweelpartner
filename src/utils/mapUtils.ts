import { Platform } from 'react-native';
import ENV from '../config/env';
import { LatLng } from '../types/location.types';
import logger from './logger';

const TAG = 'mapUtils';

export const decodePolyline = (t: string, precision: number = 5): LatLng[] => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: LatLng[] = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision);

  while (index < t.length) {
    byte = null;
    shift = 0;
    result = 0;
    do {
      byte = t.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do {
      byte = t.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    lat += latitude_change;
    lng += longitude_change;
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
};

export interface GoogleStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  start_location: LatLng;
  end_location: LatLng;
  html_instructions: string;
  maneuver?: string;
  polyline: { points: string };
  coordinates: LatLng[];
}

export interface GoogleRouteResponse {
  coordinates: LatLng[];
  distance?: string;
  timeWithTraffic?: string;
  normalTime?: string;
  steps?: GoogleStep[];
}

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Computes the road-aligned bearing (0–360°) from a polyline at the driver's
 * current position. It finds the closest polyline segment and returns its
 * compass bearing — so the map/marker always points along the road, not from
 * the noisy GPS compass.
 *
 * Returns null when the polyline has fewer than 2 points.
 */
export function getBearingFromPolyline(
  polylineCoords: LatLng[],
  currentLocation: LatLng,
): number | null {
  if (!polylineCoords || polylineCoords.length < 2) return null;

  // Find the segment whose midpoint is closest to the driver
  let minDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const midLat = (polylineCoords[i].latitude + polylineCoords[i + 1].latitude) / 2;
    const midLng = (polylineCoords[i].longitude + polylineCoords[i + 1].longitude) / 2;
    const d = getDistanceInMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      midLat,
      midLng,
    );
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
    // Early exit once we've found a very close segment and started moving away
    if (minDist < 5 && i > bestIdx + 2) break;
  }

  // Compute the forward bearing of the best segment (A → B)
  const a = polylineCoords[bestIdx];
  const b = polylineCoords[bestIdx + 1];

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  if (bearing < 0) bearing += 360;

  return bearing;
}

export function stripHtmlTags(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getManeuverDetails(
  maneuver: string | undefined,
  htmlInstructions: string | undefined
): { icon: string; text: string } {
  const maneuverLower = maneuver?.toLowerCase() || '';
  const htmlLower = htmlInstructions?.toLowerCase() || '';

  // 1. Check maneuver string first
  if (maneuverLower.includes('slight-left') || maneuverLower.includes('slight_left')) {
    return { icon: 'arrow-undo', text: 'Slight left' };
  }
  if (maneuverLower.includes('slight-right') || maneuverLower.includes('slight_right')) {
    return { icon: 'arrow-redo', text: 'Slight right' };
  }
  if (maneuverLower.includes('turn-left') || maneuverLower.includes('fork-left')) {
    return { icon: 'arrow-undo', text: 'Turn left' };
  }
  if (maneuverLower.includes('turn-right') || maneuverLower.includes('fork-right')) {
    return { icon: 'arrow-redo', text: 'Turn right' };
  }
  if (maneuverLower.includes('uturn-left') || maneuverLower.includes('uturn-right')) {
    return { icon: 'arrow-back', text: 'Make a U-turn' };
  }
  if (maneuverLower.includes('keep-left')) {
    return { icon: 'arrow-undo', text: 'Keep left' };
  }
  if (maneuverLower.includes('keep-right')) {
    return { icon: 'arrow-redo', text: 'Keep right' };
  }
  if (maneuverLower.includes('merge')) {
    return { icon: 'arrow-up', text: 'Merge' };
  }
  if (maneuverLower.includes('straight')) {
    return { icon: 'arrow-up', text: 'Go straight' };
  }

  // 2. Fallback to html_instructions parsing
  if (htmlLower.includes('turn <b>left</b>') || htmlLower.includes('turn left')) {
    return { icon: 'arrow-undo', text: 'Turn left' };
  }
  if (htmlLower.includes('turn <b>right</b>') || htmlLower.includes('turn right')) {
    return { icon: 'arrow-redo', text: 'Turn right' };
  }
  if (htmlLower.includes('keep <b>left</b>') || htmlLower.includes('keep left')) {
    return { icon: 'arrow-undo', text: 'Keep left' };
  }
  if (htmlLower.includes('keep <b>right</b>') || htmlLower.includes('keep right')) {
    return { icon: 'arrow-redo', text: 'Keep right' };
  }
  if (htmlLower.includes('merge')) {
    return { icon: 'arrow-up', text: 'Merge' };
  }
  if (htmlLower.includes('u-turn')) {
    return { icon: 'arrow-back', text: 'Make a U-turn' };
  }
  if (htmlLower.includes('head') || htmlLower.includes('straight')) {
    return { icon: 'arrow-up', text: 'Head straight' };
  }

  return { icon: 'arrow-up', text: 'Continue' };
}

export function extractRoadName(htmlInstructions: string): string {
  if (!htmlInstructions) return 'Main Road';
  
  const mainHtml = htmlInstructions.split(/<div/i)[0];
  
  const ontoMatch = mainHtml.match(/onto\s+<b>([^<]+)<\/b>/i);
  if (ontoMatch) return ontoMatch[1].trim();
  
  const towardMatch = mainHtml.match(/toward\s+<b>([^<]+)<\/b>/i);
  if (towardMatch) return towardMatch[1].trim();

  const cleanText = stripHtmlTags(mainHtml);
  
  const ontoIndex = cleanText.toLowerCase().indexOf('onto ');
  if (ontoIndex !== -1) {
    return cleanText.substring(ontoIndex + 5).trim();
  }
  
  const towardIndex = cleanText.toLowerCase().indexOf('toward ');
  if (towardIndex !== -1) {
    return cleanText.substring(towardIndex + 7).trim();
  }
  
  return cleanText;
}

interface CacheEntry {
  origin: LatLng;
  destination: LatLng;
  response: GoogleRouteResponse;
  timestamp: number;
}

const routeCache: { [key: string]: CacheEntry } = {};
const CACHE_TTL_MS = 300000; // 5 minutes cache validity

const getCacheKey = (origin: LatLng, destination: LatLng, waypoints?: LatLng[]) => {
  const lat1 = origin.latitude.toFixed(4);
  const lng1 = origin.longitude.toFixed(4);
  const lat2 = destination.latitude.toFixed(4);
  const lng2 = destination.longitude.toFixed(4);
  let wpKey = '';
  if (waypoints && waypoints.length > 0) {
    wpKey = '|wp:' + waypoints.map(wp => `${wp.latitude.toFixed(4)},${wp.longitude.toFixed(4)}`).join('|');
  }
  return `${lat1},${lng1}->${lat2},${lng2}${wpKey}`;
};

export const fetchGoogleRoute = async (
  origin: LatLng,
  destination: LatLng,
  waypoints?: LatLng[],
  bypassCache?: boolean,
): Promise<GoogleRouteResponse> => {
  const cacheKey = getCacheKey(origin, destination, waypoints);
  const cached = routeCache[cacheKey];
  const now = Date.now();

  if (!bypassCache && cached && now - cached.timestamp < CACHE_TTL_MS) {
    // console.log(`[mapUtils] Route cache HIT for key: ${cacheKey}`);
    return cached.response;
  }

  // console.log(`[mapUtils] Route cache MISS for key: ${cacheKey}. Fetching from Google Directions API.`);

  const apiKey =
    Platform.OS === 'ios'
      ? ENV.GOOGLE_MAPS_API_KEY_IOS
      : ENV.GOOGLE_MAPS_API_KEY_ANDROID;

  let waypointsStr = '';
  if (waypoints && waypoints.length > 0) {
    const formattedWaypoints = waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|');
    waypointsStr = `&waypoints=${encodeURIComponent(formattedWaypoints)}`;
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=two_wheeler&departure_time=now${waypointsStr}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const json = await response.json();

    if (json.status !== 'OK') {
      logger.error(TAG, `Google Directions API error: ${json.status} - ${json.error_message || ''}`);
      return { coordinates: [] };
    }

    const leg = json.routes[0]?.legs[0];
    const distance = leg?.distance?.text;
    const timeWithTraffic = leg?.duration_in_traffic?.text;
    const normalTime = leg?.duration?.text;

    // console.log(`Distance: ${distance}`);
    // console.log(`Live Travel Time: ${timeWithTraffic}`);

    const steps: GoogleStep[] = leg?.steps?.map((step: any) => ({
      distance: step.distance,
      duration: step.duration,
      start_location: { latitude: step.start_location.lat, longitude: step.start_location.lng },
      end_location: { latitude: step.end_location.lat, longitude: step.end_location.lng },
      html_instructions: step.html_instructions,
      maneuver: step.maneuver,
      polyline: step.polyline,
      coordinates: decodePolyline(step.polyline.points),
    })) || [];

    if (json.routes && json.routes.length > 0) {
      const points = json.routes[0].overview_polyline.points;
      const resVal: GoogleRouteResponse = {
        coordinates: decodePolyline(points),
        distance,
        timeWithTraffic,
        normalTime,
        steps,
      };
      
      routeCache[cacheKey] = {
        origin,
        destination,
        response: resVal,
        timestamp: Date.now(),
      };

      return resVal;
    }
  } catch (error: any) {
    logger.error(TAG, `Failed to fetch route: ${error.message}`);
  }

  return { coordinates: [] };
};

const geocodeCache = new Map<string, LatLng>();

export const geocodeAddress = async (address: string): Promise<LatLng | null> => {
  if (!address) return null;
  const trimmed = address.trim().toLowerCase();
  if (geocodeCache.has(trimmed)) {
    return geocodeCache.get(trimmed)!;
  }

  const apiKey =
    Platform.OS === 'ios'
      ? ENV.GOOGLE_MAPS_API_KEY_IOS
      : ENV.GOOGLE_MAPS_API_KEY_ANDROID;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const json = await response.json();

    if (json.status === 'OK' && json.results && json.results.length > 0) {
      const location = json.results[0].geometry.location;
      const result: LatLng = {
        latitude: location.lat,
        longitude: location.lng,
      };
      geocodeCache.set(trimmed, result);
      return result;
    } else {
      logger.error(TAG, `Geocoding failed for address: ${address}, status: ${json.status}`);
    }
  } catch (error: any) {
    logger.error(TAG, `Failed to geocode address: ${error.message}`);
  }
  return null;
};

export interface SplitRouteResult {
  traversed: LatLng[];
  remaining: LatLng[];
  closestSegmentIndex: number;
  distanceToRoute: number;
  progressPercent: number;
}

/**
 * Splits route coordinates at the driver's current position:
 * - traversed: The path behind the driver (turns gray like in Google Maps)
 * - remaining: The path ahead from driver to destination (active color)
 */
export const splitRouteAtLocation = (
  routeCoords: LatLng[],
  currentLocation: LatLng,
  lastIndex: number = 0
): SplitRouteResult => {
  if (!routeCoords || routeCoords.length < 2) {
    return {
      traversed: [],
      remaining: routeCoords || [],
      closestSegmentIndex: 0,
      distanceToRoute: 0,
      progressPercent: 0,
    };
  }

  if (
    !currentLocation ||
    typeof currentLocation.latitude !== 'number' ||
    typeof currentLocation.longitude !== 'number' ||
    isNaN(currentLocation.latitude) ||
    isNaN(currentLocation.longitude)
  ) {
    return {
      traversed: [],
      remaining: routeCoords,
      closestSegmentIndex: 0,
      distanceToRoute: 0,
      progressPercent: 0,
    };
  }

  const pLat = currentLocation.latitude;
  const pLng = currentLocation.longitude;

  let minDistance = Infinity;
  let bestIndex = 0;
  let bestProj: LatLng = routeCoords[0];

  // Search forward from around lastIndex to prevent backward jumps on GPS jitter
  let startIndex = 0;
  if (lastIndex > 0 && lastIndex < routeCoords.length - 1) {
    startIndex = Math.max(0, lastIndex - 2);
  }

  for (let i = startIndex; i < routeCoords.length - 1; i++) {
    const a = routeCoords[i];
    const b = routeCoords[i + 1];

    const midLatRad = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
    const cosLat = Math.cos(midLatRad);

    const dx = (b.longitude - a.longitude) * 111320 * cosLat;
    const dy = (b.latitude - a.latitude) * 110540;
    const segLenSq = dx * dx + dy * dy;

    let proj: LatLng;
    if (segLenSq < 1e-4) {
      proj = a;
    } else {
      const wx = (pLng - a.longitude) * 111320 * cosLat;
      const wy = (pLat - a.latitude) * 110540;
      const t = Math.max(0, Math.min(1, (wx * dx + wy * dy) / segLenSq));
      proj = {
        latitude: a.latitude + t * (b.latitude - a.latitude),
        longitude: a.longitude + t * (b.longitude - a.longitude),
      };
    }

    const dist = getDistanceInMeters(pLat, pLng, proj.latitude, proj.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
      bestProj = proj;
    }

    if (minDistance < 6 && i > lastIndex + 3) {
      break;
    }
  }

  // If driver deviated or returned to screen and distance is > 50m, search earlier segments
  if (startIndex > 0 && minDistance > 50) {
    for (let i = 0; i < startIndex; i++) {
      const a = routeCoords[i];
      const b = routeCoords[i + 1];

      const midLatRad = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
      const cosLat = Math.cos(midLatRad);

      const dx = (b.longitude - a.longitude) * 111320 * cosLat;
      const dy = (b.latitude - a.latitude) * 110540;
      const segLenSq = dx * dx + dy * dy;

      let proj: LatLng;
      if (segLenSq < 1e-4) {
        proj = a;
      } else {
        const wx = (pLng - a.longitude) * 111320 * cosLat;
        const wy = (pLat - a.latitude) * 110540;
        const t = Math.max(0, Math.min(1, (wx * dx + wy * dy) / segLenSq));
        proj = {
          latitude: a.latitude + t * (b.latitude - a.latitude),
          longitude: a.longitude + t * (b.longitude - a.longitude),
        };
      }

      const dist = getDistanceInMeters(pLat, pLng, proj.latitude, proj.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
        bestProj = proj;
      }

      if (minDistance < 6) {
        break;
      }
    }
  }

  const cleanConsecutive = (list: LatLng[]): LatLng[] => {
    const res: LatLng[] = [];
    for (let i = 0; i < list.length; i++) {
      const pt = list[i];
      if (res.length === 0) {
        res.push(pt);
      } else {
        const last = res[res.length - 1];
        if (
          Math.abs(pt.latitude - last.latitude) > 1e-5 ||
          Math.abs(pt.longitude - last.longitude) > 1e-5
        ) {
          res.push(pt);
        }
      }
    }
    return res;
  };

  // Traversed path: Start of route up to bestIndex, bestProj, then currentLocation
  let traversed: LatLng[] = [];
  const distFromStart = getDistanceInMeters(
    routeCoords[0].latitude,
    routeCoords[0].longitude,
    pLat,
    pLng
  );
  if (bestIndex > 0 || distFromStart > 12) {
    traversed = cleanConsecutive([
      ...routeCoords.slice(0, bestIndex + 1),
      bestProj,
      currentLocation,
    ]);
  }

  // Draw only the route geometry. Starting this line at the raw GPS location
  // creates a straight shortcut from the road to the driver's off-route GPS fix.
  const remaining = cleanConsecutive([
    bestProj,
    ...routeCoords.slice(bestIndex + 1),
  ]);

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((bestIndex / (routeCoords.length - 1)) * 100))
  );

  return {
    traversed: traversed.length >= 2 ? traversed : [],
    remaining: remaining.length >= 2 ? remaining : routeCoords,
    closestSegmentIndex: bestIndex,
    distanceToRoute: minDistance,
    progressPercent,
  };
};
