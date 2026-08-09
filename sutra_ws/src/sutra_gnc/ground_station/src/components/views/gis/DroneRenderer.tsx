import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { DroneAsset, TelemetryData } from '../../../types';

interface DroneRendererProps {
  map: maplibregl.Map | null;
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
}

export const DroneRenderer: React.FC<DroneRendererProps> = ({ map, activeDrone, telemetry }) => {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!elementRef.current) {
      const el = document.createElement('div');
      el.className = 'drone-marker-container relative cursor-pointer';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-16 h-16 rounded-full border border-cyan-400/40 bg-cyan-500/10 animate-ping"></div>
          
          <div id="drone-svg-rotation" class="relative w-10 h-10 transition-transform duration-75">
            <svg viewBox="0 0 40 40" class="w-full h-full drop-shadow-[0_0_8px_#00f0ff]">
              <line x1="20" y1="20" x2="20" y2="4" stroke="#00e676" stroke-width="2.5" stroke-dasharray="2,2" />
              <polygon points="20,0 16,8 24,8" fill="#00e676" />
              
              <line x1="8" y1="8" x2="32" y2="32" stroke="#00f0ff" stroke-width="2" />
              <line x1="32" y1="8" x2="8" y2="32" stroke="#00f0ff" stroke-width="2" />

              <circle cx="8" cy="8" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
              <circle cx="32" cy="8" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
              <circle cx="8" cy="32" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
              <circle cx="32" cy="32" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />

              <circle cx="20" cy="20" r="5" fill="#00f0ff" />
            </svg>
          </div>

          <div class="absolute left-12 top-[-10px] whitespace-nowrap bg-[#060b14]/95 border border-[#00f0ff] backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono shadow-2xl z-20">
            <div class="text-cyan-400 font-bold uppercase flex items-center space-x-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>${activeDrone.callsign} • ${activeDrone.status}</span>
            </div>
            <div id="drone-telemetry-stats" class="text-slate-200 text-[9px]">
              ALT: ${activeDrone.altitude || 0}m AGL | SPD: ${activeDrone.groundSpeed || 0} km/h
            </div>
          </div>
        </div>
      `;
      elementRef.current = el;

      markerRef.current = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat([activeDrone.lng, activeDrone.lat])
        .addTo(map);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
        elementRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([activeDrone.lng, activeDrone.lat]);
    }
    if (elementRef.current) {
      const rotEl = elementRef.current.querySelector('#drone-svg-rotation') as HTMLElement;
      if (rotEl) {
        rotEl.style.transform = `rotate(${activeDrone.heading || 0}deg)`;
      }
      const statsEl = elementRef.current.querySelector('#drone-telemetry-stats') as HTMLElement;
      if (statsEl) {
        statsEl.innerHTML = `ALT: ${activeDrone.altitude || 0}m AGL | SPD: ${activeDrone.groundSpeed || 0} km/h`;
      }
    }
  }, [activeDrone.lat, activeDrone.lng, activeDrone.heading, activeDrone.altitude, activeDrone.groundSpeed]);

  return null;
};
