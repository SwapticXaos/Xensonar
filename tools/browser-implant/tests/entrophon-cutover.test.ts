import { playScheduledToneWithLifecycle } from '../../../src/features/xensonar/audio/scheduledTonePlaybackBoundary';
import { resetEntrophonSoundConfig } from '../../../src/core/audio/xensonarMicrotonalSoundEngine';

const must = (cond: unknown, msg: string) => { if (!cond) throw new Error(msg); };
resetEntrophonSoundConfig();

const legacySentinel = new Error('LEGACY_GRAPH_REACHED');

function makeCtx(onLegacy: () => void): AudioContext {
  return {
    currentTime: 1,
    sampleRate: 48000,
    state: 'running',
    createOscillator() { onLegacy(); throw legacySentinel; },
  } as unknown as AudioContext;
}

function makeDeps(args: {
  heldLong: boolean;
  submit: (ctx: AudioContext, plan: any) => any;
  note?: (ctx: AudioContext, reason?: string) => void;
  onLegacy: () => void;
}) {
  return {
    ctx: makeCtx(args.onLegacy),
    activeScheduledTonesRef: { current: [] },
    transientRuntime: {
      admitVoice: () => null,
      pickTargets: (targets: unknown) => targets,
      releaseVoice: () => undefined,
    },
    getMainOutput: () => ({}) as AudioNode,
    heldLong: args.heldLong,
    submitEntrophonC11: args.submit,
    noteEntrophonLegacyFallback: args.note ?? (() => undefined),
  };
}

const request = {
  freq: 220,
  offset: 0,
  dur: 0.18,
  type: 'sawtooth' as OscillatorType,
  volume: 0.2,
  q: 1.1,
  cutoff: 2800,
  options: { source: 'wave' as const, prominence: 1 },
};

// Negative control A: once C11 owns and accepts a normal Entrophon tone,
// Legacy graph construction must be unreachable.
{
  let submitCalls = 0;
  let legacyTouches = 0;
  const originalSetTimeout = globalThis.setTimeout;
  (globalThis as any).setTimeout = ((fn: (...xs: any[]) => void) => { fn(); return 0 as any; }) as typeof setTimeout;
  try {
    const ok = playScheduledToneWithLifecycle(makeDeps({
      heldLong: false,
      onLegacy: () => legacyTouches++,
      submit: () => { submitCalls++; return { owned: true, submitted: true, token: 1, reason: 'submitted' as const }; },
    }), request);
    must(ok === true, 'normal C11 Entrophon should report handled');
    must(submitCalls === 1, `expected one C11 submit, got ${submitCalls}`);
    must(legacyTouches === 0, `Legacy AudioNode constructor reached after C11 ownership (${legacyTouches})`);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
}

// Negative control B: before C11 ownership, a normal Entrophon tone must still
// reach the existing Legacy renderer; otherwise bootstrap would mute the class.
{
  let submitCalls = 0;
  let legacyTouches = 0;
  let reason = '';
  try {
    playScheduledToneWithLifecycle(makeDeps({
      heldLong: false,
      onLegacy: () => legacyTouches++,
      submit: () => { submitCalls++; return { owned: false, submitted: false, token: null, reason: 'not-ready' as const }; },
      note: (_ctx, r) => { reason = r ?? ''; },
    }), request);
    throw new Error('expected Legacy graph sentinel');
  } catch (error) {
    must(error === legacySentinel, `unexpected pre-ready error: ${String(error)}`);
  }
  must(submitCalls === 1, 'pre-ready normal Entrophon must probe the C11 owner once');
  must(legacyTouches === 1, `pre-ready normal Entrophon must enter Legacy exactly once (${legacyTouches})`);
  must(reason === 'pre-ready', `expected pre-ready route reason, got ${reason}`);
}

// Hold/Space is a separate lifecycle-special subclass. It must remain on the
// proven Legacy lifecycle until C11 has an explicit early-release command.
{
  let submitCalls = 0;
  let legacyTouches = 0;
  let reason = '';
  try {
    playScheduledToneWithLifecycle(makeDeps({
      heldLong: true,
      onLegacy: () => legacyTouches++,
      submit: () => { submitCalls++; return { owned: true, submitted: true, token: 2, reason: 'submitted' as const }; },
      note: (_ctx, r) => { reason = r ?? ''; },
    }), request);
    throw new Error('expected held Legacy graph sentinel');
  } catch (error) {
    must(error === legacySentinel, `unexpected held-path error: ${String(error)}`);
  }
  must(submitCalls === 0, `held-special must not submit to C11 without release semantics (${submitCalls})`);
  must(legacyTouches === 1, `held-special must preserve Legacy lifecycle (${legacyTouches})`);
  must(reason === 'held-special-path', `expected held-special route reason, got ${reason}`);
}

console.log(JSON.stringify({
  pass: true,
  c11OwnedSkipsLegacy: true,
  preReadyFallsBackLegacy: true,
  heldSpecialPreservesLegacyLifecycle: true,
}));
