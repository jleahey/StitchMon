/**
 * Screenshot stitcher — auto-orders images and composites with overlap trimming.
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
  dataUrl: string;
  width: number;
  height: number;
  pairs: StitchPairResult[];
  /** The auto-determined ordering of input files (indices into the original files array) */
  order: number[];
}

export type ProgressCallback = (message: string, pairIndex: number, totalPairs: number) => void;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  // willReadFrequently avoids the browser perf warning on repeated getImageData calls
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ?? canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Auto-order N images into a linear vertical chain.
 *
 * For each unordered pair (i,j) we run detectOverlap in BOTH directions
 * and compare:
 *   - fwd = detectOverlap(i, j)  → i is above j
 *   - rev = detectOverlap(j, i)  → j is above i
 *
 * The direction with a valid result AND higher confidence wins.
 * We accumulate a "directed wins" count for each image as predecessor,
 * then do a simple topological sort (image with fewest predecessors = top).
 */
async function autoOrder(
  canvases: HTMLCanvasElement[],
  onProgress?: (msg: string, doneProbes: number) => void,
): Promise<{ order: number[]; overlaps: Map<string, OverlapResult> }> {
  const n = canvases.length;
  const overlapsMap = new Map<string, OverlapResult>();

  // wins[i] = how many other images i has been determined to sit above
  // This is computed pairwise without a full matrix.
  // predecessorVotes[j] = total confidence that some image sits above j
  const predecessorVotes = new Array<number>(n).fill(0);

  // For each detected "i above j" edge, record the confidence and overlap in matrices
  // so we can greedily chain later
  const edgeScore: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  // edgeOverlap stores the overlap pixel count for each directed edge.
  // When choosing the next image in the chain, we prefer the candidate with the
  // LARGEST overlap (= starts earliest in the scroll, most adjacent to current).
  // A larger overlap means more shared pixels at the top of the candidate, which
  // places it higher in absolute scroll position — i.e., it comes immediately after
  // the current image rather than being a "transitive" distant successor.
  const edgeOverlap: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const totalPairs = (n * (n - 1)) / 2;
  let done = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const msg = `Ordering: comparing ${done + 1}/${totalPairs}…`;
      
      const fwd = await detectOverlap(canvases[i], canvases[j], 0.85, 4, (subDone) => {
        onProgress?.(msg, done * 160 + subDone);
      });
      const rev = await detectOverlap(canvases[j], canvases[i], 0.85, 4, (subDone) => {
        onProgress?.(msg, done * 160 + 80 + subDone);
      });

      console.log(
        `[autoOrder] pair (${i},${j}): fwd=${fwd ? `${fwd.overlapPixels}px conf=${fwd.confidence.toFixed(2)}` : 'null'} ` +
        `rev=${rev ? `${rev.overlapPixels}px conf=${rev.confidence.toFixed(2)}` : 'null'}`
      );

      // Both null → no information, skip
      if (!fwd && !rev) { done++; continue; }

      // Determine winner.
      // Weight by confidence × sqrt(voteCount) so a direction that got
      // 27 consistent votes beats one with 4 coincidental matches, even
      // if the minority had marginally higher per-strip NCC.
      const fwdScore = fwd ? fwd.confidence * Math.sqrt(fwd._votes ?? 1) : -1;
      const revScore = rev ? rev.confidence * Math.sqrt(rev._votes ?? 1) : -1;

      let iAboveJ: boolean;
      if (fwd && !rev) {
        iAboveJ = true;
      } else if (!fwd && rev) {
        iAboveJ = false;
      } else {
        iAboveJ = fwdScore >= revScore;
      }

      if (iAboveJ) {
        const conf = fwd!.confidence;
        predecessorVotes[j] += conf;
        edgeScore[i][j] = conf;
        edgeOverlap[i][j] = fwd!.overlapPixels;
        overlapsMap.set(`${i},${j}`, fwd!);
      } else {
        const conf = rev!.confidence;
        predecessorVotes[i] += conf;
        edgeScore[j][i] = conf;
        edgeOverlap[j][i] = rev!.overlapPixels;
        overlapsMap.set(`${j},${i}`, rev!);
      }
      done++;
    }
  }

  console.log('[autoOrder] predecessorVotes:', predecessorVotes);

  // Start from the image with the fewest predecessor votes (= the top image)
  const used = new Set<number>();
  const order: number[] = [];
  let current = predecessorVotes.indexOf(Math.min(...predecessorVotes));
  order.push(current);
  used.add(current);

  while (order.length < n) {
    let bestNext = -1;
    let bestOverlap = -1;
    for (let j = 0; j < n; j++) {
      if (used.has(j)) continue;
      // Prefer the candidate with the LARGEST overlap from current.
      // Large overlap = candidate starts earliest in the scroll = most adjacent next step.
      // (A "transitive" edge like 0→2 in a chain 0→1→2 has smaller overlap than 0→1.)
      if (edgeScore[current][j] > 0 && edgeOverlap[current][j] > bestOverlap) {
        bestOverlap = edgeOverlap[current][j];
        bestNext = j;
      }
    }
    if (bestNext === -1) {
      // No confident edge — append remaining in original order
      for (let j = 0; j < n; j++) {
        if (!used.has(j)) { order.push(j); used.add(j); }
      }
      break;
    }
    order.push(bestNext);
    used.add(bestNext);
    current = bestNext;
  }

  console.log('[autoOrder] determined order:', order);
  return { order, overlaps: overlapsMap };
}

