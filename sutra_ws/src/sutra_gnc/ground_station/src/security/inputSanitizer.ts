export class InputSanitizer {
  /**
   * Sanitizes string inputs by escaping HTML tags and special characters (Anti-XSS)
   */
  static sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validates coordinate lat/lng numerical ranges (-90 to +90 lat, -180 to +180 lng)
   */
  static isValidCoordinate(lat: number, lng: number): boolean {
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
