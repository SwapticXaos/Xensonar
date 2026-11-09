import { blendHz } from "../../resonance/interpreterConfig";
import {
  DRONE_JI_OVERTONES,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
  GAME_HEIGHT,
  GAME_WIDTH,
  PRESET_MAP,
} from "../domain/instrumentData";
import type { Room3TopologyStateRefs } from "../room3/room3TopologyUiStateTypes";
import type { AppNexusParams } from "./nexusParamsInitialState";
import { clamp } from "./resonanceRuntimeMath";
import type { ResonanceNexusRuntimeRefs } from "./resonanceNexusRuntimeRefs";

export const RESONANCE_NEXUS_DRONE_AUDIO_FRAME_CONTRACT = {
  ownsNoAudioNodeCreation: true,
  ownsNoAudioNodeCleanup: true,
  preservesPerFrameParameterOrder: true,
  preservesJiFrequencyAndGainWrites: true,
  preservesManualJiFrequencyWrites: true,
} as const;

export type ResonanceNexusDroneAudioFrameArgs = {
  readonly ctx: AudioContext;
  state: ResonanceNexusRuntimeRefs;
  params: AppNexusParams;
  t: number;
  readonly osc: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
  readonly myceliumDroneModRef: Room3TopologyStateRefs["myceliumDroneModRef"];
  readonly myzelEnabled: boolean;
  readonly myzelLayerModRef: Room3TopologyStateRefs["myzelLayerModRef"];
  readonly myzelGateRef: Room3TopologyStateRefs["myzelGateRef"];
  readonly room3BodyEnabled: boolean;
  readonly room3TimbreStateRef: Room3TopologyStateRefs["room3TimbreStateRef"];
  readonly droneVolume: number;
};

