import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import type { MyzelCentralColorMixer } from '../../resonance/myzelCentralColorMixer';
import type { MyzelInterpreterMix } from '../../resonance/interpreterConfig';
import {
  deriveNodalConstellationFingerprint,
  getNodalDeviceTargetLevel,
  getNodalTargetAggregate,
  type NodalDeviceMatrix,
} from '../../resonance/nodalDeviceMatrix';
import {
  calculateSemanticProfile,
  updateSemanticInteractionDevice,
  type SemanticInteractionEnvelope,
  type SemanticInteractionRefs,
} from '../../resonance/semanticInteractionDevice';
import {
  updateTopologicalResonator,
  type TopologicalResonatorEnvelope,
  type TopologicalResonatorRefs,
} from '../../resonance/topologicalResonanceMatrix';
import {
  DEFAULT_NODAL_MOD_ROUTES,
  deriveNodalModSourceValues,
  evaluateNodalModulationMatrix,
} from '../../resonance/nodalModulationMatrix';

const clamp = (value: number, min = 0, max = 1): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const foldFreqIntoRange = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  let next = value;
  while (next < min) next *= 2;
  while (next > max) next /= 2;
  return clamp(next, min, max);
};

export type Room3NodeDeviceAudioEnvelope = {
  tension: number;
  rawTension: number;
  voidPressure: number;
  splash: number;
};

export const createRoom3NodeDeviceAudioEnvelope = (): Room3NodeDeviceAudioEnvelope => ({
  tension: 0,
  rawTension: 0,
  voidPressure: 0,
  splash: 0,
});

export type Room3NodeDeviceAudioRefs = SemanticInteractionRefs & TopologicalResonatorRefs & {
  myzelCarrierOsc: OscillatorNode | null;
  myzelSubOsc: OscillatorNode | null;
  myzelCarrierGain: GainNode | null;
  myzelSubGain: GainNode | null;
  myzelBodyGain: GainNode | null;
  myzelLowpass: BiquadFilterNode | null;
  myzelPan: StereoPannerNode | null;
  myzelDriveGain: GainNode | null;
  myzelColorPostGain?: GainNode | null;
  myzelMasterGain: GainNode | null;
  myzelAirSend?: GainNode | null;
  myzelAirWetGain?: GainNode | null;
  myzelAirDelay?: DelayNode | null;
  myzelAirFeedback?: GainNode | null;
  myzelAirHighpass?: BiquadFilterNode | null;
  myzelFormantFilters: BiquadFilterNode[];
  myzelFormantGains: GainNode[];
  myzelOvertoneOscs: OscillatorNode[];
  myzelOvertoneGains: GainNode[];
  myzelConstellationFilter: BiquadFilterNode | null;
  myzelConstellationOscs: OscillatorNode[];
  myzelConstellationGains: GainNode[];
};

export type Room3NodeDeviceAudioLayerMod = {
  masterGain: number;
  overtoneRatios: number[];
};

export type UpdateRoom3NodeDeviceAudioFrameArgs = {
  audioCtx: AudioContext;
  refs: Room3NodeDeviceAudioRefs;
  snapshot: MyceliumSnapshot;
  baseHz: number;
  enabled: boolean;
  colorMixer: MyzelCentralColorMixer;
  nodalMatrix: NodalDeviceMatrix;
  nodeDeviceEnvelope: Room3NodeDeviceAudioEnvelope;
  semanticEnvelope: SemanticInteractionEnvelope;
  topologicalEnvelope: TopologicalResonatorEnvelope;
  layerMod: Room3NodeDeviceAudioLayerMod;
  interpreterMix: MyzelInterpreterMix;
  myzelDriveEnabled: boolean;
  gate: number;
  minFreq: number;
  maxFreq: number;
};

export type Room3NodeDeviceAudioTelemetry = {
  fieldSpaceBoost: number;
  colorVoiceVolume: number;
  subDevice: number;
  crushDevice: number;
  resonatorDevice: number;
  vibeDevice: number;
  semanticDevice: number;
  topologicalDevice: number;
};

