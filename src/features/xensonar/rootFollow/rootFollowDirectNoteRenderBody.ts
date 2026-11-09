import type {
  InstrumentVoiceDef,
} from '../../l3lab/canonicalForge/canonicalPreviewContracts';
import {
  recordAudioPressureAdaptiveAction,
  recordAudioPressureCount,
} from '../../../core/audio/audioPressureMap';
import {
  isAudioEventValid,
  safeApplyAttack,
  safeApplyExponentialRelease,
} from '../../../core/audio/safeAudioScheduling';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { RootFollowActiveSynthVoice } from './rootFollowRendererTypes';
import {
  activeRootFollowLocalFieldList,
  scheduleRootFollowDynamicFieldGainAutomation,
  scheduleRootFollowLocalPitchDetuneAutomation,
  type RootFollowLocalField,
} from './rootFollowLocalFieldAutomation';
import { registerRootFollowActiveSynthVoice } from './rootFollowActiveVoiceRuntime';
import type { RootFollowAudioNodeRegistrar } from './rootFollowAudioNodeRegistry';

export type RootFollowOscillatorDirectBodyArgs = {
  ctx: AudioContext;
  destination: GainNode;
  registerNode: RootFollowAudioNodeRegistrar;
  compiledGainCurve?: number[] | null;
  compiledPitchSemitones?: number[] | null;
  activeSynthVoices: Map<string, RootFollowActiveSynthVoice>;
  voiceId: string;
  preset: InstrumentVoiceDef;
  noteStart: number;
  noteDuration: number;
  baseFrequency: number;
  targetFrequency: number;
  peak: number;
  attack: number;
  release: number;
  trackPan: number;
  localField?: RootFollowLocalField;
};

