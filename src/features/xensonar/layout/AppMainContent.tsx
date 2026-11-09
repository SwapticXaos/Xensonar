import { lazy, Suspense, type ComponentProps } from 'react';
import { CommonsRoom } from '../rooms/CommonsRoom';
import { AppRoomViewport } from '../rooms/AppRoomViewport';
import { RecordingMarkerSideRails } from '../rooms/RecordingMarkerSideRails';
import { ResonanceGuidePanel } from '../rooms/ResonanceGuidePanel';
import { ResonanceStatusStrip } from '../rooms/ResonanceStatusStrip';
import { ResonanceControlCorePanel } from '../rooms/ResonanceControlCorePanel';
import { RecordingTakePanel } from '../rooms/RecordingTakePanel';
import { ResonanceParallelEffectsPanel } from '../rooms/ResonanceParallelEffectsPanel';
import { ResonanceSoundPalettePanel } from '../rooms/ResonanceSoundPalettePanel';
import { ResonanceGrooveBassPanel } from '../rooms/ResonanceGrooveBassPanel';
import { ResonanceStagePanel } from '../rooms/ResonanceStagePanel';
import type { PerformanceCrisisPanelProps } from '../performanceCrisis/performanceCrisisPanelProps';
import { shouldRenderResonancePanels } from '../rooms/resonancePanelProps';
import { XENSONAR_DIAGNOSTIC_SURFACES_ENABLED, XENSONAR_MATERIALSCHMIEDE_ENABLED } from '../rooms/coreBuildProfile';

const PerformanceCrisisManagementPanelLazy = XENSONAR_DIAGNOSTIC_SURFACES_ENABLED
  ? lazy(() =>
      import('../performanceCrisis/ui/PerformanceCrisisManagementPanel').then((module) => ({
        default: module.PerformanceCrisisManagementPanel,
      })),
    )
  : null;

const ResonanceBurstDiagnosticsPanelLazy = XENSONAR_DIAGNOSTIC_SURFACES_ENABLED
  ? lazy(() =>
      import('../rooms/ResonanceBurstDiagnosticsPanel').then((module) => ({
        default: module.ResonanceBurstDiagnosticsPanel,
      })),
    )
  : null;

type Level3LabRoomComponent = typeof import('../../../components/Level3LabRoom')['Level3LabRoom'];
type ResonanceBurstDiagnosticsPanelComponent =
  typeof import('../rooms/ResonanceBurstDiagnosticsPanel')['ResonanceBurstDiagnosticsPanel'];
const Level3LabRoomLazy = XENSONAR_MATERIALSCHMIEDE_ENABLED
  ? lazy(() => import('../../../components/Level3LabRoom').then((module) => ({ default: module.Level3LabRoom })))
  : null;

type AppMainContentProps = {
  room: ComponentProps<typeof AppRoomViewport>['room'];
  mainRoomProps: ComponentProps<typeof AppRoomViewport>['mainRoomProps'];
  topologyPanelProps: ComponentProps<typeof AppRoomViewport>['topologyPanelProps'];
  xenpolarRoomProps: ComponentProps<typeof AppRoomViewport>['xenpolarRoomProps'];
  irrlichtArenaPanelProps: ComponentProps<typeof AppRoomViewport>['irrlichtArenaPanelProps'];
  resonanceStatusStripProps: ComponentProps<typeof ResonanceStatusStrip>;
  recordingMarkerSideRailsProps: ComponentProps<typeof RecordingMarkerSideRails>;
  resonanceStagePanelProps: ComponentProps<typeof ResonanceStagePanel>;
  resonanceControlCorePanelProps: ComponentProps<typeof ResonanceControlCorePanel>;
  resonanceSoundPalettePanelProps: ComponentProps<typeof ResonanceSoundPalettePanel>;
  resonanceParallelEffectsPanelProps: ComponentProps<typeof ResonanceParallelEffectsPanel>;
  resonanceGrooveBassPanelProps: ComponentProps<typeof ResonanceGrooveBassPanel>;
  recordingTakePanelProps: ComponentProps<typeof RecordingTakePanel>;
  resonanceBurstDiagnosticsPanelProps: ComponentProps<ResonanceBurstDiagnosticsPanelComponent>;
  performanceCrisisPanelProps: PerformanceCrisisPanelProps;
  auxiliaryRoomProps: {
    commonsRoomProps: ComponentProps<typeof CommonsRoom>;
    level3LabRoomProps: ComponentProps<Level3LabRoomComponent>;
  };
};

export function AppMainContent(props: AppMainContentProps) {
  return (
    <main className="flex-1 p-6 relative">
      <AppRoomViewport
        room={props.room}
        mainRoomProps={props.mainRoomProps}
        topologyPanelProps={props.topologyPanelProps}
        xenpolarRoomProps={props.xenpolarRoomProps}
        irrlichtArenaPanelProps={props.irrlichtArenaPanelProps}
      />

      <ResonanceStatusStrip {...props.resonanceStatusStripProps} />

      <div data-xensonar-global-manager-window-host="true">
        <ResonanceGrooveBassPanel {...props.resonanceGrooveBassPanelProps} />
      </div>

      {shouldRenderResonancePanels(props.room) && (
        <>
          <RecordingMarkerSideRails {...props.recordingMarkerSideRailsProps} />
          <div className="max-w-6xl mx-auto space-y-4">
            <ResonanceStagePanel {...props.resonanceStagePanelProps} />
            <ResonanceControlCorePanel {...props.resonanceControlCorePanelProps} />
            <ResonanceSoundPalettePanel {...props.resonanceSoundPalettePanelProps} />
            <ResonanceParallelEffectsPanel {...props.resonanceParallelEffectsPanelProps} />
            <RecordingTakePanel {...props.recordingTakePanelProps} />
            <ResonanceGuidePanel />
            {PerformanceCrisisManagementPanelLazy && (
              <Suspense fallback={null}>
                <PerformanceCrisisManagementPanelLazy {...props.performanceCrisisPanelProps} />
              </Suspense>
            )}
            {ResonanceBurstDiagnosticsPanelLazy && (
              <Suspense fallback={null}>
                <ResonanceBurstDiagnosticsPanelLazy {...props.resonanceBurstDiagnosticsPanelProps} />
              </Suspense>
            )}
          </div>
        </>
      )}

      {props.room === 'COMMONS' && <CommonsRoom {...props.auxiliaryRoomProps.commonsRoomProps} />}
      {Level3LabRoomLazy && (
        <div
          className={props.room === 'L3LAB' ? undefined : 'sr-only pointer-events-none'}
          aria-hidden={props.room === 'L3LAB' ? undefined : true}
          data-package-station-keepalive={props.room === 'L3LAB' ? undefined : 'true'}
        >
          <Suspense fallback={props.room === 'L3LAB' ? <div className="p-6 text-sm text-neutral-500">Materialschmiede wird geladen …</div> : null}>
            <Level3LabRoomLazy {...props.auxiliaryRoomProps.level3LabRoomProps} />
          </Suspense>
        </div>
      )}
    </main>
  );
}
