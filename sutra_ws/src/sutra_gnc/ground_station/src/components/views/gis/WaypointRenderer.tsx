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
  const waypointsRef = useRef<Waypoint[]>(waypoints);
  const isDraggingRef = useRef<boolean>(false);

  // Keep latest waypoints in ref to avoid stale closures inside event listeners
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  useEffect(() => {
    if (!map) return;

    const currentMarkerIds = new Set(markersRef.current.keys());
    const newWaypointIds = new Set(waypoints.map((w) => w.id));

    // Remove markers that no longer exist in waypoints array
    currentMarkerIds.forEach((id) => {
      if (!newWaypointIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    });

    // Create or update markers
    waypoints.forEach((wp, idx) => {
      const isCompleted = wp.completed || idx < activeWaypointIdx;
      const isActive = idx === activeWaypointIdx;
      const color = isCompleted ? '#00e676' : isActive ? '#00f0ff' : '#ffb700';

      if (markersRef.current.has(wp.id)) {
        // UPDATE EXISTING MARKER POSITION ONLY IF NOT DRAGGING
        if (!isDraggingRef.current) {
          const marker = markersRef.current.get(wp.id)!;
          marker.setLngLat([wp.lng, wp.lat]);
          marker.setDraggable(isEditable);
        }
      } else {
        // CREATE NEW MARKER (ONCE PER WAYPOINT ID)
        const el = document.createElement('div');
        el.className = 'waypoint-marker cursor-grab active:cursor-grabbing select-none';

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

        marker.on('dragstart', () => {
          isDraggingRef.current = true;
          map.dragPan.disable();
        });

        marker.on('dragend', () => {
          map.dragPan.enable();
          isDraggingRef.current = false;

          const lngLat = marker.getLngLat();
          const latestWaypoints = waypointsRef.current;
          const updated = latestWaypoints.map((w) =>
            w.id === wp.id ? { ...w, lat: +lngLat.lat.toFixed(5), lng: +lngLat.lng.toFixed(5) } : w
          );
          onUpdateWaypoints(updated);
        });

        markersRef.current.set(wp.id, marker);
      }
    });
  }, [map, waypoints, activeWaypointIdx, isEditable, onUpdateWaypoints]);

  // Clean up all markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, []);

  return null;
};
