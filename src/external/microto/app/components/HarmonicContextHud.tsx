import type { FC } from "react";

import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { formatQuantizeHudLabel } from "../../shared/tuning/quantizeLabel";
import type { HarmonicWorldIntensity } from "../../domain/harmonicWorld";

type HarmonicContextHudProps = {
  title?: string;
  modeLabel?: string;
  slice: QuantizeSliceLike;
  /** Optional root frequency in Hz (from GlobalHarmonicContext or similar). */
  rootHz?: number;
  /** Optional tuning label, e.g. "JI", "12-EDO", "BP". */
  tuningLabel?: string;
  /** Optional world intensity hint (from HarmonicWorld.profile.intensity). */
  intensity?: HarmonicWorldIntensity;
  className?: string;
};

export const HarmonicContextHud: FC<HarmonicContextHudProps> = ({
  title = "Harmonischer Kontext",
  modeLabel,
  slice,
  rootHz,
  tuningLabel,
  intensity,
  className = "",
}) => {
  const quantizeLabel = formatQuantizeHudLabel(slice);
  const lines: string[] = [];

  if (modeLabel) {
    lines.push(modeLabel);
  }

  if (rootHz !== undefined || tuningLabel) {
    const pieces: string[] = [];
    if (rootHz !== undefined && Number.isFinite(rootHz)) {
      pieces.push(`Root: ${rootHz.toFixed(2)} Hz`);
    }
    if (tuningLabel) {
      pieces.push(tuningLabel);
    }
    if (pieces.length > 0) {
      lines.push(pieces.join(" · "));
    }
  }

  lines.push(quantizeLabel);

  if (intensity) {
    lines.push(`Intensity: ${intensity}`);
  }

  return (
    <div className={`text-xs border border-neutral-800 bg-black/40 p-3 ${className}`}>
      <div className="text-neutral-400 mb-1">{title}</div>
      <div className="text-neutral-100 space-y-0.5">
        {lines.map((text, idx) => (
          <div key={idx}>{text}</div>
        ))}
      </div>
    </div>
  );
};

