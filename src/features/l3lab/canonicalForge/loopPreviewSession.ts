export type LoopPreviewNode = OscillatorNode | GainNode | BiquadFilterNode | StereoPannerNode | AudioBufferSourceNode;

export type ActiveLoopPreviewState = {
  token: number;
  ctx: AudioContext;
  source: AudioBufferSourceNode;
  master: GainNode;
  renderedBuffer: AudioBuffer;
  totalDurationSec: number;
  totalSteps: number;
  stepDurationSec: number;
  startTime: number;
  loopOffsetSec: number;
  playheadCallback: ((stepFloat: number | null) => void) | undefined;
  globalPlayheadCallback: ((ratio: number | null) => void) | undefined;
};

let previewCtx: AudioContext | null = null;
let currentNodes: LoopPreviewNode[] = [];
let playheadFrame: number | null = null;
let currentToken = 0;
let activeLoopPreviewState: ActiveLoopPreviewState | null = null;

export function getLoopPreviewContext(): AudioContext {
  if (!previewCtx) previewCtx = new AudioContext({ sampleRate: 44100 });
  return previewCtx;
}

export function registerLoopPreviewNode(node: LoopPreviewNode) {
  currentNodes.push(node);
}

export function unregisterLoopPreviewNode(node: LoopPreviewNode) {
  currentNodes = currentNodes.filter((entry) => entry !== node);
}

function stopLoopPreviewNodes() {
  currentNodes.forEach((node) => {
    try {
      if ('stop' in node && typeof node.stop === 'function') node.stop();
    } catch {}
    try {
      node.disconnect();
    } catch {}
  });
  currentNodes = [];
}

export function beginLoopPreviewToken() {
  currentToken += 1;
  return currentToken;
}

export function isLoopPreviewTokenCurrent(token: number) {
  return token === currentToken;
}

export function getActiveLoopPreviewState() {
  return activeLoopPreviewState;
}

export function setActiveLoopPreviewState(state: ActiveLoopPreviewState | null) {
  activeLoopPreviewState = state;
}

export function setLoopPreviewPlayheadFrame(frame: number | null) {
  playheadFrame = frame;
}

export function createLoopBufferSource(
  ctx: AudioContext,
  state: ActiveLoopPreviewState,
  offsetSec: number,
  startTime: number,
) {
  const source = ctx.createBufferSource();
  source.buffer = state.renderedBuffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = Math.max(0.05, state.totalDurationSec);
  source.connect(state.master);
  source.start(startTime, offsetSec);
  registerLoopPreviewNode(source);
  return source;
}

export function hasSeekableLoopComposerPreview() {
  return activeLoopPreviewState !== null;
}

export function seekLoopComposerPreviewToStep(targetStep: number) {
  const state = activeLoopPreviewState;
  if (!state) return false;
  const totalSteps = Math.max(1, state.totalSteps);
  const normalizedStep = ((targetStep % totalSteps) + totalSteps) % totalSteps;
  const offsetSec = state.totalDurationSec > 0 ? (normalizedStep / totalSteps) * state.totalDurationSec : 0;
  const now = state.ctx.currentTime;
  const startLeadSec = 0.012;
  const startTime = now + startLeadSec;
  try {
    state.source.stop(now);
  } catch {}
  try {
    state.source.disconnect();
  } catch {}
  unregisterLoopPreviewNode(state.source);
  state.master.gain.cancelScheduledValues(now);
  state.master.gain.setValueAtTime(Math.max(0.0001, state.master.gain.value || 0.82), now);
  state.master.gain.linearRampToValueAtTime(0.0001, now + 0.005);
  state.master.gain.linearRampToValueAtTime(0.82, startTime + 0.012);
  state.source = createLoopBufferSource(state.ctx, state, offsetSec, startTime);
  state.startTime = startTime;
  state.loopOffsetSec = offsetSec;
  state.playheadCallback?.(normalizedStep);
  state.globalPlayheadCallback?.(Math.max(0, Math.min(1, offsetSec / Math.max(0.001, state.totalDurationSec))));
  return true;
}

export function stopLoopComposerPreview() {
  currentToken += 1;
  activeLoopPreviewState = null;
  if (playheadFrame != null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(playheadFrame);
    playheadFrame = null;
  }
  stopLoopPreviewNodes();
}

export function getAudibleLoopPreviewContextTime(ctx: AudioContext) {
  // For the melodic loop playhead we intentionally follow the scheduler clock,
  // not a latency-shifted output estimate. Otherwise the visual marker starts
  // too far ahead before the first manual seek.
  return ctx.currentTime;
}
