import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { UseAppResonanceChromeRuntimeBoundaryArgs } from './useAppResonanceChromeRuntimeBoundaryTypes';

export type ChromeStatusSource = UseAppResonanceChromeRuntimeBoundaryArgs['status'];
export type ChromeHeaderSource = UseAppResonanceChromeRuntimeBoundaryArgs['header'];
export type ChromeSideRailsSource = UseAppResonanceChromeRuntimeBoundaryArgs['sideRails'];
export type ChromeGrooveStatusSource = UseAppResonanceChromeRuntimeBoundaryArgs['grooveStatus'];

type ResonanceActionBadgesSource = {
  readonly octave: boolean;
  readonly sustain: boolean;
  readonly swell: boolean;
};

type ChromeStatusNexusSource = Pick<
  AppNexusParams,
  | 'resonanceHotkeyMode'
  | 'materialLoopActive'
  | 'rootFollowLoopActive'
  | 'echoOn'
>;

type ChromeGrooveNexusSource = Pick<
  AppNexusParams,
  | 'drumConfigMode'
  | 'drumPattern'
  | 'drumConfigId'
  | 'bassPattern'
  | 'bassPatternMode'
  | 'bassClipId'
>;

export type BuildAppResonanceChromeStatusPresentationSourceInput = {
  readonly nParamsUI: ChromeStatusNexusSource;
  readonly cursorHudHz: ChromeStatusSource['cursorHudHz'];
  readonly materialLoopName: ChromeStatusSource['materialLoopName'];
  readonly rootFollowLoopName: ChromeStatusSource['rootFollowLoopName'];
  readonly onOpenMaterialLoopManager?: ChromeStatusSource['onOpenMaterialLoopManager'];
  readonly onOpenRootFollowLoopManager?: ChromeStatusSource['onOpenRootFollowLoopManager'];
  readonly onOpenDrumPatternManager?: ChromeStatusSource['onOpenDrumPatternManager'];
  readonly onOpenBassPatternManager?: ChromeStatusSource['onOpenBassPatternManager'];
  readonly resonanceActionBadges: ResonanceActionBadgesSource;
  readonly driveActive: boolean;
  readonly formatHzCompact: ChromeStatusSource['formatHzCompact'];
};

export type BuildAppResonanceChromeHeaderPresentationSourceInput = Omit<ChromeHeaderSource, 'onLogoClick'> & {
  readonly addLogoMarker: () => void;
};

export type BuildAppResonanceChromeSideRailsPresentationSourceInput = Omit<ChromeSideRailsSource, 'addSideMarker'> & {
  readonly addSideMarker: ChromeSideRailsSource['addSideMarker'];
};

export type BuildAppResonanceChromeGrooveStatusPresentationSourceInput = {
  readonly exportedDrumConfigs: ChromeGrooveStatusSource['exportedDrumConfigs'];
  readonly nParamsUI: ChromeGrooveNexusSource;
};
