/**
 * Overlap detection via OpenCV.js template matching.
 *
 * Takes the bottom strip of image A and searches for it in the top portion
 * of image B. Returns the overlap amount (pixels to trim from top of B).
 */

export interface OverlapResult {
  /** Number of overlapping pixels (rows) to trim from top of img B */
  overlapPixels: number;
  /** Confidence score 0–1 from template matching */
  confidence: number;
}

/**
 * Detect overlap between the bottom of imageA and the top of imageB.
 *
 * @param canvasA - Canvas containing image A
 * @param canvasB - Canvas containing image B
 * @param stripHeight - Height of the strip to extract from the bottom of A (default: 150px)
 * @param confidenceThreshold - Minimum confidence to accept a match (default: 0.5)
 */
export function detectOverlap(
  canvasA: HTMLCanvasElement,
  canvasB: HTMLCanvasElement,
  stripHeight = 150,
  confidenceThreshold = 0.5,
): OverlapResult | null {
  const cv = window.cv;
  if (!cv) return null;

  let matA: InstanceType<typeof cv.Mat> | null = null;
  let matB: InstanceType<typeof cv.Mat> | null = null;
  let grayA: InstanceType<typeof cv.Mat> | null = null;
  let grayB: InstanceType<typeof cv.Mat> | null = null;
  let stripMat: InstanceType<typeof cv.Mat> | null = null;
  let searchRegion: InstanceType<typeof cv.Mat> | null = null;
  let result: InstanceType<typeof cv.Mat> | null = null;

  try {
    matA = cv.imread(canvasA);
    matB = cv.imread(canvasB);

    // Convert to grayscale for matching
    grayA = new cv.Mat();
    grayB = new cv.Mat();
    cv.cvtColor(matA, grayA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(matB, grayB, cv.COLOR_RGBA2GRAY);

    // Clamp strip height to image dimensions
    const effectiveStripHeight = Math.min(stripHeight, grayA.rows, Math.floor(grayB.rows * 0.8));
    if (effectiveStripHeight < 10) return null;

    // Extract bottom strip from image A
    const stripRect = new cv.Rect(0, grayA.rows - effectiveStripHeight, grayA.cols, effectiveStripHeight);
    stripMat = grayA.roi(stripRect);

    // Search in the top portion of image B (up to 80% of its height)
    const searchHeight = Math.min(grayB.rows, Math.floor(grayB.rows * 0.8));

    // If the images have different widths, we can't template match directly
    if (grayA.cols !== grayB.cols) {
      return null;
    }

    const searchRect = new cv.Rect(0, 0, grayB.cols, searchHeight);
    searchRegion = grayB.roi(searchRect);

    // Template match needs the template to be smaller than the search region
    if (stripMat.rows >= searchRegion.rows || stripMat.cols > searchRegion.cols) {
      return null;
    }

    result = new cv.Mat();
    cv.matchTemplate(searchRegion, stripMat, result, cv.TM_CCOEFF_NORMED);

    const minMax = cv.minMaxLoc(result);
    const confidence = minMax.maxVal;
    const matchY = minMax.maxLoc.y;

    if (confidence < confidenceThreshold) {
      return null;
    }

    // The overlap is: from matchY in image B to the end of the strip
    // matchY is where the top of the strip was found in the search region of B
    // So everything from 0 to matchY + stripHeight in B overlaps with A
    const overlapPixels = matchY + effectiveStripHeight;

    return { overlapPixels, confidence };
  } catch (e) {
    console.warn('Overlap detection failed:', e);
    return null;
  } finally {
    matA?.delete();
    matB?.delete();
    grayA?.delete();
    grayB?.delete();
    stripMat?.delete();
    searchRegion?.delete();
    result?.delete();
  }
}