export function resetRoom3NodeDeviceAudioFrame(
  refs: Room3NodeDeviceAudioRefs,
  envelope: Room3NodeDeviceAudioEnvelope,
  semanticEnvelope: SemanticInteractionEnvelope,
  topologicalEnvelope: TopologicalResonatorEnvelope,
  now: number,
): void {
  envelope.tension = 0;
  envelope.rawTension = 0;
  envelope.voidPressure = 0;
  envelope.splash = 0;
  semanticEnvelope.obs = 0;
  semanticEnvelope.raw = 0;
  topologicalEnvelope.relationEnergy = 0;
  topologicalEnvelope.interference = 0;
  topologicalEnvelope.sparkle = 0;
  refs.myzelMasterGain?.gain.setTargetAtTime(0.0001, now, 0.05);
  refs.myzelConstellationGains.forEach((gain) => gain.gain.setTargetAtTime(0.0001, now, 0.04));
  refs.myzelDriveGain?.gain.setTargetAtTime(1, now, 0.06);
  refs.myzelColorPostGain?.gain.setTargetAtTime(1, now, 0.06);
  refs.myzelAirSend?.gain.setTargetAtTime(0.0001, now, 0.05);
  refs.myzelAirWetGain?.gain.setTargetAtTime(0.0001, now, 0.08);
  refs.myzelAirFeedback?.gain.setTargetAtTime(0.35, now, 0.08);
  refs._semanticDevice?.deviceMaster.gain.setTargetAtTime(0.0001, now, 0.05);
  refs._topologicalResonator?.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
}

