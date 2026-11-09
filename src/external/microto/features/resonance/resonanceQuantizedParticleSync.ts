/**
 * Resonance quantized particle capture helpers.
 * Keeps hit detection in the canonical simulation frame while the queue hook
 * stays responsible only for scheduling/flushing queued audio events.
 */

import { clamp, quantizeStepSeconds, type QuantizeSubdivision } from "../../shared/tuning/grid";
import type { QuantizedParticleSlice } from "./config/stateSlices";
import type { NexusRuntimeRefs, QuantizedParticleEvent } from "./resonanceRefs";

type SyncQuantizedParticleHitsArgs = {
  refs: NexusRuntimeRefs;
  quantized: QuantizedParticleSlice;
  audioTime: number;
  frameNow: number;
  baseFreq: number;
};

export function syncQuantizedParticleHits({
  refs,
  quantized,
  audioTime,
  frameNow,
  baseFreq,
}: SyncQuantizedParticleHitsArgs): void {
  const quantizeEnabled = !!(quantized.quantizeEvents ?? quantized.quantizeOn);
  if (!quantizeEnabled || !refs.gain) {
    refs.quantizedLastHitByAgent = [];
    return;
  }
  /* When quantize is off we do not clear quantizedHitQueue so keyboard-triggered events
   * (triggerKeyboardPitch) persist until useQuantizedParticleQueue flush plays them. */

  const stepDur = quantizeStepSeconds(
    quantized.quantizeBpm ?? 108,
    (quantized.quantizeSubdivision ?? "16") as QuantizeSubdivision,
  );
  const clickLocked = !!quantized.clickSoundOnly;
  const collapseAudible = frameNow < refs.swarmCollapseUntil;
  const agents = refs.agents ?? [];
  const last = refs.quantizedLastHitByAgent;
  const pendingHits: Array<
    QuantizedParticleEvent & { stamp: number; order: number; melodicOffset: number }
  > = [];

  for (let i = 0; i < agents.length; i += 1) {
    const stamp = agents[i]?.lastHit ?? 0;
    if (!Number.isFinite(stamp) || stamp <= 0) continue;
    if (last[i] === stamp) continue;
    last[i] = stamp;

    if (quantized.agentEnabled?.[i] === false) continue;
    if (clickLocked && !collapseAudible) continue;

    const maxSpread = Math.min(stepDur * 0.46, 0.12);
    pendingHits.push({
      stamp,
      order: refs.agentConstellationOrderByIndex[i] ?? i,
      melodicOffset: clamp(refs.agentMelodicOffsetByIndex[i] ?? 0, 0, maxSpread),
      dueTime: 0,
      freq: clamp(baseFreq * (agents[i]?.ratio ?? 1), 40, 4000),
      amp: (quantized.particleVolume ?? 0.3) * (quantized.agentVolumes?.[i] ?? 1),
      preset: quantized.particlePreset ?? "glass_ping",
    });
  }

  if (!pendingHits.length) return;

  pendingHits.sort((a, b) =>
    a.stamp === b.stamp
      ? a.order === b.order
        ? a.freq - b.freq
        : a.order - b.order
      : a.stamp - b.stamp,
  );
  const hitCountsByStamp = new Map<number, number>();
  pendingHits.forEach((hit) => {
    hitCountsByStamp.set(hit.stamp, (hitCountsByStamp.get(hit.stamp) ?? 0) + 1);
  });

  const baseDueTime = Math.ceil(audioTime / stepDur) * stepDur + 0.001;
  const issuedByStamp = new Map<number, number>();

  pendingHits.forEach((hit) => {
    const count = hitCountsByStamp.get(hit.stamp) ?? 1;
    const index = issuedByStamp.get(hit.stamp) ?? 0;
    issuedByStamp.set(hit.stamp, index + 1);
    const maxSpread = Math.min(stepDur * 0.46, 0.12);
    const spreadOffset =
      count <= 1
        ? hit.melodicOffset
        : Math.max(hit.melodicOffset, (maxSpread / (count - 1)) * index);

    refs.quantizedHitQueue.push({
      dueTime: baseDueTime + spreadOffset,
      freq: hit.freq,
      amp: hit.amp,
      preset: hit.preset,
    });
  });
}
