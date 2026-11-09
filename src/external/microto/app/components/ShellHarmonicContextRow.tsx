/**
 * Shell row: global root, grid tuning, interval (when Resonance), live interval explainer, groove preset, BPM, base-freq quick presets.
 * Single responsibility: display current harmonic context in the shell (vision §5 harmonic feedback, §1 harmonic first-class).
 */

import type { GlobalHarmonicContext } from "../../features/resonance/config/stateSlices";
import type { Room } from "../roomRegistry";
import { BaseFreqQuickPresets } from "./BaseFreqQuickPresets";
import { getIntervalExplainer } from "../../features/resonance/intervalExplainer";
import { SHELL_INTERVAL_EXPLAINER_TITLE } from "../copy";

export type ShellHarmonicContextRowProps = {
  globalHarmonicContext: GlobalHarmonicContext;
  room: Room;
  /** When in Resonance with grid on (vision §5). */
  liveCursorInterval?: string;
  /** Current groove preset label (Ctrl+Q cycle). */
  currentQuantizePresetLabel?: string | null;
  /** Optional: set global root from shell. */
  onSetBaseFreq?: (hz: number) => void;
};

export function ShellHarmonicContextRow({
  globalHarmonicContext,
  room,
  liveCursorInterval,
  currentQuantizePresetLabel,
  onSetBaseFreq,
}: ShellHarmonicContextRowProps) {
  return (
    <div className="flex gap-2 flex-wrap items-baseline">
      <span className="uppercase tracking-widest text-neutral-500">Global Root</span>
      <span className="text-neutral-200">{globalHarmonicContext.baseFreq.toFixed(2)} Hz</span>
      <span className="mx-1 text-neutral-600">·</span>
      <span className="uppercase tracking-widest">{globalHarmonicContext.gridTuning}</span>
      {room === "RESONANCE" && liveCursorInterval && (() => {
        const explainer = getIntervalExplainer(liveCursorInterval, globalHarmonicContext.gridTuning);
        const hasExplainer = explainer.short && explainer.short !== liveCursorInterval;
        return (
          <>
            <span className="mx-1 text-neutral-600">·</span>
            <span className="uppercase tracking-widest text-neutral-500">Interval</span>
            <span
              className="rounded border border-indigo-500/60 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-200 font-medium"
              title={explainer.hint ?? (explainer.cents != null ? `≈ ${Math.round(explainer.cents)}¢` : undefined)}
            >
              {liveCursorInterval}
            </span>
            {hasExplainer && (
              <>
                <span className="mx-1 text-neutral-600">·</span>
                <span
                  className="text-[10px] text-neutral-400 italic"
                  title={SHELL_INTERVAL_EXPLAINER_TITLE}
                >
                  {explainer.short}
                  {explainer.cents != null && (
                    <span className="ml-1 text-neutral-500">≈{Math.round(explainer.cents)}¢</span>
                  )}
                </span>
              </>
            )}
          </>
        );
      })()}
      {room === "RESONANCE" && (
        <>
          <span className="mx-1 text-neutral-600">·</span>
          {currentQuantizePresetLabel && (
            <>
              <span
                className="rounded border border-amber-600/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200 font-medium"
                title="Current groove preset (Ctrl+Q / Ctrl+Shift+Q to cycle)"
              >
                {currentQuantizePresetLabel}
              </span>
              <span className="mx-1 text-neutral-600">·</span>
            </>
          )}
          <span
            className="rounded border border-emerald-600/50 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200 font-medium tabular-nums"
            title="Groove tempo (quantize BPM)"
          >
            {Math.round(globalHarmonicContext.quantizeBpm)} BPM
          </span>
        </>
      )}
      {onSetBaseFreq && (
        <>
          <span className="mx-1 text-neutral-600">·</span>
          <BaseFreqQuickPresets
            currentBaseFreq={globalHarmonicContext.baseFreq}
            onSetBaseFreq={onSetBaseFreq}
          />
        </>
      )}
    </div>
  );
}
