import React, { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const DEFAULT_CALAPAN_CENTER = {
  latitude: 13.4117,
  longitude: 121.1803,
};

export interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number } | null;
  dropoffLocation?: { lat: number; lng: number } | null;
  recenterTrigger?: number;
  height?: string;
  width?: string;
  interactive?: boolean;
}

/**
 * MapView - Leaflet OpenStreetMap Map Component (matching Passenger, LGU & TODA portals)
 * Pure, clean light map canvas.
 */
export const MapView: React.FC<MapViewProps> = ({
  center = { lat: DEFAULT_CALAPAN_CENTER.latitude, lng: DEFAULT_CALAPAN_CENTER.longitude },
  zoom = 15,
  userLocation,
  pickupLocation,
  dropoffLocation,
  recenterTrigger = 0,
  height = "100%",
  width = "100%",
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const effectiveCenter: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
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

    // OpenStreetMap Tile Layer (Clean light tiles)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      subdomains: ["a", "b", "c"],
    }).addTo(map);

    // Create a LayerGroup for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Invalidate size after container settles
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [interactive]);

  // Handle Updates: Markers, Route Polyline, Panning
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // 1. Driver Location Pulse Dot Marker
    if (userLocation && (!pickupLocation || !dropoffLocation)) {
      const userDotIcon = L.divIcon({
        className: "leaflet-user-marker",
        html: `
          <div class="leaflet-user-pulse">
            <div class="pulse-ring"></div>
            <div class="pulse-core"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userDotIcon }).addTo(markersLayer);
    }

    // 2. Pickup Pin Marker (Green)
    if (pickupLocation && pickupLocation.lat !== 0) {
      const pickupIcon = L.divIcon({
        className: "leaflet-pickup-marker",
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background-color: #10B981;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
          ">P</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon }).addTo(markersLayer);
    }

    // 3. Dropoff Pin Marker (Red/Orange)
    if (dropoffLocation && dropoffLocation.lat !== 0) {
      const dropoffIcon = L.divIcon({
        className: "leaflet-dropoff-marker",
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background-color: #EF4444;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
          ">D</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([dropoffLocation.lat, dropoffLocation.lng], { icon: dropoffIcon }).addTo(markersLayer);
    }

    // 4. Draw Clean Route Polyline & Fit Bounds if both points exist
    if (pickupLocation && pickupLocation.lat !== 0 && dropoffLocation && dropoffLocation.lat !== 0) {
      const latlngs: [number, number][] = [
        [pickupLocation.lat, pickupLocation.lng],
        [dropoffLocation.lat, dropoffLocation.lng],
      ];

      const polyline = L.polyline(latlngs, {
        color: "#FF6B00",
        weight: 4,
        opacity: 0.9,
        dashArray: "8, 6",
      }).addTo(map);

      routePolylineRef.current = polyline;

      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
      });
    } else if (userLocation) {
      map.panTo([userLocation.lat, userLocation.lng], { animate: true });
    }
  }, [userLocation, pickupLocation, dropoffLocation, recenterTrigger]);

  // Recenter trigger listener
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
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
