/**
 * SAKAY Location Service
 * Centralized service for:
 * - Real Browser Geolocation API
 * - Real-time Location State
 * - Place Search & Autocomplete
 * - Reverse Geocoding
 * - OSRM Road Distance & Routing
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  matchBold?: string;
  distance: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][]; // [lat, lng]
  source: "osrm" | "road_estimate";
}

// Fallback Default Center: Calapan City Hall, Oriental Mindoro
export const DEFAULT_CALAPAN_CENTER: LocationCoords = {
  latitude: 13.4115,
  longitude: 121.1803,
};

/**
 * Checks current browser geolocation permission state if supported
 */
export const checkGeolocationPermission = async (): Promise<PermissionState | null> => {
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state; // 'granted' | 'prompt' | 'denied'
    } catch {
      return null;
    }
  }
  return null;
};

export const getCachedDevicePosition = (): LocationCoords | null => {
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
 * Requests real device location via browser Geolocation API with automatic fallback
 */
export const getCurrentDevicePosition = (): Promise<LocationCoords> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
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

      // Cache coordinates locally for instant rehydration across pages
      try {
        localStorage.setItem("user_lat", coords.latitude.toString());
        localStorage.setItem("user_lng", coords.longitude.toString());
        localStorage.setItem("gps_permission", "true");
      } catch {}

      resolve(coords);
    };

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        saveSuccess,
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            try {
              localStorage.setItem("gps_permission", "false");
            } catch {}
          }
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
          try {
            localStorage.setItem("gps_permission", "false");
          } catch {}
          reject(new Error("Location permission denied by user."));
          return;
        }
        // If high accuracy failed due to timeout or unavailable hardware (common on desktop/laptops), try low accuracy
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
 * Watch real device location in real-time
 */
export const watchDevicePosition = (
  onCoords: (coords: LocationCoords) => void,
  onError?: (err: Error) => void
): number | null => {
  if (!navigator.geolocation) return null;

  return navigator.geolocation.watchPosition(
    (position) => {
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
      } catch {}
      onCoords(coords);
    },
    (error) => {
      if (onError) onError(new Error(error.message));
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30000,
    }
  );
};

/**
 * Calculates planar coordinate distance in kilometers (standard equirectangular projection)
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const latDiff = (lat2 - lat1) * 110.574;
  const lonDiff = (lon2 - lon1) * 108.29;
  return Math.round(Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 100) / 100;
};

/**
 * Backward compatibility alias for distance calculation
 */
export const calculateHaversineKm = calculateDistanceKm;

/**
 * Formats distance into a human-friendly string (e.g. "450 m" or "2.3 km")
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

// Recent Destination Interface and Local Storage Helpers
export interface RecentDestination {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export const getRecentsStorageKey = (passengerId?: string): string => {
  const id =
    passengerId ||
    localStorage.getItem("sakay_passenger_id") ||
    localStorage.getItem("sakay_passenger_phone");
  return id ? `sakay_recent_destinations_${id}` : `sakay_recent_destinations_guest`;
};

export const getRecentDestinations = (passengerId?: string): RecentDestination[] => {
  try {
    const key = getRecentsStorageKey(passengerId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveRecentDestination = (
  dest: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  },
  passengerId?: string
): RecentDestination[] => {
  try {
    if (!dest.name || !dest.lat || !dest.lng) return getRecentDestinations(passengerId);
    const existing = getRecentDestinations(passengerId);
    // Filter out duplicates (same name or within 50 meters)
    const filtered = existing.filter((item) => {
      const isSameName = item.name.trim().toLowerCase() === dest.name.trim().toLowerCase();
      const dist = calculateDistanceKm(item.lat, item.lng, dest.lat, dest.lng);
      return !isSameName && dist > 0.05;
    });

    const newItem: RecentDestination = {
      id: `recent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dest.name,
      address: dest.address,
      lat: dest.lat,
      lng: dest.lng,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, 10);
    const key = getRecentsStorageKey(passengerId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Error saving recent destination:", e);
    return [];
  }
};

export const clearRecentDestinations = (passengerId?: string): void => {
  try {
    const key = getRecentsStorageKey(passengerId);
    localStorage.removeItem(key);
    // Clear legacy global un-scoped key as well
    localStorage.removeItem("sakay_recent_destinations");
  } catch {}
};

// Verified prominent local Calapan City landmarks (strictly limited to 5 verified popular places)
export const CURATED_CALAPAN_PLACES: PlaceSuggestion[] = [
  {
    id: "calapan_market",
    name: "Calapan Public Market",
    distance: "1.2 km",
    address: "J. Luna Street, San Vicente North, Calapan City, Oriental Mindoro",
    lat: 13.4131,
    lng: 121.1789,
  },
  {
    id: "calapan_port",
    name: "Calapan Port",
    distance: "2.5 km",
    address: "Port Access Road, San Antonio, Calapan City, Oriental Mindoro",
    lat: 13.4283,
    lng: 121.1946,
  },
  {
    id: "calapan_city_hall",
    name: "City Hall",
    distance: "3.2 km",
    address: "Calapan New City Hall, M. Roxas Drive, Guinobatan, Calapan City, Oriental Mindoro",
    lat: 13.3791,
    lng: 121.1832,
  },
  {
    id: "xentro_mall",
    name: "Xentro Mall",
    distance: "1.4 km",
    address: "M. Roxas Drive, Sto. Niño, Calapan City, Oriental Mindoro",
    lat: 13.4030,
    lng: 121.1838,
  },
  {
    id: "citymall_calapan",
    name: "City Mall",
    distance: "2.1 km",
    address: "Roxas Drive, Ilaya, Calapan City, Oriental Mindoro",
    lat: 13.4131,
    lng: 121.1845,
  },
];

/**
 * Searches places via Nominatim OpenStreetMap Geocoding API with recent destinations integration
 */
