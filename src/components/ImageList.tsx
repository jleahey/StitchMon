import { useEffect, useMemo, useState } from 'react';

interface ImageItem {
  file: File;
  id: string;
}

interface ImageListProps {
  items: ImageItem[];
  onReorder: (items: ImageItem[]) => void;
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ThumbnailImage({ file }: { file: File }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;
  return <img className="image-item-thumbnail" src={src} alt={file.name} />;
}

export function ImageList({ items, onReorder, onRemove }: ImageListProps) {
  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + item.file.size, 0),
    [items],
  );

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  };

  if (items.length === 0) return null;

  return (
    <div className="image-list">
      <div className="image-list-header">
        <span className="image-list-title">Screenshots</span>
        <span className="image-list-count">
          {items.length} image{items.length !== 1 ? 's' : ''} · {formatSize(totalSize)}
        </span>
      </div>

      {items.map((item, index) => (
        <div
          className="image-item"
          key={item.id}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="image-item-number">{index + 1}</span>
          <ThumbnailImage file={item.file} />
          <div className="image-item-info">
            <div className="image-item-name">{item.file.name}</div>
            <div className="image-item-size">{formatSize(item.file.size)}</div>
          </div>
          <div className="image-item-actions">
            <button
              className="btn-icon"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              title="Move up"
            >
              ▲
            </button>
            <button
              className="btn-icon"
              onClick={() => moveDown(index)}
              disabled={index === items.length - 1}
              title="Move down"
            >
              ▼
            </button>
            <button
              className="btn-icon danger"
              onClick={() => onRemove(item.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
