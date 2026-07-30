import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Waypoint } from '../../../types';

interface WaypointRendererProps {
  map: maplibregl.Map | null;
  waypoints: Waypoint[];
  activeWaypointIdx?: number;
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  isEditable?: boolean;
}

export const WaypointRenderer: React.FC<WaypointRendererProps> = ({
  map,
  waypoints,
  activeWaypointIdx = 0,
  onUpdateWaypoints,
  isEditable = true
}) => {
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    waypoints.forEach((wp, idx) => {
      const el = document.createElement('div');
      el.className = 'waypoint-marker cursor-grab active:cursor-grabbing transition-transform hover:scale-110 select-none';

      const isCompleted = wp.completed || idx < activeWaypointIdx;
      const isActive = idx === activeWaypointIdx;
      const color = isCompleted ? '#00e676' : isActive ? '#00f0ff' : '#ffb700';

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          ${isActive ? '<div class="absolute -inset-1.5 rounded-full border-2 border-cyan-400/80 animate-ping"></div>' : ''}
          <div class="relative w-7 h-7 rounded-full border-2 border-[${color}] bg-[#080d16]/95 flex items-center justify-center shadow-[0_0_10px_${color}66] font-mono font-bold text-xs text-[${color}]">
            ${wp.id}
          </div>
          <div class="mt-0.5 bg-[#080d16] border border-[${color}]/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-200 shadow">
            ${wp.alt}m
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el, draggable: isEditable })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);

      // Disable map panning during marker drag to prevent conflicts
      marker.on('dragstart', () => {
        map.dragPan.disable();
      });

      // Update position ONLY on dragend
      marker.on('dragend', () => {
        map.dragPan.enable();
        const lngLat = marker.getLngLat();
        const updated = waypoints.map((w) =>
          w.id === wp.id ? { ...w, lat: +lngLat.lat.toFixed(5), lng: +lngLat.lng.toFixed(5) } : w
        );
        onUpdateWaypoints(updated);
      });

      markersRef.current.set(wp.id, marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [map, waypoints, activeWaypointIdx, isEditable, onUpdateWaypoints]);

  return null;
};