export const searchPlaces = async (
  query: string,
  userLat = DEFAULT_CALAPAN_CENTER.latitude,
  userLng = DEFAULT_CALAPAN_CENTER.longitude
): Promise<PlaceSuggestion[]> => {
  const cleanQuery = query.trim();

  // If query is short, return empty array (handled in UI by recents & curated)
  if (cleanQuery.length < 2) {
    return [];
  }

  // Check matching recent destinations first
  const recentMatches: PlaceSuggestion[] = getRecentDestinations()
    .filter(
      (p) =>
        p.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(cleanQuery.toLowerCase())
    )
    .map((p) => {
      const distKm = calculateDistanceKm(userLat, userLng, p.lat, p.lng);
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        distance: formatDistance(distKm),
        lat: p.lat,
        lng: p.lng,
      };
    });

  // Check curated landmarks
  const curatedMatches: PlaceSuggestion[] = CURATED_CALAPAN_PLACES
    .filter(
      (p) =>
        p.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(cleanQuery.toLowerCase())
    )
    .map((p) => {
      const distKm = calculateDistanceKm(userLat, userLng, p.lat, p.lng);
      return {
        ...p,
        distance: formatDistance(distKm),
      };
    });

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      cleanQuery + " Calapan Oriental Mindoro"
    )}&format=json&addressdetails=1&limit=6&countrycodes=ph`;

    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en,fil",
        "User-Agent": "SakayPassengerPWA/1.0",
      },
    });

    if (!res.ok) throw new Error("Place search request failed");
    const data = await res.json();

    const remotePlaces: PlaceSuggestion[] = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const distKm = calculateDistanceKm(userLat, userLng, lat, lng);
      const name = item.name || item.display_name.split(",")[0];
      return {
        id: `nom_${item.place_id}`,
        name: name,
        distance: formatDistance(distKm),
        address: item.display_name,
        lat,
        lng,
      };
    });

    const combined = [...recentMatches];
    curatedMatches.forEach((cp) => {
      if (!combined.some((item) => calculateDistanceKm(item.lat, item.lng, cp.lat, cp.lng) < 0.05)) {
        combined.push(cp);
      }
    });
    remotePlaces.forEach((rp) => {
      if (!combined.some((item) => calculateDistanceKm(item.lat, item.lng, rp.lat, rp.lng) < 0.1)) {
        combined.push(rp);
      }
    });

    return combined.slice(0, 8);
  } catch (err) {
    console.warn("Place search API fallback:", err);
    const combined = [...recentMatches];
    curatedMatches.forEach((cp) => {
      if (!combined.some((item) => calculateDistanceKm(item.lat, item.lng, cp.lat, cp.lng) < 0.05)) {
        combined.push(cp);
      }
    });
    return combined;
  }
};

/**
 * Reverse geocodes coordinates to a human-readable address
 */
export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en,fil",
        "User-Agent": "SakayPassengerPWA/1.0",
      },
    });

    if (!res.ok) throw new Error("Reverse geocode request failed");
    const data = await res.json();

    if (data && data.display_name) {
      const parts = data.display_name.split(",");
      if (parts.length >= 2) {
        return `${parts[0].trim()}, ${parts[1].trim()}`;
      }
      return data.display_name;
    }
    return "Kasalukuyang Lokasyon (Calapan City)";
  } catch (err) {
    console.warn("Reverse geocode fallback:", err);
    return "Kasalukuyang Lokasyon";
  }
};

/**
 * Queries OSRM road network for accurate driving distance & duration
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
          source: "osrm",
        };
      }
    } catch (err) {
      console.warn(`[getOSRMRoute] Endpoint request issue: ${url}`, err);
    }
  }

  // Fallback if public road routing servers are unreachable
  const straightKm = calculateDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const estimatedKm = Math.round(straightKm * 1.3 * 100) / 100;
  const estimatedMin = Math.max(1, Math.round((estimatedKm / 20) * 60));

  return {
    distanceKm: estimatedKm,
    durationMin: estimatedMin,
    coordinates: [
      [pickupLat, pickupLng],
      [dropoffLat, dropoffLng],
    ],
    source: "road_estimate",
  };
};
