import type { MutableRefObject } from 'react';
import { createLiveMasteringSystem, type LiveMasteringSystem } from '../../resonance/liveMastering';
import { resolveLiveMasterEffectOutputRole, type LiveMasterBusRole, type LiveMasterEffectKey } from './liveMasterBusContract';
import { connectAudioGraphNode } from './audioGraphConnectionRegistry';
import { configureMasterChain } from './masteringHelpers';
import type { RecordingSourceMode } from '../domain/runtimeTypes';

export type LiveMasterAudioTapKey = 'pre_fx' | 'post_fx' | 'monitor';
export type { LiveMasterBusRole, LiveMasterEffectKey } from './liveMasterBusContract';

export type LiveMasterBusRuntimeRefs = {
  finalMixBusRef: MutableRefObject<GainNode | null>;
  drumMixBusRef: MutableRefObject<GainNode | null>;
  masterMixBusRef: MutableRefObject<GainNode | null>;
  finalLimiterRef: MutableRefObject<DynamicsCompressorNode | null>;
  finalClipperRef: MutableRefObject<WaveShaperNode | null>;
  finalOutputTrimRef: MutableRefObject<GainNode | null>;
  finalMixAnalyserRef: MutableRefObject<AnalyserNode | null>;
  preFxTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  postFxTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  monitorTapAnalyserRef: MutableRefObject<AnalyserNode | null>;
  audioTapScratchRef: MutableRefObject<Record<LiveMasterAudioTapKey, Uint8Array | null>>;
  liveMasteringRef: MutableRefObject<LiveMasteringSystem | null>;
  noDrumRecordClipperRef: MutableRefObject<WaveShaperNode | null>;
  noDrumRecordLimiterRef: MutableRefObject<DynamicsCompressorNode | null>;
  noDrumRecordOutputRef: MutableRefObject<GainNode | null>;
  recordingDestinationWithDrumsRef: MutableRefObject<MediaStreamAudioDestinationNode | null>;
  recordingDestinationWithoutDrumsRef: MutableRefObject<MediaStreamAudioDestinationNode | null>;
  externalGameRecordingBusRef: MutableRefObject<GainNode | null>;
  externalGameRecordingBusConnectionTargetsRef: MutableRefObject<Set<MediaStreamAudioDestinationNode>>;
};

export function ensureFinalMixBusRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs): GainNode {
  if (!refs.finalMixBusRef.current) {
    const clipper = ctx.createWaveShaper();
    const limiter = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    const analyser = ctx.createAnalyser();
    const preFxTap = ctx.createAnalyser();
    const postFxTap = ctx.createAnalyser();
    const monitorTap = ctx.createAnalyser();
    const liveMaster = createLiveMasteringSystem(ctx);

    configureMasterChain(ctx, clipper, limiter, out);
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.76;
    preFxTap.fftSize = 512;
    preFxTap.smoothingTimeConstant = 0.72;
    postFxTap.fftSize = 512;
    postFxTap.smoothingTimeConstant = 0.72;
    monitorTap.fftSize = 512;
    monitorTap.smoothingTimeConstant = 0.72;

    if (liveMaster.premaster) connectAudioGraphNode(liveMaster.premaster, preFxTap, { label: 'master:preamplifier->pre-fx-tap', subsystem: 'master' });
    if (liveMaster.glue) connectAudioGraphNode(liveMaster.glue, clipper, { label: 'master:glue->clipper', subsystem: 'master' });
    connectAudioGraphNode(clipper, limiter, { label: 'master:clipper->limiter', subsystem: 'master' });
    connectAudioGraphNode(limiter, postFxTap, { label: 'master:limiter->post-fx-tap', subsystem: 'master' });
    connectAudioGraphNode(limiter, out, { label: 'master:limiter->output-trim', subsystem: 'master' });
    connectAudioGraphNode(out, ctx.destination, { label: 'master:output-trim->destination', subsystem: 'master' });
    connectAudioGraphNode(out, analyser, { label: 'master:output-trim->analyser', subsystem: 'diagnostics' });
    connectAudioGraphNode(out, monitorTap, { label: 'master:output-trim->monitor-tap', subsystem: 'diagnostics' });

    refs.audioTapScratchRef.current.pre_fx = new Uint8Array(preFxTap.fftSize);
    refs.audioTapScratchRef.current.post_fx = new Uint8Array(postFxTap.fftSize);
    refs.audioTapScratchRef.current.monitor = new Uint8Array(monitorTap.fftSize);
    refs.preFxTapAnalyserRef.current = preFxTap;
    refs.postFxTapAnalyserRef.current = postFxTap;
    refs.monitorTapAnalyserRef.current = monitorTap;
    refs.finalMixBusRef.current = liveMaster.inputs.main as GainNode;
    refs.drumMixBusRef.current = liveMaster.inputs.rhythm as GainNode;
    refs.masterMixBusRef.current = liveMaster.premaster;
    refs.liveMasteringRef.current = liveMaster;
    refs.finalMixAnalyserRef.current = analyser;
    refs.finalClipperRef.current = clipper;
    refs.finalLimiterRef.current = limiter;
    refs.finalOutputTrimRef.current = out;
  }
  return refs.finalMixBusRef.current as GainNode;
}

