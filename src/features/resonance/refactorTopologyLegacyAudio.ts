import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";
import { parseJiRatioLabel } from "./weaveMath";
import type { MyzelInstallationMix, MyzelTopologyMode } from "./refactorTopologySupport";

import { clamp, lerp } from "./refactorTopologyNodeAura";
import { deriveRefactorTopologyLegacyAudioFrame } from "./refactorTopologyLegacyAudioFrame";

export type RefactorTopologyLegacyAudioState = {
  nodeOsc: OscillatorNode | null;
  nodeOvertoneOsc: OscillatorNode | null;
  nodeColorOsc: OscillatorNode | null;
  nodeNoiseSource: AudioBufferSourceNode | null;
  nodeHoldGain: GainNode | null;
  nodeAccentGain: GainNode | null;
  nodeColorGain: GainNode | null;
  nodeNoiseGain: GainNode | null;
  nodeDriveGain: GainNode | null;
  nodeDriveShaper: WaveShaperNode | null;
  nodeMasterGain: GainNode | null;
  nodePan: StereoPannerNode | null;
  nodeFilter: BiquadFilterNode | null;
  demoRootOsc: OscillatorNode | null;
  demoRootSubOsc: OscillatorNode | null;
  demoRootGain: GainNode | null;
  demoRootSubGain: GainNode | null;
  demoRootFilter: BiquadFilterNode | null;
  demoRootPan: StereoPannerNode | null;
  demoRootMasterGain: GainNode | null;
  activeNodeLabel: string | null;
  activeNodeKey: string | null;
  activeNodeFreq: number;
  lastAccentAt: number;
  wasActive: boolean;
  activationStartedAt: number;
  relationTensionEnv: number;
  relationTensionRaw: number;
  voidPressureEnv: number;
  tensionReleaseSplash: number;
};

export const createRefactorTopologyLegacyAudioState = (): RefactorTopologyLegacyAudioState => ({
  nodeOsc: null,
  nodeOvertoneOsc: null,
  nodeColorOsc: null,
  nodeNoiseSource: null,
  nodeHoldGain: null,
  nodeAccentGain: null,
  nodeColorGain: null,
  nodeNoiseGain: null,
  nodeDriveGain: null,
  nodeDriveShaper: null,
  nodeMasterGain: null,
  nodePan: null,
  nodeFilter: null,
  demoRootOsc: null,
  demoRootSubOsc: null,
  demoRootGain: null,
  demoRootSubGain: null,
  demoRootFilter: null,
  demoRootPan: null,
  demoRootMasterGain: null,
  activeNodeLabel: null,
  activeNodeKey: null,
  activeNodeFreq: 0,
  lastAccentAt: -Infinity,
  wasActive: false,
  activationStartedAt: -Infinity,
  relationTensionEnv: 0,
  relationTensionRaw: 0,
  voidPressureEnv: 0,
  tensionReleaseSplash: 0,
});

