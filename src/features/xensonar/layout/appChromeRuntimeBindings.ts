import { buildAppChromeProps } from './appChromeProps';

type AppChromePropsArgs = Parameters<typeof buildAppChromeProps>[0];

export type BuildAppChromeRuntimeBindingsArgs = {
  room: AppChromePropsArgs['appHeader']['room'];
  recordingActive: AppChromePropsArgs['appHeader']['recordingActive'];
  logoMarkerPulses: AppChromePropsArgs['appHeader']['logoMarkerPulses'];
  recordingDurationLabel: AppChromePropsArgs['appHeader']['recordingDurationLabel'];
  xenpolarShortcutActive: AppChromePropsArgs['appHeader']['xenpolarShortcutActive'];
  onLogoClick: AppChromePropsArgs['appHeader']['onLogoClick'];
  onToggleRecordingFromHeader: AppChromePropsArgs['appHeader']['onToggleRecordingFromHeader'];
  setFamilyRequestedActive: AppChromePropsArgs['appHeader']['setFamilyRequestedActive'];
  setRoom: AppChromePropsArgs['appHeader']['setRoom'];
  setXenpolarView: AppChromePropsArgs['appHeader']['setXenpolarView'];
  particleSystemLabel: AppChromePropsArgs['resonanceStatusStrip']['particleSystemLabel'];
  particleDisplayModeLabel: AppChromePropsArgs['resonanceStatusStrip']['particleDisplayModeLabel'];
  cursorHudHzLabel: AppChromePropsArgs['resonanceStatusStrip']['cursorHudHzLabel'];
  gridTuningLabel: AppChromePropsArgs['resonanceStatusStrip']['gridTuningLabel'];
  gridModeLabel: AppChromePropsArgs['resonanceStatusStrip']['gridModeLabel'];
  gridBaseHzLabel: AppChromePropsArgs['resonanceStatusStrip']['gridBaseHzLabel'];
  keyboardWindowRangeLabel: AppChromePropsArgs['resonanceStatusStrip']['keyboardWindowRangeLabel'];
  keyboardWindowFirstHzLabel: AppChromePropsArgs['resonanceStatusStrip']['keyboardWindowFirstHzLabel'];
  keyboardWindowLastHzLabel: AppChromePropsArgs['resonanceStatusStrip']['keyboardWindowLastHzLabel'];
  hotkeyModeLabel: AppChromePropsArgs['resonanceStatusStrip']['hotkeyModeLabel'];
  materialLoopNameLabel: AppChromePropsArgs['resonanceStatusStrip']['materialLoopNameLabel'];
  rootFollowLoopNameLabel: AppChromePropsArgs['resonanceStatusStrip']['rootFollowLoopNameLabel'];
  drumPatternNameLabel: AppChromePropsArgs['resonanceStatusStrip']['drumPatternNameLabel'];
  bassPatternNameLabel: AppChromePropsArgs['resonanceStatusStrip']['bassPatternNameLabel'];
  onOpenMaterialLoopManager?: AppChromePropsArgs['resonanceStatusStrip']['onOpenMaterialLoopManager'];
  onOpenRootFollowLoopManager?: AppChromePropsArgs['resonanceStatusStrip']['onOpenRootFollowLoopManager'];
  onOpenDrumPatternManager?: AppChromePropsArgs['resonanceStatusStrip']['onOpenDrumPatternManager'];
  onOpenBassPatternManager?: AppChromePropsArgs['resonanceStatusStrip']['onOpenBassPatternManager'];
  onOpenGridTuningRack?: AppChromePropsArgs['resonanceStatusStrip']['onOpenGridTuningRack'];
  materialLoopActive: AppChromePropsArgs['resonanceStatusStrip']['materialLoopActive'];
  rootFollowLoopActive: AppChromePropsArgs['resonanceStatusStrip']['rootFollowLoopActive'];
  materialLoopHotkeysActive: AppChromePropsArgs['resonanceStatusStrip']['materialLoopHotkeysActive'];
  rootFollowLoopHotkeysActive: AppChromePropsArgs['resonanceStatusStrip']['rootFollowLoopHotkeysActive'];
  octaveActive: AppChromePropsArgs['resonanceStatusStrip']['octaveActive'];
  sustainActive: AppChromePropsArgs['resonanceStatusStrip']['sustainActive'];
  swellActive: AppChromePropsArgs['resonanceStatusStrip']['swellActive'];
  echoActive: AppChromePropsArgs['resonanceStatusStrip']['echoActive'];
  driveActive: AppChromePropsArgs['resonanceStatusStrip']['driveActive'];
  isRecording: AppChromePropsArgs['recordingMarkerSideRails']['isRecording'];
  sideMarkerPulses: AppChromePropsArgs['recordingMarkerSideRails']['sideMarkerPulses'];
  scrollbarInsetPx: AppChromePropsArgs['recordingMarkerSideRails']['scrollbarInsetPx'];
  addSideMarker: AppChromePropsArgs['recordingMarkerSideRails']['addSideMarker'];
  triggerSideMarkerPulse: AppChromePropsArgs['recordingMarkerSideRails']['triggerSideMarkerPulse'];
};

