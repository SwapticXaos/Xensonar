/**
 * Resonance drone WebAudio graph: build and apply (vision §6 audio engine modules).
 * Single place for drone bus, flanger, and overtone mix; orchestrator calls build then apply.
 * Keeps useResonanceOrchestrator thin and audio domain explicit.
 */

import { clamp } from "../../shared/tuning/grid";
import { DRONE_JI_OVERTONES } from "./config/overtones";
import type { NexusRuntimeRefs } from "./resonanceRefs";

/** Create and connect drone volume bus, group bus, rhythm gain, flanger. Mutates refs. */
export function buildResonanceDroneGraph(
  ctx: AudioContext,
  refs: NexusRuntimeRefs,
  droneVolume: number,
): void {
  if (refs.droneVolumeBus) return;

  const volBus = ctx.createGain();
  volBus.gain.value = clamp(droneVolume, 0, 1);
  refs.droneVolumeBus = volBus;

  const groupBus = ctx.createGain();
  refs.droneGroupBus = groupBus;

  const rhythmBus = ctx.createGain();
  rhythmBus.gain.value = 1.0;
  refs.droneRhythmGain = rhythmBus;

  const flangerDelay = ctx.createDelay(1.0);
  const flangerFeedback = ctx.createGain();
  const flangerLfo = ctx.createOscillator();
  const flangerLfoGain = ctx.createGain();
  const flangerWet = ctx.createGain();

  flangerDelay.delayTime.value = 0.005;
  flangerFeedback.gain.value = 0;
  flangerLfo.type = "sine";
  flangerLfo.frequency.value = 0.25;
  flangerLfoGain.gain.value = 0.003;

  flangerLfo.connect(flangerLfoGain);
  flangerLfoGain.connect(flangerDelay.delayTime);
  flangerDelay.connect(flangerFeedback);
  flangerFeedback.connect(flangerDelay);

  groupBus.connect(rhythmBus);
  rhythmBus.connect(volBus);
  rhythmBus.connect(flangerDelay);
  flangerDelay.connect(flangerWet);
  flangerWet.connect(volBus);
  volBus.connect(ctx.destination);

  flangerLfo.start();

  refs.flangerDelay = flangerDelay;
  refs.flangerFeedback = flangerFeedback;
  refs.flangerLfo = flangerLfo;
  refs.flangerLfoGain = flangerLfoGain;
  refs.flangerWet = flangerWet;
}

/** Route gain, gainB, overtoneMaster, manualJiMaster into drone group bus. */
export function routeOvertoneNodesToGroupBus(refs: NexusRuntimeRefs): void {
  const droneGroupBus = refs.droneGroupBus;
  if (!droneGroupBus) return;
  const route = (node: AudioNode | null) => {
    if (!node) return;
    try {
      node.disconnect();
    } catch {
      // already disconnected
    }
    node.connect(droneGroupBus);
  };
  route(refs.gain);
  route(refs.gainB);
  route(refs.overtoneMaster);
  route(refs.manualJiMaster);
}

export type DroneMixParams = {
  droneVolume: number;
  droneJIOvertones: Record<string, number>;
  droneTimbre: number;
};

/** Apply volume bus gain, manualJiMaster gain, and per-overtone gains. */
export function applyDroneOvertoneMix(
  ctx: AudioContext,
  refs: NexusRuntimeRefs,
  params: DroneMixParams,
  mixOverride?: Record<string, number>,
  timbreOverride?: number,
): void {
  if (!refs.droneVolumeBus) return;
  refs.droneVolumeBus.gain.setTargetAtTime(clamp(params.droneVolume, 0, 1), ctx.currentTime, 0.04);

  const activeMix = mixOverride ?? params.droneJIOvertones;
  const timbre = clamp(timbreOverride ?? params.droneTimbre ?? 0, 0, 1);
  if (refs.manualJiMaster) {
    refs.manualJiMaster.gain.setTargetAtTime(0.28 + timbre * 0.72, ctx.currentTime, 0.06);
  }
  for (const node of DRONE_JI_OVERTONES) {
    const gainNode = refs.manualJiGains[node.label];
    if (!gainNode) continue;
    const slider = clamp(activeMix[node.label] ?? 0, 0, 1);
    const perPartial = slider * (0.008 + 0.07 * timbre);
    gainNode.gain.setTargetAtTime(perPartial, ctx.currentTime, 0.05);
  }
}
