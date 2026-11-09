import type { NexusAgent } from "../domain/runtimeTypes";
import type { ParticleSystem } from "../domain/instrumentData";
import type { ParticleAudioIntentRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import { resolveParticleLoadReductionScale } from "../performanceCrisis/particleCrisisAgencyPolicy";
import { resolveParticleImpactPitch } from "../../soundLibrary/particlePitchRouting";

export type ParticleAudioIntentRuntimeParams = {
  particleSystem: ParticleSystem;
  particleVolume: number;
  agentVolumes: number[];
  agentEnabled: boolean[];
  quantizeOn: boolean;
  particleMute: boolean;
  performancePolicy?: ParticleAudioIntentRuntimePolicy;
};

export type ParticleAudioIntentCandidate = {
  agent: NexusAgent;
  agentIndex: number;
  frameNowMs: number;
  audioTimeSec: number;
  waveGain: number;
  x: number;
  y: number;
  targetFreq: number;
  sourceKind: "ripple" | "sector";
};

export type ParticleToneIntent = {
  playbackFreq: number;
  rootFreq: number;
  volume: number;
  position: { x: number; y: number };
};

export const PARTICLE_AUDIO_INTENT_SHAPER_CONTRACT = {
  /** Below this density every hit remains audible; the shaper only wakes up under real clusters. */
  passThroughCount: 5,
  /** Dense frames still keep a living chord/cloud; this is not a hard austerity cap. */
  denseFrameMaxIntents: 10,
  /** Strong wave hits are favoured, weak duplicated frame hits are the first to become purely visual. */
  strongGainThreshold: 0.68,
  /** A small diversity bonus keeps the shaper from always choosing only one spatial/pitch neighbourhood. */
  diversityBonus: 0.075,
} as const;

const areParticleAudioIntentsMuted = (params: ParticleAudioIntentRuntimeParams): boolean => params.particleMute;
const areDirectParticlesMuted = (params: ParticleAudioIntentRuntimeParams): boolean => params.quantizeOn || params.particleMute;

function candidateScore(candidate: ParticleAudioIntentCandidate, params: ParticleAudioIntentRuntimeParams) {
  const volumeWeight = Math.max(0, params.agentVolumes[candidate.agentIndex] ?? 1);
  const enabledWeight = params.agentEnabled[candidate.agentIndex] === false ? 0 : 1;
  const sourceWeight = candidate.sourceKind === "sector" ? 1.035 : 1;
  const diversityWeight = params.performancePolicy?.preferDiverseImpacts ? 1 + (params.performancePolicy.diversityBonus ?? 0) : 1;
  return enabledWeight * sourceWeight * diversityWeight * Math.pow(Math.max(0, candidate.waveGain), 1.35) * Math.sqrt(Math.max(0.01, volumeWeight));
}

function resolveFrameIntentBudget(candidates: ParticleAudioIntentCandidate[], params: ParticleAudioIntentRuntimeParams) {
  const contract = { ...PARTICLE_AUDIO_INTENT_SHAPER_CONTRACT, ...(params.performancePolicy ?? {}) };
  const audibleCandidates = candidates.filter((candidate) => (
    params.agentEnabled[candidate.agentIndex] !== false
    && candidateScore(candidate, params) > 0
  ));
  if (audibleCandidates.length <= contract.passThroughCount) return audibleCandidates.length;

  const localPressure = Math.max(0, Math.min(1, (audibleCandidates.length - contract.passThroughCount) / Math.max(1, contract.denseFrameMaxIntents + contract.passThroughCount)));
  const loadScale = resolveParticleLoadReductionScale(params.performancePolicy, localPressure, 'audio-intent');
  const applyLoadTaper = (budget: number, minimum = contract.passThroughCount) => Math.min(
    audibleCandidates.length,
    Math.max(Math.max(1, minimum), Math.round(budget * loadScale)),
  );

  if (contract.crisisMode === 'off') return applyLoadTaper(
    Math.min(audibleCandidates.length, Math.max(contract.passThroughCount, contract.denseFrameMaxIntents)),
    contract.passThroughCount,
  );

  const strongCount = audibleCandidates.filter((candidate) => candidate.waveGain >= contract.strongGainThreshold).length;
  const densityAllowance = contract.passThroughCount + Math.floor(Math.sqrt(audibleCandidates.length));
  const strongAllowance = Math.ceil(strongCount * 0.5);
  const smoothReserve = contract.smoothBeforeThin ? Math.min(3, Math.ceil((contract.maxMicroDelayMs ?? 0) / 8)) : 0;
  const liberationReserve = contract.crisisMode === 'quantization-liberation' ? Math.min(3, contract.liberationMaxEventsPerWindow ?? 0) : 0;
  const baseBudget = Math.min(
    audibleCandidates.length,
    Math.max(1, contract.denseFrameMaxIntents),
    Math.max(contract.passThroughCount + 1, densityAllowance + strongAllowance + smoothReserve + liberationReserve),
  );
  const strongReserve = contract.loadReduction?.preserveStrongImpacts ? Math.min(baseBudget, Math.max(contract.passThroughCount, Math.ceil(strongCount * 0.55))) : contract.passThroughCount;
  return applyLoadTaper(baseBudget, strongReserve);
}

export function selectParticleAudioIntentCandidates(args: {
  candidates: ParticleAudioIntentCandidate[];
  params: ParticleAudioIntentRuntimeParams;
}): ParticleAudioIntentCandidate[] {
  const { candidates, params } = args;
  if (areParticleAudioIntentsMuted(params) || candidates.length === 0) return [];

  const budget = resolveFrameIntentBudget(candidates, params);
  if (candidates.length <= budget) return candidates.filter((candidate) => params.agentEnabled[candidate.agentIndex] !== false);

  const chosen: ParticleAudioIntentCandidate[] = [];
  const usedAgents = new Set<number>();
  const sorted = [...candidates]
    .filter((candidate) => params.agentEnabled[candidate.agentIndex] !== false)
    .sort((a, b) => candidateScore(b, params) - candidateScore(a, params));

  // First pass: preserve pitch/agent diversity before allowing duplicate neighbourhoods.
  for (const candidate of sorted) {
    if (chosen.length >= budget) break;
    if (usedAgents.has(candidate.agentIndex)) continue;
    chosen.push(candidate);
    usedAgents.add(candidate.agentIndex);
  }

  // Second pass: fill any remaining room with the next strongest events.
  for (const candidate of sorted) {
    if (chosen.length >= budget) break;
    if (chosen.includes(candidate)) continue;
    chosen.push(candidate);
  }

  return chosen.sort((a, b) => a.agentIndex - b.agentIndex);
}

export function commitParticleAudioIntent(args: {
  candidate: ParticleAudioIntentCandidate;
  params: ParticleAudioIntentRuntimeParams;
  onParticleTone: (tone: ParticleToneIntent) => void;
}) {
  const { candidate, params, onParticleTone } = args;
  const { agent, agentIndex, targetFreq, waveGain } = candidate;
  agent.lastAudioIntentHit = candidate.frameNowMs;
  agent.lastAudioIntentAudioTimeSec = candidate.audioTimeSec;
  agent.lastAudioIntentGain = waveGain;
  agent.lastAudioIntentX = candidate.x;
  agent.lastAudioIntentY = candidate.y;

  if (areDirectParticlesMuted(params)) return;

  const volume = params.particleVolume * (params.agentVolumes[agentIndex] ?? 1) * Math.pow(waveGain, 2.2);
  const impactPitch = resolveParticleImpactPitch({
    rootFreq: targetFreq,
    ratio: agent.ratio,
    minHz: 80,
    maxHz: 2400,
  });

  onParticleTone({
    playbackFreq: impactPitch.playbackFreq,
    rootFreq: impactPitch.rootFreq,
    volume,
    position: { x: candidate.x, y: candidate.y },
  });
}
