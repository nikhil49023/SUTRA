/**
 * Smart Horizon GCS — Spatial Data Exchange & Multi-Format Converter
 * Formats: GeoJSON RFC 7946, KML (Google Earth / DJI Pilot), WKT (Well-Known Text)
 */

import { Geofence, ZoneType, GeometryType } from '../types/geofence';

export interface SpatialValidationResult {
  valid: boolean;
  geofences: Partial<Geofence>[];
  errors: string[];
  warnings: string[];
}

export class GeofenceFormatService {
  /**
   * Exports geofences to standard GeoJSON FeatureCollection
   */
  public static exportToGeoJSON(geofences: Geofence[]): string {
    const features = geofences.map((g) => {
      let geometry: any;
      if (g.geometry_type === 'CIRCLE' && g.center) {
        geometry = {
          type: 'Point',
          coordinates: [g.center[1], g.center[0]],
        };
      } else if (g.geometry_type === 'CORRIDOR' && g.coordinates) {
        geometry = {
          type: 'LineString',
          coordinates: g.coordinates.map((c) => [c[1], c[0]]),
        };
      } else if (g.coordinates && g.coordinates.length >= 3) {
        const closed = [...g.coordinates];
        if (
          closed[0][0] !== closed[closed.length - 1][0] ||
          closed[0][1] !== closed[closed.length - 1][1]
        ) {
          closed.push(closed[0]);
        }
        geometry = {
          type: 'Polygon',
          coordinates: [closed.map((c) => [c[1], c[0]])],
        };
      } else {
        geometry = { type: 'GeometryCollection', geometries: [] };
      }

      return {
        type: 'Feature',
        id: g.id,
        properties: {
          name: g.name,
          zone_type: g.zone_type,
          geometry_type: g.geometry_type,
          radius: g.radius,
          corridor_width: g.corridor_width,
          altitude_min: g.altitude_min ?? 0,
          altitude_max: g.altitude_max ?? 120,
          priority: g.priority ?? 3,
          enabled: g.enabled ?? true,
          visible: g.visible ?? true,
          description: g.description || '',
        },
        geometry,
      };
    });

    return JSON.stringify(
      {
        type: 'FeatureCollection',
        generator: 'SMART HORIZON TACTICAL GCS v2.0',
        timestamp: new Date().toISOString(),
        features,
      },
      null,
      2
    );
  }

