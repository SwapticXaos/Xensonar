import { useMemo } from "react";
import { BASS_PATTERNS, DRUM_PATTERNS } from "../domain/instrumentData";
import { resolveActiveDrumPlaylistEntry, resolveDrumPlaylistEntries } from "../drumPatternPlaylist";
import { readBassClipById } from "../groove/bassClipLibrary";
import { buildAppResonanceDisplayRuntimeEntry } from "../runtimeEntries";
import { buildAppResonanceChromeRuntimeArgs } from "./appResonanceChromeRuntimeArgs";
import type { AppResonanceChromeRuntimeBoundary, UseAppResonanceChromeRuntimeBoundaryArgs } from './useAppResonanceChromeRuntimeBoundaryTypes';

export type { AppResonanceChromeRuntimeBoundary, UseAppResonanceChromeRuntimeBoundaryArgs } from './useAppResonanceChromeRuntimeBoundaryTypes';

export function useAppResonanceChromeRuntimeBoundary({
  display: displayInput,
  header,
  status,
  sideRails,
  grooveStatus,
}: UseAppResonanceChromeRuntimeBoundaryArgs): AppResonanceChromeRuntimeBoundary {
  const display = useMemo(
    () => buildAppResonanceDisplayRuntimeEntry(displayInput),
    [displayInput],
  );

  const activeDrumStatusEntry = useMemo(() => resolveActiveDrumPlaylistEntry({
    entries: resolveDrumPlaylistEntries({ drumPatterns: DRUM_PATTERNS, exportedDrumConfigs: grooveStatus.exportedDrumConfigs }),
    drumConfigMode: grooveStatus.drumConfigMode,
    drumPattern: grooveStatus.drumPattern,
    drumConfigId: grooveStatus.drumConfigId,
  }), [
    grooveStatus.exportedDrumConfigs,
    grooveStatus.drumConfigMode,
    grooveStatus.drumPattern,
    grooveStatus.drumConfigId,
  ]);

  const activeBassStatusEntry = useMemo(
    () => BASS_PATTERNS.find((entry) => entry.value === grooveStatus.bassPattern) ?? null,
    [grooveStatus.bassPattern],
  );

  const activeBassClipStatus = useMemo(
    () => grooveStatus.bassPatternMode === "clip" ? readBassClipById(grooveStatus.bassClipId) : null,
    [grooveStatus.bassPatternMode, grooveStatus.bassClipId],
  );

  const appResonanceChromeRuntimeArgs = useMemo(() => buildAppResonanceChromeRuntimeArgs({
    header,
    status: {
      ...status,
      particleSystemLabel: display.particleSystemLabel,
      particleDisplayModeLabel: display.particleDisplayModeLabel,
      gridTuningLabel: display.gridTuningLabel,
      gridModeLabel: display.gridModeLabel,
      gridBaseHz: displayInput.keyboardWindow.gridBase,
      keyboardWindowStart: display.keyboardWindowStart,
      keyboardWindowEnd: display.keyboardWindowEnd,
      keyboardWindowFirstHz: display.keyboardWindowFirstHz,
      keyboardWindowLastHz: display.keyboardWindowLastHz,
      drumPatternName: activeDrumStatusEntry?.name ?? null,
      bassPatternName: activeBassClipStatus?.name ?? activeBassStatusEntry?.label ?? null,
    },
    sideRails,
  }), [
    header,
    status,
    sideRails,
    display,
    displayInput.keyboardWindow.gridBase,
    activeDrumStatusEntry,
    activeBassClipStatus,
    activeBassStatusEntry,
  ]);

  return {
    ...display,
    appResonanceChromeRuntimeArgs,
  };
}
