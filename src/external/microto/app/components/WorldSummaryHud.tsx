import type { FC, ReactNode } from "react";

import type { HarmonicWorld } from "../../domain/harmonicWorld";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { WorldHintCard } from "./WorldHintCard";
import { HarmonicContextHud } from "./HarmonicContextHud";

type WorldSummaryHudProps = {
  /** Optional active harmonic world view-model. When absent, the world card is omitted. */
  world?: HarmonicWorld | null;
  /** Quantize slice used to render the groove label in the context HUD. */
  slice: QuantizeSliceLike;
  /** Optional root frequency in Hz (typically from GlobalHarmonicContext). */
  rootHz?: number;
  /** Optional tuning label, e.g. "JI", "12-EDO", "BP". */
  tuningLabel?: string;
  /** Optional mode label shown in the context HUD title line. */
  modeLabel?: string;
  /** Optional extra text rendered inside the world card. */
  worldHintChildren?: ReactNode;
  /** Optional callback to navigate to a recommended room from the world card. */
  onSelectRoom?: (roomId: import("../roomRegistry").Room) => void;
  className?: string;
};

/**
 * Compact combined HUD that surfaces:
 * - The active Harmonic World (label, description, tags, notes)
 * - The local harmonic context (root Hz, tuning label, quantize/groove label, intensity)
 *
 * Intended as a reusable building block for rooms that want to show
 * "where this surface sits inside the current world" without each room
 * having to manually compose WorldHintCard + HarmonicContextHud.
 */
export const WorldSummaryHud: FC<WorldSummaryHudProps> = ({
  world,
  slice,
  rootHz,
  tuningLabel,
  modeLabel,
  worldHintChildren,
  onSelectRoom,
  className = "",
}) => {
  const intensity = world?.profile?.intensity;

  return (
    <div className={`space-y-2 ${className}`}>
      {world && (
        <WorldHintCard world={world} onSelectRoom={onSelectRoom}>
          {worldHintChildren}
        </WorldHintCard>
      )}
      <HarmonicContextHud
        modeLabel={modeLabel}
        slice={slice}
        rootHz={rootHz}
        tuningLabel={tuningLabel}
        intensity={intensity}
      />
    </div>
  );
};