  /**
   * Exports geofences to KML (Keyhole Markup Language)
   */
  public static exportToKML(geofences: Geofence[]): string {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>Smart Horizon Tactical Geofences</name>\n    <description>Authoritative UAV Containment & Airspace Boundaries</description>\n`;

    // Styles for Zone Types
    kml += `    <Style id="NO_FLY"><LineStyle><color>ff4444ef</color><width>3</width></LineStyle><PolyStyle><color>404444ef</color></PolyStyle></Style>\n`;
    kml += `    <Style id="WARNING"><LineStyle><color>ff0b9ef5</color><width>3</width></LineStyle><PolyStyle><color>400b9ef5</color></PolyStyle></Style>\n`;
    kml += `    <Style id="SAFE"><LineStyle><color>ff81b910</color><width>3</width></LineStyle><PolyStyle><color>4081b910</color></PolyStyle></Style>\n`;

    geofences.forEach((g) => {
      kml += `    <Placemark>\n      <name>${escapeXml(g.name)}</name>\n      <description>Zone: ${g.zone_type} | Alt: ${g.altitude_min}-${g.altitude_max}m</description>\n      <styleUrl>#${g.zone_type}</styleUrl>\n`;

      if (g.coordinates && g.coordinates.length >= 3) {
        const closed = [...g.coordinates];
        if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
          closed.push(closed[0]);
        }
        const coordStr = closed.map((c) => `${c[1]},${c[0]},${g.altitude_max}`).join(' ');
        kml += `      <Polygon>\n        <extrude>1</extrude>\n        <altitudeMode>relativeToGround</altitudeMode>\n        <outerBoundaryIs>\n          <LinearRing>\n            <coordinates>${coordStr}</coordinates>\n          </LinearRing>\n        </outerBoundaryIs>\n      </Polygon>\n`;
      } else if (g.geometry_type === 'CIRCLE' && g.center) {
        kml += `      <Point>\n        <coordinates>${g.center[1]},${g.center[0]},${g.altitude_max}</coordinates>\n      </Point>\n`;
      }
      kml += `    </Placemark>\n`;
    });

    kml += `  </Document>\n</kml>`;
    return kml;
  }

  /**
   * Exports geofences to WKT (Well-Known Text)
   */
  public static exportToWKT(geofences: Geofence[]): string {
    const lines = geofences.map((g) => {
      if (g.coordinates && g.coordinates.length >= 3) {
        const closed = [...g.coordinates];
        if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
          closed.push(closed[0]);
        }
        const pts = closed.map((c) => `${c[1]} ${c[0]}`).join(', ');
        return `POLYGON((${pts})) -- Name: ${g.name} [${g.zone_type}]`;
      }
      if (g.geometry_type === 'CIRCLE' && g.center) {
        return `POINT(${g.center[1]} ${g.center[0]}) -- Center: ${g.name} Radius: ${g.radius}m`;
      }
      return `-- Invalid geometry for ${g.name}`;
    });
    return lines.join('\n');
  }

  /**
   * Imports and validates GeoJSON string
   */
  public static parseGeoJSON(raw: string): SpatialValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const geofences: Partial<Geofence>[] = [];

    try {
      const parsed = JSON.parse(raw);
      const features = parsed.type === 'FeatureCollection' ? parsed.features : parsed.type === 'Feature' ? [parsed] : [];

      if (!features || features.length === 0) {
        errors.push('No GeoJSON features found in provided file.');
        return { valid: false, geofences: [], errors, warnings };
      }

      features.forEach((feat: any, idx: number) => {
        const props = feat.properties || {};
        const geom = feat.geometry || {};
        const name = props.name || `Imported Zone #${idx + 1}`;
        const rawZone = String(props.zone_type || 'NO_FLY').toUpperCase();
        const zoneType: ZoneType = ['SAFE', 'WARNING', 'NO_FLY', 'INCLUSION', 'EXCLUSION'].includes(rawZone)
          ? (rawZone as ZoneType)
          : 'NO_FLY';

        if (geom.type === 'Polygon') {
          const ring = geom.coordinates?.[0] || [];
          if (ring.length < 3) {
            warnings.push(`Feature #${idx + 1} (${name}) has fewer than 3 vertices. Skipped.`);
            return;
          }
          const coords: [number, number][] = ring.map((c: any) => [Number(c[1]), Number(c[0])]);
          geofences.push({
            id: feat.id || `gf-import-${Date.now()}-${idx}`,
            name,
            zone_type: zoneType,
            geometry_type: 'POLYGON',
            coordinates: coords,
            altitude_min: Number(props.altitude_min ?? 0),
            altitude_max: Number(props.altitude_max ?? 120),
            priority: Number(props.priority ?? 3),
            enabled: props.enabled !== false,
            visible: props.visible !== false,
          });
        } else if (geom.type === 'Point') {
          const c = geom.coordinates || [];
          if (c.length >= 2) {
            geofences.push({
              id: feat.id || `gf-import-${Date.now()}-${idx}`,
              name,
              zone_type: zoneType,
              geometry_type: 'CIRCLE',
              center: [Number(c[1]), Number(c[0])],
              radius: Number(props.radius ?? 200),
              altitude_min: Number(props.altitude_min ?? 0),
              altitude_max: Number(props.altitude_max ?? 120),
              priority: Number(props.priority ?? 3),
              enabled: props.enabled !== false,
              visible: props.visible !== false,
            });
          }
        }
      });
    } catch (e: any) {
      errors.push(`JSON Syntax Error: ${e.message}`);
    }

    return {
      valid: errors.length === 0 && geofences.length > 0,
      geofences,
      errors,
      warnings,
    };
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
