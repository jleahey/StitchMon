import { useCallback, useRef, useState } from 'react';
import { DropZone } from './components/DropZone';
import { ProgressOverlay } from './components/ProgressOverlay';
import { ResultViewer } from './components/ResultViewer';
import { stitchImages } from './stitcher/stitcher';
import type { StitchResult } from './stitcher/stitcher';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [stitching, setStitching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressCur, setProgressCur] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const running = useRef(false);

  const runStitch = useCallback(async (allFiles: File[]) => {
    if (allFiles.length === 0 || running.current) return;
    running.current = true;
    setStitching(true);
    setProgressMsg('Starting…');
    setProgressCur(0);
    setProgressTotal(0);
    setResult(null);
    // Yield once so the progress overlay renders before heavy work begins
    await new Promise(r => setTimeout(r, 30));
    try {
      const res = await stitchImages(allFiles, (msg, cur, total) => {
        setProgressMsg(msg);
        setProgressCur(cur);
        setProgressTotal(total);
      });
      setResult(res);
      // Brief delay so user sees 100% before result appears
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error('Stitch failed:', e);
      alert(`Stitching failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setStitching(false);
      running.current = false;
    }
  }, []);

  const handleFiles = useCallback((incoming: File[]) => {
    setFiles(prev => {
      const merged = [...prev, ...incoming];
      setTimeout(() => runStitch(merged), 0);
      return merged;
    });
  }, [runStitch]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setResult(null);
  }, []);

  return (
    <div className="app">
      {/* Floating badge — icon + name + count */}
      <div className="app-badge">
        <img className="app-badge-icon" src="icon.png" alt="" aria-hidden="true" />
        <span className="app-badge-logo">StitchMon</span>
        {files.length > 0 && !stitching && (
          <span className="app-badge-count">{files.length} img{files.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <main className="app-stage">
        {!result && !stitching && files.length === 0 && (
          <div className="stage-empty">
            <DropZone onFiles={handleFiles} />
          </div>
        )}

        {result && (
          <div className="stage-result">
            <ResultViewer
              result={result}
              onFullscreen={() => setFullscreen(true)}
              onReset={handleReset}
              onAddMore={handleFiles}
            />
          </div>
        )}
      </main>

      {stitching && (
        <ProgressOverlay
          message={progressMsg}
          current={progressCur}
          total={progressTotal}
        />
      )}

      {fullscreen && result && (
        <div
          className="lightbox"
          onClick={() => setFullscreen(false)}
          id="lightbox"
        >
          <button
            className="lightbox-close"
            onClick={() => setFullscreen(false)}
            aria-label="Close"
          >✕</button>
          <img
            className="lightbox-img"
            src={result.dataUrl}
            alt="Stitched screenshot fullscreen"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
