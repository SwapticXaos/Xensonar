import type { ReactNode } from 'react';

export type PlaylistDragHudState = {
  x: number;
  y: number;
};

export function PlaylistDragActionHud({
  state,
  label,
  title,
  sourceTitle,
  sourceSubtitle,
  tone = 'fuchsia',
}: {
  state: PlaylistDragHudState | null;
  label: string;
  title?: ReactNode;
  sourceTitle?: ReactNode;
  sourceSubtitle?: ReactNode;
  tone?: 'fuchsia' | 'violet' | 'cyan';
}) {
  if (!state || !label || !sourceTitle) return null;
  const toneClass = tone === 'cyan'
    ? 'border-cyan-500/80 bg-cyan-950/95 text-cyan-50'
    : tone === 'violet'
      ? 'border-violet-500/80 bg-violet-950/95 text-violet-50'
      : 'border-fuchsia-500/80 bg-fuchsia-950/95 text-fuchsia-50';
  const chipClass = tone === 'cyan'
    ? 'border-cyan-400/70 bg-cyan-900/50 text-cyan-50'
    : tone === 'violet'
      ? 'border-violet-400/70 bg-violet-900/50 text-violet-50'
      : 'border-fuchsia-400/70 bg-fuchsia-900/50 text-fuchsia-50';
  const left = typeof window === 'undefined'
    ? state.x
    : Math.min(Math.max(12, state.x + 14), Math.max(12, window.innerWidth - 590));
  const top = typeof window === 'undefined'
    ? state.y
    : Math.min(Math.max(38, state.y), Math.max(38, window.innerHeight - 38));

  return (
    <div
      className={`pointer-events-none fixed z-[240] min-w-[22rem] max-w-[36rem] rounded-xl border px-3 py-2 text-[11px] shadow-2xl shadow-black/70 ${toneClass}`}
      style={{ left, top, transform: 'translateY(-50%)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{sourceTitle}</div>
          {sourceSubtitle ? <div className="mt-0.5 truncate text-[10px] opacity-60">{sourceSubtitle}</div> : null}
        </div>
        <div className={`shrink-0 rounded-lg border px-3 py-1.5 text-right ${chipClass}`}>
          <div className="text-[9px] uppercase tracking-[0.24em] opacity-75">{label}</div>
          {title ? <div className="mt-1 max-w-[17rem] truncate font-semibold">{title}</div> : null}
        </div>
      </div>
    </div>
  );
}