export function runResonanceNexusDroneAudioFrame(args: ResonanceNexusDroneAudioFrameArgs): number {
  const {
    ctx, state, params: p, t, osc, filter, gain,
    myceliumDroneModRef, myzelEnabled, myzelLayerModRef, myzelGateRef,
    room3BodyEnabled, room3TimbreStateRef, droneVolume,
  } = args;

  const preset = PRESET_MAP[p.dronePreset] ?? PRESET_MAP.warm_pad;
  const tParam = clamp(p.droneTimbre, 0, 1);
  const profileMix = Math.pow(tParam, 1.15);
  const overtoneCents = Math.log2(preset.overtoneRatio) * 1200;
  const myceliumMod = myceliumDroneModRef.current;
  const myzelWeave = myzelEnabled ? myzelLayerModRef.current : null;
  const myzelGate = myzelEnabled ? myzelGateRef.current : 0;
  const room3Timbre = room3BodyEnabled && myzelEnabled ? room3TimbreStateRef.current : null;

  const targetFreq = 55 + (1 - state.cursorY / GAME_HEIGHT) * 385;
  const weaveCutoffMul = myzelWeave
    ? clamp(0.88 + (myzelWeave.lowpassHz / 3200) * 0.28 + myzelGate * 0.12 + myzelWeave.shimmer * 1.5, 0.78, 1.45)
    : 1;
  const weaveGainLift = myzelWeave ? 1 + myzelGate * 0.06 + myzelWeave.shimmer * 0.55 : 1;
  const weaveBaseHz = myzelWeave ? blendHz(targetFreq, myzelWeave.baseHz, clamp(0.08 + myzelGate * 0.12 + myzelWeave.shimmer * 0.22, 0, 0.32), DRONE_MIN_FREQ, DRONE_MAX_FREQ) : targetFreq;
  const bodyCutoffMul = room3Timbre ? clamp(0.92 + room3Timbre.air * 0.16 + room3Timbre.resonanceFocus * 0.14 - room3Timbre.damping * 0.08, 0.82, 1.34) : 1;
  const targetCutoff = (preset.cutoffBase + (state.cursorX / GAME_WIDTH) * preset.cutoffSpan) * (1 + myceliumMod.filterBias) * weaveCutoffMul * bodyCutoffMul;

  state.wobble *= 0.975;
  state.wobblePhase += 0.15 + state.wobble * 0.25;
  const wobbleLFO = Math.sin(state.wobblePhase) * state.wobble;

  const effectiveVibrato = clamp((p.droneVibrato || 0) + myceliumMod.vibratoBias, 0, 1);
  const vibratoRatio = Math.pow(2, (Math.sin(t * 5 * Math.PI * 2) * 50 * effectiveVibrato) / 1200);
  const finalBaseFreq = (weaveBaseHz + wobbleLFO * 4) * vibratoRatio;

  const now = ctx.currentTime;
  const droneHardMuted = droneVolume <= 0.0005;
  if (state.myceliumFormantFilter && state.myceliumFormantGain) {
    state.myceliumFormantFilter.frequency.setTargetAtTime(myceliumMod.formantCenterHz, now, 0.18);
    state.myceliumFormantFilter.Q.setTargetAtTime(myceliumMod.formantQ, now, 0.18);
    state.myceliumFormantGain.gain.setTargetAtTime(droneHardMuted ? 0 : myceliumMod.formantWet, now, droneHardMuted ? 0.025 : 0.18);
  }

  if (osc.type !== preset.oscA) osc.type = preset.oscA;
  if (filter.type !== preset.filterType) filter.type = preset.filterType;

  osc.frequency.setTargetAtTime(finalBaseFreq, now, 0.15);
  filter.frequency.setTargetAtTime(targetCutoff + wobbleLFO * 800, now, 0.15);
  filter.Q.setTargetAtTime(preset.qBase + tParam * preset.qSpan + (room3Timbre?.resonanceFocus ?? 0) * 0.9, now, 0.15);
  gain.gain.setTargetAtTime(droneHardMuted ? 0.0001 : (preset.gainA + tParam * preset.gainASpan + wobbleLFO * 0.015) * weaveGainLift * (1 + (room3Timbre?.bodyMix ?? 0) * 0.06), now, droneHardMuted ? 0.025 : 0.15);

  if (state.oscB && state.gainB) {
    if (state.oscB.type !== preset.oscB) state.oscB.type = preset.oscB;
    state.oscB.frequency.setTargetAtTime(finalBaseFreq, now, 0.15);
    state.oscB.detune.setTargetAtTime(overtoneCents + profileMix * preset.overtoneDriftCents + (room3Timbre?.inharmonicity ?? 0) * 22, now, 0.15);
    state.gainB.gain.setTargetAtTime(droneHardMuted ? 0.0001 : (preset.gainBBase + profileMix * preset.gainBProfile) * (1 + myzelGate * 0.08 + (room3Timbre?.partialGroups.formant ?? 0) * 0.04), now, droneHardMuted ? 0.025 : 0.15);
  }
  if (state.lfo && state.lfoGain) {
    state.lfo.frequency.setTargetAtTime(preset.lfoBase + tParam * preset.lfoSpan, now, 0.15);
    state.lfoGain.gain.setTargetAtTime(2 + tParam * 10, now, 0.15);
  }

  DRONE_JI_OVERTONES.forEach((node) => {
    const o = state.jiOscs[node.label];
    const g = state.jiGains[node.label];
    if (o && g) {
      o.frequency.setTargetAtTime(finalBaseFreq * node.ratio, now, 0.15);
      const vol = p.droneJIOvertones[node.label] || 0;
      g.gain.setTargetAtTime(droneHardMuted ? 0 : vol * 0.015, now, droneHardMuted ? 0.025 : 0.15);
    }
    const mOsc = state.manualJiOscs[node.label];
    if (mOsc) mOsc.frequency.setTargetAtTime(finalBaseFreq * node.ratio, now, 0.15);
  });

  if (state.delayNode && state.delayFeedback) {
    state.delayNode.delayTime.setTargetAtTime(p.echoTempo / 1000, now, 0.1);
    state.delayFeedback.gain.setTargetAtTime(!droneHardMuted && p.echoOn ? clamp(p.echoDecay ?? 0.6, 0, 0.96) : 0, now, droneHardMuted ? 0.025 : 0.1);
  }

  return targetFreq;
}
