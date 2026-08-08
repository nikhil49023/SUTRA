// Geofence Spatial Service
import * as turf from "@turf/turf";
import type { Feature, Polygon, Position, LineString } from "geojson";

export class GeofenceSpatialService {
    /**
     * Calculate polygon area in square meters.
     */
    static calculateArea(polygon: Feature<Polygon>): number {
        try {
            return turf.area(polygon);
        } catch {
            return 0;
        }
    }

    /**
     * Calculate polygon perimeter in meters.
     */
    static calculatePerimeter(polygon: Feature<Polygon>): number {
        try {
            const line = turf.polygonToLine(polygon);
            if (line.type === "FeatureCollection") {
                return line.features.reduce((acc, feat) => acc + turf.length(feat, { units: "kilometers" }) * 1000, 0);
            }
            return turf.length(line, { units: "kilometers" }) * 1000;
        } catch {
            return 0;
        }
    }

    /**
     * Calculate centroid.
     */
    static calculateCentroid(polygon: Feature<Polygon>): Position {
        const center = turf.centroid(polygon);
        return center.geometry.coordinates;
    }

    /**
     * Bounding Box
     */
    static getBoundingBox(polygon: Feature<Polygon>) {
        return turf.bbox(polygon);
    }

    /**
     * Check whether point is inside polygon.
     */
    static isPointInside(
        lat: number,
        lng: number,
        polygon: Feature<Polygon>
    ): boolean {
        const point = turf.point([lng, lat]);
        return turf.booleanPointInPolygon(point, polygon);
    }

    /**
     * Distance from point to polygon.
     * Returns meters.
     */
    static distanceToPolygon(
        lat: number,
        lng: number,
        polygon: Feature<Polygon>
    ): number {
        try {
            const point = turf.point([lng, lat]);
            if (turf.booleanPointInPolygon(point, polygon)) return 0;
            const line = turf.polygonToLine(polygon);
            return (
                turf.pointToLineDistance(
                    point,
                    line as any,
                    { units: "kilometers" }
                ) * 1000
            );
        } catch {
            return Number.MAX_VALUE;
        }
    }

    /**
     * Polygon intersects another polygon.
     */
    static intersects(
        polygonA: Feature<Polygon>,
        polygonB: Feature<Polygon>
    ): boolean {
        try {
            return turf.booleanIntersects(polygonA, polygonB);
        } catch {
            return false;
        }
    }

    /**
     * Route intersects polygon.
     */
    static routeIntersectsPolygon(
        route: Feature<LineString>,
        polygon: Feature<Polygon>
    ): boolean {
        try {
            return turf.booleanIntersects(route, polygon);
        } catch {
            return false;
        }
    }

    /**
     * Estimate route length.
     */
    static calculateRouteLength(route: Feature<LineString>): number {
        try {
            return turf.length(route, { units: "kilometers" }) * 1000;
        } catch {
            return 0;
        }
    }

    /**
     * Calculate bearing.
     */
    static calculateBearing(from: Position, to: Position): number {
        return turf.bearing(turf.point(from), turf.point(to));
    }

    /**
     * Create Turf polygon from vertices.
     */
    static createPolygon(vertices: Position[]): Feature<Polygon> {
        const coords = [...vertices];
        if (coords.length > 0) {
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coords.push([...first]);
            }
        }
        return turf.polygon([coords]);
    }

    /**
     * Create a circle polygon from center [lng, lat] and radius in meters.
     */
    static createCirclePolygon(center: Position, radiusMeters: number = 500): Feature<Polygon> {
        const options = { steps: 64, units: "kilometers" as const };
        return turf.circle(center, radiusMeters / 1000, options) as unknown as Feature<Polygon>;
    }

    /**
     * Create a corridor buffer polygon from a LineString path and width in meters.
     */
    static createCorridorPolygon(lineCoords: Position[], widthMeters: number = 100): Feature<Polygon> {
        const line = turf.lineString(lineCoords);
        const buffered = turf.buffer(line, (widthMeters / 2) / 1000, { units: "kilometers" });
        return buffered as unknown as Feature<Polygon>;
    }
}