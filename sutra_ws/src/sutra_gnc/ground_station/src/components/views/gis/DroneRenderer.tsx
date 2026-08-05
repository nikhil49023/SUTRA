import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { DroneAsset, TelemetryData } from '../../../types';
import { fleetStore } from '../../../store/FleetStore';

interface DroneRendererProps {
  map: maplibregl.Map | null;
  activeDrone: DroneAsset;
  telemetry: TelemetryData;
  drones?: DroneAsset[];
}

export const DroneRenderer: React.FC<DroneRendererProps> = ({ map, activeDrone, telemetry, drones }) => {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const fleetList = drones && drones.length > 0 ? drones : [activeDrone];

  useEffect(() => {
    if (!map) return;

    fleetList.forEach((drone) => {
      let marker = markersRef.current.get(drone.id);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'drone-marker-container relative cursor-pointer';
        const isLeader = drone.id === 'DRONE_01' || drone.id === activeDrone.id;

        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-14 h-14 rounded-full border ${isLeader ? 'border-cyan-400/50 bg-cyan-500/10 animate-ping' : 'border-emerald-400/30 bg-emerald-500/5'}"></div>
            
            <div id="drone-rot-${drone.id}" class="relative w-8 h-8 transition-transform duration-75">
              <svg viewBox="0 0 40 40" class="w-full h-full drop-shadow-[0_0_8px_${isLeader ? '#00f0ff' : '#00e676'}]">
                <line x1="20" y1="20" x2="20" y2="4" stroke="${isLeader ? '#00e676' : '#00f0ff'}" stroke-width="2.5" stroke-dasharray="2,2" />
                <polygon points="20,0 16,8 24,8" fill="${isLeader ? '#00e676' : '#00f0ff'}" />
                
                <line x1="8" y1="8" x2="32" y2="32" stroke="${isLeader ? '#00f0ff' : '#00e676'}" stroke-width="2" />
                <line x1="32" y1="8" x2="8" y2="32" stroke="${isLeader ? '#00f0ff' : '#00e676'}" stroke-width="2" />

                <circle cx="8" cy="8" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
                <circle cx="32" cy="8" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
                <circle cx="8" cy="32" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />
                <circle cx="32" cy="32" r="4" fill="#00f0ff44" stroke="#00f0ff" stroke-width="1" />

                <circle cx="20" cy="20" r="5" fill="${isLeader ? '#00f0ff' : '#00e676'}" />
              </svg>
            </div>

            <div class="absolute left-10 top-[-8px] whitespace-nowrap bg-[#060b14]/95 border ${isLeader ? 'border-[#00f0ff]' : 'border-slate-700'} backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono shadow-2xl z-20">
              <div className="font-bold uppercase flex items-center space-x-1 ${isLeader ? 'text-cyan-400' : 'text-slate-300'}">
                <span class="w-1.5 h-1.5 rounded-full ${isLeader ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}"></span>
                <span>${drone.callsign}</span>
              </div>
              <div id="drone-stats-${drone.id}" class="text-slate-300 text-[8px]">
                ALT: ${drone.altitude || 0}m | BAT: ${drone.battery || 95}%
              </div>
            </div>
          </div>
        `;

        marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
          .setLngLat([drone.lng, drone.lat])
          .addTo(map);

        markersRef.current.set(drone.id, marker);
      } else {
        // Fast 60 FPS update of existing marker
        marker.setLngLat([drone.lng, drone.lat]);
        const rotEl = marker.getElement().querySelector(`#drone-rot-${drone.id}`) as HTMLElement;
        if (rotEl) {
          rotEl.style.transform = `rotate(${drone.heading || 0}deg)`;
        }
        const statsEl = marker.getElement().querySelector(`#drone-stats-${drone.id}`) as HTMLElement;
        if (statsEl) {
          statsEl.innerHTML = `ALT: ${drone.altitude || 0}m | BAT: ${drone.battery || 95}%`;
        }
      }
    });
  }, [map, fleetList]);

  return null;
};
