interface ProgressOverlayProps {
  message: string;
  current: number;
  total: number;
}

export function ProgressOverlay({ message, current, total }: ProgressOverlayProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : null;

  return (
    <div className="progress-overlay">
      <div className="progress-card">
        <div className="progress-spinner" />
        <div className="progress-title">Stitching…</div>
        <div className="progress-status">{message}</div>
        {pct !== null && (
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
        {pct !== null && (
          <div className="progress-pct">{pct}%</div>
        )}
      </div>
    </div>
  );
}
