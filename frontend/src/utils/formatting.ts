/**
 * Formatting utilities for coordinates, distances, speeds, and time in Tactical GCS.
 */

export function formatCoordinates(lat: number, lon: number, format: 'DD' | 'DMS' = 'DD'): string {
  if (format === 'DMS') {
    const latH = lat >= 0 ? 'N' : 'S';
    const lonH = lon >= 0 ? 'E' : 'W';
    const absLat = Math.abs(lat);
    const absLon = Math.abs(lon);

    const latD = Math.floor(absLat);
    const latM = Math.floor((absLat - latD) * 60);
    const latS = ((absLat - latD - latM / 60) * 3600).toFixed(1);

    const lonD = Math.floor(absLon);
    const lonM = Math.floor((absLon - lonD) * 60);
    const lonS = ((absLon - lonD - lonM / 60) * 3600).toFixed(1);

    return `${latD}°${latM}'${latS}"${latH}, ${lonD}°${lonM}'${lonS}"${lonH}`;
  }

  return `${lat >= 0 ? '+' : ''}${lat.toFixed(6)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(6)}°`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(1)} m`;
}

export function formatSpeed(mps: number, unit: 'mps' | 'kmh' | 'knots' = 'mps'): string {
  if (unit === 'kmh') {
    return `${(mps * 3.6).toFixed(1)} km/h`;
  }
  if (unit === 'knots') {
    return `${(mps * 1.94384).toFixed(1)} kts`;
  }
  return `${mps.toFixed(1)} m/s`;
}

export function formatAltitude(meters: number): string {
  return `${meters.toFixed(1)} m`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
  return date.toTimeString().split(' ')[0] + '.' + String(date.getMilliseconds()).padStart(3, '0');
}
