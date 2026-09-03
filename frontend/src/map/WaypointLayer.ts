/**
 * Smart Horizon GCS — Waypoint Rendering & Drag Manipulation Layer
 *
 * PERFORMANCE FIXES:
 * 1. Markers are created ONCE and updated in-place — no full DOM rebuild per render.
 * 2. During drag: only the route GeoJSON (line) is updated via requestAnimationFrame.
 *    The store is NOT written. Zero React re-renders while dragging.
 * 3. WebSocket: throttled to 16ms (~60fps cap) during drag, committed once on dragend.
 * 4. On dragend: store is updated once with final position, triggering one React cycle.
 */

import maplibregl from 'maplibre-gl';
import { Waypoint } from '../types/mission';
import { commandManager } from '../communication/CommandManager';
import { useMissionStore } from '../stores/missionStore';

interface WaypointMarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLElement;
  dotEl: HTMLElement;
  labelEl: HTMLElement;
  subEl: HTMLElement;
  wp: Waypoint;
}

export class WaypointLayer {
  private map: maplibregl.Map | null = null;
  private markers: Map<string | number, WaypointMarkerEntry> = new Map();
  private dragging = false;

  /** Callback so RouteLayer can update the route line during drag without React */
  public onDragUpdate: ((wpId: string | number, lat: number, lon: number) => void) | null = null;

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) {
      this.clearMarkers();
    }
  }

  public renderWaypoints(
    waypoints: Waypoint[],
    activeIndex = 1,
    selectedId: string | null = null
  ): void {
    if (!this.map || this.dragging) return;

    const incomingIds = new Set<string | number>();
    waypoints.forEach((wp) => incomingIds.add(wp.id || wp.index));

    // Remove stale markers
    for (const [id, entry] of this.markers.entries()) {
      if (!incomingIds.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }

    waypoints.forEach((wp) => {
      const markerId = wp.id || wp.index;
      const isSelected = selectedId === wp.id || selectedId === String(wp.index);
      const isActive = activeIndex === wp.index;

      let entry = this.markers.get(markerId);

      if (!entry) {
        // ── First-time creation ──────────────────────────────────────────────
        const el = document.createElement('div');
        el.className = 'tactical-waypoint-marker cursor-grab active:cursor-grabbing';

        const container = document.createElement('div');
        container.className = 'relative flex items-center justify-center';

        const dotEl = document.createElement('div');
        dotEl.className =
          'w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 shadow-lg';

        const labelEl = document.createElement('span');
        labelEl.textContent = String(wp.index);

        const subEl = document.createElement('div');
        subEl.className =
          'absolute -bottom-4 px-1 py-0.5 bg-[#0B0F14]/90 rounded border border-[#2B3743] text-[9px] font-mono text-[#A9B3BD] whitespace-nowrap pointer-events-none';

        dotEl.appendChild(labelEl);
        container.appendChild(dotEl);
        container.appendChild(subEl);
        el.appendChild(container);

        // Click to select (read from store, no prop drilling)
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = wp.id || wp.index;
          // Minimal store write — only selection
          useMissionStore.getState().hydrateFromSnapshot({ selected_waypoint_id: String(id) });
          commandManager.sendCommand('mission.select_waypoint', { waypoint_id: id });
        });

        const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([
          wp.longitude,
          wp.latitude,
        ]);
        marker.addTo(this.map!);

        entry = { marker, el, dotEl, labelEl, subEl, wp };
        this.markers.set(markerId, entry);

        // ── Drag handlers ─────────────────────────────────────────────────────
        let rafId: number | null = null;
        let lastLat = wp.latitude;
        let lastLon = wp.longitude;

        // Throttle WS sends to ~60fps during drag; update route line via rAF
        marker.on('drag', () => {
          this.dragging = true;
          const lngLat = marker.getLngLat();
          lastLat = lngLat.lat;
          lastLon = lngLat.lng;

          // Route line update via rAF — no store, no React render
          if (rafId === null) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              this.onDragUpdate?.(markerId, lastLat, lastLon);
            });
          }
        });

        marker.on('dragend', () => {
          this.dragging = false;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }

          const lngLat = marker.getLngLat();
          const finalLat = lngLat.lat;
          const finalLon = lngLat.lng;

          // Update route line once
          this.onDragUpdate?.(markerId, finalLat, finalLon);

          // Single WS message on commit
          commandManager.sendCommand('mission.update_waypoint', {
            waypoint_id: markerId,
            latitude: finalLat,
            longitude: finalLon,
          });

          // Update store ONCE with final position — triggers 1 React render
          const current = useMissionStore.getState().waypoints;
          useMissionStore.getState().setWaypoints(
            current.map((w) =>
              (w.id || w.index) === markerId
                ? { ...w, latitude: finalLat, longitude: finalLon }
                : w
            )
          );
        });
      } else {
        // ── Lightweight update (no DOM rebuild) ───────────────────────────────
        entry.wp = wp;
        entry.marker.setLngLat([wp.longitude, wp.latitude]);
      }

      // Update visual state (class changes only, no innerHTML)
      const isNowSelected = selectedId === wp.id || selectedId === String(wp.index);
      const isNowActive = activeIndex === wp.index;
      const isNowPassed = wp.index < activeIndex;

      if (isNowSelected) {
        entry.dotEl.className =
          'w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 shadow-lg bg-[#5B8FB9] border-[#E7EBEF] text-[#0B0F14] scale-125 ring-4 ring-[#5B8FB9]/50 transition-transform';
      } else if (isNowActive) {
        entry.dotEl.className =
          'w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 shadow-lg bg-[#10B981] border-[#34D399] text-white scale-110 ring-4 ring-[#10B981]/60 animate-pulse transition-transform';
      } else if (isNowPassed) {
        entry.dotEl.className =
          'w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 bg-[#064E3B] border-[#059669] text-[#34D399] opacity-80 transition-transform';
      } else {
        entry.dotEl.className =
          'w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 shadow-lg bg-[#11171E]/95 border-[#5B8FB9] text-[#5B8FB9] hover:scale-110 transition-transform';
      }
      entry.labelEl.textContent = isNowPassed ? '✓' : String(wp.index);
      entry.subEl.textContent = `${wp.altitude}m | ${wp.speed}m/s`;
    });
  }

  public clearMarkers(): void {
    this.markers.forEach((e) => e.marker.remove());
    this.markers.clear();
  }
}
