import { JI_NODES } from "../xensonar/domain/instrumentData";
import type { SemanticNode } from "../xensonar/domain/runtimeTypes";
import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";

export type MyzelTopologyMode = "enhancer" | "installation";

export type MyzelInstallationMix = {
  rootLevel: number;
  ballLevel: number;
  nodeLevel: number;
  decay: number;
};

export const DEFAULT_MYZEL_INSTALLATION_MIX: MyzelInstallationMix = {
  rootLevel: 0.62,
  ballLevel: 0.34,
  nodeLevel: 0.78,
  decay: 0.72,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const foldFreqIntoRange = (freq: number, min: number, max: number) => {
  let next = freq;
  while (next < min) next *= 2;
  while (next > max) next /= 2;
  return clamp(next, min, max);
};

const ratioByLabel = new Map(JI_NODES.map((node) => [node.label, node.ratio] as const));

export const createInitialMyzelTopologyNodes = (baseFreq: number, width: number, height: number): SemanticNode[] => (
  JI_NODES.map((ji, index) => ({
    x: width * 0.1 + Math.random() * width * 0.8,
    y: height * 0.1 + Math.random() * height * 0.8,
    freq: baseFreq * ji.ratio,
    energy: 0,
    label: ji.label,
    ratio: ji.ratio,
    tuningCents: 0,
    residentId: `resident-${index}-${Math.random().toString(36).slice(2, 7)}`,
    residentSystem: "ji",
    residentMode: "chromatic",
    residentStepIndex: index,
    residentMuted: false,
    isCustomResident: false,
  }))
);

export type MyzelInstallationVoice = {
  osc: OscillatorNode;
  overtoneOsc: OscillatorNode;
  filter: BiquadFilterNode;
  overtoneGain: GainNode;
  gain: GainNode;
  lastIntensity: number;
  lastTriggeredAt: number;
};

export type MyzelInstallationAudioState = {
  master: GainNode | null;
  rootOsc: OscillatorNode | null;
  rootSubOsc: OscillatorNode | null;
  rootFilter: BiquadFilterNode | null;
  rootGain: GainNode | null;
  rootSubGain: GainNode | null;
  ballOsc: OscillatorNode | null;
  ballGain: GainNode | null;
  nodeVoices: Map<string, MyzelInstallationVoice>;
};

export const createMyzelInstallationAudioState = (): MyzelInstallationAudioState => ({
  master: null,
  rootOsc: null,
  rootSubOsc: null,
  rootFilter: null,
  rootGain: null,
  rootSubGain: null,
  ballOsc: null,
  ballGain: null,
  nodeVoices: new Map(),
});

export const ensureMyzelInstallationAudio = (
  ctx: AudioContext,
  state: MyzelInstallationAudioState,
  destination: AudioNode,
) => {
  if (state.master) return state;

  const master = ctx.createGain();
  master.gain.value = 0.0001;

  const rootFilter = ctx.createBiquadFilter();
  rootFilter.type = "lowpass";
  rootFilter.frequency.value = 720;
  rootFilter.Q.value = 0.6;

  const rootOsc = ctx.createOscillator();
  rootOsc.type = "sawtooth";
  const rootGain = ctx.createGain();
  rootGain.gain.value = 0.0001;
  rootOsc.connect(rootGain);
  rootGain.connect(rootFilter);

  const rootSubOsc = ctx.createOscillator();
  rootSubOsc.type = "triangle";
  const rootSubGain = ctx.createGain();
  rootSubGain.gain.value = 0.0001;
  rootSubOsc.connect(rootSubGain);
  rootSubGain.connect(rootFilter);

  const ballOsc = ctx.createOscillator();
  ballOsc.type = "triangle";
  const ballGain = ctx.createGain();
  ballGain.gain.value = 0.0001;
  ballOsc.connect(ballGain);
  ballGain.connect(master);

  rootFilter.connect(master);
  master.connect(destination);

  rootOsc.start();
  rootSubOsc.start();
  ballOsc.start();

  state.master = master;
  state.rootOsc = rootOsc;
  state.rootSubOsc = rootSubOsc;
  state.rootFilter = rootFilter;
  state.rootGain = rootGain;
  state.rootSubGain = rootSubGain;
  state.ballOsc = ballOsc;
  state.ballGain = ballGain;

  return state;
};

const ensureNodeVoice = (
  ctx: AudioContext,
  state: MyzelInstallationAudioState,
  destination: AudioNode,
  id: string,
) => {
  const existing = state.nodeVoices.get(id);
  if (existing) return existing;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const overtoneOsc = ctx.createOscillator();
  overtoneOsc.type = "sine";
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 880;
  filter.Q.value = 4.2;
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.0001;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;

  osc.connect(filter);
  overtoneOsc.connect(overtoneGain);
  overtoneGain.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start();
  overtoneOsc.start();

  const voice: MyzelInstallationVoice = {
    osc,
    overtoneOsc,
    filter,
    overtoneGain,
    gain,
    lastIntensity: 0,
    lastTriggeredAt: -1,
  };
  state.nodeVoices.set(id, voice);
  return voice;
};

export const updateMyzelInstallationAudio = (
  ctx: AudioContext,
  state: MyzelInstallationAudioState,
  options: {
    enabled: boolean;
    mode: MyzelTopologyMode;
    couplingEnabled: boolean;
    rootHz: number;
    nodes: SemanticNode[];
    cursor: { x: number; y: number; vx: number; vy: number };
    snapshot: MyceliumSnapshot;
    mix: MyzelInstallationMix;
  },
) => {
  if (!state.master) return;
  const now = ctx.currentTime;
  const active = options.enabled && options.mode === "installation";
  state.master.gain.setTargetAtTime(active ? 1 : 0.0001, now, active ? 0.08 : 0.18);
  if (!active) {
    state.ballGain?.gain.setTargetAtTime(0.0001, now, 0.16);
    state.rootGain?.gain.setTargetAtTime(0.0001, now, 0.16);
    state.rootSubGain?.gain.setTargetAtTime(0.0001, now, 0.16);
    state.nodeVoices.forEach((voice) => {
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.8);
      voice.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.8);
      voice.lastIntensity = 0;
    });
    return;
  }

  const { rootHz, nodes, cursor, snapshot, mix, couplingEnabled } = options;
  const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
  const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const tension = clamp(snapshot.constellationTension ?? 0, 0, 1);
  const speed = clamp(Math.hypot(cursor.vx, cursor.vy) / 18, 0, 1);

  state.rootOsc?.frequency.setTargetAtTime(rootHz, now, 0.08);
  state.rootSubOsc?.frequency.setTargetAtTime(rootHz / 2, now, 0.08);
  state.rootFilter?.frequency.setTargetAtTime(foldFreqIntoRange(rootHz * (2.4 + brightness * 1.4 + flux * 0.4), 280, 1800), now, 0.12);
  state.rootFilter?.Q.setTargetAtTime(0.55 + tension * 1.15, now, 0.12);
  state.rootGain?.gain.setTargetAtTime(Math.max(0.0001, 0.12 * mix.rootLevel * (0.85 + brightness * 0.25)), now, 0.1);
  state.rootSubGain?.gain.setTargetAtTime(Math.max(0.0001, 0.065 * mix.rootLevel * (0.8 + flux * 0.2)), now, 0.1);

  if (!couplingEnabled) {
    state.ballGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    state.nodeVoices.forEach((voice) => {
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.12);
      voice.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.12);
      voice.lastIntensity = 0;
    });
    return;
  }

  const audibleNodes = nodes.filter((node) => !node.residentMuted);
  let nearestNode: SemanticNode | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const node of (audibleNodes.length ? audibleNodes : nodes)) {
    const dist = Math.hypot(node.x - cursor.x, node.y - cursor.y);
    if (dist < nearestDist) {
      nearestNode = node;
      nearestDist = dist;
    }
  }

  const nearestRatio = nearestNode ? (ratioByLabel.get(nearestNode.label) ?? Math.max(1, nearestNode.freq / Math.max(1, rootHz))) : 1.25;
  const ballFreq = foldFreqIntoRange(rootHz * nearestRatio * Math.pow(2, (speed * 7 - brightness * 2) / 1200), 70, 3200);
  const ballTarget = Math.max(0.0001, 0.055 * mix.ballLevel * (0.6 + (1 - clamp(nearestDist / 180, 0, 1)) * 0.5 + speed * 0.3));
  state.ballOsc?.frequency.setTargetAtTime(ballFreq, now, 0.05);
  state.ballGain?.gain.setTargetAtTime(ballTarget, now, 0.07);

  const proximityRadius = 150;
  const releaseTail = 0.22 + mix.decay * 1.75;
  for (const node of nodes) {
    const ratio = ratioByLabel.get(node.label) ?? Math.max(1, node.freq / Math.max(1, rootHz));
    if (node.residentMuted) {
      const voice = ensureNodeVoice(ctx, state, state.master, node.residentId ?? node.label);
      voice.gain.gain.setTargetAtTime(0.0001, now, 0.12);
      voice.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.12);
      voice.lastIntensity = 0;
      continue;
    }
    const voice = ensureNodeVoice(ctx, state, state.master, node.residentId ?? node.label);
    const distance = Math.hypot(node.x - cursor.x, node.y - cursor.y);
    const proximity = clamp(1 - distance / proximityRadius, 0, 1);
    const energy = clamp(node.energy, 0, 1);
    const opened = Math.pow(proximity, 1.75) * (0.45 + energy * 0.55);
    const sustainTarget = Math.max(0.0001, mix.nodeLevel * (0.013 + opened * 0.08 + energy * 0.022));
    const overtoneTarget = Math.max(0.0001, sustainTarget * (0.3 + brightness * 0.4 + tension * 0.12));
    const freq = foldFreqIntoRange(rootHz * ratio, 90, 3800);

    voice.osc.frequency.setTargetAtTime(freq, now, 0.05);
    voice.overtoneOsc.frequency.setTargetAtTime(freq * (ratio > 1.45 ? 1.5 : 2), now, 0.05);
    voice.filter.frequency.setTargetAtTime(foldFreqIntoRange(freq * (1.1 + brightness * 0.8), 180, 4200), now, 0.07);
    voice.filter.Q.setTargetAtTime(2.8 + energy * 5 + tension * 2.5, now, 0.09);

    const crossedThreshold = opened > 0.56 && voice.lastIntensity <= 0.56;
    if (crossedThreshold && now - voice.lastTriggeredAt > 0.12) {
      voice.lastTriggeredAt = now;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.linearRampToValueAtTime(sustainTarget * (1.2 + speed * 0.25), now + 0.035);
      voice.gain.gain.setTargetAtTime(sustainTarget * 0.78, now + 0.05, releaseTail * 0.4);
      voice.overtoneGain.gain.cancelScheduledValues(now);
      voice.overtoneGain.gain.setValueAtTime(Math.max(0.0001, voice.overtoneGain.gain.value), now);
      voice.overtoneGain.gain.linearRampToValueAtTime(overtoneTarget * (1.1 + brightness * 0.2), now + 0.025);
      voice.overtoneGain.gain.setTargetAtTime(overtoneTarget * 0.72, now + 0.045, releaseTail * 0.45);
    } else if (opened > voice.lastIntensity) {
      voice.gain.gain.setTargetAtTime(sustainTarget, now, 0.08);
      voice.overtoneGain.gain.setTargetAtTime(overtoneTarget, now, 0.08);
    } else {
      voice.gain.gain.setTargetAtTime(sustainTarget, now, releaseTail);
      voice.overtoneGain.gain.setTargetAtTime(overtoneTarget, now, releaseTail * 0.92);
    }

    voice.lastIntensity = opened;
  }
};
