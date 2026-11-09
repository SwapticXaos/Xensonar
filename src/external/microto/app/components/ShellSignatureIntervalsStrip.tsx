/**
 * Shell-level strip: one-click "Go to" for pinned signature intervals (vision §3 §5).
 * Makes signature intervals discoverable from the HUD even when not in Synth;
 * clicking Go opens Synth and moves cursor to that interval (or moves immediately if already in Synth).
 * Optional "Hear" preview plays a short tone at baseFreq * ratio for harmonic-first discovery.
 * "Surprise interval" jumps to a random discovery ratio for exploratory play.
 */
import { getSignatureIntervals, ratioToShortLabel, ratioToCents } from "../../domain/signatureIntervals";
import { SHELL_SIGNATURE_STRIP_LABEL, SHELL_SURPRISE_INTERVAL_LABEL, SIGNATURE_GO_TO_TITLE, SIGNATURE_PREVIEW_TITLE, SIGNATURE_PREVIEW_LABEL } from "../copy";

export type ShellSignatureIntervalsStripProps = {
  /** When user clicks Go(i): navigate to Synth and jump to interval i (or jump if already in Synth). */
  onRequestSignatureGo: (index: number) => void;
  /** Optional: jump to a random discovery ratio (vision §3 exploratory). */
  onSurpriseInterval?: () => void;
  /** Base frequency in Hz for preview tone (e.g. from current world or global context). */
  baseFreq: number;
  /** Optional: play short tone at baseFreq * ratio (vision §3 harmonic first-class). */
  onPreviewInterval?: (baseFreq: number, ratio: number) => void;
};

export function ShellSignatureIntervalsStrip({
  onRequestSignatureGo,
  onSurpriseInterval,
  baseFreq,
  onPreviewInterval,
}: ShellSignatureIntervalsStripProps) {
  const intervals = getSignatureIntervals();
  const showPinned = intervals.length > 0;
  if (!showPinned && !onSurpriseInterval) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-violet-800/60 bg-violet-950/30 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-violet-400/90">{SHELL_SIGNATURE_STRIP_LABEL}</span>
      {onSurpriseInterval && (
        <button
          type="button"
          onClick={onSurpriseInterval}
          className="rounded border border-violet-600/70 bg-violet-800/40 px-2 py-1 text-[10px] text-violet-200 hover:border-amber-500/80 hover:bg-amber-500/10 transition-colors"
          title="Jump to a random harmonic interval (e.g. 5/4, 3/2)"
        >
          {SHELL_SURPRISE_INTERVAL_LABEL}
        </button>
      )}
      {showPinned && intervals.map(({ ratio }, i) => {
        const label = ratioToShortLabel(ratio);
        const cents = Math.round(ratioToCents(ratio));
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {onPreviewInterval && (
              <button
                type="button"
                className="rounded border border-violet-600/70 bg-violet-800/40 px-1.5 py-0.5 text-[10px] text-violet-200 hover:border-violet-500 hover:bg-violet-700/50 transition-colors"
                title={SIGNATURE_PREVIEW_TITLE(label)}
                onClick={() => onPreviewInterval(baseFreq, ratio)}
              >
                {SIGNATURE_PREVIEW_LABEL}
              </button>
            )}
            <button
              type="button"
              className="rounded border border-violet-700/80 bg-violet-900/50 px-2 py-1 text-xs text-violet-100 hover:border-violet-500 hover:bg-violet-800/60 transition-colors"
              title={SIGNATURE_GO_TO_TITLE(label)}
              onClick={() => onRequestSignatureGo(i)}
            >
              <span className="font-medium">{label}</span>
              <span className="ml-1 text-violet-300/80 tabular-nums">{cents}¢</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
