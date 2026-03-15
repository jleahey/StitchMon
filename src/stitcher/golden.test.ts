import { describe, it, expect } from 'vitest';
import { stitchImages } from './stitcher';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Resolving directory relative to this file
// tests/goldens/ is where the user will put their screenshots
const GOLDENS_DIR = path.resolve(__dirname, '../../tests/goldens');

describe('Golden Tests', () => {
  // If the directory doesn't exist, we just skip (it's gitignored)
  if (!fs.existsSync(GOLDENS_DIR)) {
    it('should skip if no goldens directory', () => {
      console.log('Skipping golden tests: tests/goldens/ not found.');
    });
    return;
  }

  const cases = fs.readdirSync(GOLDENS_DIR).filter(f => 
    fs.statSync(path.join(GOLDENS_DIR, f)).isDirectory()
  );

  if (cases.length === 0) {
    it('should skip if no cases', () => {
      console.log('No cases found in tests/goldens/.');
    });
    return;
  }

  cases.forEach(caseName => {
    it(`should match golden for ${caseName}`, async () => {
      const caseDir = path.join(GOLDENS_DIR, caseName);
      
      // Get all PNGs except golden.png and diff.png
      const files = fs.readdirSync(caseDir)
        .filter(f => f.toLowerCase().endsWith('.png') && f !== 'golden.png' && f !== 'diff.png')
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map(f => {
          const buffer = fs.readFileSync(path.join(caseDir, f));
          const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
          
          // Create a File object and attach the mock data URL for the setup mock
          const file = new File([buffer], f, { type: 'image/png' }) as any;
          file._mockDataUrl = dataUrl;
          return file as File;
        });

      if (files.length === 0) return;

      console.log(`[Test] Stitching ${files.length} images for ${caseName}...`);
      const result = await stitchImages(files);
      
      const goldenPath = path.join(caseDir, 'golden.png');
      if (!fs.existsSync(goldenPath)) {
        // Automatically save the first run as golden if it's missing
        console.log(`[Test] Golden missing for ${caseName}. Creating it from current result.`);
        const resultData = Buffer.from(result.dataUrl.split(',')[1], 'base64');
        fs.writeFileSync(goldenPath, resultData);
        return;
      }

      const goldenBuffer = fs.readFileSync(goldenPath);
      const goldenImg = PNG.sync.read(goldenBuffer);
      
      const resultData = Buffer.from(result.dataUrl.split(',')[1], 'base64');
      const resultImg = PNG.sync.read(resultData);

      // Compare dimensions
      expect(resultImg.width, 'Width mismatch').toBe(goldenImg.width);
      expect(resultImg.height, 'Height mismatch').toBe(goldenImg.height);

      // Compare pixels
      const diff = new PNG({ width: goldenImg.width, height: goldenImg.height });
      const numDiffPixels = pixelmatch(
        goldenImg.data,
        resultImg.data,
        diff.data,
        goldenImg.width,
        goldenImg.height,
        { threshold: 0.1 }
      );

      if (numDiffPixels > 0) {
        const diffPath = path.join(caseDir, 'diff.png');
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        console.error(`[Test] Case ${caseName} FAILED with ${numDiffPixels} different pixels. See diff.png in the folder.`);
      }

      expect(numDiffPixels, `Pixels mismatch for ${caseName}`).toBe(0);
    });
  });
});