export type AppChromeRuntimeBindings = AppChromePropsArgs;

export function buildAppChromeRuntimeBindings(
  args: BuildAppChromeRuntimeBindingsArgs,
): AppChromeRuntimeBindings {
  return {
    appHeader: {
      room: args.room,
      recordingActive: args.recordingActive,
      logoMarkerPulses: args.logoMarkerPulses,
      recordingDurationLabel: args.recordingDurationLabel,
      xenpolarShortcutActive: args.xenpolarShortcutActive,
      onLogoClick: args.onLogoClick,
      onToggleRecordingFromHeader: args.onToggleRecordingFromHeader,
      setFamilyRequestedActive: args.setFamilyRequestedActive,
      setRoom: args.setRoom,
      setXenpolarView: args.setXenpolarView,
    },
    resonanceStatusStrip: {
      particleSystemLabel: args.particleSystemLabel,
      particleDisplayModeLabel: args.particleDisplayModeLabel,
      cursorHudHzLabel: args.cursorHudHzLabel,
      gridTuningLabel: args.gridTuningLabel,
      gridModeLabel: args.gridModeLabel,
      gridBaseHzLabel: args.gridBaseHzLabel,
      keyboardWindowRangeLabel: args.keyboardWindowRangeLabel,
      keyboardWindowFirstHzLabel: args.keyboardWindowFirstHzLabel,
      keyboardWindowLastHzLabel: args.keyboardWindowLastHzLabel,
      hotkeyModeLabel: args.hotkeyModeLabel,
      materialLoopNameLabel: args.materialLoopNameLabel,
      rootFollowLoopNameLabel: args.rootFollowLoopNameLabel,
      drumPatternNameLabel: args.drumPatternNameLabel,
      bassPatternNameLabel: args.bassPatternNameLabel,
      onOpenMaterialLoopManager: args.onOpenMaterialLoopManager,
      onOpenRootFollowLoopManager: args.onOpenRootFollowLoopManager,
      onOpenDrumPatternManager: args.onOpenDrumPatternManager,
      onOpenBassPatternManager: args.onOpenBassPatternManager,
      onOpenGridTuningRack: args.onOpenGridTuningRack,
      materialLoopActive: args.materialLoopActive,
      rootFollowLoopActive: args.rootFollowLoopActive,
      materialLoopHotkeysActive: args.materialLoopHotkeysActive,
      rootFollowLoopHotkeysActive: args.rootFollowLoopHotkeysActive,
      octaveActive: args.octaveActive,
      sustainActive: args.sustainActive,
      swellActive: args.swellActive,
      echoActive: args.echoActive,
      driveActive: args.driveActive,
    },
    recordingMarkerSideRails: {
      isRecording: args.isRecording,
      sideMarkerPulses: args.sideMarkerPulses,
      scrollbarInsetPx: args.scrollbarInsetPx,
      addSideMarker: args.addSideMarker,
      triggerSideMarkerPulse: args.triggerSideMarkerPulse,
    },
  };
}
