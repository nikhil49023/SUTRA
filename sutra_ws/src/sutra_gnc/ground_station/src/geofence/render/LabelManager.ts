// Label Manager
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import * as turf from "@turf/turf";
import type { GeofenceFeature } from "../types/GeofenceTypes";

export class LabelManager {
  private labels = new Map<string, Marker>();

  /**
   * Remove every label.
   */
  clear() {
    this.labels.forEach((marker: Marker) => marker.remove());
    this.labels.clear();
  }

  /**
   * Render all geofence labels.
   */
  render(map: MapLibreMap, features: GeofenceFeature[]) {
    // Remove labels that no longer exist
    const ids = new Set(features.map((f: GeofenceFeature) => f.properties.id));

    this.labels.forEach((marker: Marker, id: string) => {
      if (!ids.has(id)) {
        marker.remove();
        this.labels.delete(id);
      }
    });

    features.forEach((feature: GeofenceFeature) => {
      if (!feature.properties.visible) return;

      const centroid = turf.centroid(feature as any);
      const [lng, lat] = centroid.geometry.coordinates;

      let marker = this.labels.get(feature.properties.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "pointer-events-none transition-all duration-200";
        el.style.background = "rgba(7, 12, 24, 0.88)";
        el.style.border = `1.5px solid ${feature.properties.color}`;
        el.style.borderRadius = "8px";
        el.style.padding = "5px 10px";
        el.style.color = "white";
        el.style.fontSize = "10px";
        el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        el.style.backdropFilter = "blur(8px)";
        el.style.boxShadow = `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${feature.properties.color}40`;
        el.style.whiteSpace = "nowrap";

        marker = new Marker({
          element: el,
        })
          .setLngLat([lng, lat])
          .addTo(map);

        this.labels.set(feature.properties.id, marker);
      }

      marker.setLngLat([lng, lat]);

      const element = marker.getElement();
      element.style.borderColor = feature.properties.color;
      element.style.boxShadow = `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${feature.properties.color}50`;

      let labelHtml = `
        <div style="text-align: center; text-transform: uppercase; font-weight: 800; font-size: 11px; letter-spacing: 0.6px; color: ${feature.properties.color};">
          ${feature.properties.name}
        </div>
      `;

      if (feature.properties.geometryType === "CIRCLE") {
        labelHtml += `
          <div style="text-align: center; font-size: 9.5px; color: #e2e8f0; margin-top: 2px;">
            Radius: ${feature.properties.radiusMeters || 500} m
          </div>
          <div style="text-align: center; font-size: 9.5px; color: #94a3b8;">
            Alt: ${feature.properties.altitudeMin} - ${feature.properties.altitudeMax} m
          </div>
        `;
      } else if (feature.properties.geometryType === "CORRIDOR") {
        labelHtml += `
          <div style="text-align: center; font-size: 9.5px; color: #94a3b8; margin-top: 2px;">
            Alt: ${feature.properties.altitudeMin} - ${feature.properties.altitudeMax} m
          </div>
        `;
      } else {
        const areaKm2 = (feature.properties.areaSqMeters / 1000000).toFixed(2);
        labelHtml += `
          <div style="text-align: center; font-size: 9.5px; color: #e2e8f0; margin-top: 2px;">
            Area: ${areaKm2} km²
          </div>
          <div style="text-align: center; font-size: 9.5px; color: #94a3b8;">
            Alt: ${feature.properties.altitudeMin} - ${feature.properties.altitudeMax} m
          </div>
        `;
      }

      element.innerHTML = labelHtml;
    });
  }

  /**
   * Remove a single label.
   */
  remove(id: string) {
    const marker = this.labels.get(id);
    if (!marker) return;

    marker.remove();
    this.labels.delete(id);
  }
}

export const labelManager = new LabelManager();