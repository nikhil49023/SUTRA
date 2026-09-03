/**
 * Smart Horizon GCS — Performance Utilities
 *
 * throttle        — time-based throttle (leading + trailing call)
 * debounce        — delay-based debounce
 * rafThrottle     — requestAnimationFrame throttle (for visual updates, max 60fps)
 * shallowEqual    — fast shallow object equality check
 */

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: any = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastCall >= limitMs) {
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limitMs - (now - lastCall));
    }
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: any = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * RAF-throttle: collapses multiple synchronous calls in the same frame into one.
 * Ideal for visual updates like route repaints during waypoint drag.
 * Guarantees at most 1 call per animation frame (~60fps).
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let latestArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    latestArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (latestArgs) {
          func(...latestArgs);
          latestArgs = null;
        }
      });
    }
  };
}

/**
 * Shallow object equality — returns true if all enumerable own-property values are ===.
 * Use to guard Zustand writes when telemetry data hasn't semantically changed.
 */
export function shallowEqual<T extends object>(a: T, b: Partial<T>): boolean {
  for (const key of Object.keys(b) as (keyof T)[]) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
