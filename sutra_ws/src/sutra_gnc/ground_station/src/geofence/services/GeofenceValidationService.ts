// Geofence Validation Service
import type { Position } from "geojson";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export class GeofenceValidationService {
  /**
   * Validate vertex array.
   */
  static validate(vertices: Position[]): ValidationResult {
    if (vertices.length < 3) {
      return {
        valid: false,
        message: "A geofence polygon requires at least 3 vertices.",
      };
    }
    return { valid: true };
  }
}
