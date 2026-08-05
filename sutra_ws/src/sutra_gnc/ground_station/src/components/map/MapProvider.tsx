import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContextValue {
  map: maplibregl.Map | null;
  isLoaded: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const MapContext = createContext<MapContextValue>({
  map: null,
  isLoaded: false,
  containerRef: { current: null }
});

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (mapRef.current) return;

    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [34.5225, 45.1082],
      zoom: 14,
      pitch: 45,
      bearing: -15,
      attributionControl: false
    });

    map.on('load', () => {
      setIsLoaded(true);
    });

    mapRef.current = map;

    return () => {
      // Intentionally preserve MapLibre instance across SPA tab navigation!
    };
  }, []);

  return (
    <MapContext.Provider value={{ map: mapRef.current, isLoaded, containerRef }}>
      <div className="relative w-full h-full">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {children}
      </div>
    </MapContext.Provider>
  );
};

export const useMapInstance = () => useContext(MapContext);