export function scheduleRootFollowOscillatorDirectBody(
  args: RootFollowOscillatorDirectBodyArgs,
) {
  const {
    ctx,
    destination,
    registerNode,
    activeSynthVoices,
    voiceId,
    preset,
    noteStart,
    noteDuration,
    baseFrequency,
    targetFrequency,
    peak,
    attack,
    release,
    trackPan,
    localField = null,
  } = args;

  const maxLatenessSec = Math.max(
    0.018,
    Math.min(0.12, noteDuration * 0.42 + attack),
  );
  if (!isAudioEventValid(ctx, noteStart, maxLatenessSec)) {
    recordAudioPressureCount('scheduled-tone-oscillator', 'voice-rejected', 1);
    recordAudioPressureAdaptiveAction('safe-envelope-stale-dropped', 1);
    return;
  }

  const voiceGain = ctx.createGain();
  const dynamicGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const envelope = safeApplyAttack({
    param: voiceGain.gain,
    audioCtx: ctx,
    intendedStartTime: noteStart,
    attackDurationSec: attack,
    peakValue: peak,
  });
  if (envelope.usedCatchUpRamp) {
    recordAudioPressureAdaptiveAction('safe-envelope-catchup-ramped', 1);
  }
  const safeVoiceStart = envelope.safeStartTime;
  const noteEnd = safeVoiceStart + noteDuration;
  const releaseEnd = safeApplyExponentialRelease({
    param: voiceGain.gain,
    audioCtx: ctx,
    releaseStartTime: noteEnd,
    releaseDurationSec: release,
    startValue: peak,
  });
  const stopAt = releaseEnd + 0.03;

  panner.pan.setValueAtTime(clamp(trackPan, -1, 1), safeVoiceStart);
  dynamicGain.gain.setValueAtTime(1, safeVoiceStart);
  scheduleRootFollowDynamicFieldGainAutomation(
    dynamicGain,
    activeRootFollowLocalFieldList(localField, 'dynamic-fade'),
    safeVoiceStart,
    noteDuration,
    stopAt,
  );

  if (args.compiledGainCurve?.length && args.compiledGainCurve.length > 1) {
    dynamicGain.gain.setValueCurveAtTime(Float32Array.from(args.compiledGainCurve), safeVoiceStart, noteDuration);
  }
  let output: AudioNode = voiceGain;
  if (preset.filterType) {
    const filter = ctx.createBiquadFilter();
    filter.type = preset.filterType;
    filter.frequency.setValueAtTime(
      preset.filterFrequency ?? 1200,
      safeVoiceStart,
    );
    filter.Q.setValueAtTime(preset.filterQ ?? 0.7, safeVoiceStart);
    voiceGain.connect(filter);
    output = filter;
    registerNode({
      node: filter,
      cleanupDelayMs: Math.max(300, (stopAt - ctx.currentTime + 0.18) * 1000),
    });
  }

  output.connect(dynamicGain);
  dynamicGain.connect(panner);
  panner.connect(destination);
  const chainCleanupDelayMs = Math.max(
    300,
    (stopAt - ctx.currentTime + 0.18) * 1000,
  );
  registerNode({ node: voiceGain, cleanupDelayMs: chainCleanupDelayMs });
  registerNode({ node: dynamicGain, cleanupDelayMs: chainCleanupDelayMs });
  registerNode({ node: panner, cleanupDelayMs: chainCleanupDelayMs });

  let oscillatorIndex = 0;
  let actualStartedOscillators = 0;
  preset.oscillators.forEach((oscConfig) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const detune = Number.isFinite(oscConfig.detune ?? NaN)
      ? Number(oscConfig.detune)
      : 0;
    const freqMul = Number.isFinite(oscConfig.freqMul ?? NaN)
      ? Math.max(0.125, Number(oscConfig.freqMul))
      : 1;
    const durationMul = Number.isFinite(oscConfig.durationMul ?? NaN)
      ? Math.max(0.1, Number(oscConfig.durationMul))
      : 1;
    const startOffset = Number.isFinite(oscConfig.startOffsetSec ?? NaN)
      ? Math.max(0, Number(oscConfig.startOffsetSec))
      : 0;
    const oscStart = safeVoiceStart + startOffset;
    const oscStop = Math.min(
      stopAt,
      oscStart + Math.max(0.04, noteDuration * durationMul + release),
    );
    const rawOscFrequency =
      targetFrequency * freqMul * Math.pow(2, detune / 1200);
    const oscFrequency = Math.max(20, Math.min(12000, rawOscFrequency));
    const oscBaseFrequency = Math.max(
      20,
      Math.min(12000, baseFrequency * freqMul * Math.pow(2, detune / 1200)),
    );

    osc.type = oscConfig.type;
    osc.frequency.setValueAtTime(oscFrequency, oscStart);
    scheduleRootFollowLocalPitchDetuneAutomation(
      osc.detune,
      localField,
      oscStart,
      Math.max(0.012, oscStop - oscStart),
    );
    if (args.compiledPitchSemitones && args.compiledPitchSemitones.length > 1) {
      osc.detune.setValueCurveAtTime(Float32Array.from(args.compiledPitchSemitones, v => v * 100), oscStart, Math.max(0.012, oscStop - oscStart));
    }
    oscGain.gain.setValueAtTime(Math.max(0.0001, oscConfig.gain), oscStart);

    osc.connect(oscGain);
    oscGain.connect(voiceGain);
    const oscCleanupDelayMs = Math.max(
      300,
      (oscStop - ctx.currentTime + 0.18) * 1000,
    );
    registerNode({ node: osc });
    registerNode({ node: oscGain, cleanupDelayMs: oscCleanupDelayMs });

    const initialRootFollowRatio = clamp(
      targetFrequency / Math.max(1, baseFrequency),
      0.125,
      8,
    );
    registerRootFollowActiveSynthVoice({
      activeSynthVoices,
      id: `${voiceId}:${oscillatorIndex}`,
      endTime: stopAt,
      baseTargetValue: oscBaseFrequency,
      frequencyTargets: [osc.frequency],
      noteStart: oscStart,
      noteEnd: oscStop,
      lastAppliedRatio: initialRootFollowRatio,
    });
    oscillatorIndex += 1;

    osc.start(oscStart);
    osc.stop(oscStop);
    actualStartedOscillators += 1;
  });
  if (actualStartedOscillators > 0) {
    recordAudioPressureCount(
      'scheduled-tone-oscillator',
      'oscillator-start',
      actualStartedOscillators,
    );
  }
}

export { scheduleRootFollowSampleDirectBody } from './rootFollowSampleVoiceRuntime';
export type { RootFollowSampleDirectBodyArgs } from './rootFollowSampleVoiceRuntime';
