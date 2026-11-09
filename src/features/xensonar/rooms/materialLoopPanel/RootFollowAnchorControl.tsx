import { useEffect, useState } from 'react';
import type { MaterialEntry } from '../../../l3lab/materialLibrary';
import {
  ROOT_FOLLOW_ANCHOR_MODE,
  ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS,
  ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP,
  ROOT_FOLLOW_FLEXIBLE_ANCHOR_BUTTON_LABEL,
  formatRootFollowAnchorMode,
  resolveRootFollowAnchorMode,
  rootFollowAnchorModeToRootHz,
} from '../../rootFollow/rootFollowAnchorMode';

export function RootFollowAnchorControl({
  entry,
  onSetAnchor,
  onStampCurrentAnchor,
}: {
  entry: MaterialEntry | null;
  onSetAnchor: (entryId: string, rootHz: number | null) => void;
  onStampCurrentAnchor: (entryId: string) => void;
}) {
  const anchorMode = resolveRootFollowAnchorMode(entry?.rootHz ?? null);
  const fixedHz = anchorMode.mode === ROOT_FOLLOW_ANCHOR_MODE.FIXED_HZ ? anchorMode.rootHz : null;
  const [draftHz, setDraftHz] = useState(fixedHz !== null ? fixedHz.toFixed(1) : '');

  useEffect(() => {
    setDraftHz(fixedHz !== null ? fixedHz.toFixed(1) : '');
  }, [entry?.id, fixedHz]);

  if (!entry) return null;

  const commitDraft = () => {
    const parsed = rootFollowAnchorModeToRootHz({ mode: ROOT_FOLLOW_ANCHOR_MODE.FIXED_HZ, rootHz: Number.parseFloat(draftHz.replace(',', '.')) });
    if (parsed === null) return;
    onSetAnchor(entry.id, parsed);
  };

  return (
    <div className="rounded border border-violet-900/50 bg-black/25 p-2 text-[11px] leading-relaxed text-violet-100/75">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-violet-200/70">Tonaler Anker</div>
        <div className="text-violet-200/70">{formatRootFollowAnchorMode(anchorMode)}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[0.9fr_1.35fr]">
        <button
          type="button"
          title={ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP}
          onClick={() => onSetAnchor(entry.id, null)}
          className={`rounded border px-3 py-2 text-left ${fixedHz === null ? 'border-violet-300 bg-violet-950/45 text-violet-50' : 'border-violet-900/60 bg-neutral-950/60 text-violet-100/75 hover:bg-violet-950/25'}`}
        >
          {ROOT_FOLLOW_FLEXIBLE_ANCHOR_BUTTON_LABEL}
        </button>
        <label className={`flex min-w-0 items-center gap-2 rounded border px-2 py-1 ${fixedHz !== null ? 'border-violet-300 bg-violet-950/35' : 'border-violet-900/60 bg-neutral-950/60'}`}>
          <input
            type="number"
            min={ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS.minHz}
            max={ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS.maxHz}
            step={ROOT_FOLLOW_FIXED_ANCHOR_INPUT_LIMITS.stepHz}
            value={draftHz}
            placeholder="___"
            onChange={(event) => setDraftHz(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDraft();
              }
            }}
            className="min-w-0 flex-1 rounded border border-violet-900/50 bg-neutral-950 px-2 py-1 text-violet-50"
          />
          <span className="shrink-0 text-violet-100/70">Hz</span>
          <button
            type="button"
            onClick={commitDraft}
            className="shrink-0 rounded border border-violet-800/70 px-2 py-1 text-[10px] text-violet-100 hover:bg-violet-950/35"
          >
            setzen
          </button>
        </label>
      </div>
      {fixedHz === null ? (
        <button type="button" onClick={() => onStampCurrentAnchor(entry.id)} className="mt-2 w-full rounded border border-violet-800/60 px-2 py-1 text-violet-100/80 hover:bg-violet-950/30">
          aktuellen Raster-Anker als Hz setzen
        </button>
      ) : null}
    </div>
  );
}
