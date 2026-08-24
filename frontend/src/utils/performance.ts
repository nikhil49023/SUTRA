/**
 * Throttling and high-performance animation helpers.
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
