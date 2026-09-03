import '@testing-library/jest-dom';

// Polyfills for browser environment in Vitest / JSDOM
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(callback, 16) as any;
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
