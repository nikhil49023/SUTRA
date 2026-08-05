export class MemoryMonitor {
  public static getMemoryUsage(): { usedHeapMB: number; totalHeapMB: number } {
    const mem = (performance as any).memory;
    if (mem) {
      return {
        usedHeapMB: Math.round(mem.usedJSHeapSize / 1048576),
        totalHeapMB: Math.round(mem.totalJSHeapSize / 1048576)
      };
    }
    return { usedHeapMB: 48, totalHeapMB: 128 };
  }
}
