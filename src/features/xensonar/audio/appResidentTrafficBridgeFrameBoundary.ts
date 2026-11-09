import { getAudioNowSec } from '../../../core/time/unifiedTime';
import { getResidentCollisionOutputAmp } from '../../topology/installationAudioPolicy';
import type { InstallationFieldConfig, InstallationResidentSoundPreset } from '../../topology/installationFieldConfig';
import { resolveResidentSoundDefinition } from '../../topology/residentSoundCatalog';
import type { QueuedCollisionTrigger } from '../../soundLibrary/particlePitchRouting';
import type { QuantizeGrid } from '../domain/instrumentData';
import type { DirectedPulse, NexusRipple, SemanticNode } from '../domain/runtimeTypes';
import {
  buildMyzelResidentFieldRuntimeFrame,
  collectMyzelResidentFieldRuntimeWaveEvents,
} from '../myzelSynth/myzelRoom3RuntimeBoundary';
import { getQuantizeStepSeconds } from '../rooms/resonanceRuntimeMath';
import {
  mergeQueuedCollisionTrigger,
  resolveQuantizeAnchor,
  resolveTrafficQuantizeSchedule,
} from '../rooms/audioTrafficQuantize';
import type { AppNexusAgentToneAction } from './useAppNexusAudioActionSurfaceBoundary';

type MutableRef<T> = { current: T };

type Point = { x: number; y: number };

export type AppResidentTrafficBridgeFrameBoundaryResult = {
  readonly residentEventCount: number;
  readonly queuedEventCount: number;
  readonly directEventCount: number;
  readonly quantized: boolean;
};

export type AppResidentTrafficBridgeFrameBoundaryArgs = {
  readonly active: boolean;
  readonly config: InstallationFieldConfig;
  readonly nodes: SemanticNode[];
  readonly oscillatorBall: Point | null;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly ripples: NexusRipple[];
  readonly sectorPulses: DirectedPulse[];
  readonly nowMs: number;
  readonly targetFreq: number;
  readonly quantizeOn: boolean;
  readonly audioCtx: AudioContext | null;
  readonly gridTempoBpm: number;
  readonly quantizeGrid: QuantizeGrid;
  readonly quantizeReferenceBars?: number;
  readonly quantizeAnchorRef: MutableRef<number | null>;
  readonly waveCollisionQueueRef: MutableRef<QueuedCollisionTrigger[]>;
  readonly echoOn: boolean;
  readonly delayNode?: AudioNode | null;
  readonly playNexusAgentTone: AppNexusAgentToneAction;
  readonly noUiChangedByBoundary: true;
  readonly noFrameOrderMoved: true;
  readonly noQuantizeAnchorRewrite: true;
  readonly noQueuePolicyRewrite: true;
  readonly noDirectVsQueuedBranchCollapse: true;
  readonly noResidentSoundNormalization: true;
  readonly noWellenstarterOrRootFollowPolicyOwnedHere: true;
  readonly noStableLanePolicyOwnedHere: true;
};

function resolveResidentTrafficSound(args: {
  eventSoundSelectionId?: string;
  elasticPitchEnabled?: boolean;
  fallbackResidentSound: InstallationResidentSoundPreset;
}) {
  return resolveResidentSoundDefinition(
    (args.eventSoundSelectionId as InstallationResidentSoundPreset | undefined) ?? args.fallbackResidentSound,
    { elasticPitch: !!args.elasticPitchEnabled },
  );
}

export function runAppResidentTrafficBridgeFrameBoundary(
  args: AppResidentTrafficBridgeFrameBoundaryArgs,
): AppResidentTrafficBridgeFrameBoundaryResult {
  const residentFieldFrame = buildMyzelResidentFieldRuntimeFrame({
    active: args.active,
    config: args.config,
    nodes: args.nodes,
    oscillatorBall: args.oscillatorBall,
    sourceWidth: args.sourceWidth,
    sourceHeight: args.sourceHeight,
    targetWidth: args.targetWidth,
    targetHeight: args.targetHeight,
  });

  const residentWaveEvents = collectMyzelResidentFieldRuntimeWaveEvents({
    frame: residentFieldFrame,
    active: args.active,
    config: args.config,
    ripples: args.ripples,
    sectorPulses: args.sectorPulses,
    nowMs: args.nowMs,
    targetFreq: args.targetFreq,
  });

  if (residentWaveEvents.length === 0) {
    return {
      residentEventCount: 0,
      queuedEventCount: 0,
      directEventCount: 0,
      quantized: args.quantizeOn,
    };
  }

  if (args.quantizeOn) {
    const ctx = args.audioCtx;
    if (!ctx) {
      return {
        residentEventCount: residentWaveEvents.length,
        queuedEventCount: 0,
        directEventCount: 0,
        quantized: true,
      };
    }

    const now = getAudioNowSec(ctx);
    const step = getQuantizeStepSeconds(args.gridTempoBpm, args.quantizeGrid, args.quantizeReferenceBars ?? 1);
    const anchor = resolveQuantizeAnchor(args.quantizeAnchorRef.current, now);
    args.quantizeAnchorRef.current = anchor;

    residentWaveEvents.forEach((event) => {
      const residentSound = resolveResidentTrafficSound({
        eventSoundSelectionId: event.soundSelectionId,
        elasticPitchEnabled: event.elasticPitchEnabled,
        fallbackResidentSound: args.config.residentSound,
      });
      const sourceKey = `resident:${event.targetId}:${event.sourceKind}`;
      const schedule = resolveTrafficQuantizeSchedule({
        nowSec: now,
        stepSec: step,
        anchorSec: anchor,
        sourceKey,
        targetKind: 'resident',
      });
      mergeQueuedCollisionTrigger(args.waveCollisionQueueRef.current, {
        dueTime: schedule.dueTime,
        macroDueTime: schedule.macroDueTime,
        sourceKey,
        freq: event.freq * residentSound.collision.freqMul,
        amp: getResidentCollisionOutputAmp(args.config, event.amp, residentSound.collision.ampMul),
        preset: residentSound.collision.preset,
        x: event.x,
        y: event.y,
        waveGain: event.waveGain,
        targetKind: 'resident',
      });
    });

    return {
      residentEventCount: residentWaveEvents.length,
      queuedEventCount: residentWaveEvents.length,
      directEventCount: 0,
      quantized: true,
    };
  }

  residentWaveEvents.forEach((event) => {
    const residentSound = resolveResidentTrafficSound({
      eventSoundSelectionId: event.soundSelectionId,
      elasticPitchEnabled: event.elasticPitchEnabled,
      fallbackResidentSound: args.config.residentSound,
    });
    args.playNexusAgentTone(
      event.freq * residentSound.collision.freqMul,
      getResidentCollisionOutputAmp(args.config, event.amp, residentSound.collision.ampMul),
      args.echoOn && args.delayNode ? args.delayNode : undefined,
      undefined,
      residentSound.collision.preset,
      undefined,
      'resident',
    );
  });

  return {
    residentEventCount: residentWaveEvents.length,
    queuedEventCount: 0,
    directEventCount: residentWaveEvents.length,
    quantized: false,
  };
}
