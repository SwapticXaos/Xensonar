export type ForgeAudioHandoffTarget = 'legacy' | 'canonical';

export interface ForgeAudioHandoffPayload {
  target: ForgeAudioHandoffTarget;
  name: string;
  fileName: string;
  blob: Blob;
  bars: number;
  bpm: number;
  role: 'loop';
  origin: 'melodic-loop' | 'microto';
}

const queue = new Map<ForgeAudioHandoffTarget, ForgeAudioHandoffPayload>();

export function queueForgeAudioHandoff(payload: ForgeAudioHandoffPayload) {
  queue.set(payload.target, payload);
}

export function consumeForgeAudioHandoff(target: ForgeAudioHandoffTarget) {
  const payload = queue.get(target) ?? null;
  if (payload) queue.delete(target);
  return payload;
}

export function clearForgeAudioHandoff(target: ForgeAudioHandoffTarget) {
  queue.delete(target);
}
