import type { buildAppChromeRuntimeBindings } from "./appChromeRuntimeBindings";

export type AppChromeRuntimeArgs = Parameters<typeof buildAppChromeRuntimeBindings>[0];

type HeaderArgs = Pick<
  AppChromeRuntimeArgs,
  | "room"
  | "recordingActive"
  | "logoMarkerPulses"
  | "recordingDurationLabel"
  | "xenpolarShortcutActive"
  | "onLogoClick"
  | "onToggleRecordingFromHeader"
  | "setFamilyRequestedActive"
  | "setRoom"
  | "setXenpolarView"
>;

type SideRailsArgs = Pick<
  AppChromeRuntimeArgs,
  | "isRecording"
  | "sideMarkerPulses"
  | "scrollbarInsetPx"
  | "addSideMarker"
  | "triggerSideMarkerPulse"
>;

type StatusArgs = {
  particleSystemLabel: AppChromeRuntimeArgs["particleSystemLabel"];
  particleDisplayModeLabel: AppChromeRuntimeArgs["particleDisplayModeLabel"];
  cursorHudHz: number | null;
  gridTuningLabel: AppChromeRuntimeArgs["gridTuningLabel"];
  gridModeLabel: AppChromeRuntimeArgs["gridModeLabel"];
  gridBaseHz: number;
  keyboardWindowStart: number;
  keyboardWindowEnd: number;
  keyboardWindowFirstHz: number | null;
  keyboardWindowLastHz: number | null;
  hotkeyModeLabel: AppChromeRuntimeArgs["hotkeyModeLabel"];
  materialLoopName: string | null;
  rootFollowLoopName: string | null;
  drumPatternName: string | null;
  bassPatternName: string | null;
  onOpenMaterialLoopManager?: AppChromeRuntimeArgs["onOpenMaterialLoopManager"];
  onOpenRootFollowLoopManager?: AppChromeRuntimeArgs["onOpenRootFollowLoopManager"];
  onOpenDrumPatternManager?: AppChromeRuntimeArgs["onOpenDrumPatternManager"];
  onOpenBassPatternManager?: AppChromeRuntimeArgs["onOpenBassPatternManager"];
  onOpenGridTuningRack?: AppChromeRuntimeArgs["onOpenGridTuningRack"]; 
  materialLoopActive: AppChromeRuntimeArgs["materialLoopActive"];
  rootFollowLoopActive: AppChromeRuntimeArgs["rootFollowLoopActive"];
  materialLoopHotkeysActive: AppChromeRuntimeArgs["materialLoopHotkeysActive"];
  rootFollowLoopHotkeysActive: AppChromeRuntimeArgs["rootFollowLoopHotkeysActive"];
  octaveActive: AppChromeRuntimeArgs["octaveActive"];
  sustainActive: AppChromeRuntimeArgs["sustainActive"];
  swellActive: AppChromeRuntimeArgs["swellActive"];
  echoActive: AppChromeRuntimeArgs["echoActive"];
  driveActive: AppChromeRuntimeArgs["driveActive"];
  formatHzCompact: (hz: number, precision?: number) => string;
};

export type BuildAppResonanceChromeRuntimeArgsInput = {
  header: HeaderArgs;
  status: StatusArgs;
  sideRails: SideRailsArgs;
};
