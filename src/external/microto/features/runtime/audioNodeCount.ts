/**
 * Dev-only audio node counter for DiagnosticsHUD.
 * Helps verify "robust audio scheduling" (vision §5) by tracking node creation.
 *
 * Patches AudioContext create* methods to increment a counter. For OscillatorNode
 * and AudioBufferSourceNode we decrement on "ended" (short-lived nodes). Gain,
 * BiquadFilter, Delay are long-lived (drone graph) so we don't decrement those.
 *
 * Displayed in DiagnosticsHUD when audio is active. No tests (dev-only).
 */

let count = 0;
let uninstall: (() => void) | null = null;

function increment() {
  count += 1;
}

function decrement() {
  if (count > 0) count -= 1;
}

export function getDevNodeCount(): number {
  return count;
}

export function installDevNodeCounter(ctx: AudioContext): () => void {
  if (uninstall) return uninstall;

  const origOsc = ctx.createOscillator.bind(ctx);
  const origGain = ctx.createGain.bind(ctx);
  const origBiquad = ctx.createBiquadFilter.bind(ctx);
  const origDelay = ctx.createDelay.bind(ctx);
  const origBuffer = ctx.createBufferSource?.bind(ctx);

  ctx.createOscillator = function (this: AudioContext) {
    increment();
    const node = origOsc();
    node.addEventListener("ended", () => decrement(), { once: true });
    return node;
  };

  ctx.createGain = function (this: AudioContext) {
    increment();
    return origGain();
  };

  ctx.createBiquadFilter = function (this: AudioContext) {
    increment();
    return origBiquad();
  };

  ctx.createDelay = function (this: AudioContext, maxDelayTime?: number) {
    increment();
    return origDelay(maxDelayTime);
  };

  if (origBuffer) {
    ctx.createBufferSource = function (this: AudioContext) {
      increment();
      const node = origBuffer();
      node.addEventListener("ended", () => decrement(), { once: true });
      return node;
    };
  }

  uninstall = () => {
    ctx.createOscillator = origOsc;
    ctx.createGain = origGain;
    ctx.createBiquadFilter = origBiquad;
    ctx.createDelay = origDelay;
    if (origBuffer) ctx.createBufferSource = origBuffer;
    uninstall = null;
  };

  return uninstall;
}
