// Marker Manager
import { Map, Marker } from "maplibre-gl";

export class MarkerManager {
  private drawingMarkers: Marker[] = [];
  private editMarkers: Marker[] = [];

  /**
   * Remove all markers.
   */
  clearAll() {
    this.clearDrawingMarkers();
    this.clearEditMarkers();
    this.clearAllGeofenceMarkers();
  }

  /**
   * Remove drawing markers.
   */
  clearDrawingMarkers() {
    this.drawingMarkers.forEach((marker) => marker.remove());
    this.drawingMarkers = [];
  }

  /**
   * Remove edit markers.
   */
  clearEditMarkers() {
    this.editMarkers.forEach((marker) => marker.remove());
    this.editMarkers = [];
  }

  /**
   * Render drawing vertices.
   */
  renderDrawingMarkers(map: Map, vertices: [number, number][]) {
    this.clearDrawingMarkers();

    vertices.forEach(([lng, lat]) => {
      const element = document.createElement("div");

      element.style.width = "12px";
      element.style.height = "12px";
      element.style.borderRadius = "50%";
      element.style.background = "#00f0ff";
      element.style.border = "2px solid white";
      element.style.boxShadow = "0 0 8px cyan";
      element.style.cursor = "pointer";

      const marker = new Marker({
        element,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      this.drawingMarkers.push(marker);
    });
  }

  /**
   * Render editable vertices.
   */
  renderEditMarkers(
    map: Map,
    vertices: [number, number][],
    onDrag: (index: number, lng: number, lat: number) => void
  ) {
    this.clearEditMarkers();

    vertices.forEach(([lng, lat], index) => {
      const element = document.createElement("div");

      element.style.width = "14px";
      element.style.height = "14px";
      element.style.borderRadius = "50%";
      element.style.background = "#ffffff";
      element.style.border = "3px solid #00f0ff";
      element.style.boxShadow = "0 0 10px cyan";
      element.style.cursor = "grab";

      const marker = new Marker({
        element,
        draggable: true,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("drag", () => {
        const pos = marker.getLngLat();
        onDrag(index, pos.lng, pos.lat);
      });

      this.editMarkers.push(marker);
    });
  }

  /**
   * Update drawing marker positions.
   */
  updateDrawingMarkers(vertices: [number, number][]) {
    vertices.forEach((vertex, i) => {
      if (this.drawingMarkers[i]) {
        this.drawingMarkers[i].setLngLat(vertex);
      }
    });
  }

  private allGeofenceMarkers: Marker[] = [];

  /**
   * Remove all geofence vertex markers.
   */
  clearAllGeofenceMarkers() {
    this.allGeofenceMarkers.forEach((marker) => marker.remove());
    this.allGeofenceMarkers = [];
  }

  /**
   * Render vertex markers at all polygon corners for visible geofences.
   */
  renderAllGeofenceVertexMarkers(map: Map, features: any[]) {
    this.clearAllGeofenceMarkers();

    features.forEach((feature) => {
      if (!feature.properties?.visible) return;
      if (!feature.geometry?.coordinates) return;

      const geomType = feature.properties.geometryType || "POLYGON";
      if (geomType === "CIRCLE") return; // Circle handled by center/radius

      const coords = feature.geometry.coordinates[0] || [];
      const points = coords.slice(0, -1);

      points.forEach(([lng, lat]: [number, number]) => {
        const element = document.createElement("div");
        element.style.width = "7px";
        element.style.height = "7px";
        element.style.borderRadius = "50%";
        element.style.background = "#ffffff";
        element.style.border = `2px solid ${feature.properties.color || "#ef4444"}`;
        element.style.boxShadow = `0 0 6px ${feature.properties.color || "#ef4444"}`;
        element.style.pointerEvents = "none";

        const marker = new Marker({ element })
          .setLngLat([lng, lat])
          .addTo(map);

        this.allGeofenceMarkers.push(marker);
      });
    });
  }

  /**
   * Update edit marker positions.
   */
  updateEditMarkers(vertices: [number, number][]) {
    vertices.forEach((vertex, i) => {
      if (this.editMarkers[i]) {
        this.editMarkers[i].setLngLat(vertex);
      }
    });
  }
}

export const markerManager = new MarkerManager();
