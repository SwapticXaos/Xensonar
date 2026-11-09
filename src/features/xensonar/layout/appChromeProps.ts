import type { ComponentProps } from 'react';
import { buildAppHeaderProps } from './appShellProps';
import { buildRecordingMarkerSideRailsProps } from '../rooms/resonancePanelProps';
import { ResonanceStatusStrip } from '../rooms/ResonanceStatusStrip';

export type BuildAppChromePropsArgs = {
  appHeader: Parameters<typeof buildAppHeaderProps>[0];
  resonanceStatusStrip: ComponentProps<typeof ResonanceStatusStrip>;
  recordingMarkerSideRails: Parameters<typeof buildRecordingMarkerSideRailsProps>[0];
};

export type AppChromeProps = {
  appHeaderProps: ReturnType<typeof buildAppHeaderProps>;
  resonanceStatusStripProps: ComponentProps<typeof ResonanceStatusStrip>;
  recordingMarkerSideRailsProps: ReturnType<typeof buildRecordingMarkerSideRailsProps>;
};

export function buildAppChromeProps(args: BuildAppChromePropsArgs): AppChromeProps {
  return {
    appHeaderProps: buildAppHeaderProps(args.appHeader),
    resonanceStatusStripProps: args.resonanceStatusStrip,
    recordingMarkerSideRailsProps: buildRecordingMarkerSideRailsProps(args.recordingMarkerSideRails),
  };
}
