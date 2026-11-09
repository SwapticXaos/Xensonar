import type { AppShellFrameProps, BuildAppShellFramePropsArgs } from './appShellFramePropsTypes';

export type { AppMainContentProps, AppShellFrameProps, BuildAppShellFramePropsArgs } from './appShellFramePropsTypes';

export function buildAppShellFrameProps(
  args: BuildAppShellFramePropsArgs,
): AppShellFrameProps {
  return {
    appHeaderProps: args.appHeaderProps,
    mainContentProps: {
      room: args.room,
      mainRoomProps: args.mainRoomProps,
      topologyPanelProps: args.topologyPanelProps,
      xenpolarRoomProps: args.xenpolarRoomProps,
      irrlichtArenaPanelProps: args.irrlichtArenaPanelProps,
      resonanceStatusStripProps: args.resonanceStatusStripProps,
      recordingMarkerSideRailsProps: args.recordingMarkerSideRailsProps,
      resonanceStagePanelProps: args.resonanceStagePanelProps,
      resonanceControlCorePanelProps: args.resonanceControlCorePanelProps,
      resonanceSoundPalettePanelProps: args.resonanceSoundPalettePanelProps,
      resonanceParallelEffectsPanelProps: args.resonanceParallelEffectsPanelProps,
      resonanceGrooveBassPanelProps: args.resonanceGrooveBassPanelProps,
      recordingTakePanelProps: args.recordingTakePanelProps,
      resonanceBurstDiagnosticsPanelProps: args.resonanceBurstDiagnosticsPanelProps,
      performanceCrisisPanelProps: args.performanceCrisisPanelProps,
      auxiliaryRoomProps: args.auxiliaryRoomProps,
    },
  };
}