export function updateRoom3NodeDeviceAudioFrame(args: UpdateRoom3NodeDeviceAudioFrameArgs): Room3NodeDeviceAudioTelemetry {
  const {
    audioCtx,
    refs,
    snapshot,
    baseHz,
    enabled,
    colorMixer,
    nodalMatrix,
    nodeDeviceEnvelope,
    semanticEnvelope,
    topologicalEnvelope,
    layerMod,
    interpreterMix,
    myzelDriveEnabled,
    gate,
    minFreq,
    maxFreq,
  } = args;
  const now = audioCtx.currentTime;

  if (!enabled) {
    resetRoom3NodeDeviceAudioFrame(refs, nodeDeviceEnvelope, semanticEnvelope, topologicalEnvelope, now);
    return {
      fieldSpaceBoost: 0,
      colorVoiceVolume: 0,
      subDevice: 0,
      crushDevice: 0,
      resonatorDevice: 0,
      vibeDevice: 0,
      semanticDevice: 0,
      topologicalDevice: 0,
    };
  }

  const tension = clamp(snapshot.constellationTension ?? 0, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const centroidX = clamp(snapshot.constellationCentroidX ?? 0.5, 0, 1);
  const centroidY = clamp(snapshot.constellationCentroidY ?? 0.5, 0, 1);
  const relationTension = clamp(snapshot.myzelRelationTension ?? 0, 0, 1);
  const voidPressure = clamp(snapshot.myzelVoidPressure ?? 0, 0, 1);
  const localRoughness = clamp(snapshot.myzelLocalRoughness ?? 0, 0, 1);
  const localBody = clamp(snapshot.myzelLocalBody ?? 0.5, 0, 1);
  const localFormant = clamp(snapshot.myzelLocalFormant ?? 0.5, 0, 1);
  const spatialWavefolder = clamp(snapshot.myzelSpatialWavefolder ?? 0, 0, 1);
  const spatialBitcrusher = clamp(snapshot.myzelSpatialBitcrusher ?? 0, 0, 1);
  const spatialFormant = clamp(snapshot.myzelSpatialFormant ?? 0, 0, 1);
  const spatialShimmer = clamp(snapshot.myzelSpatialShimmer ?? 0, 0, 1);
  const spatialSub = clamp(snapshot.myzelSpatialSub ?? 0, 0, 1);
  const spatialResonator = clamp(snapshot.myzelSpatialResonator ?? 0, 0, 1);
  const spatialGrain = clamp(snapshot.myzelSpatialGrainBlur ?? 0, 0, 1);
  const spatialDrive = clamp(snapshot.myzelSpatialDrive ?? 0, 0, 1);
  const spatialChorus = clamp(snapshot.myzelSpatialChorus ?? 0, 0, 1);
  const spatialTilt = clamp(snapshot.myzelSpatialSpectralTilt ?? 0.5, 0, 1);
  const spatialQ = clamp(snapshot.myzelSpatialQ ?? 0.35, 0, 1);
  const clusterMass = clamp(snapshot.myzelClusterMass ?? 0, 0, 1);
  const gestaltAsymmetry = clamp(snapshot.myzelGestaltAsymmetry ?? 0, 0, 1);
  const gestaltLinearity = clamp(snapshot.myzelGestaltLinearity ?? 0, 0, 1);
  const paletteGlassAir = clamp(snapshot.myzelPaletteGlassAir ?? 0.28, 0, 1);
  const paletteMetalCluster = clamp(snapshot.myzelPaletteMetalCluster ?? 0, 0, 1);
  const paletteReedFormant = clamp(snapshot.myzelPaletteReedFormant ?? 0, 0, 1);
  const paletteUnstableNoise = clamp(snapshot.myzelPaletteUnstableNoise ?? 0, 0, 1);
  const paletteWarmChoir = clamp(snapshot.myzelPaletteWarmChoir ?? 0.72, 0, 1);

  const nodalFingerprint = deriveNodalConstellationFingerprint(snapshot, nodalMatrix);
  const nodalColorTarget = getNodalTargetAggregate(nodalMatrix, 'myzelColorVoice');
  const nodalClusterGlue = getNodalDeviceTargetLevel(nodalMatrix, 'clusterGlue', 'myzelColorVoice');
  const nodalSchwarm = getNodalDeviceTargetLevel(nodalMatrix, 'schwarmdeuter', 'myzelColorVoice');
  const nodalMemory = getNodalDeviceTargetLevel(nodalMatrix, 'memoryFenster', 'myzelColorVoice');
  const nodalSpiral = getNodalDeviceTargetLevel(nodalMatrix, 'psychedelicSpiral', 'myzelColorVoice');
  const nodalMatrixLift = clamp(0.42 + nodalColorTarget * 0.88, 0.08, 1.35);
  const colorVoiceVolume = colorMixer.enabled ? clamp(colorMixer.volume, 0, 1.5) * nodalMatrixLift : 0;
  const colorCarrierMix = colorMixer.enabled ? clamp(colorMixer.carrier, 0, 1) : 0;
  const colorSubMix = colorMixer.enabled ? clamp(colorMixer.sub, 0, 1) * clamp(0.72 + nodalMemory * 0.42 + nodalClusterGlue * 0.18, 0.35, 1.35) : 0;
  const colorFormantMix = colorMixer.enabled ? clamp(colorMixer.formant, 0, 1) * clamp(0.75 + nodalSchwarm * 0.42 + nodalFingerprint.linearity * 0.18, 0.35, 1.35) : 0;
  const colorOvertoneMix = colorMixer.enabled ? clamp(colorMixer.overtone, 0, 1) * clamp(0.68 + nodalClusterGlue * 0.48 + nodalFingerprint.clusterMass * 0.22, 0.32, 1.4) : 0;
  const colorDriveMix = colorMixer.enabled ? clamp(colorMixer.drive, 0, 1) * clamp(0.74 + nodalSchwarm * 0.36 + nodalSpiral * 0.22, 0.32, 1.35) : 0;
  const colorAirMix = colorMixer.enabled ? clamp(colorMixer.air, 0, 1) * clamp(0.72 + nodalMemory * 0.34 + nodalSpiral * 0.3, 0.32, 1.35) : 0;

  const previousRawTension = nodeDeviceEnvelope.rawTension;
  nodeDeviceEnvelope.tension = clamp(lerp(nodeDeviceEnvelope.tension, relationTension, relationTension > nodeDeviceEnvelope.tension ? 0.35 : 0.015), 0, 1);
  nodeDeviceEnvelope.voidPressure = clamp(lerp(nodeDeviceEnvelope.voidPressure, voidPressure, 0.05), 0, 1);
  const tensionRelease = clamp(previousRawTension - relationTension, 0, 1);
  nodeDeviceEnvelope.splash = clamp(Math.max(nodeDeviceEnvelope.splash * 0.92, tensionRelease * 2.5), 0, 1);
  nodeDeviceEnvelope.rawTension = relationTension;
  const tensionEnv = nodeDeviceEnvelope.tension;
  const voidEnv = nodeDeviceEnvelope.voidPressure;
  const releaseSplash = nodeDeviceEnvelope.splash;

  const semanticProfile = updateSemanticInteractionDevice(audioCtx, refs, snapshot, semanticEnvelope, {
    matrix: nodalMatrix,
    target: 'myzelColorVoice',
    baseHz,
    masterGain: layerMod.masterGain,
    colorVoiceVolume,
    enabled: colorMixer.enabled && enabled,
  });
  const topologicalTelemetry = updateTopologicalResonator(audioCtx, refs, snapshot, topologicalEnvelope, {
    matrix: nodalMatrix,
    target: 'myzelColorVoice',
    baseHz,
    colorVoiceVolume,
    enabled: colorMixer.enabled && enabled,
  });
  const nodalModSources = deriveNodalModSourceValues(snapshot, semanticProfile, topologicalTelemetry);
  const nodalModTargets = evaluateNodalModulationMatrix(nodalModSources, DEFAULT_NODAL_MOD_ROUTES);
  const modulationColorLift = clamp(1 + nodalModTargets['colorVoice.volume'], 0.82, 1.32);
  const modulationDriveLift = clamp(nodalModTargets['colorVoice.drive'], 0, 0.28);
  const modulationFormantLift = clamp(nodalModTargets['colorVoice.formantQ'], 0, 0.24);
  const modulationOvertoneLift = clamp(nodalModTargets['colorVoice.overtoneGain'], 0, 0.24);
  const modulationAirLift = clamp(nodalModTargets['airDelay.send'], 0, 0.28);
  const modulationSemanticFmLift = clamp(nodalModTargets['semanticFriction.fmDepth'], 0, 0.3);
  const modulationSemanticRawLift = clamp(nodalModTargets['semanticFriction.rawNoise'], 0, 0.24);
  const modulationTopoInterferenceLift = clamp(nodalModTargets['topologicalResonator.interference'], 0, 0.36);
  const modulationTopoFeedbackLift = clamp(nodalModTargets['topologicalResonator.feedback'], 0, 0.18);
  const modulationMemoryLift = clamp(nodalModTargets['memoryFenster.size'], 0, 0.22);

  const topologicalTarget = getNodalDeviceTargetLevel(nodalMatrix, 'topologicalResonator', 'myzelColorVoice');
  const topologicalRelationEnergy = clamp(topologicalTelemetry.relationEnergy * topologicalTarget + modulationTopoInterferenceLift * 0.45, 0, 1);
  const topologicalInterference = clamp(topologicalTelemetry.primaryInterference * topologicalTarget + modulationTopoInterferenceLift, 0, 1);
  const topologicalSparkle = clamp(topologicalTelemetry.primarySparkle * topologicalTarget + modulationTopoFeedbackLift * 0.55, 0, 1);
  const semanticTarget = getNodalDeviceTargetLevel(nodalMatrix, 'semanticFriction', 'myzelColorVoice');
  const semanticObsession = clamp(semanticProfile.envObsession * semanticTarget + modulationSemanticFmLift * 0.38, 0, 1);
  const semanticRawReality = clamp(semanticProfile.envRaw * semanticTarget + modulationSemanticRawLift * 0.42, 0, 1);
  const semanticSymbiosis = clamp(semanticProfile.symbiosis * semanticTarget + modulationFormantLift * 0.26, 0, 1);
  const semanticStarveDucking = clamp(1 - semanticProfile.peripheryStarve * semanticTarget * 0.42, 0.58, 1);

  const spatialDistortion = clamp(spatialWavefolder * 0.52 + spatialBitcrusher * 0.34 + spatialDrive * 0.44 + spatialGrain * 0.22 + paletteMetalCluster * 0.16 + paletteUnstableNoise * 0.14 + gestaltAsymmetry * 0.08 + tensionEnv * 0.1 + semanticObsession * 0.18 + semanticRawReality * 0.1 + topologicalInterference * 0.2 + modulationDriveLift * 0.24, 0, 1);
  const spatialAir = clamp(spatialShimmer * 0.52 + spatialChorus * 0.28 + Math.max(0, spatialTilt - 0.5) * 0.34 + paletteGlassAir * 0.12 + releaseSplash * 0.48, 0, 1);
  const fieldWavefold = clamp(spatialWavefolder * 0.76 + spatialDrive * 0.28 + paletteMetalCluster * 0.2 + tensionEnv * 0.16, 0, 1);
  const fieldFormant = clamp(spatialFormant * 0.72 + paletteReedFormant * 0.24 + gestaltLinearity * 0.18 + localFormant * 0.12 + semanticSymbiosis * 0.16 + topologicalRelationEnergy * 0.14 + modulationFormantLift * 0.18 - semanticObsession * 0.08, 0, 1);
  const fieldVoidSub = clamp((spatialSub * 0.58 + voidEnv * 0.42 + spatialResonator * 0.18 + clusterMass * 0.1 + semanticRawReality * 0.18 + topologicalRelationEnergy * 0.08 + modulationMemoryLift * 0.08) * (0.35 + colorSubMix * 0.85), 0, 1);
  const fieldRoughnessPressure = clamp(localRoughness * 0.44 + spatialDistortion * 0.38 + paletteUnstableNoise * 0.18 + semanticRawReality * 0.14 + semanticObsession * 0.14 + topologicalInterference * 0.16 + modulationSemanticRawLift * 0.12, 0, 1);
  const fieldDrivePressure = clamp(Math.pow(tensionEnv * 0.6 + fieldRoughnessPressure * 0.32 + semanticObsession * 0.18, 1.5), 0, 1);
  const driveCompensation = clamp(1 - fieldDrivePressure * 0.25 * (0.35 + colorDriveMix * 0.65), 0.72, 1);
  const fieldSpaceBoost = clamp(spatialAir * 0.34 + spatialShimmer * 0.28 + voidEnv * 0.24 + releaseSplash * 0.55 + topologicalSparkle * 0.12 + modulationAirLift * 0.42, 0, 1);
  const constellationBlend = clamp(interpreterMix.constellationBlend, 0, 1);
  const gateLift = clamp(0.45 + gate * 0.55, 0.35, 1);
  const ratios = (snapshot.constellationRatios?.length ? snapshot.constellationRatios : layerMod.overtoneRatios).slice(0, 3);
  const interpreterDrive = myzelDriveEnabled
    ? clamp(
        interpreterMix.driveAmount
          + (tension * 0.28 + flux * 0.42 + brightness * 0.08) * interpreterMix.driveResponse
          + spatialDistortion * 0.24
          + fieldWavefold * 0.2
          + paletteUnstableNoise * 0.08,
        0,
        1,
      )
    : 0;

  const colorBodyPresence = clamp(0.18 + flux * 0.24 + tensionEnv * 0.18 + fieldVoidSub * 0.28 + paletteWarmChoir * 0.12, 0, 1);
  const colorCarrierGain = colorVoiceVolume * modulationColorLift * colorCarrierMix * clamp(0.018 + colorBodyPresence * 0.075 + fieldWavefold * 0.018, 0.0001, 0.16);
  const colorSubGain = colorVoiceVolume * modulationColorLift * colorSubMix * clamp(0.0001 + fieldVoidSub * 0.095 + voidEnv * 0.032, 0.0001, 0.16);
  const colorBodyGain = colorVoiceVolume * modulationColorLift * colorCarrierMix * clamp(0.02 + localBody * 0.05 + fieldVoidSub * 0.045 + clusterMass * 0.018, 0.0001, 0.18);

  refs.myzelCarrierOsc?.frequency.setTargetAtTime(baseHz * (0.985 + localFormant * 0.03 + fieldWavefold * 0.012), now, 0.09);
  refs.myzelSubOsc?.frequency.setTargetAtTime(baseHz / 2, now, 0.12);
  refs.myzelCarrierGain?.gain.setTargetAtTime(colorCarrierGain, now, tensionEnv > 0.18 ? 0.045 : 0.085);
  refs.myzelSubGain?.gain.setTargetAtTime(colorSubGain, now, voidEnv > 0.16 ? 0.11 : 0.18);
  refs.myzelBodyGain?.gain.setTargetAtTime(colorBodyGain, now, 0.12);
  refs.myzelLowpass?.frequency.setTargetAtTime(
    clamp(baseHz * (5.5 + brightness * 8.5 + fieldFormant * 5.2 + spatialAir * 2.2 - fieldVoidSub * 2.4), 180, 6200),
    now,
    releaseSplash > 0.08 || tensionEnv > 0.18 ? 0.045 : 0.11,
  );
  refs.myzelLowpass?.Q.setTargetAtTime(clamp(0.55 + fieldFormant * 3.8 + gestaltLinearity * 2.1 + tensionEnv * 1.4, 0.45, 8.5), now, 0.09);
  refs.myzelFormantFilters.forEach((filter, idx) => {
    const vowelBias = idx === 0 ? 0.76 : idx === 1 ? 1.38 : 2.16;
    const formantHz = clamp(baseHz * (2.2 + vowelBias * 2.7 + fieldFormant * (idx + 1) * 1.7 + paletteReedFormant * 1.8 - fieldVoidSub * 0.55), 240, 4200);
    filter.frequency.setTargetAtTime(formantHz, now, fieldFormant > 0.18 ? 0.055 : 0.12);
    filter.Q.setTargetAtTime(clamp(1.0 + fieldFormant * 8.0 + gestaltLinearity * 4.5 + tensionEnv * 2.2, 0.7, 18), now, 0.08);
  });
  refs.myzelFormantGains.forEach((gain, idx) => {
    const idxBias = idx === 0 ? 0.72 : idx === 1 ? 1.0 : 0.64;
    const target = colorVoiceVolume * colorFormantMix * (1 + modulationFormantLift) * semanticStarveDucking * clamp((0.002 + fieldFormant * 0.036 + paletteReedFormant * 0.018 + releaseSplash * 0.006) * idxBias, 0.0001, 0.09);
    gain.gain.setTargetAtTime(target, now, fieldFormant > 0.18 || releaseSplash > 0.08 ? 0.045 : 0.1);
  });
  refs.myzelOvertoneOscs.forEach((osc, idx) => {
    const ratio = ratios[idx] ?? (1.25 + idx * 0.35);
    const overtoneDetune = ((idx % 2 === 0 ? 1 : -1) * (clusterMass * 9 + paletteMetalCluster * 11 + spatialDistortion * 5));
    osc.frequency.setTargetAtTime(clamp(baseHz * ratio * Math.pow(2, overtoneDetune / 1200), minFreq * 0.75, maxFreq * 8), now, 0.18);
    osc.detune?.setTargetAtTime(overtoneDetune * 0.35, now, 0.22);
  });
  refs.myzelOvertoneGains.forEach((gain, idx) => {
    const idxBias = idx === 0 ? 0.82 : idx === 1 ? 0.68 : 0.52;
    const target = colorVoiceVolume * colorOvertoneMix * (1 + modulationOvertoneLift) * semanticStarveDucking * clamp((0.0015 + clusterMass * 0.012 + flux * 0.01 + fieldSpaceBoost * 0.006 + paletteMetalCluster * 0.006 + semanticSymbiosis * 0.004) * idxBias, 0.0001, 0.045);
    gain.gain.setTargetAtTime(target, now, clusterMass > 0.18 || flux > 0.18 ? 0.07 : 0.14);
  });

  const drivePreGain = myzelDriveEnabled
    ? clamp(
        1
          + (fieldDrivePressure * 3.5 + fieldWavefold * 1.15 + semanticObsession * 0.85 + modulationDriveLift * 1.15) * (0.25 + colorDriveMix * 0.95)
          + interpreterDrive * 4.4
          + constellationBlend * flux * 1.1,
        1,
        9.2,
      )
    : 1;
  refs.myzelDriveGain?.gain.setTargetAtTime(drivePreGain, now, myzelDriveEnabled && (fieldDrivePressure > 0.14 || fieldWavefold > 0.18 || tensionEnv > 0.18) ? 0.018 : 0.052);
  refs.myzelColorPostGain?.gain.setTargetAtTime(driveCompensation, now, fieldDrivePressure > 0.18 ? 0.04 : 0.07);
  refs.myzelMasterGain?.gain.setTargetAtTime(
    Math.max(
      0.0001,
      layerMod.masterGain
        * colorVoiceVolume
        * gateLift
        * (0.92 + constellationBlend * 0.14 + voidEnv * 0.08),
    ),
    now,
    fieldDrivePressure > 0.18 ? 0.05 : 0.09,
  );

  const fieldAirPressure = clamp((fieldSpaceBoost * 0.48 + releaseSplash * 0.38 + spatialShimmer * 0.2 + voidEnv * 0.12 + modulationAirLift * 0.55) * colorAirMix, 0, 1);
  refs.myzelAirSend?.gain.setTargetAtTime(fieldAirPressure * 0.5 * colorVoiceVolume, now, releaseSplash > 0.08 ? 0.045 : 0.095);
  refs.myzelAirWetGain?.gain.setTargetAtTime(
    Math.max(0.0001, layerMod.masterGain * colorVoiceVolume * gateLift * (0.32 + fieldAirPressure * 0.26)),
    now,
    0.12,
  );
  refs.myzelAirFeedback?.gain.setTargetAtTime(
    clamp(0.35 + tensionEnv * 0.16 + spatialShimmer * 0.12 + paletteGlassAir * 0.04, 0.35, 0.72),
    now,
    0.11,
  );
  refs.myzelAirDelay?.delayTime.setTargetAtTime(clamp(0.28 + voidEnv * 0.24 + releaseSplash * 0.1, 0.18, 0.78), now, 0.18);
  refs.myzelAirHighpass?.frequency.setTargetAtTime(clamp(1350 + spatialAir * 520 + releaseSplash * 280 - voidEnv * 170, 900, 2400), now, 0.16);

  refs.myzelConstellationFilter?.frequency.setTargetAtTime(
    foldFreqIntoRange(
      baseHz * (1.42 + brightness * 1.74 + centroidY * 0.38 + fieldFormant * 0.92 + spatialAir * 0.42 + localBody * 0.12 - fieldVoidSub * 0.48 + releaseSplash * 0.74),
      95 + fieldVoidSub * 70,
      5200,
    ),
    now,
    flux > 0.18 || tensionEnv > 0.18 || releaseSplash > 0.08 ? 0.022 : 0.068,
  );
  refs.myzelConstellationFilter?.Q.setTargetAtTime(
    clamp(
      1.1
        + (tension * 3.2 + flux * 1.8 + tensionEnv * 3.4 + fieldDrivePressure * 1.4 + fieldFormant * 2.8 * colorFormantMix + spatialResonator * 1.6 + spatialQ * 1.4 + paletteReedFormant * 2.1 * colorFormantMix + gestaltLinearity * 2.3) * (0.35 + constellationBlend * 0.65)
        - releaseSplash * 0.45,
      0.7,
      15.5,
    ),
    now,
    tensionEnv > 0.22 ? 0.045 : 0.072,
  );
  refs.myzelConstellationOscs.forEach((osc, idx) => {
    const ratio = ratios[idx] ?? (1.25 + idx * 0.35);
    const detuneCents = ((centroidX - 0.5) * (idx === 0 ? 10 : idx === 1 ? 16 : 24))
      + (flux * (idx + 1) * 2.2)
      + (localRoughness * (idx + 1) * 3.8)
      + (spatialDistortion * (idx + 1) * 3.6)
      + (paletteUnstableNoise * (idx + 1) * 2.8)
      + ((localFormant - 0.5) * (idx === 0 ? 1.2 : idx === 1 ? 2.2 : 3.4));
    const targetFreq = clamp(baseHz * ratio * Math.pow(2, detuneCents / 1200), minFreq * 0.75, maxFreq * 8);
    osc.frequency.setTargetAtTime(targetFreq, now, flux > 0.18 || relationTension > 0.18 ? 0.025 : 0.06);
    osc.detune?.setTargetAtTime((idx % 2 === 0 ? 1 : -1) * clusterMass * 12, now, 0.2);
  });
  refs.myzelConstellationGains.forEach((gain, idx) => {
    const idxBias = idx === 0 ? 1 : idx === 1 ? 0.72 : 0.54;
    const target = Math.max(
      0.0001,
      (0.002 + tension * 0.008 + brightness * 0.004 + flux * 0.018 + tensionEnv * 0.016 + releaseSplash * 0.011 + fieldSpaceBoost * 0.006 + spatialDistortion * 0.009 + fieldVoidSub * (idx === 0 ? 0.012 : 0.003) + paletteWarmChoir * 0.002) * idxBias * gateLift * constellationBlend * colorOvertoneMix * driveCompensation,
    );
    gain.gain.setTargetAtTime(target, now, flux > 0.18 || tensionEnv > 0.18 || releaseSplash > 0.08 ? 0.024 : 0.064);
  });

  const fallbackSemantic = calculateSemanticProfile(snapshot, semanticEnvelope);
  return {
    fieldSpaceBoost,
    colorVoiceVolume,
    subDevice: fieldVoidSub,
    crushDevice: spatialDistortion,
    resonatorDevice: Math.max(fieldFormant, topologicalRelationEnergy),
    vibeDevice: fieldAirPressure,
    semanticDevice: semanticProfile.interactionPressure ?? fallbackSemantic.interactionPressure,
    topologicalDevice: topologicalTelemetry.deviceLevel,
  };
}
