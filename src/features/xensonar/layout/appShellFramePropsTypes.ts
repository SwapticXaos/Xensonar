import type { ComponentProps } from 'react';
import type { AppMainContent } from './AppMainContent';
import type { AppShellFrame } from './AppShellFrame';

export type AppShellFrameProps = ComponentProps<typeof AppShellFrame>;
export type AppMainContentProps = ComponentProps<typeof AppMainContent>;

export type BuildAppShellFramePropsArgs = {
  appHeaderProps: AppShellFrameProps['appHeaderProps'];
  room: AppMainContentProps['room'];
  mainRoomProps: AppMainContentProps['mainRoomProps'];
  topologyPanelProps: AppMainContentProps['topologyPanelProps'];
  xenpolarRoomProps: AppMainContentProps['xenpolarRoomProps'];
  irrlichtArenaPanelProps: AppMainContentProps['irrlichtArenaPanelProps'];
  resonanceStatusStripProps: AppMainContentProps['resonanceStatusStripProps'];
  recordingMarkerSideRailsProps: AppMainContentProps['recordingMarkerSideRailsProps'];
  resonanceStagePanelProps: AppMainContentProps['resonanceStagePanelProps'];
  resonanceControlCorePanelProps: AppMainContentProps['resonanceControlCorePanelProps'];
  resonanceSoundPalettePanelProps: AppMainContentProps['resonanceSoundPalettePanelProps'];
  resonanceParallelEffectsPanelProps: AppMainContentProps['resonanceParallelEffectsPanelProps'];
  resonanceGrooveBassPanelProps: AppMainContentProps['resonanceGrooveBassPanelProps'];
  recordingTakePanelProps: AppMainContentProps['recordingTakePanelProps'];
  resonanceBurstDiagnosticsPanelProps: AppMainContentProps['resonanceBurstDiagnosticsPanelProps'];
  performanceCrisisPanelProps: AppMainContentProps['performanceCrisisPanelProps'];
  auxiliaryRoomProps: AppMainContentProps['auxiliaryRoomProps'];
};
