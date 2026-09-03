/**
 * Smart Horizon GCS — AI Edge Perception Target Markers Layer
 * Subsystem: Map Engine / Subsystem C Integration
 *
 * Renders live WGS84 survivor / target detection markers on the MapLibre 3D canvas.
 * Displays Target ID, classification (SURVIVOR), confidence score, source drone,
 * and tracking halo rings. Clicking a marker selects the target in the Tactical Inspector.
 */

import maplibregl from 'maplibre-gl';
import { TrackedTarget } from '../types/ai';
import { useSelectionStore } from '../stores/selectionStore';

interface TargetMarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLElement;
  badgeEl: HTMLElement;
  labelEl: HTMLElement;
  confEl: HTMLElement;
  droneEl: HTMLElement;
  pulseEl: HTMLElement;
}

export class AiTargetLayer {
  private map: maplibregl.Map | null = null;
  private markers: Map<string, TargetMarkerEntry> = new Map();

  public setMap(map: maplibregl.Map | null): void {
    this.map = map;
    if (!map) {
      this.clear();
    }
  }

  public updateTargets(targets: TrackedTarget[], selectedTargetId?: string | null): void {
    if (!this.map) return;

    // Filter to active targets only
    const activeTargets = targets.filter(
      (t) =>
        t &&
        (t.target_id || t.id) &&
        t.latitude &&
        t.longitude &&
        t.tracking_status !== 'LOST'
    );

    const activeIds = new Set(activeTargets.map((t) => String(t.target_id || t.id)));

    // 1. Remove markers for targets no longer active or marked LOST
    for (const [id, entry] of this.markers.entries()) {
      if (!activeIds.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }

    // 2. Create or update markers for each active target
    for (const target of activeTargets) {
      const targetId = String(target.target_id || target.id);
      const isSelected = selectedTargetId === targetId;
      const isSurvivor = target.label?.toUpperCase().includes('SURVIVOR') ?? true;
      const confPct = Math.round((target.confidence ?? 1.0) * 100);

      let entry = this.markers.get(targetId);

      if (!entry) {
        // Create root marker container
        const el = document.createElement('div');
        el.className = 'relative flex flex-col items-center cursor-pointer group select-none pointer-events-auto';
        el.style.transform = 'translate(-50%, -50%)';

        // Pulse beacon ring
        const pulseEl = document.createElement('div');
        pulseEl.className = 'absolute -inset-2.5 rounded-full border-2 animate-ping pointer-events-none opacity-75';
        pulseEl.style.borderColor = isSurvivor ? '#F59E0B' : '#EC4899';
        el.appendChild(pulseEl);

        // Center crosshair icon circle
        const circleEl = document.createElement('div');
        circleEl.className = 'w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-[11px] shadow-lg border-2 z-10 transition-transform group-hover:scale-110';
        circleEl.style.backgroundColor = isSurvivor ? 'rgba(180, 83, 9, 0.95)' : 'rgba(190, 24, 93, 0.95)';
        circleEl.style.borderColor = isSurvivor ? '#FDE68A' : '#FBCFE8';
        circleEl.style.color = '#FFFFFF';
        circleEl.innerHTML = '⌖';
        el.appendChild(circleEl);

        // Target Info Badge
        const badgeEl = document.createElement('div');
        badgeEl.className = 'mt-1 px-2 py-0.5 rounded border shadow-xl flex items-center space-x-1.5 font-mono text-[10px] whitespace-nowrap backdrop-blur-md transition-all z-20';
        badgeEl.style.backgroundColor = isSurvivor ? 'rgba(15, 23, 42, 0.92)' : 'rgba(24, 15, 30, 0.92)';
        badgeEl.style.borderColor = isSurvivor ? 'rgba(245, 158, 11, 0.6)' : 'rgba(236, 72, 153, 0.6)';

        const labelEl = document.createElement('span');
        labelEl.className = 'font-bold tracking-wider';
        labelEl.style.color = isSurvivor ? '#FBBF24' : '#F472B6';
        labelEl.textContent = `${target.label || 'SURVIVOR'} #${targetId}`;

        const confEl = document.createElement('span');
        confEl.className = 'px-1 py-0.2 rounded bg-black/60 font-bold';
        confEl.style.color = confPct >= 70 ? '#34D399' : '#FBBF24';
        confEl.textContent = `${confPct}%`;

        const droneEl = document.createElement('span');
        droneEl.className = 'text-[8px] text-slate-400 font-normal';
        droneEl.textContent = `UAV:${(target.drone_id || 'ALPHA').toUpperCase()}`;

        badgeEl.appendChild(labelEl);
        badgeEl.appendChild(confEl);
        badgeEl.appendChild(droneEl);
        el.appendChild(badgeEl);

        // Click Handler -> Select Target in GCS
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          useSelectionStore.getState().selectTarget(targetId);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([target.longitude, target.latitude])
          .addTo(this.map);

        entry = { marker, el, badgeEl, labelEl, confEl, droneEl, pulseEl };
        this.markers.set(targetId, entry);
      } else {
        // Update existing marker position & info in-place
        entry.marker.setLngLat([target.longitude, target.latitude]);
        entry.labelEl.textContent = `${target.label || 'SURVIVOR'} #${targetId}`;
        entry.confEl.textContent = `${confPct}%`;
        entry.confEl.style.color = confPct >= 70 ? '#34D399' : '#FBBF24';
        entry.droneEl.textContent = `UAV:${(target.drone_id || 'ALPHA').toUpperCase()}`;
      }

      // Selection state styling
      if (isSelected) {
        entry.badgeEl.style.borderColor = '#38BDF8';
        entry.badgeEl.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.8)';
        entry.badgeEl.style.transform = 'scale(1.08)';
      } else {
        entry.badgeEl.style.borderColor = isSurvivor ? 'rgba(245, 158, 11, 0.6)' : 'rgba(236, 72, 153, 0.6)';
        entry.badgeEl.style.boxShadow = 'none';
        entry.badgeEl.style.transform = 'scale(1.0)';
      }
    }
  }

  public clear(): void {
    for (const entry of this.markers.values()) {
      entry.marker.remove();
    }
    this.markers.clear();
  }
}
