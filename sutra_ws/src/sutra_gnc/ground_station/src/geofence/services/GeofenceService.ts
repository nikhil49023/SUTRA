// Geofence Service
import type { Position } from "geojson";

import type {
  GeofenceFeature,
  GeofenceProperties,
} from "../types/GeofenceTypes";
import { ZoneType, ZONE_COLORS } from "../types/GeofenceTypes";

import { geofenceStore } from "../store/GeofenceStore";
import { GeofenceSpatialService } from "./GeofenceSpatialService";
import { GeofenceValidationService } from "./GeofenceValidationService";

export class GeofenceService {
  /**
   * Create a new geofence.
   */
  static createGeofence(
    nameOrOptions: string | {
      name: string;
      type?: ZoneType;
      zoneType?: ZoneType;
      vertices: Position[];
      geometryType?: any;
      altitudeMin?: number;
      altitudeMax?: number;
      radiusMeters?: number;
      corridorWidthMeters?: number;
      color?: string;
    },
    zoneType?: ZoneType,
    vertices?: Position[],
    geometryType: any = "POLYGON",
    radiusMeters: number = 500,
    corridorWidthMeters: number = 100
  ): GeofenceFeature | null {
    let name: string;
    let actualZoneType: ZoneType;
    let actualVertices: Position[];
    let actualGeomType: any;
    let actualRadius = radiusMeters;
    let actualCorridorWidth = corridorWidthMeters;
    let altMin = 0;
    let altMax = 120;
    let customColor: string | undefined;

    if (typeof nameOrOptions === "object") {
      name = nameOrOptions.name;
      actualZoneType = nameOrOptions.type || nameOrOptions.zoneType || ZoneType.NO_FLY;
      actualVertices = nameOrOptions.vertices || [];
      actualGeomType = nameOrOptions.geometryType || "POLYGON";
      if (nameOrOptions.radiusMeters !== undefined) actualRadius = nameOrOptions.radiusMeters;
      if (nameOrOptions.corridorWidthMeters !== undefined) actualCorridorWidth = nameOrOptions.corridorWidthMeters;
      if (nameOrOptions.altitudeMin !== undefined) altMin = nameOrOptions.altitudeMin;
      if (nameOrOptions.altitudeMax !== undefined) altMax = nameOrOptions.altitudeMax;
      if (nameOrOptions.color !== undefined) customColor = nameOrOptions.color;
    } else {
      name = nameOrOptions;
      actualZoneType = zoneType || ZoneType.NO_FLY;
      actualVertices = vertices || [];
      actualGeomType = geometryType;
    }

    if (actualVertices.length === 0) return null;

    let polygon: GeofenceFeature;
    if (actualGeomType === "CIRCLE" && actualVertices.length >= 1) {
      polygon = GeofenceSpatialService.createCirclePolygon(actualVertices[0], actualRadius) as unknown as GeofenceFeature;
    } else if (actualGeomType === "CORRIDOR" && actualVertices.length >= 2) {
      polygon = GeofenceSpatialService.createCorridorPolygon(actualVertices, actualCorridorWidth) as unknown as GeofenceFeature;
    } else {
      const validation = GeofenceValidationService.validate(actualVertices);
      if (!validation.valid) {
        console.error(validation.message);
        return null;
      }
      polygon = GeofenceSpatialService.createPolygon(actualVertices) as unknown as GeofenceFeature;
    }

    const now = new Date().toISOString();

    const properties: GeofenceProperties = {
      id: crypto.randomUUID(),
      name,
      type: actualZoneType,
      geometryType: actualGeomType,
      color: customColor || ZONE_COLORS[actualZoneType]?.outline || "#10b981",
      visible: true,
      locked: false,
      altitudeMin: altMin,
      altitudeMax: altMax,
      areaSqMeters: GeofenceSpatialService.calculateArea(polygon),
      perimeterMeters: GeofenceSpatialService.calculatePerimeter(polygon),
      radiusMeters: actualGeomType === "CIRCLE" ? actualRadius : undefined,
      corridorWidthMeters: actualGeomType === "CORRIDOR" ? actualCorridorWidth : undefined,
      createdAt: now,
      updatedAt: now,
    };

    polygon.properties = properties;

    const state = geofenceStore.getState();

    geofenceStore.setCollection({
      ...state.collection,
      features: [...state.collection.features, polygon],
    });

    return polygon;
  }

  /**
   * Return all geofences.
   */
  static getAll(): GeofenceFeature[] {
    return geofenceStore.getState().collection.features;
  }

  /**
   * Find geofence by id.
   */
  static getById(id: string): GeofenceFeature | undefined {
    return this.getAll().find((g: GeofenceFeature) => g.properties.id === id);
  }

  /**
   * Delete geofence.
   */
  static delete(id: string): void {
    const state = geofenceStore.getState();

    geofenceStore.setCollection({
      ...state.collection,
      features: state.collection.features.filter((g: GeofenceFeature) => g.properties.id !== id),
    });
  }

  /**
   * Rename geofence.
   */
  static rename(id: string, name: string): void {
    this.updateProperties(id, { name });
  }

  /**
   * Update min/max altitude.
   */
  static updateAltitude(
    id: string,
    altitudeMin: number,
    altitudeMax: number
  ): void {
    this.updateProperties(id, { altitudeMin, altitudeMax });
  }

  /**
   * Toggle visibility.
   */
  static toggleVisibility(id: string): void {
    const feature = this.getById(id);

    if (!feature) return;

    this.updateProperties(id, {
      visible: !feature.properties.visible,
    });
  }

  /**
   * Lock or unlock.
   */
  static toggleLock(id: string): void {
    const feature = this.getById(id);

    if (!feature) return;

    this.updateProperties(id, {
      locked: !feature.properties.locked,
    });
  }

  /**
   * Change zone type.
   */
  static changeType(id: string, type: ZoneType): void {
    this.updateProperties(id, {
      type,
      color: ZONE_COLORS[type].outline,
    });
  }

  /**
   * Update vertices.
   */
  static updateVertices(id: string, vertices: Position[]): void {
    const validation = GeofenceValidationService.validate(vertices);

    if (!validation.valid) return;

    const polygon = GeofenceSpatialService.createPolygon(vertices) as unknown as GeofenceFeature;

    const feature = this.getById(id);

    if (!feature) return;

    polygon.properties = {
      ...feature.properties,
      updatedAt: new Date().toISOString(),
      areaSqMeters: GeofenceSpatialService.calculateArea(polygon),
      perimeterMeters: GeofenceSpatialService.calculatePerimeter(polygon),
    };

    const state = geofenceStore.getState();

    geofenceStore.setCollection({
      ...state.collection,
      features: state.collection.features.map((g: GeofenceFeature) =>
        g.properties.id === id ? polygon : g
      ),
    });
  }

  /**
   * Internal property updater.
   */
  private static updateProperties(
    id: string,
    properties: Partial<GeofenceProperties>
  ): void {
    const state = geofenceStore.getState();

    geofenceStore.setCollection({
      ...state.collection,
      features: state.collection.features.map((g: GeofenceFeature) => {
        if (g.properties.id !== id) return g;

        return {
          ...g,
          properties: {
            ...g.properties,
            ...properties,
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    });
  }
}
