export class LinkQuality {
  public static calculateLinkIndex(satellites: number, rssiDbm: number): number {
    const satScore = Math.min(100, (satellites / 18) * 100);
    const rfScore = Math.max(0, Math.min(100, ((rssiDbm + 100) / 50) * 100));
    return Math.round(satScore * 0.5 + rfScore * 0.5);
  }
}
