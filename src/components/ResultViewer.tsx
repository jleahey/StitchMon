import { useCallback, useRef, useState } from 'react';
import type { StitchResult } from '../stitcher/stitcher';

interface ResultViewerProps {
  result: StitchResult;
  onReset: () => void;
  onAddMore: (files: File[]) => void;
}

export function ResultViewer({ result, onReset, onAddMore }: ResultViewerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [addDragOver, setAddDragOver] = useState(false);

  const handleDownload = async () => {
    const filename = 'stitched.png';

    // Try Web Share API first (better for mobile/iOS camera roll)
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(result.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
          });
          return;
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    }

    // Fallback to traditional download
    const a = document.createElement('a');
    a.download = filename;
    a.href = result.dataUrl;
    a.click();
  };

  const handleAddDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAddDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onAddMore(files);
  }, [onAddMore]);

  const handleAddInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length) onAddMore(files);
    e.target.value = '';
  };

  const fallbackCount = result.pairs.filter(p => p.fallback).length;
  const overlapCount = result.pairs.filter(p => !p.fallback).length;

  return (
    <div className="result-section" id="result-section">
      {/* Toolbar */}
      <div className="result-toolbar">
        <div className="result-meta">
          <span className="result-dims">{result.width} × {result.height}px</span>
          {overlapCount > 0 && (
            <span className="result-tag ok">
              ✓ {overlapCount} overlap{overlapCount !== 1 ? 's' : ''} trimmed
            </span>
          )}
          {fallbackCount > 0 && (
            <span className="result-tag warn">
              {fallbackCount} simple join{fallbackCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="result-actions">
          <button className="btn-action secondary" onClick={onReset} title="Clear and start over">
            ↺ New
          </button>
          <button className="btn-action primary" onClick={handleDownload} id="download-btn">
            ⬇ Download
          </button>
        </div>
      </div>

      {/* Result image */}
      <div className="result-canvas-wrapper">
        <img
          src={result.dataUrl}
          alt="Stitched screenshot"
        />
      </div>

      {/* Add more screenshots strip */}
      <div
        className={`add-more-strip ${addDragOver ? 'drag-over' : ''}`}
        onDrop={handleAddDrop}
        onDragOver={e => { e.preventDefault(); setAddDragOver(true); }}
        onDragLeave={() => setAddDragOver(false)}
        onClick={() => inputRef.current?.click()}
        title="Drop or click to add more screenshots"
      >
        <span className="add-more-icon">＋</span>
        <span className="add-more-label">Drop more screenshots to extend</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleAddInput}
        />
      </div>
    </div>
  );
}
