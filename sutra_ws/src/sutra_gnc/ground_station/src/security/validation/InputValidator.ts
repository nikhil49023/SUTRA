export class InputValidator {
  public static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  public static validateAltitude(altM: number): boolean {
    return altM >= 0 && altM <= 10000;
  }
}
