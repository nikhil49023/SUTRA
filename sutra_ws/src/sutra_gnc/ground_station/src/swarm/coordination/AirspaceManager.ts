export class AirspaceManager {
  public static checkAirspaceClearance(lat: number, lng: number, alt: number): boolean {
    return alt >= 20 && alt <= 400;
  }
}
