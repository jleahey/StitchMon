import { useCallback, useEffect, useState } from 'react';
import { DropZone } from './components/DropZone';
import { ImageList } from './components/ImageList';
import { ProgressOverlay } from './components/ProgressOverlay';
import { ResultViewer } from './components/ResultViewer';
import { waitForOpenCV, isOpenCVReady } from './stitcher/opencv';
import { stitchImages } from './stitcher/stitcher';
import type { StitchResult } from './stitcher/stitcher';

interface ImageItem {
  file: File;
  id: string;
}

let nextId = 0;
function makeId() {
  return `img-${nextId++}-${Date.now()}`;
}

type OpenCVStatus = 'loading' | 'ready' | 'error';

export default function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [stitching, setStitching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressCur, setProgressCur] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [cvStatus, setCvStatus] = useState<OpenCVStatus>(
    isOpenCVReady() ? 'ready' : 'loading',
  );

  useEffect(() => {
    if (cvStatus === 'ready') return;
    waitForOpenCV(60000)
      .then(() => setCvStatus('ready'))
      .catch(() => setCvStatus('error'));
  }, [cvStatus]);

  const handleFiles = useCallback((files: File[]) => {
    const newItems = files.map(f => ({ file: f, id: makeId() }));
    setItems(prev => [...prev, ...newItems]);
    setResult(null);
  }, []);

  const handleReorder = useCallback((newItems: ImageItem[]) => {
    setItems(newItems);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    setItems([]);
    setResult(null);
  }, []);

  const handleStitch = useCallback(async () => {
    if (items.length < 2) return;

    setStitching(true);
    setResult(null);

    try {
      const res = await stitchImages(
        items.map(i => i.file),
        (msg, cur, total) => {
          setProgressMsg(msg);
          setProgressCur(cur);
          setProgressTotal(total);
        },
      );
      setResult(res);
    } catch (e) {
      console.error('Stitch failed:', e);
      alert(`Stitching failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setStitching(false);
    }
  }, [items]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">StitchMon</div>
        <div className="app-subtitle">Screenshot Stitcher</div>
      </header>

      {cvStatus === 'loading' && (
        <div className="opencv-status loading">
          Loading image processing engine…
        </div>
      )}
      {cvStatus === 'error' && (
        <div className="opencv-status error">
          ⚠ OpenCV.js failed to load — overlap detection unavailable, images will be simply concatenated.
        </div>
      )}

      <main className="app-main">
        <DropZone onFiles={handleFiles} />

        <ImageList items={items} onReorder={handleReorder} onRemove={handleRemove} />

        {items.length >= 2 && (
          <div className="action-bar">
            <button
              className="btn-stitch"
              onClick={handleStitch}
              disabled={stitching || items.length < 2}
              id="stitch-btn"
            >
              {stitching ? 'Stitching…' : `Stitch ${items.length} Screenshots`}
            </button>
            <button className="btn-clear" onClick={handleClear}>
              Clear All
            </button>
          </div>
        )}

        {result && <ResultViewer result={result} />}
      </main>

      {stitching && (
        <ProgressOverlay
          message={progressMsg}
          current={progressCur}
          total={progressTotal}
        />
      )}
    </div>
  );
}
