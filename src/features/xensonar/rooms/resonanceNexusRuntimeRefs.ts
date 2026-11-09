import type { AgentImpactRipple, DirectedPulse, NexusAgent, NexusRipple } from "../domain/runtimeTypes";
import type { DroneDriveInsertRefs } from "../../resonance/droneDrive";
import type { SemanticInteractionDevice } from "../../resonance/semanticInteractionDevice";
import type { TopologicalResonatorDevice } from "../../resonance/topologicalResonanceMatrix";

export type CreateResonanceNexusRuntimeRefsOptions = {
  gameWidth: number;
  gameHeight: number;
};

export const createResonanceNexusRuntimeRefs = ({ gameWidth, gameHeight }: CreateResonanceNexusRuntimeRefsOptions) => ({
  cursorX: gameWidth / 2,
  cursorY: gameHeight / 2,
  wobble: 0,
  wobblePhase: 0,
  osc: null as OscillatorNode | null,
  oscB: null as OscillatorNode | null,
  filter: null as BiquadFilterNode | null,
  gain: null as GainNode | null,
  gainB: null as GainNode | null,
  lfo: null as OscillatorNode | null,
  lfoGain: null as GainNode | null,
  delayNode: null as DelayNode | null,
  delayFeedback: null as GainNode | null,
  droneGroupBus: null as GainNode | null,
  droneRhythmGain: null as GainNode | null,
  droneVolumeBus: null as GainNode | null,
  droneDriveRefs: null as DroneDriveInsertRefs | null,
  flangerDelay: null as DelayNode | null,
  flangerFeedback: null as GainNode | null,
  flangerLfo: null as OscillatorNode | null,
  flangerLfoGain: null as GainNode | null,
  flangerWet: null as GainNode | null,
  myceliumFormantFilter: null as BiquadFilterNode | null,
  myceliumFormantGain: null as GainNode | null,
  myzelCarrierOsc: null as OscillatorNode | null,
  myzelSubOsc: null as OscillatorNode | null,
  myzelCarrierGain: null as GainNode | null,
  myzelSubGain: null as GainNode | null,
  myzelBodyGain: null as GainNode | null,
  myzelMasterGain: null as GainNode | null,
  myzelPan: null as StereoPannerNode | null,
  myzelDriveGain: null as GainNode | null,
  myzelDriveShaper: null as WaveShaperNode | null,
  myzelColorPostGain: null as GainNode | null,
  myzelAirSend: null as GainNode | null,
  myzelAirWetGain: null as GainNode | null,
  myzelAirDelay: null as DelayNode | null,
  myzelAirFeedback: null as GainNode | null,
  myzelAirHighpass: null as BiquadFilterNode | null,
  myzelLowpass: null as BiquadFilterNode | null,
  myzelFormantFilters: [] as BiquadFilterNode[],
  myzelFormantGains: [] as GainNode[],
  myzelOvertoneOscs: [] as OscillatorNode[],
  myzelOvertoneGains: [] as GainNode[],
  myzelConstellationFilter: null as BiquadFilterNode | null,
  myzelConstellationOscs: [] as OscillatorNode[],
  myzelConstellationGains: [] as GainNode[],
  room3BodyNoiseSource: null as AudioBufferSourceNode | null,
  room3BodyNoiseGain: null as GainNode | null,
  room3BodyPulseOsc: null as OscillatorNode | null,
  room3BodyPulseGain: null as GainNode | null,
  room3BodyExciterGain: null as GainNode | null,
  room3BodyPreDriveGain: null as GainNode | null,
  room3BodyPreDriveShaper: null as WaveShaperNode | null,
  room3BodyToneBus: null as GainNode | null,
  room3BodyHighpass: null as BiquadFilterNode | null,
  room3BodyLowpass: null as BiquadFilterNode | null,
  room3BodyPostDriveShaper: null as WaveShaperNode | null,
  room3BodyMaster: null as GainNode | null,
  room3BodyModeFilters: [] as BiquadFilterNode[],
  room3BodyModeGains: [] as GainNode[],
  overtoneMaster: null as GainNode | null,
  manualJiMaster: null as GainNode | null,
  manualJiOscs: {} as Record<string, OscillatorNode>,
  manualJiGains: {} as Record<string, GainNode>,
  jiOscs: {} as Record<string, OscillatorNode>,
  jiGains: {} as Record<string, GainNode>,
  ripples: [] as NexusRipple[],
  impactRipples: [] as AgentImpactRipple[],
  agents: [] as NexusAgent[],
  sectorPulses: [] as DirectedPulse[],
  directedPulses: [] as DirectedPulse[],
  nextAbsoluteStep: null as number | null,
  noiseBuffer: null as AudioBuffer | null,
  _semanticDevice: null as SemanticInteractionDevice | null,
  _topologicalResonator: null as TopologicalResonatorDevice | null,
});

export type ResonanceNexusRuntimeRefs = ReturnType<typeof createResonanceNexusRuntimeRefs>;
export type ResonanceNexusRuntimeRefObject = { current: ResonanceNexusRuntimeRefs };

export type ResonanceCursorSnapshot = {
  cursorX: number;
  cursorY: number;
  wobble: number;
  wobblePhase: number;
};

export const readResonanceCursorSnapshot = (
  refs: ResonanceNexusRuntimeRefObject,
): ResonanceCursorSnapshot => ({
  cursorX: refs.current.cursorX,
  cursorY: refs.current.cursorY,
  wobble: refs.current.wobble,
  wobblePhase: refs.current.wobblePhase,
});

export const writeResonanceCursorY = (
  refs: ResonanceNexusRuntimeRefObject,
  cursorY: number,
) => {
  refs.current.cursorY = cursorY;
  return cursorY;
};

export const clearResonanceTransientQueues = (refs: ResonanceNexusRuntimeRefObject) => {
  refs.current.ripples = [];
  refs.current.sectorPulses = [];
  refs.current.directedPulses = [];
  refs.current.impactRipples = [];
  refs.current.nextAbsoluteStep = null;
};
