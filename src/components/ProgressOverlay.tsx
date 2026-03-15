interface ProgressOverlayProps {
  message: string;
  current: number;
  total: number;
}

export function ProgressOverlay({ message, current, total }: ProgressOverlayProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-overlay">
      <div className="progress-card">
        <div className="progress-spinner" />
        <div className="progress-title">Stitching…</div>
        <div className="progress-status">
          {message}
          {total > 0 && <span> ({pct}%)</span>}
        </div>
      </div>
    </div>
  );
}