export function ensureDrumMixBusRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs): GainNode {
  ensureFinalMixBusRuntime(ctx, refs);
  return refs.drumMixBusRef.current as GainNode;
}

export function getLiveMasterBusRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs, role: LiveMasterBusRole = 'main'): GainNode {
  const ensured = ensureFinalMixBusRuntime(ctx, refs);
  return (refs.liveMasteringRef.current?.inputs[role] ?? ensured) as GainNode;
}

export function getLiveMasterEffectBusRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs, effect: LiveMasterEffectKey): GainNode {
  return getLiveMasterBusRuntime(ctx, refs, resolveLiveMasterEffectOutputRole(effect));
}


function connectExternalGameRecordingBusToDestinations(refs: LiveMasterBusRuntimeRefs): void {
  const bus = refs.externalGameRecordingBusRef.current;
  if (!bus) return;
  const targets = refs.externalGameRecordingBusConnectionTargetsRef.current;
  const connectTarget = (destination: MediaStreamAudioDestinationNode | null) => {
    if (!destination || targets.has(destination)) return;
    connectAudioGraphNode(bus, destination, { label: 'recording:external-game-capture->media-destination', subsystem: 'recording' });
    targets.add(destination);
  };
  connectTarget(refs.recordingDestinationWithDrumsRef.current);
  connectTarget(refs.recordingDestinationWithoutDrumsRef.current);
}

export function ensureExternalGameRecordingCaptureBusRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs): GainNode {
  ensureFinalMixBusRuntime(ctx, refs);
  if (!refs.externalGameRecordingBusRef.current) {
    const bus = ctx.createGain();
    bus.gain.value = 1;
    refs.externalGameRecordingBusRef.current = bus;
  }
  connectExternalGameRecordingBusToDestinations(refs);
  return refs.externalGameRecordingBusRef.current as GainNode;
}

export function ensureNoDrumRecordTapRuntime(ctx: AudioContext, refs: LiveMasterBusRuntimeRefs): GainNode {
  ensureFinalMixBusRuntime(ctx, refs);
  if (!refs.noDrumRecordOutputRef.current) {
    const clipper = ctx.createWaveShaper();
    const limiter = ctx.createDynamicsCompressor();
    const out = ctx.createGain();
    configureMasterChain(ctx, clipper, limiter, out);
    connectAudioGraphNode(refs.liveMasteringRef.current?.musicPremaster ?? refs.finalMixBusRef.current, clipper, { label: 'recording:no-drum-premaster->clipper', subsystem: 'recording' });
    connectAudioGraphNode(clipper, limiter, { label: 'recording:no-drum-clipper->limiter', subsystem: 'recording' });
    connectAudioGraphNode(limiter, out, { label: 'recording:no-drum-limiter->output', subsystem: 'recording' });
    refs.noDrumRecordClipperRef.current = clipper;
    refs.noDrumRecordLimiterRef.current = limiter;
    refs.noDrumRecordOutputRef.current = out;
  }
  return refs.noDrumRecordOutputRef.current as GainNode;
}

export function ensureLiveMasterRecordingDestinationRuntime(
  ctx: AudioContext,
  refs: LiveMasterBusRuntimeRefs,
  mode: RecordingSourceMode,
): MediaStreamAudioDestinationNode | null {
  if (mode === 'without_drums') {
    if (!refs.recordingDestinationWithoutDrumsRef.current) {
      const destination = ctx.createMediaStreamDestination();
      connectAudioGraphNode(ensureNoDrumRecordTapRuntime(ctx, refs), destination, { label: 'recording:no-drum-tap->media-destination', subsystem: 'recording' });
      refs.recordingDestinationWithoutDrumsRef.current = destination;
      connectExternalGameRecordingBusToDestinations(refs);
    }
    return refs.recordingDestinationWithoutDrumsRef.current;
  }

  if (!refs.recordingDestinationWithDrumsRef.current) {
    const destination = ctx.createMediaStreamDestination();
    connectAudioGraphNode(refs.finalOutputTrimRef.current ?? ensureFinalMixBusRuntime(ctx, refs), destination, { label: 'recording:main-output->media-destination', subsystem: 'recording' });
    refs.recordingDestinationWithDrumsRef.current = destination;
    connectExternalGameRecordingBusToDestinations(refs);
  }
  return refs.recordingDestinationWithDrumsRef.current;
}
