import { vi } from 'vitest';
import { Image as CanvasImage } from 'canvas';

// Basic mocks for APIs not present in JSDOM
if (typeof window !== 'undefined') {
  // Use node-canvas Image which is faster and more reliable in Node than JSDOM's mock
  (globalThis as any).Image = CanvasImage;

  (globalThis as any).URL.createObjectURL = vi.fn((obj: any) => {
    // If it's our mocked File with _mockDataUrl, use it.
    // Otherwise return a dummy blob URL.
    return (obj && (obj as any)._mockDataUrl) || 'blob:mock-url';
  });
  (globalThis as any).URL.revokeObjectURL = vi.fn();
}
