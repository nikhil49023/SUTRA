import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, type MapStyleMode } from './MapStyles';

interface MapRendererProps {
  initialCenter: [number, number]; // [lng, lat]
  initialZoom?: number;
  mapStyle: MapStyleMode;
  children: (map: maplibregl.Map | null) => React.ReactNode;
  onMapClick?: (lngLat: { lat: number; lng: number }) => void;
  followDrone?: boolean;
  dronePos?: [number, number]; // [lng, lat]
  cursorStyle?: string;
}

export const MapRenderer: React.FC<MapRendererProps> = ({
  initialCenter,
  initialZoom = 14,
  mapStyle,
  children,
  onMapClick,
  followDrone,
  dronePos,
  cursorStyle = 'crosshair'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const onMapClickRef = useRef(onMapClick);

  // Keep latest onMapClick callback in ref to prevent stale closures
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLES[mapStyle].url,
      center: initialCenter,
      zoom: initialZoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({ lat: +e.lngLat.lat.toFixed(5), lng: +e.lngLat.lng.toFixed(5) });
      }
    });

    map.on('load', () => {
      setMapInstance(map);
      map.getCanvas().style.cursor = cursorStyle;
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update canvas cursor style dynamically (Crosshair in placement/drawing mode, Grab in Pan mode)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = cursorStyle;
    }
  }, [cursorStyle]);

  // Update style when mapStyle prop changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(MAP_STYLES[mapStyle].url);
    }
  }, [mapStyle]);

  // Auto-center on drone when followDrone is active
  useEffect(() => {
    if (mapRef.current && followDrone && dronePos) {
      mapRef.current.easeTo({ center: dronePos, duration: 300 });
    }
  }, [followDrone, dronePos]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 w-full h-full bg-[#070a11]" />
      {children(mapInstance)}
    </div>
  );
};
