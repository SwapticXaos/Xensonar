/**
 * One-tap root (base frequency) presets for the shell HUD.
 * Vision §3: harmonic systems first-class; immediate root change without opening a room.
 */

import { ROOT_HZ_LABEL, ROOT_HZ_PRESETS } from "../copy";

const TOLERANCE_HZ = 0.5;

function isActivePreset(currentHz: number, presetHz: number): boolean {
  return Math.abs(currentHz - presetHz) < TOLERANCE_HZ;
}

export type BaseFreqQuickPresetsProps = {
  currentBaseFreq: number;
  onSetBaseFreq: (hz: number) => void;
};

export function BaseFreqQuickPresets({ currentBaseFreq, onSetBaseFreq }: BaseFreqQuickPresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-widest text-neutral-500 mr-0.5">{ROOT_HZ_LABEL}</span>
      {ROOT_HZ_PRESETS.map(({ hz, label, ariaLabel }) => {
        const active = isActivePreset(currentBaseFreq, hz);
        return (
          <button
            key={hz}
            type="button"
            onClick={() => onSetBaseFreq(hz)}
            aria-label={ariaLabel ?? `${label} Hz`}
            title={ariaLabel ?? `${label} Hz`}
            className={`rounded border px-1.5 py-0.5 text-[9px] transition-colors ${
              active
                ? "border-amber-500/80 bg-amber-500/20 text-amber-200"
                : "border-neutral-600 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
