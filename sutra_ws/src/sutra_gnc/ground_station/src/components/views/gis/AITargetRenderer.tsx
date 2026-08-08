import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { perceptronBridge } from '../../../ai/perception/PerceptronBridge';
import type { ProjectedTargetWGS84 } from '../../../ai/perception/GpsRaycaster';

interface AITargetRendererProps {
  map: maplibregl.Map | null;
}

export const AITargetRenderer: React.FC<AITargetRendererProps> = ({ map }) => {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const unsubscribe = perceptronBridge.subscribe((targets: ProjectedTargetWGS84[]) => {
      targets.forEach((target) => {
        let marker = markersRef.current.get(target.targetId);

        if (!marker) {
          const el = document.createElement('div');
          el.className = 'ai-target-marker relative cursor-pointer z-30';
          const isSurvivor = target.label.includes('SURVIVOR') || target.label.includes('HUMAN');

          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-10 h-10 rounded-full border ${isSurvivor ? 'border-red-500/60 bg-red-500/20 animate-ping' : 'border-amber-400/50 bg-amber-500/10'}"></div>
              
              <div class="w-6 h-6 rounded-full ${isSurvivor ? 'bg-red-600 border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500 border-2 border-black'} flex items-center justify-center text-white text-[10px] font-bold">
                🎯
              </div>

              <div class="absolute left-7 top-[-6px] whitespace-nowrap bg-[#060b14]/95 border ${isSurvivor ? 'border-red-500' : 'border-amber-400'} backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono shadow-2xl z-40">
                <div class="font-bold uppercase ${isSurvivor ? 'text-red-400' : 'text-amber-300'} flex items-center space-x-1">
                  <span>${target.label}</span>
                </div>
                <div class="text-slate-300 text-[8px]">
                  DIST: ${target.distanceMeters}m | CONF: ${(target.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          `;

          marker = new maplibregl.Marker({ element: el })
            .setLngLat([target.lng, target.lat])
            .addTo(map);

          markersRef.current.set(target.targetId, marker);
        } else {
          marker.setLngLat([target.lng, target.lat]);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [map]);

  return null;
};
