/**
 * General helpers
 */

import { LatLng } from '../types/location.types';

/** Haversine formula — distance in km between two coordinates */
export const getDistanceKm = (from: LatLng, to: LatLng): number => {
  const R = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => (value * Math.PI) / 180;

/** Compute bearing from source to destination in degrees */
export const getBearing = (from: LatLng, to: LatLng): number => {
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
};

/** Sleep helper for async code */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/** Deep clone (simple, avoids circular ref issues) */
export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/** Clamp a number between min and max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Generate a simple UUID-like unique ID */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

/** Truncate long strings */
export const truncate = (str: string, maxLen: number): string =>
  str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;

/** Parse stop points from FCM / Socket / API payload */
export const parseStops = (raw: any): any[] => {
  if (!raw) return [];
  let rawList =
    raw.stops ??
    raw.stopPoints ??
    raw.stop_points ??
    (Array.isArray(raw) ? raw : null);

  if (typeof rawList === 'string') {
    try {
      rawList = JSON.parse(rawList);
    } catch {
      rawList = [];
    }
  }
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map((stop: any, idx: number) => {
      if (!stop) return null;
      if (typeof stop === 'string') {
        try {
          const parsed = JSON.parse(stop);
          if (parsed && typeof parsed === 'object') stop = parsed;
        } catch {}
      }

      const lat = parseFloat(
        stop.lat ??
        stop.latitude ??
        stop.pickupLat ??
        (Array.isArray(stop.coordinates)
          ? stop.coordinates[1]
          : stop.coordinates?.latitude) ??
        '0',
      );
      const lng = parseFloat(
        stop.lng ??
        stop.longitude ??
        stop.pickupLng ??
        (Array.isArray(stop.coordinates)
          ? stop.coordinates[0]
          : stop.coordinates?.longitude) ??
        '0',
      );

      const title =
        stop.title ||
        stop.name ||
        stop.address ||
        stop.pickupAddress ||
        `Stop ${idx + 1}`;

      const address =
        stop.address && String(stop.address).trim().length > 0
          ? String(stop.address)
          : title;

      return {
        ...stop,
        title,
        address,
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };
    })
    .filter(
      (s: any) =>
        s &&
        ((!isNaN(s.latitude) && s.latitude !== 0) ||
          (!isNaN(s.longitude) && s.longitude !== 0) ||
          (s.address && s.address.length > 0) ||
          (s.title && s.title.length > 0)),
    );
};

/** Helper to resolve a pair of numbers [a, b] into latitude and longitude safely */
const resolveCoordPair = (a: any, b: any, fallbackLat: number, fallbackLng: number): LatLng => {
  const n0 = Number(a);
  const n1 = Number(b);
  if (isNaN(n0) || isNaN(n1)) return { latitude: fallbackLat, longitude: fallbackLng };

  // If one number is clearly in Indian / Asian longitude range (50 to 180) and other is in latitude range (-45 to 45)
  if (n0 > 50 && n0 <= 180 && n1 >= -45 && n1 <= 45) {
    // GeoJSON [longitude, latitude] -> n0 is lng, n1 is lat
    return { latitude: n1, longitude: n0 };
  }
  if (n1 > 50 && n1 <= 180 && n0 >= -45 && n0 <= 45) {
    // Standard [latitude, longitude] -> n0 is lat, n1 is lng
    return { latitude: n0, longitude: n1 };
  }

  // Globally: if one number is > 90 or < -90, it MUST be longitude
  if (Math.abs(n0) > 90 && Math.abs(n1) <= 90) {
    return { latitude: n1, longitude: n0 };
  }
  if (Math.abs(n1) > 90 && Math.abs(n0) <= 90) {
    return { latitude: n0, longitude: n1 };
  }

  // Default GeoJSON convention: index 1 is lat, index 0 is lng
  return { latitude: n1, longitude: n0 };
};

/** Normalize latitude and longitude, automatically correcting swapped coordinates */
export const normalizeLatLng = (lat: number, lng: number, fallbackLat = 0, fallbackLng = 0): LatLng => {
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return { latitude: fallbackLat, longitude: fallbackLng };
  }
  // Auto-correct if latitude and longitude are swapped (e.g., lat: 77.2, lng: 28.6 in India)
  if (Math.abs(lat) > 50 && Math.abs(lng) <= 45) {
    return { latitude: lng, longitude: lat };
  }
  return { latitude: lat, longitude: lng };
};