export async function stitchImages(
  files: File[],
  onProgress?: ProgressCallback,
): Promise<StitchResult> {
  if (files.length === 0) throw new Error('No images provided');

  onProgress?.('Loading images…', 0, files.length);
  const images: HTMLImageElement[] = [];
  for (const file of files) {
    images.push(await loadImage(file));
  }
  const canvases = images.map(imageToCanvas);

  if (canvases.length === 1) {
    URL.revokeObjectURL(images[0].src);
    return {
      dataUrl: canvases[0].toDataURL('image/png'),
      width: canvases[0].width,
      height: canvases[0].height,
      pairs: [],
      order: [0],
    };
  }

  // Auto-order — pure canvas, no OpenCV needed
  let order: number[];
  let overlapCache: Map<string, OverlapResult>;

  // Cumulative progress tracking
  const n = canvases.length;
  const orderingPairs = (n * (n - 1)) / 2;
  const refinementPairs = n - 1;
  const PROBES_PER_DETECTION = 80;
  // autoOrder does 2 detections per pair (fwd/rev)
  const orderingProbes = orderingPairs * 2 * PROBES_PER_DETECTION;
  const refinementProbes = refinementPairs * PROBES_PER_DETECTION;
  const totalWeight = orderingProbes + refinementProbes + 1; // +1 for compositing

  if (files.length <= 8) {
    // Full pairwise search for small sets
    const result = await autoOrder(canvases, (msg, doneProbes) => {
      // cur is [0...total-1]
      // We want to map it into [0...orderingPairs]
      onProgress?.(msg, doneProbes, totalWeight);
    });
    order = result.order;
    overlapCache = result.overlaps;
  } else {
    // Too many images — keep upload order, do sequential detection
    order = canvases.map((_, i) => i);
    overlapCache = new Map();
  }

  // Re-order canvases according to the determined order
  const orderedCanvases = order.map(i => canvases[i]);

  // Detect overlaps for consecutive ordered pairs
  // (re-use cache hits from the auto-order phase)
  const pairResults: StitchPairResult[] = [];
  const overlapList: (OverlapResult | null)[] = [];

  for (let i = 0; i < orderedCanvases.length - 1; i++) {
    const msg = `Refining overlap ${i + 1}/${orderedCanvases.length - 1}…`;
    const keyFwd = `${order[i]},${order[i + 1]}`;
 
    let best: OverlapResult | null = overlapCache.get(keyFwd) ?? null;
 
    if (!best) {
      best = await detectOverlap(orderedCanvases[i], orderedCanvases[i + 1], 0.85, 4, (subDone) => {
        onProgress?.(msg, orderingProbes + (i * PROBES_PER_DETECTION) + subDone, totalWeight);
      }) ?? null;
    } else {
      // Immediate progress jump for cache hits
      onProgress?.(msg, orderingProbes + (i + 1) * PROBES_PER_DETECTION, totalWeight);
    }

    overlapList.push(best);
    pairResults.push({
      indexA: order[i],
      indexB: order[i + 1],
      overlap: best,
      fallback: best === null,
    });
  }

  // ── Footer-aware compositing (generalised for N images) ──────────────────
  //
  // For each image[i] that has a successor:
  //   1. Draw image[i] from startRow[i] to footerCut[i]  (strip the footer)
  //   2. Compute startRow[i+1] = overlap(i→i+1) − footerH[i]
  //      If startRow[i+1] ≤ 0 → no footer adjustment possible, use 0.
  //
  // The last image is drawn from startRow[last] to its bottom.
  //
  // FORMULA:
  //   overlap = hA − rowA + bestRowB
  //   If A is cut at footerCut = hA × 0.88, footerH = hA × 0.12
  //   Then startB that picks up RIGHT where A's cut ends:
  //     startB = overlap − footerH
  //   because: A[footerCut] == B[startB]  ↔  startB = overlap − footerH

  const FOOTER_FRAC = 0.88;

  // Pass 1: compute startRow for each image
  const startRow = new Array<number>(orderedCanvases.length).fill(0);
  for (let i = 0; i < orderedCanvases.length - 1; i++) {
    const ov = overlapList[i];
    if (!ov) { startRow[i + 1] = 0; continue; }
    const footerH = Math.floor(orderedCanvases[i].height * (1 - FOOTER_FRAC));
    const next    = ov.overlapPixels - footerH;
    startRow[i + 1] = next > 0 ? next : 0;
  }

  // Pass 2: compute total height
  const width = Math.max(...orderedCanvases.map(c => c.width));
  let totalHeight = 0;
  for (let i = 0; i < orderedCanvases.length; i++) {
    const isLast = i === orderedCanvases.length - 1;
    const drawTo = (!isLast && overlapList[i])
      ? Math.floor(orderedCanvases[i].height * FOOTER_FRAC)
      : orderedCanvases[i].height;
    totalHeight += drawTo - startRow[i];
  }

  // Composite
  onProgress?.('Compositing…', orderingProbes + refinementProbes + 1, totalWeight);
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width  = width;
  finalCanvas.height = totalHeight;
  const ctx = finalCanvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, totalHeight);

  let y = 0;
  for (let i = 0; i < orderedCanvases.length; i++) {
    const isLast = i === orderedCanvases.length - 1;
    const from   = startRow[i];
    const to     = (!isLast && overlapList[i])
      ? Math.floor(orderedCanvases[i].height * FOOTER_FRAC)
      : orderedCanvases[i].height;
    const srcH = to - from;
    if (srcH > 0) {
      ctx.drawImage(
        orderedCanvases[i],
        0, from, orderedCanvases[i].width, srcH,
        0, y,    orderedCanvases[i].width, srcH,
      );
      y += srcH;
    }
  }

  images.forEach(img => URL.revokeObjectURL(img.src));

  return {
    dataUrl: finalCanvas.toDataURL('image/png'),
    width: finalCanvas.width,
    height: finalCanvas.height,
    pairs: pairResults,
    order,
  };
}
