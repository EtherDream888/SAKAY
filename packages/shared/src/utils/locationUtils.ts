/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export const calculateHaversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates (alias for calculateHaversineKm)
 */
export const getDistanceKm = calculateHaversineKm;

/**
 * Formats distance into a human-friendly string (e.g. "450 m" or "2.3 km")
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][]; // [lat, lng]
  source: 'osrm' | 'haversine';
}

/**
 * Queries OSRM road network for accurate driving distance, duration & road geometry coordinates
 */
export const getOSRMRoute = async (
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number
): Promise<RouteResult> => {
  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
        const durationMin = Math.max(1, Math.round(route.duration / 60));
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );

        return {
          distanceKm,
          durationMin,
          coordinates,
          source: 'osrm',
        };
      }
    } catch (err) {
      console.warn(`[getOSRMRoute] Endpoint request issue: ${url}`, err);
    }
  }

  // Fallback if public road routing servers are unreachable
  const straightKm = calculateHaversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const estimatedKm = Math.round(straightKm * 1.3 * 100) / 100;
  const estimatedMin = Math.max(1, Math.round((estimatedKm / 20) * 60));

  return {
    distanceKm: estimatedKm,
    durationMin: estimatedMin,
    coordinates: [
      [pickupLat, pickupLng],
      [dropoffLat, dropoffLng],
    ],
    source: 'haversine',
  };
};

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * Retrieves cached device position from localStorage if available
 */
export const getCachedDevicePosition = (): LocationCoords | null => {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const lat = localStorage.getItem("user_lat");
    const lng = localStorage.getItem("user_lng");
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
        return { latitude: parsedLat, longitude: parsedLng };
      }
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Requests real device location with high-accuracy first and fast low-accuracy (network/Wi-Fi) fallback
 */
export const getCurrentDevicePosition = (): Promise<LocationCoords> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser/device."));
      return;
    }

    const saveSuccess = (position: GeolocationPosition) => {
      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      try {
        localStorage.setItem("user_lat", coords.latitude.toString());
        localStorage.setItem("user_lng", coords.longitude.toString());
        localStorage.setItem("gps_permission", "true");
        localStorage.setItem("sakay_driver_location_permission", "always");
      } catch {}

      resolve(coords);
    };

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        saveSuccess,
        (error) => {
          let message = "An error occurred retrieving location.";
          if (error.code === error.PERMISSION_DENIED) {
            message = "Location permission denied by user.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Location information is unavailable.";
          } else if (error.code === error.TIMEOUT) {
            message = "Location request timed out.";
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        }
      );
    };

    // Try high accuracy first (e.g. mobile GPS), fallback quickly to low accuracy (Wi-Fi/cellular/network)
    navigator.geolocation.getCurrentPosition(
      saveSuccess,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission denied by user."));
          return;
        }
        tryLowAccuracy();
      },
      {
        enableHighAccuracy: true,
        timeout: 4000,
        maximumAge: 10000,
      }
    );
  });
};

/**
 * Watches real device position with continuous updates
 */
export const watchDevicePosition = (
  onCoords: (coords: LocationCoords) => void,
  onError?: (err: Error) => void
): number | null => {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  return navigator.geolocation.watchPosition(
    (pos) => {
      const coords: LocationCoords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
      try {
        localStorage.setItem("user_lat", coords.latitude.toString());
        localStorage.setItem("user_lng", coords.longitude.toString());
      } catch {}
      onCoords(coords);
    },
    (err) => {
      if (onError) onError(new Error(err.message));
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }
  );
};
