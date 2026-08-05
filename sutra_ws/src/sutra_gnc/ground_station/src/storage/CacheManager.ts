export class CacheManager {
  private static cache = new Map<string, any>();

  public static get(key: string): any { return this.cache.get(key); }
  public static set(key: string, val: any): void { this.cache.set(key, val); }
}
