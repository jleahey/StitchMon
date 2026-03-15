/**
 * Overlap detection — multi-row strip voting.
 *
 * PROBLEM WITH SINGLE-ROW MATCHING:
 *   Single rows of uniform color (message background spacers, status bar)
 *   produce NCC=1.0 matches at wrong positions, poisoning the vote.
 *
 * FIX: Match STRIPS of 8 consecutive rows. A strip spanning a message
 * bubble edge is unique. A strip of identical background rows is flat
 * and has near-zero variance → NCC → 0 (safely rejected).
 *
 * FORMULA (unchanged):
 *   A[rowA .. rowA+S-1] == B[bestRowB .. bestRowB+S-1]
 *   ⟹  overlapPixels = hA - rowA + bestRowB
 */

export interface OverlapResult {
  overlapPixels: number;
  confidence: number;
  /** Number of strip-votes that supported the winning bin */
  _votes: number;
}

const STRIP_H = 8; // rows per strip — enough to span a bubble-to-spacer transition

function stripSignature(
  data: Uint8ClampedArray,
  width: number,
  startY: number,
  stripH: number,
  step = 4,
): Float32Array | null {
  const cols = Math.ceil(width / step);
  const sig = new Float32Array(cols * stripH);
  for (let dy = 0; dy < stripH; dy++) {
    for (let xi = 0; xi < cols; xi++) {
      const x = xi * step;
      const idx = ((startY + dy) * width + x) * 4;
      sig[dy * cols + xi] =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }

  // Reject flat (low-variance) strips — typical of empty background rows
  let mean = 0;
  for (let i = 0; i < sig.length; i++) mean += sig[i];
  mean /= sig.length;
  let variance = 0;
  for (let i = 0; i < sig.length; i++) variance += (sig[i] - mean) ** 2;
  variance /= sig.length;

  // If standard deviation < 4 luminance units (out of 255) the strip is
  // nearly uniform and will cause false matches — skip it.
  if (Math.sqrt(variance) < 4) return null;

  return sig;
}

function ncc(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let mA = 0, mB = 0;
  for (let i = 0; i < n; i++) { mA += a[i]; mB += b[i]; }
  mA /= n; mB /= n;
  let ab = 0, a2 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - mA, db = b[i] - mB;
    ab += da * db; a2 += da * da; b2 += db * db;
  }
  const denom = Math.sqrt(a2 * b2);
  return denom < 1e-6 ? 0 : ab / denom;
}

export async function detectOverlap(
  canvasA: HTMLCanvasElement,
  canvasB: HTMLCanvasElement,
  nccThreshold = 0.85,
  minVotes = 4,
  onSubProgress?: (done: number, total: number) => void,
): Promise<OverlapResult | null> {
  if (canvasA.width !== canvasB.width) return null;

  const w  = canvasA.width;
  const hA = canvasA.height;
  const hB = canvasB.height;

  const ctxA = (canvasA.getContext('2d', { willReadFrequently: true }) ??
                canvasA.getContext('2d'))!;
  const ctxB = (canvasB.getContext('2d', { willReadFrequently: true }) ??
                canvasB.getContext('2d'))!;

  const imgA = ctxA.getImageData(0, 0, w, hA);
  const imgB = ctxB.getImageData(0, 0, w, hB);

  // Sample strip start-rows in A's lower zone (40%–88%), skipping footer
  const scanStartA = Math.floor(hA * 0.40);
  const scanEndA   = Math.floor(hA * 0.88) - STRIP_H;
  const PROBES = 80;
  const stepA = Math.max(1, Math.floor((scanEndA - scanStartA) / PROBES));

  // Search in B's top 65%
  const searchEndB = Math.floor(hB * 0.65) - STRIP_H;

  // Pre-compute signatures for B to save time in the inner loop
  const sigsB: { row: number; sig: Float32Array }[] = [];
  for (let rowB = 0; rowB <= searchEndB; rowB += 2) {
    const s = stripSignature(imgB.data, w, rowB, STRIP_H);
    if (s) sigsB.push({ row: rowB, sig: s });
  }

  const minOverlap = Math.floor(Math.min(hA, hB) * 0.05);
  const maxOverlap = Math.floor(Math.min(hA, hB) * 0.90);

  const BIN = 6;
  const voteMap = new Map<number, { total: number; count: number }>();

  let probesDone = 0;
  for (let rowA = scanStartA; rowA < scanEndA; rowA += stepA) {
    const sigA = stripSignature(imgA.data, w, rowA, STRIP_H);
    if (!sigA) continue; 

    let bestNCC  = nccThreshold;
    let bestRowB = -1;

    for (const b of sigsB) {
      const score = ncc(sigA, b.sig);
      if (score > bestNCC) {
        bestNCC = score;
        bestRowB = b.row;
      }
    }

    if (bestRowB !== -1) {
      const overlap = hA - rowA + bestRowB;
      if (overlap >= minOverlap && overlap <= maxOverlap) {
        const bin = Math.round(overlap / BIN) * BIN;
        const entry = voteMap.get(bin) ?? { total: 0, count: 0 };
        entry.total += bestNCC;
        entry.count += 1;
        voteMap.set(bin, entry);
      }
    }

    // Yield frequently to keep UI animations smooth
    probesDone++;
    onSubProgress?.(probesDone, PROBES);
    if (probesDone % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (voteMap.size === 0) return null;

  // Winning bin = highest (total_conf × sqrt(count)) — favours consistent votes
  let bestBin = -1, bestScore = -1;
  for (const [bin, { total, count }] of voteMap) {
    const sc = total * Math.sqrt(count);
    if (sc > bestScore) { bestScore = sc; bestBin = bin; }
  }
  if (bestBin === -1) return null;

  const winner = voteMap.get(bestBin)!;
  if (winner.count < minVotes) return null;  // too few votes — likely coincidental

  const confidence = winner.total / winner.count;

  console.log(
    `[StitchMon] overlap: ${bestBin}px, conf=${confidence.toFixed(3)},` +
    ` votes=${winner.count}/${voteMap.size} bins`
  );
  return { overlapPixels: bestBin, confidence, _votes: winner.count };
}
