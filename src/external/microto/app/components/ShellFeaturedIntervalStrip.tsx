/**
 * Shell strip: today's featured harmonic interval (vision §3 §5 discoverability).
 * One interval per day with label, cents, short tip; Hear = preview tone, Go = open Synth and jump to that ratio.
 * Extensible: FEATURED_DISCOVERY can grow; getFeaturedDiscoveryInterval() can later use preferences or A/B.
 */
import {
  getFeaturedDiscoveryInterval,
  ratioToShortLabel,
  ratioToCents,
} from "../../domain/signatureIntervals";
import {
  SHELL_FEATURED_INTERVAL_LABEL,
  SHELL_FEATURED_INTERVAL_GO_TITLE,
  SIGNATURE_PREVIEW_LABEL,
  SIGNATURE_PREVIEW_TITLE,
} from "../copy";

export type ShellFeaturedIntervalStripProps = {
  /** Base frequency in Hz for preview tone. */
  baseFreq: number;
  /** Play short tone at baseFreq × ratio. */
  onPreviewInterval?: (baseFreq: number, ratio: number) => void;
  /** Open Synth and move cursor to this ratio (or move immediately if already in Synth). */
  onGoToInterval?: (ratio: number) => void;
};

export function ShellFeaturedIntervalStrip({
  baseFreq,
  onPreviewInterval,
  onGoToInterval,
}: ShellFeaturedIntervalStripProps) {
  const featured = getFeaturedDiscoveryInterval();
  const label = ratioToShortLabel(featured.ratio);
  const cents = Math.round(ratioToCents(featured.ratio));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-amber-800/50 bg-amber-950/25 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-amber-500/90">
        {SHELL_FEATURED_INTERVAL_LABEL}
      </span>
      <span className="text-xs text-amber-100/95 font-medium">{label}</span>
      <span className="tabular-nums text-[10px] text-amber-400/80">{cents}¢</span>
      <span className="text-[10px] text-amber-300/70 italic max-w-[12rem] truncate" title={featured.tip}>
        {featured.tip}
      </span>
      {onPreviewInterval && (
        <button
          type="button"
          className="rounded border border-amber-600/60 bg-amber-800/30 px-1.5 py-0.5 text-[10px] text-amber-200 hover:border-amber-500 hover:bg-amber-700/40 transition-colors"
          title={SIGNATURE_PREVIEW_TITLE(label)}
          onClick={() => onPreviewInterval(baseFreq, featured.ratio)}
        >
          {SIGNATURE_PREVIEW_LABEL}
        </button>
      )}
      {onGoToInterval && (
        <button
          type="button"
          className="rounded border border-amber-600/70 bg-amber-800/40 px-2 py-1 text-[10px] text-amber-100 hover:border-amber-500 hover:bg-amber-600/30 transition-colors"
          title={SHELL_FEATURED_INTERVAL_GO_TITLE(label)}
          onClick={() => onGoToInterval(featured.ratio)}
        >
          Go
        </button>
      )}
    </div>
  );
}
