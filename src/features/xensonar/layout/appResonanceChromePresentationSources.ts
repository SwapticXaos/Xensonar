import { formatResonanceHotkeyModeStatusLabel } from './resonanceHotkeyModeStatus';
import type {
  BuildAppResonanceChromeGrooveStatusPresentationSourceInput,
  BuildAppResonanceChromeHeaderPresentationSourceInput,
  BuildAppResonanceChromeSideRailsPresentationSourceInput,
  BuildAppResonanceChromeStatusPresentationSourceInput,
  ChromeGrooveStatusSource,
  ChromeHeaderSource,
  ChromeSideRailsSource,
  ChromeStatusSource,
} from './appResonanceChromePresentationSourceTypes';

export type {
  BuildAppResonanceChromeGrooveStatusPresentationSourceInput,
  BuildAppResonanceChromeHeaderPresentationSourceInput,
  BuildAppResonanceChromeSideRailsPresentationSourceInput,
  BuildAppResonanceChromeStatusPresentationSourceInput,
} from './appResonanceChromePresentationSourceTypes';

export const APP_RESONANCE_CHROME_PRESENTATION_SOURCES_PROBE = {
  cleanupKind: 'app-resonance-chrome-presentation-sources',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsScheduling: false,
  ownsRoomLifecycle: false,
  onlyBuildsChromePresentationSourceObjects: true,
  movedFromAppCallsite: [
    'chrome status source literal',
    'chrome header logo marker callback',
    'chrome side-rail marker callback',
    'chrome groove status source literal',
  ] as const,
  explicitlyNotMoved: [
    'useAppResonanceChromeRuntimeBoundary hook',
    'recording runtime behavior',
    'material/root-follow manager actions',
    'hotkey routing behavior',
    'drum or bass pattern resolution',
    'WaveStarter, Root-Follow, Materialspur, SpectralForge and Stable-Rhythm behavior',
  ] as const,
} as const;

export function buildAppResonanceChromeStatusPresentationSource({
  nParamsUI,
  cursorHudHz,
  materialLoopName,
  rootFollowLoopName,
  onOpenMaterialLoopManager,
  onOpenRootFollowLoopManager,
  onOpenDrumPatternManager,
  onOpenBassPatternManager,
  resonanceActionBadges,
  driveActive,
  formatHzCompact,
}: BuildAppResonanceChromeStatusPresentationSourceInput): ChromeStatusSource {
  return {
    cursorHudHz,
    hotkeyModeLabel: formatResonanceHotkeyModeStatusLabel(nParamsUI.resonanceHotkeyMode),
    materialLoopName,
    rootFollowLoopName,
    onOpenMaterialLoopManager,
    onOpenRootFollowLoopManager,
    onOpenDrumPatternManager,
    onOpenBassPatternManager,
    materialLoopActive: nParamsUI.materialLoopActive,
    rootFollowLoopActive: nParamsUI.rootFollowLoopActive,
    materialLoopHotkeysActive: nParamsUI.resonanceHotkeyMode === 'material',
    rootFollowLoopHotkeysActive: nParamsUI.resonanceHotkeyMode === 'root-follow',
    octaveActive: resonanceActionBadges.octave,
    sustainActive: resonanceActionBadges.sustain,
    swellActive: resonanceActionBadges.swell,
    echoActive: nParamsUI.echoOn,
    driveActive,
    formatHzCompact,
  } satisfies ChromeStatusSource;
}

export function buildAppResonanceChromeHeaderPresentationSource({
  addLogoMarker,
  ...header
}: BuildAppResonanceChromeHeaderPresentationSourceInput): ChromeHeaderSource {
  return {
    ...header,
    onLogoClick: () => {
      if (header.recordingActive) addLogoMarker();
    },
  } satisfies ChromeHeaderSource;
}

export function buildAppResonanceChromeSideRailsPresentationSource({
  addSideMarker,
  ...sideRails
}: BuildAppResonanceChromeSideRailsPresentationSourceInput): ChromeSideRailsSource {
  return {
    ...sideRails,
    addSideMarker,
  } satisfies ChromeSideRailsSource;
}

export function buildAppResonanceChromeGrooveStatusPresentationSource({
  exportedDrumConfigs,
  nParamsUI,
}: BuildAppResonanceChromeGrooveStatusPresentationSourceInput): ChromeGrooveStatusSource {
  return {
    exportedDrumConfigs,
    drumConfigMode: nParamsUI.drumConfigMode,
    drumPattern: nParamsUI.drumPattern,
    drumConfigId: nParamsUI.drumConfigId,
    bassPattern: nParamsUI.bassPattern,
    bassPatternMode: nParamsUI.bassPatternMode,
    bassClipId: nParamsUI.bassClipId,
  } satisfies ChromeGrooveStatusSource;
}
