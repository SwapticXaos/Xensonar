/**
 * Signature intervals: pin current cursor interval, recall with one click (vision §3 harmonic first-class).
 */
import { useCallback, useState } from "react";
import {
  getSignatureIntervals,
  addSignatureInterval,
  removeSignatureInterval,
  ratioToShortLabel,
} from "../../../domain/signatureIntervals";
import {
  SIGNATURE_INTERVALS_LABEL,
  SIGNATURE_PIN_CURRENT_LABEL,
  SIGNATURE_PIN_CURRENT_TITLE,
  SIGNATURE_GO_TO_TITLE,
  SIGNATURE_FULL_TITLE,
} from "../../../app/copy";

type Props = {
  gridBase: number;
  getCurrentCursorFreq: () => number;
  moveCursorToFreq: (freq: number) => void;
};

export function ResonanceSignatureIntervalsRow({
  gridBase,
  getCurrentCursorFreq,
  moveCursorToFreq,
}: Props) {
  const [, forceUpdate] = useState(0);
  const intervals = getSignatureIntervals();

  const handlePinCurrent = useCallback(() => {
    const freq = getCurrentCursorFreq();
    if (!Number.isFinite(gridBase) || gridBase <= 0 || !Number.isFinite(freq) || freq <= 0) return;
    const ratio = freq / gridBase;
    if (ratio <= 0) return;
    const added = addSignatureInterval(ratio);
    if (added) forceUpdate((n) => n + 1);
  }, [gridBase, getCurrentCursorFreq]);

  const handleGoTo = useCallback(
    (ratio: number) => {
      if (!Number.isFinite(gridBase) || gridBase <= 0) return;
      const freq = gridBase * ratio;
      moveCursorToFreq(freq);
    },
    [gridBase, moveCursorToFreq],
  );

  const handleRemove = useCallback((index: number) => {
    removeSignatureInterval(index);
    forceUpdate((n) => n + 1);
  }, []);

  return (
    <div className="rounded border border-neutral-700 bg-neutral-900/60 p-2" title={SIGNATURE_FULL_TITLE}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-400">{SIGNATURE_INTERVALS_LABEL}</span>
        <button
          type="button"
          className="rounded bg-violet-900/60 px-2 py-1 text-xs text-violet-200 hover:bg-violet-800/70"
          title={SIGNATURE_PIN_CURRENT_TITLE}
          onClick={handlePinCurrent}
        >
          {SIGNATURE_PIN_CURRENT_LABEL}
        </button>
        {intervals.map(({ ratio }, i) => {
          const label = ratioToShortLabel(ratio);
          return (
            <span key={i} className="flex items-center gap-1">
              <button
                type="button"
                className="rounded bg-neutral-700/80 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-600"
                title={SIGNATURE_GO_TO_TITLE(label)}
                onClick={() => handleGoTo(ratio)}
              >
                {label}
              </button>
              <button
                type="button"
                className="rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
                title="Remove this interval"
                aria-label={`Remove ${label}`}
                onClick={() => handleRemove(i)}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
