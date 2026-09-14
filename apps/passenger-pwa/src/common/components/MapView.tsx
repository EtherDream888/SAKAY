import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CALAPAN_CENTER, getOSRMRoute } from "../../services/locationService";

export interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number } | null;
  dropoffLocation?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
  recenterTrigger?: number;
  height?: string;
  width?: string;
  interactive?: boolean;
}

/**
 * MapView - Leaflet OpenStreetMap Map Component (matching LGU & TODA portals)
 * Pure, clean map canvas with Google Maps-style road-based route polyline.
 */
export const MapView: React.FC<MapViewProps> = ({
  center = { lat: DEFAULT_CALAPAN_CENTER.latitude, lng: DEFAULT_CALAPAN_CENTER.longitude },
  zoom = 15,
  userLocation,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  routeCoordinates,
  recenterTrigger = 0,
  height = "100%",
  width = "100%",
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const [roadCoords, setRoadCoords] = useState<[number, number][]>(routeCoordinates || []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const targetCenter = (pickupLocation && pickupLocation.lat !== 0)
      ? pickupLocation
      : (userLocation && userLocation.lat !== 0)
      ? userLocation
      : null;

    const effectiveCenter: [number, number] = targetCenter
      ? [targetCenter.lat, targetCenter.lng]
      : [center.lat, center.lng];

    const map = L.map(mapContainerRef.current, {
      center: effectiveCenter,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
    });

    // OpenStreetMap Tile Layer (Clean & fast)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: ["a", "b", "c"],
    }).addTo(map);

    // Create a LayerGroup for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Create a LayerGroup for route polylines
    const routeLayers = L.layerGroup().addTo(map);
    routeLayersRef.current = routeLayers;

    mapInstanceRef.current = map;

    // Invalidate size after container settles
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
      if (routeLayersRef.current) {
        routeLayersRef.current.clearLayers();
        routeLayersRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [interactive]);

  // Synchronize roadCoordinates prop or fetch road coordinates via OSRM
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length >= 2) {
      setRoadCoords(routeCoordinates);
      return;
    }

    if (
      pickupLocation &&
      pickupLocation.lat !== 0 &&
      dropoffLocation &&
      dropoffLocation.lat !== 0
    ) {
      let isMounted = true;
      getOSRMRoute(pickupLocation.lat, pickupLocation.lng, dropoffLocation.lat, dropoffLocation.lng)
        .then((result) => {
          if (isMounted && result.coordinates && result.coordinates.length >= 2) {
            setRoadCoords(result.coordinates);
          }
        })
        .catch((err) => {
          console.warn("[MapView] Road routing error:", err);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setRoadCoords([]);
    }
  }, [
    pickupLocation?.lat,
    pickupLocation?.lng,
    dropoffLocation?.lat,
    dropoffLocation?.lng,
    routeCoordinates,
  ]);

  // Handle Updates: Markers, Road Route Polyline, Panning
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayers = routeLayersRef.current;
    if (!map || !markersLayer || !routeLayers) return;

    markersLayer.clearLayers();
    routeLayers.clearLayers();

    // 1. User Location Pulse Dot Marker (if userLocation exists and no active pickup/dropoff route)
    if (userLocation && (!pickupLocation || !dropoffLocation)) {
      const userDotIcon = L.divIcon({
        className: "leaflet-user-marker",
        html: `
          <div class="leaflet-gmaps-pickup-container">
            <div class="gmaps-pickup-radar-wave"></div>
            <div class="gmaps-pickup-radar-wave wave-delayed"></div>
            <div class="gmaps-pickup-aura"></div>
            <div class="gmaps-pickup-core-dot"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userDotIcon }).addTo(markersLayer);
    }

    // 2. Pickup Marker: Google Maps Style Glowing & Moving Circle
    if (pickupLocation && pickupLocation.lat !== 0) {
      const pickupIcon = L.divIcon({
        className: "leaflet-pickup-marker",
        html: `
          <div class="leaflet-gmaps-pickup-container">
            <div class="gmaps-pickup-radar-wave"></div>
            <div class="gmaps-pickup-radar-wave wave-delayed"></div>
            <div class="gmaps-pickup-aura"></div>
            <div class="gmaps-pickup-core-dot"></div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon }).addTo(markersLayer);
    }

    // 3. Dropoff Marker: Google Maps Style Red Location Pin
    if (dropoffLocation && dropoffLocation.lat !== 0) {
      const dropoffIcon = L.divIcon({
        className: "leaflet-destination-marker",
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.38));
            cursor: pointer;
          ">
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 0C7.16344 0 0 7.16344 0 16C0 27.2 14.5 40.5 15.36 41.28C15.73 41.62 16.27 41.62 16.64 41.28C17.5 40.5 32 27.2 32 16C32 7.16344 24.8366 0 16 0Z"
                fill="#EA4335"
              />
              <circle cx="16" cy="16" r="6.2" fill="#FFFFFF" />
              <circle cx="16" cy="16" r="3" fill="#C5221F" />
            </svg>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      });

      L.marker([dropoffLocation.lat, dropoffLocation.lng], { icon: dropoffIcon }).addTo(markersLayer);
    }

    // 4. Driver Tricycle Marker (Live GPS Position)
    if (driverLocation && typeof driverLocation.lat === "number" && !isNaN(driverLocation.lat)) {
      const driverIcon = L.divIcon({
        className: "leaflet-driver-marker",
        html: `
          <div style="
            width: 38px;
            height: 38px;
            background-color: #FF6B00;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 4px 14px rgba(255, 107, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          ">🛺</div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(markersLayer);
    }

    // 5. Draw Road-Based Route Polyline (Google Maps style) & Fit Bounds
    const activeRoutePoints: [number, number][] =
      roadCoords && roadCoords.length >= 2
        ? roadCoords
        : routeCoordinates && routeCoordinates.length >= 2
        ? routeCoordinates
        : pickupLocation && dropoffLocation && pickupLocation.lat !== 0 && dropoffLocation.lat !== 0
        ? [
            [pickupLocation.lat, pickupLocation.lng],
            [dropoffLocation.lat, dropoffLocation.lng],
          ]
        : [];

    if (activeRoutePoints.length >= 2) {
      // 5a. Bottom casing: clean white glow border providing crisp road separation
      const routeCasing = L.polyline(activeRoutePoints, {
        color: "#FFFFFF",
        weight: 9,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      });

      // 5b. Main road route line: solid vibrant orange matching SAKAY and BOOK - SOLO.png
      const routeLine = L.polyline(activeRoutePoints, {
        color: "#FF6B00",
        weight: 6,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      });

      routeLayers.addLayer(routeCasing);
      routeLayers.addLayer(routeLine);

      // Fit map bounds to show the entire road journey
      const bounds = L.latLngBounds(activeRoutePoints);
      map.fitBounds(bounds, {
        padding: [65, 65],
        maxZoom: 16,
      });
    } else if (driverLocation && driverLocation.lat !== 0) {
      map.panTo([driverLocation.lat, driverLocation.lng], { animate: true });
    } else if (pickupLocation && pickupLocation.lat !== 0) {
      map.panTo([pickupLocation.lat, pickupLocation.lng], { animate: true });
    } else if (userLocation && userLocation.lat !== 0) {
      map.panTo([userLocation.lat, userLocation.lng], { animate: true });
    }
  }, [userLocation, pickupLocation, dropoffLocation, driverLocation, roadCoords, routeCoordinates, recenterTrigger]);

  // Recenter trigger listener
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickupLocation && pickupLocation.lat !== 0) {
      map.flyTo([pickupLocation.lat, pickupLocation.lng], zoom, { duration: 0.8 });
    } else if (userLocation && userLocation.lat !== 0) {
      map.flyTo([userLocation.lat, userLocation.lng], zoom, { duration: 0.8 });
    } else if (center) {
      map.flyTo([center.lat, center.lng], zoom, { duration: 0.8 });
    }
  }, [recenterTrigger, zoom]);

  return (
    <Box
      sx={{
        width: width,
        height: height,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        overflow: "hidden",
        backgroundColor: "#E2E8F0",
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </Box>
  );
};

export default MapView;
