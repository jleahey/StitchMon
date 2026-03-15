/**
 * Minimal type stubs for OpenCV.js used in StitchMon.
 * This is not a full type definition — only what we use.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare namespace cv {
  class Mat {
    constructor();
    constructor(rows: number, cols: number, type: number);
    rows: number;
    cols: number;
    data: Uint8Array;
    data32F: Float32Array;
    delete(): void;
    roi(rect: Rect): Mat;
    clone(): Mat;
    type(): number;
    channels(): number;
  }

  class Rect {
    constructor(x: number, y: number, width: number, height: number);
    x: number;
    y: number;
    width: number;
    height: number;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  function imread(canvas: HTMLCanvasElement): Mat;
  function imshow(canvas: HTMLCanvasElement, mat: Mat): void;

  function cvtColor(src: Mat, dst: Mat, code: number): void;
  function matchTemplate(image: Mat, templ: Mat, result: Mat, method: number): void;
  function minMaxLoc(src: Mat): {
    minVal: number;
    maxVal: number;
    minLoc: Point;
    maxLoc: Point;
  };

  function matFromImageData(imageData: ImageData): Mat;

  const CV_8UC4: number;
  const CV_8UC1: number;
  const CV_32FC1: number;

  const COLOR_RGBA2GRAY: number;
  const COLOR_BGR2GRAY: number;

  const TM_CCOEFF_NORMED: number;
  const TM_SQDIFF_NORMED: number;
}
