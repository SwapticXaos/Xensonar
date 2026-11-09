import * as React from 'react';
import { EdgeDragMaskSurface, type EdgeDragMaskRange } from '@/features/xensonar/ui/edgeDragMaskSurface';

export type SelectionMaskRange = EdgeDragMaskRange;

type SelectionMaskRangeControlProps = {
  value: SelectionMaskRange;
  minSpanRatio?: number;
  onChange: (patch: Partial<SelectionMaskRange>, statusMessage?: string) => void;
  summary?: React.ReactNode;
};

function clampRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function formatPercent(value: number) {
  return `${Math.round(clampRatio(value) * 100)}%`;
}

export function SelectionMaskRangeControl({
  value,
  minSpanRatio = 0.05,
  onChange,
  summary,
}: SelectionMaskRangeControlProps) {
  const startRatio = clampRatio(value.startRatio);
  const endRatio = Math.max(startRatio + minSpanRatio, clampRatio(value.endRatio));

  return (
    <div className="rounded border border-fuchsia-900/45 bg-fuchsia-950/15 p-2 text-[11px] text-fuchsia-100/78">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="uppercase tracking-[0.14em] text-fuchsia-200/80">Auswahlmaske</span>
        <span className="tabular-nums text-fuchsia-100/70">{formatPercent(startRatio)} → {formatPercent(endRatio)}</span>
      </div>
      {summary ? <div className="mt-1 text-fuchsia-100/62">{summary}</div> : null}
      <EdgeDragMaskSurface
        value={{ startRatio, endRatio }}
        minSpanRatio={minSpanRatio}
        onChange={onChange}
        statusLabel="Auswahlmaske"
        className="mt-2 h-7 rounded bg-black/45"
      >
        <div className="h-7 rounded border border-fuchsia-900/40 bg-black/40" />
      </EdgeDragMaskSurface>
    </div>
  );
}