/** Parse latitude and longitude safely from any object/string/array */
export const parseLatLng = (loc: any, fallbackLat = 0, fallbackLng = 0): LatLng => {
  if (!loc) return { latitude: fallbackLat, longitude: fallbackLng };

  if (typeof loc === 'string') {
    try {
      const parsed = JSON.parse(loc);
      if (parsed && typeof parsed === 'object') {
        return parseLatLng(parsed, fallbackLat, fallbackLng);
      }
    } catch {}
    if (loc.includes(',')) {
      const parts = loc.split(',');
      return resolveCoordPair(parts[0], parts[1], fallbackLat, fallbackLng);
    }
    return { latitude: fallbackLat, longitude: fallbackLng };
  }

  // Direct array [a, b]
  if (Array.isArray(loc)) {
    return resolveCoordPair(loc[0], loc[1], fallbackLat, fallbackLng);
  }

  // Object with coordinates array e.g. { coordinates: [lng, lat] }
  if (Array.isArray(loc.coordinates)) {
    return resolveCoordPair(loc.coordinates[0], loc.coordinates[1], fallbackLat, fallbackLng);
  }

  // Object with nested location object e.g. { location: { coordinates: [lng, lat] } }
  if (loc.location && typeof loc.location === 'object') {
    if (Array.isArray(loc.location.coordinates)) {
      return resolveCoordPair(loc.location.coordinates[0], loc.location.coordinates[1], fallbackLat, fallbackLng);
    }
    const nestedRes = parseLatLng(loc.location, 0, 0);
    if (nestedRes.latitude !== 0 || nestedRes.longitude !== 0) {
      return nestedRes;
    }
  }

  // Object with nested coordinates object e.g. { coordinates: { latitude, longitude } }
  if (loc.coordinates && typeof loc.coordinates === 'object' && !Array.isArray(loc.coordinates)) {
    const lat = Number(loc.coordinates.latitude ?? loc.coordinates.lat);
    const lng = Number(loc.coordinates.longitude ?? loc.coordinates.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return normalizeLatLng(lat, lng, fallbackLat, fallbackLng);
    }
  }

  // Object with coords object e.g. { coords: { latitude, longitude } }
  if (loc.coords && typeof loc.coords === 'object') {
    if (Array.isArray(loc.coords)) {
      return resolveCoordPair(loc.coords[0], loc.coords[1], fallbackLat, fallbackLng);
    }
    const lat = Number(loc.coords.latitude ?? loc.coords.lat);
    const lng = Number(loc.coords.longitude ?? loc.coords.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return normalizeLatLng(lat, lng, fallbackLat, fallbackLng);
    }
  }

  // Direct lat/lng properties on loc
  const rawLat =
    loc.latitude ??
    loc.lat ??
    loc.pickupLat ??
    loc.pickupLatitude ??
    loc.dropLat ??
    loc.dropLatitude ??
    loc.originLat ??
    loc.destinationLat;

  const rawLng =
    loc.longitude ??
    loc.lng ??
    loc.pickupLng ??
    loc.pickupLongitude ??
    loc.dropLng ??
    loc.dropLongitude ??
    loc.originLng ??
    loc.destinationLng;

  if (rawLat !== undefined && rawLng !== undefined) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return normalizeLatLng(lat, lng, fallbackLat, fallbackLng);
    }
  }

  return { latitude: fallbackLat, longitude: fallbackLng };
};

/** Checks if given coordinates match the hardcoded Bangalore fallback while address is elsewhere */
export const isLikelyBangaloreFallback = (lat: number, lng: number, address?: string): boolean => {
  const isBgl = Math.abs(lat - 12.971899) < 0.001 && Math.abs(lng - 77.641151) < 0.001;
  if (!isBgl) return false;
  if (!address) return false;
  const lower = address.toLowerCase();
  return !lower.includes('bengaluru') && !lower.includes('bangalore') && !lower.includes('karnataka');
};

/** Checks if given drop coordinates match the hardcoded Bangalore drop fallback while address is elsewhere */
export const isLikelyBangaloreDropFallback = (lat: number, lng: number, address?: string): boolean => {
  const isBgl = Math.abs(lat - 12.934988) < 0.001 && Math.abs(lng - 77.618388) < 0.001;
  if (!isBgl) return false;
  if (!address) return false;
  const lower = address.toLowerCase();
  return !lower.includes('bengaluru') && !lower.includes('bangalore') && !lower.includes('karnataka');
};

