/**
 * Screenshot stitcher — composites multiple images vertically,
 * trimming detected overlap between consecutive pairs.
 */

import { detectOverlap } from './overlapDetector';
import type { OverlapResult } from './overlapDetector';

export interface StitchPairResult {
  indexA: number;
  indexB: number;
  overlap: OverlapResult | null;
  fallback: boolean;
}

export interface StitchResult {
  /** The final stitched image as a data URL (PNG) */
  dataUrl: string;
  /** Width of the stitched image */
  width: number;
  /** Height of the stitched image */
  height: number;
  /** Per-pair results */
  pairs: StitchPairResult[];
}

export type ProgressCallback = (message: string, pairIndex: number, totalPairs: number) => void;

/**
 * Load an image File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Draw an HTMLImageElement onto a new canvas.
 */
function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Stitch an ordered array of image files into one vertical image.
 */
export async function stitchImages(
  files: File[],
  onProgress?: ProgressCallback,
): Promise<StitchResult> {
  if (files.length === 0) {
    throw new Error('No images provided');
  }

  // Load all images
  onProgress?.('Loading images…', 0, files.length - 1);
  const images: HTMLImageElement[] = [];
  for (const file of files) {
    images.push(await loadImage(file));
  }

  // Convert to canvases
  const canvases = images.map(imageToCanvas);

  // If only one image, just return it directly
  if (canvases.length === 1) {
    return {
      dataUrl: canvases[0].toDataURL('image/png'),
      width: canvases[0].width,
      height: canvases[0].height,
      pairs: [],
    };
  }

  // Detect overlaps between consecutive pairs
  const pairs: StitchPairResult[] = [];
  const overlaps: (OverlapResult | null)[] = [];

  for (let i = 0; i < canvases.length - 1; i++) {
    onProgress?.(`Detecting overlap ${i + 1}/${canvases.length - 1}…`, i, canvases.length - 1);

    // Try multiple strip heights for robustness
    let best: OverlapResult | null = null;
    for (const stripH of [150, 100, 200, 80, 250]) {
      const result = detectOverlap(canvases[i], canvases[i + 1], stripH, 0.5);
      if (result && (!best || result.confidence > best.confidence)) {
        best = result;
      }
    }

    overlaps.push(best);
    pairs.push({
      indexA: i,
      indexB: i + 1,
      overlap: best,
      fallback: best === null,
    });
  }

  // Calculate final dimensions
  const width = Math.max(...canvases.map(c => c.width));
  let totalHeight = canvases[0].height;
  for (let i = 1; i < canvases.length; i++) {
    const overlap = overlaps[i - 1];
    const trimTop = overlap ? Math.min(overlap.overlapPixels, canvases[i].height - 1) : 0;
    totalHeight += canvases[i].height - trimTop;
  }

  // Composite onto final canvas
  onProgress?.('Compositing final image…', canvases.length - 1, canvases.length - 1);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = totalHeight;
  const ctx = finalCanvas.getContext('2d')!;

  // Fill background (for images narrower than the widest)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, totalHeight);

  // Draw first image (full, including its header)
  let y = 0;
  ctx.drawImage(canvases[0], 0, y);
  y += canvases[0].height;

  // Draw subsequent images, trimming overlap from the top
  for (let i = 1; i < canvases.length; i++) {
    const overlap = overlaps[i - 1];
    const trimTop = overlap ? Math.min(overlap.overlapPixels, canvases[i].height - 1) : 0;

    const srcX = 0;
    const srcY = trimTop;
    const srcW = canvases[i].width;
    const srcH = canvases[i].height - trimTop;

    ctx.drawImage(canvases[i], srcX, srcY, srcW, srcH, 0, y, srcW, srcH);
    y += srcH;
  }

  // Clean up object URLs
  images.forEach(img => URL.revokeObjectURL(img.src));

  return {
    dataUrl: finalCanvas.toDataURL('image/png'),
    width: finalCanvas.width,
    height: finalCanvas.height,
    pairs,
  };
}
