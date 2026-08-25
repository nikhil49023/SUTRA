/**
 * Smart Horizon GCS — High-Performance Fleet Markers & Movement Layer
 *
 * BUG 1 Secondary Fix: Separated marker creation from update path.
 * The inner marker elements (pill, heading circle, subtext) are stored by reference
 * and updated in-place (textContent + style) without full innerHTML reconstruction.
 * Full innerHTML was causing reflow+exception for non-first drones, silently skipping
 * their position updates even though backend was broadcasting correctly.
 */

import maplibregl from 'maplibre-gl';
import { DroneState } from '../types/fleet';
import { useSelectionStore } from '../stores/selectionStore';
import { wsClient } from '../communication/WebSocketClient';

interface DroneMarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLElement;
  // Sub-element refs for lightweight update (avoids full innerHTML reconstruction)
  pillEl: HTMLElement;
  pillIcon: HTMLElement;
  callsignEl: HTMLElement;
  batteryEl: HTMLElement;
  headingCircleEl: HTMLElement;
  pingEl: HTMLElement | null;
  subtextEl: HTMLElement;
}

export class FleetLayer {
  private map: maplibregl.Map | null = null;
  private markers: Map<string, DroneMarkerEntry> = new Map();

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) {
      this.clear();
    }
  }

  /**
   * Update all drone markers. Creates new markers only if a drone ID is new.
   * For existing drones: only updates position, rotation, and text — no DOM reconstruction.
   */
  public updateFleet(drones: Record<string, DroneState>, selectedDroneId?: string | null): void {
    if (!this.map) return;

    const droneIds = Object.keys(drones);

    // Remove stale markers for drones that no longer exist
    for (const [id, entry] of this.markers.entries()) {
      if (!drones[id]) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }

    for (const droneId of droneIds) {
      const drone = drones[droneId];
      if (!drone) continue;

      const isSelected = selectedDroneId === droneId;
      const isLeader = drone.is_leader || drone.role === 'LEADER';

      let entry = this.markers.get(droneId);

      if (!entry) {
        // ── First-time creation: build full DOM structure ──────────────────
        const el = document.createElement('div');
        el.className = 'tactical-drone-marker cursor-pointer group';

        // Callsign pill
        const pillEl = document.createElement('div');
        pillEl.className = 'mb-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap shadow-md transition';

        const pillIcon = document.createElement('span');
        const callsignEl = document.createElement('span');
        const batteryEl = document.createElement('span');
        batteryEl.className = 'text-[9px] text-[#4F9A72] ml-1';

        pillEl.appendChild(pillIcon);
        pillEl.appendChild(callsignEl);
        pillEl.appendChild(batteryEl);

        // Heading wrapper
        const headingWrapperEl = document.createElement('div');
        headingWrapperEl.className = 'relative w-8 h-8 flex items-center justify-center';

        const headingCircleEl = document.createElement('div');
        headingCircleEl.className = 'w-8 h-8 rounded-full border flex items-center justify-center transition-transform';
        headingCircleEl.innerHTML = `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 2L4 20L12 16L20 20L12 2Z" /></svg>`;

        const pingEl = document.createElement('div');
        pingEl.className = 'absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#C49A4A] rounded-full animate-ping';

        headingWrapperEl.appendChild(headingCircleEl);

        // Subtext
        const subtextEl = document.createElement('div');
        subtextEl.className = 'mt-0.5 text-[8px] font-mono text-[#A9B3BD] bg-[#0B0F14]/90 px-1 rounded border border-[#2B3743]';

        const containerEl = document.createElement('div');
        containerEl.className = 'relative flex flex-col items-center select-none';
        containerEl.appendChild(pillEl);
        containerEl.appendChild(headingWrapperEl);
        containerEl.appendChild(subtextEl);
        el.appendChild(containerEl);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          useSelectionStore.getState().selectDrone(droneId);
          wsClient.sendCommand('FLEET_SELECT_DRONE', { drone_id: droneId });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([drone.longitude, drone.latitude])
          .addTo(this.map!);

        entry = { marker, el, pillEl, pillIcon, callsignEl, batteryEl, headingCircleEl, pingEl, subtextEl };
        this.markers.set(droneId, entry);
      }

      // ── Lightweight update path (no innerHTML reconstruction) ─────────────
      // 1. Map position
      entry.marker.setLngLat([drone.longitude, drone.latitude]);

      // 2. Callsign pill classes
      if (isSelected) {
        entry.pillEl.className = 'mb-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap shadow-md transition bg-[#1B2530] border-[#6FA4CE] text-[#E7EBEF] ring-2 ring-[#5B8FB9]/40';
      } else if (isLeader) {
        entry.pillEl.className = 'mb-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap shadow-md transition bg-[#151D26] border-[#C49A4A] text-[#C49A4A]';
      } else {
        entry.pillEl.className = 'mb-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold whitespace-nowrap shadow-md transition bg-[#11171E] border-[#2B3743] text-[#A9B3BD]';
      }
      entry.pillIcon.textContent = isLeader ? '★ ' : '';
      entry.callsignEl.textContent = drone.callsign.split(' ')[0];
      entry.batteryEl.textContent = `${drone.battery.toFixed(0)}%`;

      // 3. Heading ring + chevron color
      entry.headingCircleEl.style.transform = `rotate(${drone.heading}deg)`;
      if (isSelected) {
        entry.headingCircleEl.className = 'w-8 h-8 rounded-full border flex items-center justify-center transition-transform border-[#6FA4CE] bg-[#151D26] shadow-[0_0_12px_rgba(91,143,185,0.4)]';
      } else if (isLeader) {
        entry.headingCircleEl.className = 'w-8 h-8 rounded-full border flex items-center justify-center transition-transform border-[#C49A4A] bg-[#151D26]';
      } else {
        entry.headingCircleEl.className = 'w-8 h-8 rounded-full border flex items-center justify-center transition-transform border-[#2B3743] bg-[#11171E]';
      }
      // SVG chevron color
      const svg = entry.headingCircleEl.querySelector('svg');
      if (svg) {
        svg.className.baseVal = `w-5 h-5 ${isSelected ? 'text-[#6FA4CE]' : isLeader ? 'text-[#C49A4A]' : 'text-[#5B8FB9]'}`;
      }

      // 4. Leader ping dot
      const parentWrapper = entry.headingCircleEl.parentElement;
      if (parentWrapper) {
        if (isLeader && !parentWrapper.contains(entry.pingEl)) {
          parentWrapper.appendChild(entry.pingEl!);
        } else if (!isLeader && entry.pingEl && parentWrapper.contains(entry.pingEl)) {
          parentWrapper.removeChild(entry.pingEl!);
        }
      }

      // 5. Alt / Speed subtext
      entry.subtextEl.textContent = `${drone.altitude.toFixed(0)}m · ${drone.speed.toFixed(1)}m/s`;
    }
  }

  public clear(): void {
    this.markers.forEach((entry) => entry.marker.remove());
    this.markers.clear();
  }
}

