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
  source: "osrm" | "haversine";
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

/**
 * Requests real device location via browser Geolocation API
 */
export const getCurrentDevicePosition = (): Promise<LocationCoords> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser/device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: LocationCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        // Cache coordinates locally for instant rehydration
        localStorage.setItem("user_lat", coords.latitude.toString());
        localStorage.setItem("user_lng", coords.longitude.toString());
        localStorage.setItem("gps_permission", "true");

        resolve(coords);
      },
      (error) => {
        localStorage.setItem("gps_permission", "false");
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
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Calculates Haversine distance in kilometers between two coordinates
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
 * Formats distance into a human-friendly string (e.g. "450 m" or "2.3 km")
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

// Curated prominent local Calapan City landmarks
export const CURATED_CALAPAN_PLACES: PlaceSuggestion[] = [
  {
    id: "calapan_market",
    name: "Calapan Public Market",
    distance: "1.2 km",
    address: "San Vicente North, Calapan City, Oriental Mindoro",
    lat: 13.4116,
    lng: 121.1802,
  },
  {
    id: "calapan_terminal",
    name: "Calapan Public Terminal",
    distance: "1.7 km",
    address: "Aurora Boulevard, Calapan City, Oriental Mindoro",
    lat: 13.4120,
    lng: 121.1810,
  },
  {
    id: "lumangbayan_hall",
    name: "Lumangbayan Barangay Hall",
    distance: "9 m",
    address: "Molave Street, Calapan City, Oriental Mindoro",
    lat: 13.4115,
    lng: 121.1803,
  },
  {
    id: "calapan_port",
    name: "Calapan Port (Pier)",
    distance: "2.4 km",
    address: "San Antonio, Calapan City, Oriental Mindoro",
    lat: 13.4248,
    lng: 121.1812,
  },
  {
    id: "calapan_city_hall",
    name: "Calapan City Hall",
    distance: "3.1 km",
    address: "Guinobatan, Calapan City, Oriental Mindoro",
    lat: 13.3980,
    lng: 121.1824,
  },
  {
    id: "xentro_mall",
    name: "Xentro Mall Calapan",
    distance: "1.5 km",
    address: "JP Rizal Street, Calapan City, Oriental Mindoro",
    lat: 13.4130,
    lng: 121.1790,
  },
  {
    id: "puregold_calapan",
    name: "Puregold Calapan",
    distance: "1.4 km",
    address: "Roxas Drive, Calapan City, Oriental Mindoro",
    lat: 13.4120,
    lng: 121.1800,
  },
];

/**
 * Searches places via Nominatim OpenStreetMap Geocoding API with local fallback
 */
export const searchPlaces = async (
  query: string,
  userLat = DEFAULT_CALAPAN_CENTER.latitude,
  userLng = DEFAULT_CALAPAN_CENTER.longitude
): Promise<PlaceSuggestion[]> => {
  const cleanQuery = query.trim();

  // If query is short, return local landmarks with calculated distance from user's coordinates
  if (cleanQuery.length < 2) {
    return CURATED_CALAPAN_PLACES.map((p) => {
      const distKm = calculateHaversineKm(userLat, userLng, p.lat, p.lng);
      return {
        ...p,
        distance: formatDistance(distKm),
      };
    });
  }

  // Filter curated places first
  const localMatches = CURATED_CALAPAN_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(cleanQuery.toLowerCase())
  ).map((p) => {
    const distKm = calculateHaversineKm(userLat, userLng, p.lat, p.lng);
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
      const distKm = calculateHaversineKm(userLat, userLng, lat, lng);
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

    const combined = [...localMatches];
    remotePlaces.forEach((rp) => {
      if (!combined.some((cp) => calculateHaversineKm(cp.lat, cp.lng, rp.lat, rp.lng) < 0.1)) {
        combined.push(rp);
      }
    });

    return combined.slice(0, 8);
  } catch (err) {
    console.warn("Place search API fallback:", err);
    return localMatches;
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
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM route request failed");

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
    throw new Error("No routes returned by OSRM");
  } catch (err) {
    console.warn("OSRM routing fallback:", err);
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
      source: "haversine",
    };
  }
};
