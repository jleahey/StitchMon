/**
 * OpenCV.js helpers — wait for the CDN script to load, typed wrappers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    cv: any;
    __opencvReady?: boolean;
    Module?: {
      onRuntimeInitialized?: () => void;
    };
  }
}

export function waitForOpenCV(timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      // OpenCV.js sets window.cv when the WASM module is ready
      if (window.cv && window.cv.Mat) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('OpenCV.js failed to load within timeout'));
        return;
      }
      setTimeout(check, 100);
    }

    check();
  });
}

export function isOpenCVReady(): boolean {
  return !!(window.cv && window.cv.Mat);
}
