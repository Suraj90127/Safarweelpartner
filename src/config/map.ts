import ENV from './env';

export const MAP_CONFIG = {
  googleMapsApiKey: ENV.GOOGLE_MAPS_API_KEY_ANDROID,

  defaultRegion: {
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },

  driverMarker: {
    size: 48,
  },

  polyline: {
    strokeWidth: 5,
    strokeColor: '#fe4c01',
    geodesic: true,
  },

  cameraAnimation: {
    duration: 500,
    zoom: 15,
  },

  // Cluster radius in pixels
  clusterRadius: 40,
} as const;
