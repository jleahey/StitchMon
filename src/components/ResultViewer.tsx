import type { StitchResult } from '../stitcher/stitcher';

interface ResultViewerProps {
  result: StitchResult;
}

export function ResultViewer({ result }: ResultViewerProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'stitched.png';
    link.href = result.dataUrl;
    link.click();
  };

  const fallbackCount = result.pairs.filter(p => p.fallback).length;
  const overlapCount = result.pairs.filter(p => !p.fallback).length;

  return (
    <div className="result-section" id="result-section">
      <div className="result-header">
        <div>
          <div className="result-title">✨ Stitched Result</div>
          <div className="result-meta">
            {result.width} × {result.height}px
            {overlapCount > 0 && ` · ${overlapCount} overlap${overlapCount !== 1 ? 's' : ''} trimmed`}
            {fallbackCount > 0 && ` · ${fallbackCount} simple join${fallbackCount !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="result-actions">
          <button className="btn-download" onClick={handleDownload} id="download-btn">
            ⬇ Download PNG
          </button>
        </div>
      </div>
      <div className="result-canvas-wrapper">
        <img src={result.dataUrl} alt="Stitched screenshot" />
      </div>
    </div>
  );
}
