import type { AppChromeRuntimeArgs, BuildAppResonanceChromeRuntimeArgsInput } from './appResonanceChromeRuntimeArgsTypes';

export type { BuildAppResonanceChromeRuntimeArgsInput } from './appResonanceChromeRuntimeArgsTypes';

export function buildAppResonanceChromeRuntimeArgs(
  input: BuildAppResonanceChromeRuntimeArgsInput,
): AppChromeRuntimeArgs {
  return {
    ...input.header,
    particleSystemLabel: input.status.particleSystemLabel,
    particleDisplayModeLabel: input.status.particleDisplayModeLabel,
    cursorHudHzLabel: input.status.cursorHudHz !== null
      ? input.status.formatHzCompact(input.status.cursorHudHz)
      : "-",
    gridTuningLabel: input.status.gridTuningLabel,
    gridModeLabel: input.status.gridModeLabel,
    gridBaseHzLabel: input.status.formatHzCompact(input.status.gridBaseHz, 1),
    keyboardWindowRangeLabel: `${input.status.keyboardWindowStart + 1}-${input.status.keyboardWindowEnd + 1}`,
    keyboardWindowFirstHzLabel: input.status.keyboardWindowFirstHz !== null
      ? input.status.formatHzCompact(input.status.keyboardWindowFirstHz)
      : "-",
    keyboardWindowLastHzLabel: input.status.keyboardWindowLastHz !== null
      ? input.status.formatHzCompact(input.status.keyboardWindowLastHz)
      : "-",
    hotkeyModeLabel: input.status.hotkeyModeLabel,
    materialLoopNameLabel: input.status.materialLoopName?.trim() || "keine Materialspur",
    rootFollowLoopNameLabel: input.status.rootFollowLoopName?.trim() || "kein Root Follow",
    drumPatternNameLabel: input.status.drumPatternName?.trim() || "kein Drum Pattern",
    bassPatternNameLabel: input.status.bassPatternName?.trim() || "kein Bass Pattern",
    onOpenMaterialLoopManager: input.status.onOpenMaterialLoopManager,
    onOpenRootFollowLoopManager: input.status.onOpenRootFollowLoopManager,
    onOpenDrumPatternManager: input.status.onOpenDrumPatternManager,
    onOpenBassPatternManager: input.status.onOpenBassPatternManager,
    onOpenGridTuningRack: input.status.onOpenGridTuningRack,
    materialLoopActive: input.status.materialLoopActive,
    rootFollowLoopActive: input.status.rootFollowLoopActive,
    materialLoopHotkeysActive: input.status.materialLoopHotkeysActive,
    rootFollowLoopHotkeysActive: input.status.rootFollowLoopHotkeysActive,
    octaveActive: input.status.octaveActive,
    sustainActive: input.status.sustainActive,
    swellActive: input.status.swellActive,
    echoActive: input.status.echoActive,
    driveActive: input.status.driveActive,
    ...input.sideRails,
  };
}
