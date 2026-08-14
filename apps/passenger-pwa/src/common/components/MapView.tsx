import React, { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MapIcon from "@mui/icons-material/Map";
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { DEFAULT_CALAPAN_CENTER } from "../../services/locationService";

declare const google: any;

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

// Simulated active TODA drivers around Calapan City
const NEARBY_DRIVERS = [
  { id: "driver_1", lat: 13.4140, lng: 121.1820, name: "TODA #104" },
  { id: "driver_2", lat: 13.4080, lng: 121.1760, name: "TODA #215" },
  { id: "driver_3", lat: 13.4200, lng: 121.1850, name: "TODA #088" },
];

/**
 * Subcomponent to smoothly pan and adjust Google Maps camera
 */
const MapCameraController: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
  pickupLocation?: { lat: number; lng: number } | null;
  dropoffLocation?: { lat: number; lng: number } | null;
  recenterTrigger?: number;
}> = ({ center, zoom, pickupLocation, dropoffLocation, recenterTrigger }) => {
  const map = useMap();
  const coreLib = useMapsLibrary("core");

  useEffect(() => {
    if (!map) return;

    if (pickupLocation && dropoffLocation && coreLib) {
      const bounds = new coreLib.LatLngBounds();
      bounds.extend({ lat: pickupLocation.lat, lng: pickupLocation.lng });
      bounds.extend({ lat: dropoffLocation.lat, lng: dropoffLocation.lng });
      map.fitBounds(bounds, { top: 80, bottom: 80, left: 40, right: 40 });
    } else if (center) {
      map.panTo(center);
      if (zoom) map.setZoom(zoom);
    }
  }, [map, coreLib, center, zoom, pickupLocation, dropoffLocation, recenterTrigger]);

  return null;
};

/**
 * Subcomponent to render route directions polyline between pickup and dropoff
 */
const DirectionsPolylineRenderer: React.FC<{
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}> = ({ pickup, dropoff }) => {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const mapsLib = useMapsLibrary("maps");
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !routesLib || !mapsLib || !pickup || !dropoff) return;

    const directionsService = new routesLib.DirectionsService();

    directionsService.route(
      {
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: dropoff.lat, lng: dropoff.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === "OK" && result) {
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          const path = result.routes[0].overview_path;
          const polyline = new mapsLib.Polyline({
            path: path,
            strokeColor: "#FF6B00",
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map: map,
          });

          polylineRef.current = polyline;
        }
      }
    );

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, routesLib, mapsLib, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  return null;
};

/**
 * MapView - Real Google Maps Component powered by @vis.gl/react-google-maps
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
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || "";
  const effectiveCenter = userLocation || center;

  // Custom marker icon definitions
  const userPinIcon = "https://maps.google.com/mapfiles/ms/icons/orange-dot.png";
  const pickupPinIcon = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  const dropoffPinIcon = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
  const driverPinIcon = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

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
      }}
    >
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={effectiveCenter}
            defaultZoom={zoom}
            disableDefaultUI={true}
            gestureHandling={interactive ? "greedy" : "none"}
            style={{ width: "100%", height: "100%" }}
          >
            {/* Camera pan/fit controller */}
            <MapCameraController
              center={effectiveCenter}
              zoom={zoom}
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              recenterTrigger={recenterTrigger}
            />

            {/* Real User GPS Location Marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                title="Kasalukuyang Lokasyon"
                icon={{
                  url: userPinIcon,
                }}
              />
            )}

            {/* Pickup Marker */}
            {pickupLocation && (
              <Marker
                position={pickupLocation}
                title="Pickup Point"
                icon={{
                  url: pickupPinIcon,
                }}
              />
            )}

            {/* Destination Dropoff Marker */}
            {dropoffLocation && (
              <Marker
                position={dropoffLocation}
                title="Destinasyon"
                icon={{
                  url: dropoffPinIcon,
                }}
              />
            )}

            {/* Nearby TODA Tricycle Driver Markers */}
            {NEARBY_DRIVERS.map((driver) => (
              <Marker
                key={driver.id}
                position={{ lat: driver.lat, lng: driver.lng }}
                title={driver.name}
                icon={{
                  url: driverPinIcon,
                }}
              />
            ))}

            {/* Route Polyline when both pickup and dropoff exist */}
            {pickupLocation && dropoffLocation && (
              <DirectionsPolylineRenderer
                pickup={pickupLocation}
                dropoff={dropoffLocation}
              />
            )}
          </Map>
        </APIProvider>
      ) : (
        /* Developer Configuration Guidance when API key is missing */
        <Box
          sx={{
            width: "100%",
            height: "100%",
            backgroundColor: "#E2E8F0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 107, 0, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <MapIcon sx={{ fontSize: "36px", color: "#FF6B00" }} />
          </Box>
          <Typography
            sx={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: "8px",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Google Maps API Key Required
          </Typography>
          <Typography
            sx={{
              fontSize: "13px",
              color: "#64748B",
              lineHeight: 1.5,
              maxWidth: "280px",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Please configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
            <code>apps/passenger-pwa/.env</code> to load live Google Maps.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MapView;