/** Extract pickup coordinates from any ride object or ride candidate */
export const parsePickupLatLng = (ride: any, fallbackLat = 0, fallbackLng = 0): LatLng => {
  if (!ride) return { latitude: fallbackLat, longitude: fallbackLng };

  const address =
    ride.pickupAddress ||
    ride.pickup_address ||
    ride.pickupLocation?.address ||
    ride.pickup?.address ||
    ride.origin?.address ||
    ride.data?.pickupAddress ||
    ride.data?.pickupLocation?.address;

  const candidates = [
    ride.pickup,
    ride.pickupLocation,
    ride.pickup_location,
    ride.origin,
    ride.startLocation,
    ride.start_location,
    ride.fromLocation,
    ride.from,
    ride.location,
    ride.data?.pickup,
    ride.data?.pickupLocation,
    ride.data?.pickup_location,
    ride.ride?.pickup,
    ride.ride?.pickupLocation,
    ride.ride?.pickup_location,
  ];

  for (const cand of candidates) {
    if (cand) {
      const parsed = parseLatLng(cand, 0, 0);
      if (parsed.latitude !== 0 || parsed.longitude !== 0) {
        const candAddr = cand?.address || address;
        if (!isLikelyBangaloreFallback(parsed.latitude, parsed.longitude, candAddr)) {
          return parsed;
        }
      }
    }
  }

  const rawLat =
    ride.pickupLat ??
    ride.pickupLatitude ??
    ride.originLat ??
    ride.fromLat ??
    ride.lat ??
    ride.latitude ??
    ride.data?.pickupLat ??
    ride.data?.pickupLatitude ??
    ride.ride?.pickupLat;

  const rawLng =
    ride.pickupLng ??
    ride.pickupLongitude ??
    ride.originLng ??
    ride.fromLng ??
    ride.lng ??
    ride.longitude ??
    ride.data?.pickupLng ??
    ride.data?.pickupLongitude ??
    ride.ride?.pickupLng;

  if (rawLat !== undefined && rawLng !== undefined) {
    const parsed = normalizeLatLng(Number(rawLat), Number(rawLng), 0, 0);
    if (parsed.latitude !== 0 || parsed.longitude !== 0) {
      if (!isLikelyBangaloreFallback(parsed.latitude, parsed.longitude, address)) {
        return parsed;
      }
    }
  }

  return { latitude: fallbackLat, longitude: fallbackLng };
};

/** Extract drop coordinates from any ride object or ride candidate */
export const parseDropLatLng = (ride: any, fallbackLat = 0, fallbackLng = 0): LatLng => {
  if (!ride) return { latitude: fallbackLat, longitude: fallbackLng };

  const address =
    ride.dropAddress ||
    ride.drop_address ||
    ride.dropLocation?.address ||
    ride.drop?.address ||
    ride.destination?.address ||
    ride.data?.dropAddress ||
    ride.data?.dropLocation?.address;

  const candidates = [
    ride.drop,
    ride.dropLocation,
    ride.drop_location,
    ride.destination,
    ride.destLocation,
    ride.endLocation,
    ride.end_location,
    ride.toLocation,
    ride.to,
    ride.data?.drop,
    ride.data?.dropLocation,
    ride.data?.drop_location,
    ride.ride?.drop,
    ride.ride?.dropLocation,
    ride.ride?.drop_location,
  ];

  for (const cand of candidates) {
    if (cand) {
      const parsed = parseLatLng(cand, 0, 0);
      if (parsed.latitude !== 0 || parsed.longitude !== 0) {
        const candAddr = cand?.address || address;
        if (!isLikelyBangaloreDropFallback(parsed.latitude, parsed.longitude, candAddr)) {
          return parsed;
        }
      }
    }
  }

  const rawLat =
    ride.dropLat ??
    ride.dropLatitude ??
    ride.destinationLat ??
    ride.toLat ??
    ride.data?.dropLat ??
    ride.data?.dropLatitude ??
    ride.ride?.dropLat;

  const rawLng =
    ride.dropLng ??
    ride.dropLongitude ??
    ride.destinationLng ??
    ride.toLng ??
    ride.data?.dropLng ??
    ride.data?.dropLongitude ??
    ride.ride?.dropLng;

  if (rawLat !== undefined && rawLng !== undefined) {
    const parsed = normalizeLatLng(Number(rawLat), Number(rawLng), 0, 0);
    if (parsed.latitude !== 0 || parsed.longitude !== 0) {
      if (!isLikelyBangaloreDropFallback(parsed.latitude, parsed.longitude, address)) {
        return parsed;
      }
    }
  }

  return { latitude: fallbackLat, longitude: fallbackLng };
};

