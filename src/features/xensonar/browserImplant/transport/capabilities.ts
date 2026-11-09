export type BrowserAudioCapabilities = {
  audioWorklet: boolean;
  webAssembly: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  sabFastPath: boolean;
};
export function detectBrowserAudioCapabilities(ctx: AudioContext): BrowserAudioCapabilities {
  const sab = typeof SharedArrayBuffer !== "undefined";
  const coi = globalThis.crossOriginIsolated === true;
  return {
    audioWorklet: !!ctx.audioWorklet && typeof AudioWorkletNode !== "undefined",
    webAssembly: typeof WebAssembly !== "undefined",
    sharedArrayBuffer: sab,
    crossOriginIsolated: coi,
    sabFastPath: sab && coi,
  };
}
