// Location types

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LocationCoords extends LatLng {
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface Location {
  coords: LocationCoords;
  timestamp: number;
}

export interface LocationState {
  currentLocation: LatLng | null;
  heading: number;
  speed: number;
  isTracking: boolean;
  permissionGranted: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export type LocationAccuracy = 'high' | 'balanced' | 'low';

export interface LocationServiceOptions {
  accuracy: LocationAccuracy;
  distanceFilter: number;
  interval: number;
  onUpdate: (location: Location) => void;
  onError: (error: Error) => void;
}

export interface LocationUpdate {
  driverId: string;
  vehicleId?: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}
