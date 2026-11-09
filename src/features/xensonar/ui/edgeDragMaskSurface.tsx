import * as React from 'react';

export type EdgeDragMaskRange = {
  startRatio: number;
  endRatio: number;
};

export type EdgeDragMaskHandle = 'start' | 'end';

export type EdgeDragMaskSurfaceProps = {
  value: EdgeDragMaskRange;
  onChange: (patch: Partial<EdgeDragMaskRange>, statusMessage?: string) => void;
  onHandleDragStart?: (handle: EdgeDragMaskHandle, ratio: number, event: React.PointerEvent<HTMLButtonElement>) => void;
  onMiddlePointerDown?: (ratio: number, event: React.PointerEvent<HTMLDivElement>) => void;
  minSpanRatio?: number;
  statusLabel?: string;
  className?: string;
  children: React.ReactNode;
};

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function clampEdgeDragMaskRange(value: EdgeDragMaskRange, minSpanRatio = 0.05): EdgeDragMaskRange {
  const minSpan = clampRatio(minSpanRatio);
  const start = clampRatio(value.startRatio);
  const end = clampRatio(value.endRatio);
  if (end - start >= minSpan) return { startRatio: start, endRatio: end };
  const midpoint = clampRatio((start + end) * 0.5);
  const half = minSpan * 0.5;
  if (midpoint - half < 0) return { startRatio: 0, endRatio: Math.min(1, minSpan) };
  if (midpoint + half > 1) return { startRatio: Math.max(0, 1 - minSpan), endRatio: 1 };
  return { startRatio: midpoint - half, endRatio: midpoint + half };
}

export function resolveEdgeDragMaskRatio(surface: HTMLElement | null, clientX: number): number {
  if (!surface) return 0;
  const rect = surface.getBoundingClientRect();
  return clampRatio((clientX - rect.left) / Math.max(1, rect.width));
}

export function applyEdgeDragMaskHandle(
  value: EdgeDragMaskRange,
  handle: EdgeDragMaskHandle,
  pointerRatio: number,
  minSpanRatio = 0.05,
): EdgeDragMaskRange {
  const current = clampEdgeDragMaskRange(value, minSpanRatio);
  const ratio = clampRatio(pointerRatio);
  if (handle === 'start') {
    return clampEdgeDragMaskRange({
      startRatio: Math.min(ratio, current.endRatio - minSpanRatio),
      endRatio: current.endRatio,
    }, minSpanRatio);
  }
  return clampEdgeDragMaskRange({
    startRatio: current.startRatio,
    endRatio: Math.max(ratio, current.startRatio + minSpanRatio),
  }, minSpanRatio);
}

function formatPercent(value: number) {
  return `${Math.round(clampRatio(value) * 100)}%`;
}

export function EdgeDragMaskSurface({
  value,
  onChange,
  onHandleDragStart,
  onMiddlePointerDown,
  minSpanRatio = 0.05,
  statusLabel = 'Wirkbereich',
  className = '',
  children,
}: EdgeDragMaskSurfaceProps) {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const range = clampEdgeDragMaskRange(value, minSpanRatio);
  const widthPercent = Math.max(0, range.endRatio - range.startRatio) * 100;
  const statusFor = React.useCallback((handle: EdgeDragMaskHandle) => `${statusLabel}: ${handle === 'start' ? 'Anfang' : 'Ende'} verschoben.`, [statusLabel]);


  const handleSurfacePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!onMiddlePointerDown || event.button !== 0) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('[data-xensonar-edge-drag-mask-handle]')) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    event.preventDefault();
    onMiddlePointerDown(resolveEdgeDragMaskRatio(surface, event.clientX), event);
  }, [onMiddlePointerDown]);

  const beginHandleDrag = React.useCallback((handle: EdgeDragMaskHandle) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    event.preventDefault();
    event.stopPropagation();

    const initialRatio = resolveEdgeDragMaskRatio(surface, event.clientX);
    onHandleDragStart?.(handle, initialRatio, event);

    const commit = (clientX: number) => {
      const next = applyEdgeDragMaskHandle(range, handle, resolveEdgeDragMaskRatio(surface, clientX), minSpanRatio);
      onChange(handle === 'start' ? { startRatio: next.startRatio } : { endRatio: next.endRatio }, statusFor(handle));
    };

    commit(event.clientX);

    const handleMove = (moveEvent: PointerEvent) => commit(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    window.addEventListener('pointercancel', handleUp, { once: true });
  }, [minSpanRatio, onChange, onHandleDragStart, range, statusFor]);

  return (
    <div ref={surfaceRef} onPointerDown={handleSurfacePointerDown} className={`relative cursor-pointer select-none ${className}`} data-xensonar-edge-drag-mask-surface="horizontal" data-xensonar-edge-drag-mask-middle-scrub={onMiddlePointerDown ? 'enabled' : undefined}>
      {children}
      <div
        className="pointer-events-none absolute inset-y-0 rounded border border-fuchsia-200/70 bg-fuchsia-500/12 shadow-[inset_0_0_18px_rgba(217,70,239,0.14)]"
        style={{ left: `${range.startRatio * 100}%`, width: `${widthPercent}%` }}
        data-xensonar-edge-drag-mask-range={`${formatPercent(range.startRatio)}-${formatPercent(range.endRatio)}`}
      />
      <button
        type="button"
        aria-label={`${statusLabel} Anfang ziehen`}
        title="Anfang ziehen"
        onPointerDown={beginHandleDrag('start')}
        className="absolute top-0 h-full w-7 -translate-x-1/2 cursor-ew-resize rounded border-l-2 border-r border-fuchsia-100/80 bg-fuchsia-200/12 hover:bg-fuchsia-200/24 focus:outline-none focus:ring-1 focus:ring-fuchsia-200/80"
        style={{ left: `${range.startRatio * 100}%` }}
        data-xensonar-edge-drag-mask-handle="start"
      />
      <button
        type="button"
        aria-label={`${statusLabel} Ende ziehen`}
        title="Ende ziehen"
        onPointerDown={beginHandleDrag('end')}
        className="absolute top-0 h-full w-7 -translate-x-1/2 cursor-ew-resize rounded border-l border-r-2 border-fuchsia-100/80 bg-fuchsia-200/12 hover:bg-fuchsia-200/24 focus:outline-none focus:ring-1 focus:ring-fuchsia-200/80"
        style={{ left: `${range.endRatio * 100}%` }}
        data-xensonar-edge-drag-mask-handle="end"
      />
    </div>
  );
}
