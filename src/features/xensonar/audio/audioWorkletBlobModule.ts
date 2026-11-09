export type AudioWorkletBlobSupportStatus =
  | 'supported'
  | 'blob-url-unavailable'
  | 'audio-worklet-unavailable'
  | 'audio-worklet-node-unavailable';

export function resolveAudioWorkletBlobSupport(ctx: BaseAudioContext): AudioWorkletBlobSupportStatus {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return 'blob-url-unavailable';
  }
  if (!('audioWorklet' in ctx) || !ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function') {
    return 'audio-worklet-unavailable';
  }
  if (typeof AudioWorkletNode === 'undefined') return 'audio-worklet-node-unavailable';
  return 'supported';
}

export function createAudioWorkletBlobModuleUrl(source: string): string {
  const blob = new Blob([source], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

export async function addAudioWorkletBlobModule(ctx: BaseAudioContext, source: string): Promise<void> {
  const url = createAudioWorkletBlobModuleUrl(source);
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}
