/**
 * Smart Horizon GCS — Waypoint Rendering & Drag Manipulation Layer
 */

import maplibregl from 'maplibre-gl';
import { Waypoint } from '../types/mission';
import { commandManager } from '../communication/CommandManager';
import { throttle } from '../utils/performance';
import { useSelectionStore } from '../stores/selectionStore';

export class WaypointLayer {
  private map: maplibregl.Map | null = null;
  private markers: maplibregl.Marker[] = [];
  private throttledDragUpdate: (wpId: string | number, lat: number, lon: number) => void;

  constructor() {
    this.throttledDragUpdate = throttle((wpId: string | number, lat: number, lon: number) => {
      commandManager.sendCommand('mission.update_waypoint', {
        waypoint_id: wpId, latitude: lat, longitude: lon,
      });
    }, 150);
  }

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) {
      this.clearMarkers();
    }
  }

  public renderWaypoints(waypoints: Waypoint[], activeIndex = 1, selectedId: string | null = null): void {
    if (!this.map) return;
    this.clearMarkers();

    waypoints.forEach((wp) => {
      const el = document.createElement('div');
      el.className = 'tactical-waypoint-marker cursor-grab active:cursor-grabbing';
      const isSelected = selectedId === wp.id || selectedId === String(wp.index);
      const isActive = activeIndex === wp.index;

      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 shadow-lg transition-transform ${
            isSelected
              ? 'bg-[#5B8FB9] border-[#E7EBEF] text-[#0B0F14] scale-125 ring-4 ring-[#5B8FB9]/40'
              : isActive
              ? 'bg-[#4B7FA9] border-[#6FA4CE] text-[#E7EBEF] ring-2 ring-[#6FA4CE]/50'
              : 'bg-[#11171E]/95 border-[#5B8FB9] text-[#5B8FB9] hover:scale-110'
          }">
            ${wp.index}
          </div>
          <div class="absolute -bottom-4 px-1 py-0.2 bg-[#0B0F14]/90 rounded border border-[#2B3743] text-[9px] font-mono text-[#A9B3BD] whitespace-nowrap pointer-events-none">
            ${wp.altitude}m | ${wp.speed}m/s
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([wp.longitude, wp.latitude])
        .addTo(this.map!);

      // Click selection
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        useSelectionStore.getState().selectWaypoint(wp.id || wp.index);
        commandManager.sendCommand('mission.select_waypoint', { waypoint_id: wp.id || wp.index });
      });

      // Drag handling
      marker.on('drag', () => {
        const lngLat = marker.getLngLat();
        this.throttledDragUpdate(wp.id || wp.index, lngLat.lat, lngLat.lng);
      });

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        commandManager.sendCommand('mission.update_waypoint', {
          waypoint_id: wp.id || wp.index,
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      });

      this.markers.push(marker);
    });
  }

  public clearMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }
}
