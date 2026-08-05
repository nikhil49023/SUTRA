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
  onMapMouseMove?: (lngLat: { lat: number; lng: number }) => void;
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
  onMapMouseMove,
  followDrone,
  dronePos,
  cursorStyle = 'crosshair'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMapMouseMoveRef = useRef(onMapMouseMove);
  const initialStyleRef = useRef<MapStyleMode>(mapStyle);

  // Keep latest callbacks in refs to prevent stale closures
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onMapMouseMoveRef.current = onMapMouseMove;
  }, [onMapClick, onMapMouseMove]);

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

    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      if (onMapMouseMoveRef.current) {
        onMapMouseMoveRef.current({ lat: +e.lngLat.lat.toFixed(5), lng: +e.lngLat.lng.toFixed(5) });
      }
    });

    map.on('load', () => {
      setMapInstance(map);
      (window as any).__mapInstance = map;
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

  // Update style when mapStyle prop changes (skip initial — constructor already set it)
  useEffect(() => {
    if (mapRef.current && mapStyle !== initialStyleRef.current) {
      mapRef.current.setStyle(MAP_STYLES[mapStyle].url);
    }
    // After first real change, clear the guard so future changes always apply
    if (mapStyle !== initialStyleRef.current) {
      initialStyleRef.current = '' as MapStyleMode;
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