export { ensureRefactorTopologyLegacyAudio } from "./refactorTopologyLegacyAudioGraph";
export const updateRefactorTopologyLegacyAudio = (
  ctx: AudioContext,
  state: RefactorTopologyLegacyAudioState,
  options: {
    enabled: boolean;
    mode: MyzelTopologyMode;
    couplingEnabled: boolean;
    rootHz: number;
    snapshot: MyceliumSnapshot;
    mix: MyzelInstallationMix;
  },
) => {
  const now = ctx.currentTime;
  const { enabled, mode, couplingEnabled, rootHz, snapshot, mix } = options;
  const active = enabled && mode === "installation";

  if (!active) {
    state.wasActive = false;
    state.demoRootMasterGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.demoRootGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.demoRootSubGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeMasterGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeHoldGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeAccentGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeColorGain?.gain.setTargetAtTime(0.0001, now, 0.06);
    state.nodeNoiseGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeDriveGain?.gain.setTargetAtTime(1, now, 0.08);
    state.activeNodeLabel = null;
    state.activeNodeKey = null;
    state.activeNodeFreq = 0;
    state.relationTensionEnv = 0;
    state.relationTensionRaw = 0;
    state.voidPressureEnv = 0;
    state.tensionReleaseSplash = 0;
    return;
  }

  if (!state.wasActive) {
    state.wasActive = true;
    state.activationStartedAt = now;
    state.activeNodeLabel = null;
    state.activeNodeKey = null;
    state.activeNodeFreq = 0;
    state.lastAccentAt = now;
    state.nodeAccentGain?.gain.cancelScheduledValues(now);
    state.nodeAccentGain?.gain.setTargetAtTime(0.0001, now, 0.02);
    state.nodeColorGain?.gain.setTargetAtTime(0.0001, now, 0.03);
    state.nodeNoiseGain?.gain.setTargetAtTime(0.0001, now, 0.03);
    state.nodeDriveGain?.gain.setTargetAtTime(1, now, 0.04);
    state.relationTensionEnv = 0;
    state.relationTensionRaw = 0;
    state.voidPressureEnv = 0;
    state.tensionReleaseSplash = 0;
  }

  const {
    startupRamp,
    bassHz,
    brightness,
    tension,
    flux,
    localRoughness,
    localBrightness,
    localBody,
    localFormant,
    spatialFormant,
    spatialBitcrusher,
    spatialResonator,
    spatialGrain,
    spatialDrive,
    spatialQ,
    gestaltAsymmetry,
    paletteReedFormant,
    paletteUnstableNoise,
    paletteWarmChoir,
    tensionEnv,
    releaseSplash,
    spatialDistortion,
    spatialAir,
    fieldFormant,
    fieldVoidSub,
    centroidPan,
    nodeSignature,
    signaturePresence,
    signatureAir,
    signatureSub,
  } = deriveRefactorTopologyLegacyAudioFrame(now, rootHz, snapshot, state);

  state.demoRootOsc?.frequency.setTargetAtTime(bassHz * (1 + flux * 0.004 + tensionEnv * 0.004 + (nodeSignature.colorRatio - 1.5) * signaturePresence * 0.0022 - fieldVoidSub * 0.002), now, tensionEnv > 0.18 ? 0.055 : 0.085);
  state.demoRootSubOsc?.frequency.setTargetAtTime(bassHz * 0.5 * (1 - fieldVoidSub * 0.012), now, 0.11);
  state.demoRootFilter?.frequency.setTargetAtTime(
    clamp((118 + brightness * 210 + localBrightness * 130 + tensionEnv * 88 + spatialAir * 185 + fieldFormant * 105 - fieldVoidSub * 118 + releaseSplash * 210) * lerp(1, nodeSignature.filterMul, signaturePresence * 0.32) + signatureAir * 115 - signatureSub * 70, 70, 1540),
    now,
    releaseSplash > 0.08 ? 0.055 : 0.105,
  );
  state.demoRootFilter?.Q.setTargetAtTime(clamp(0.24 + tension * 0.36 + tensionEnv * 0.78 + spatialResonator * 0.42 + spatialQ * 0.28 + fieldFormant * 0.52 + paletteReedFormant * 0.34 + nodeSignature.qAdd * signaturePresence * 0.14 - releaseSplash * 0.12, 0.16, 3.3), now, 0.095);
  state.demoRootPan?.pan.setTargetAtTime(clamp(centroidPan * (0.14 + gestaltAsymmetry * 0.28) + (snapshot.cursorNormalizedX - 0.5) * (spatialAir * 0.12 + gestaltAsymmetry * 0.16), -0.72, 0.72), now, 0.13);
  state.demoRootGain?.gain.setTargetAtTime((0.023 + brightness * 0.012 + spatialAir * 0.011 + signatureAir * 0.007 + releaseSplash * 0.008) * clamp(mix.rootLevel * 1.06, 0, 1.08) * startupRamp, now, 0.1);
  state.demoRootSubGain?.gain.setTargetAtTime((0.034 + tension * 0.006 + fieldVoidSub * 0.024 + localBody * 0.004 + signatureSub * 0.016 + paletteWarmChoir * 0.002) * clamp(mix.rootLevel * 1.04, 0, 1.08) * startupRamp, now, 0.11);
  state.demoRootMasterGain?.gain.setTargetAtTime(clamp(0.108 * (0.56 + mix.rootLevel * 0.54 + spatialAir * 0.06 + fieldVoidSub * 0.04) * startupRamp, 0.0001, 0.17), now, 0.1);

  if (!couplingEnabled) {
    state.nodeMasterGain?.gain.setTargetAtTime(0.0001, now, 0.07);
    state.nodeHoldGain?.gain.setTargetAtTime(0.0001, now, 0.07);
    state.nodeAccentGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeColorGain?.gain.setTargetAtTime(0.0001, now, 0.06);
    state.nodeNoiseGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeDriveGain?.gain.setTargetAtTime(1, now, 0.08);
    state.activeNodeLabel = null;
    state.activeNodeKey = null;
    state.activeNodeFreq = 0;
    return;
  }

  const label = snapshot.nearestNodeLabel ?? snapshot.activeNodeLabel;
  const activeKey = snapshot.nearestNodeId ?? snapshot.activeNodeId ?? label;
  if (!label || !activeKey) {
    state.nodeMasterGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeHoldGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeAccentGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeColorGain?.gain.setTargetAtTime(0.0001, now, 0.06);
    state.nodeNoiseGain?.gain.setTargetAtTime(0.0001, now, 0.05);
    state.nodeDriveGain?.gain.setTargetAtTime(1, now, 0.08);
    state.activeNodeLabel = null;
    state.activeNodeKey = null;
    state.activeNodeFreq = 0;
    return;
  }

  const ratio = parseJiRatioLabel(label) ?? 1;
  const explicitFreq = Number.isFinite(snapshot.nearestNodeFreq) && snapshot.nearestNodeFreq > 0
    ? snapshot.nearestNodeFreq
    : Number.isFinite(snapshot.activeNodeFreq) && snapshot.activeNodeFreq > 0
      ? snapshot.activeNodeFreq
      : 0;
  const targetFreq = clamp(explicitFreq > 0 ? explicitFreq : rootHz * ratio, 40, 3200);
  const proximity = 1 - clamp(snapshot.ballToNearestNodeNormDist, 0, 1);
  const nodeEnergy = clamp(snapshot.nearestNodeEnergy ?? snapshot.nodeEnergyByLabel[label] ?? 0, 0, 1);
  const speedNorm = clamp(snapshot.myceliumBallSpeed / 14, 0, 1);
  const nodeAura = clamp(signaturePresence * (0.58 + nodeEnergy * 0.42), 0, 1);
  const nodeSignatureFilterMul = lerp(1, nodeSignature.filterMul, nodeAura * 0.72);
  const nodeSignatureQ = nodeSignature.qAdd * nodeAura;
  const nodeSignatureDrive = clamp(nodeSignature.drive * nodeAura + spatialDistortion * 0.32 + tensionEnv * 0.16 + paletteUnstableNoise * 0.08, 0, 1);
  const nodeDrivePressure = clamp(Math.pow(tensionEnv * 0.58 + nodeSignatureDrive * 0.28 + localRoughness * 0.14, 1.35), 0, 1);
  const nodeDriveCompensation = clamp(1 - nodeDrivePressure * 0.22, 0.74, 1);
  const holdLevel = clamp((0.018 + proximity * 0.145 + nodeEnergy * 0.088 + spatialResonator * 0.018 + spatialFormant * 0.01 + nodeSignature.subBias * nodeAura * 0.018) * (0.35 + mix.nodeLevel * 0.88) * startupRamp, 0.0001, 0.28);
  const masterLevel = clamp((0.038 + proximity * 0.155 + nodeEnergy * 0.082 + tensionEnv * 0.032 + spatialAir * 0.016 + releaseSplash * 0.012) * (0.4 + mix.nodeLevel * 0.82) * startupRamp * nodeDriveCompensation, 0.0001, 0.35);
  const pan = clamp(snapshot.cursorNormalizedX * 2 - 1, -1, 1);
  const formantLift = spatialFormant * (0.18 + localFormant * 0.18);
  const roughDetune = (localRoughness * 6 + spatialDistortion * 7.2 + tensionEnv * 5.4 + paletteUnstableNoise * 3.6) / 1200;

  state.nodeOsc?.frequency.setTargetAtTime(targetFreq * Math.pow(2, roughDetune * 0.24), now, 0.04);
  state.nodeOvertoneOsc?.frequency.setTargetAtTime(targetFreq * (lerp(1.48, nodeSignature.overtoneRatio, nodeAura * 0.86) + speedNorm * 0.15 + mix.ballLevel * 0.1 + spatialDistortion * 0.08 + spatialGrain * 0.04), now, 0.055);
  state.nodeColorOsc?.frequency.setTargetAtTime(
    clamp(targetFreq * lerp(1.25, nodeSignature.colorRatio, nodeAura) * (1 + localRoughness * 0.006 + spatialDistortion * 0.004), 28, 6200),
    now,
    0.055,
  );
  state.nodeColorGain?.gain.setTargetAtTime(
    clamp(nodeSignature.colorGain * nodeAura * (0.35 + mix.nodeLevel * 0.95) * startupRamp, 0.0001, 0.09),
    now,
    0.07,
  );
  state.nodeNoiseGain?.gain.setTargetAtTime(
    clamp((nodeSignature.noiseGain + spatialBitcrusher * 0.006 + spatialGrain * 0.006) * nodeAura * (0.3 + mix.ballLevel * 0.86) * startupRamp, 0.0001, 0.052),
    now,
    0.045,
  );
  state.nodeDriveGain?.gain.setTargetAtTime(
    clamp(1 + nodeDrivePressure * 3.8 + spatialDrive * 1.1, 1, 6.2),
    now,
    nodeDrivePressure > 0.25 ? 0.032 : 0.075,
  );
  state.nodeFilter?.frequency.setTargetAtTime(
    clamp(targetFreq * (1.04 + proximity * 0.28 + localBrightness * 0.22 + formantLift + fieldFormant * 0.2 + spatialAir * 0.16 - fieldVoidSub * 0.18 + releaseSplash * 0.12) * nodeSignatureFilterMul + nodeSignature.airBias * nodeAura * 560 - nodeSignature.subBias * nodeAura * 160, 85, 5600),
    now,
    0.065,
  );
  state.nodeFilter?.Q.setTargetAtTime(
    clamp(2.0 + proximity * 3.8 + nodeEnergy * 1.45 + tensionEnv * 1.85 + fieldFormant * 1.65 + spatialResonator * 1.45 + spatialQ * 0.95 + paletteReedFormant * 1.1 + nodeSignatureQ - releaseSplash * 0.45, 0.65, 15.2),
    now,
    0.075,
  );
  state.nodePan?.pan.setTargetAtTime(clamp(pan + (spatialAir - fieldVoidSub) * 0.06 + gestaltAsymmetry * (pan >= 0 ? 0.09 : -0.09), -0.88, 0.88), now, 0.085);
  state.nodeHoldGain?.gain.setTargetAtTime(holdLevel, now, 0.08 + (1 - mix.decay) * 0.1);
  state.nodeMasterGain?.gain.setTargetAtTime(masterLevel, now, 0.09 + (1 - mix.decay) * 0.1);

  const sameNode = state.activeNodeKey === activeKey;
  const freqDeltaCents = state.activeNodeFreq > 0
    ? Math.abs(1200 * Math.log2(targetFreq / Math.max(1e-6, state.activeNodeFreq)))
    : Number.POSITIVE_INFINITY;
  const accentCooldown = 0.09 + (1 - mix.decay) * 0.08;
  if (startupRamp >= 0.98 && (!sameNode || freqDeltaCents > 35) && now - state.lastAccentAt >= accentCooldown) {
    const accent = clamp((0.07 + speedNorm * 0.08 + nodeEnergy * 0.06 + tensionEnv * 0.045 + releaseSplash * 0.034 + spatialDistortion * 0.026 + nodeSignature.accentBias * nodeAura * 0.03) * (0.28 + mix.ballLevel * 0.74), 0.0001, 0.18);
    state.nodeAccentGain?.gain.cancelScheduledValues(now);
    state.nodeAccentGain?.gain.setValueAtTime(accent, now);
    state.nodeAccentGain?.gain.exponentialRampToValueAtTime(0.0001, now + clamp(0.12 + mix.decay * 0.32, 0.12, 0.46));
    state.lastAccentAt = now;
  }
  state.activeNodeLabel = label;
  state.activeNodeKey = activeKey;
  state.activeNodeFreq = targetFreq;
};
