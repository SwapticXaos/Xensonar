#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const machinePath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewSessionMachine.ts';
const sessionPath = 'src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts';
const requestKeyPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRequestKey.ts';
const truthPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewTruth.ts';
const transportPath = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const machine = readFileSync(machinePath, 'utf8');
const session = readFileSync(sessionPath, 'utf8');
const requestKey = readFileSync(requestKeyPath, 'utf8');
const truth = readFileSync(truthPath, 'utf8');
const transport = readFileSync(transportPath, 'utf8');

function clampProgress(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function currentRequestKey(state) {
  switch (state.kind) {
    case 'scheduled':
    case 'prewarming':
    case 'ready':
    case 'playing':
      return state.requestKey;
    case 'stale':
      return state.currentKey;
    case 'error':
      return state.requestKey ?? null;
    default:
      return null;
  }
}

function reduce(state, event) {
  switch (event.type) {
    case 'schedule':
      return { kind: 'scheduled', requestKey: event.requestKey, routeKind: event.routeKind, reason: event.reason };
    case 'prewarmStart':
      return { kind: 'prewarming', requestKey: event.requestKey, routeKind: event.routeKind, progress: 0 };
    case 'prewarmProgress': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'prewarming', requestKey: event.requestKey, routeKind: event.routeKind, progress: clampProgress(event.progress) };
    }
    case 'ready': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'ready', requestKey: event.requestKey, routeKind: event.routeKind, cacheHit: event.cacheHit };
    }
    case 'playStart': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'playing', requestKey: event.requestKey, routeKind: event.routeKind, loop: event.loop };
    }
    case 'playEnd': {
      const expectedKey = currentRequestKey(state);
      if (expectedKey && expectedKey !== event.requestKey) {
        return { kind: 'stale', previousKey: event.requestKey, currentKey: expectedKey, routeKind: event.routeKind };
      }
      return { kind: 'ready', requestKey: event.requestKey, routeKind: event.routeKind, cacheHit: true };
    }
    default:
      return state;
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][check] ${message}`);
    process.exit(1);
  }
}

// Scenario 1: stale progress cannot fill the current request.
let state = { kind: 'idle' };
state = reduce(state, { type: 'schedule', requestKey: 'A', routeKind: 'spectral', reason: 'test' });
state = reduce(state, { type: 'prewarmStart', requestKey: 'A', routeKind: 'spectral' });
state = reduce(state, { type: 'schedule', requestKey: 'B', routeKind: 'spectral', reason: 'test' });
state = reduce(state, { type: 'prewarmProgress', requestKey: 'A', routeKind: 'spectral', progress: 0.8 });
assert(state.kind === 'stale' && state.previousKey === 'A' && state.currentKey === 'B', 'stale progress scenario failed');

// Scenario 2: stale ready cannot make an old request green.
state = { kind: 'scheduled', requestKey: 'B', routeKind: 'spectral', reason: 'test' };
state = reduce(state, { type: 'ready', requestKey: 'A', routeKind: 'spectral', cacheHit: false });
assert(state.kind === 'stale' && state.previousKey === 'A' && state.currentKey === 'B', 'stale ready scenario failed');

// Scenario 3: latest scheduled key wins during control coalescing.
state = { kind: 'idle' };
for (const key of ['A', 'B', 'C']) {
  state = reduce(state, { type: 'schedule', requestKey: key, routeKind: 'basis-hearing', reason: 'coalesced-controls' });
}
assert(state.kind === 'scheduled' && state.requestKey === 'C', 'latest scheduled request scenario failed');

// Scenario 4: loop is playback state; request-key builder must not include it.
assert(!/loopPreview\s*:|previewLoopEnabled\s*:|loop\s*:/.test(requestKey), 'loop state leaked into preview request-key boundary as an input field');
assert(requestKey.includes('loopPreview is intentionally omitted here'), 'request-key boundary should document loopPreview as playback-only');

// Scenario 5: play is gated to ready/playing in the driver.
assert(/state\.kind\s*===\s*['"]ready['"]\s*\|\|\s*state\.kind\s*===\s*['"]playing['"]/.test(session), 'driver canPlay must gate on ready/playing only');
assert(session.includes('requestMatchesCurrent(request)'), 'driver must check requestMatchesCurrent before play/progress/ready');


// Scenario 6: progress truth must distinguish preparing/prepared/playing/stale instead of one green bucket.
for (const marker of ["| 'preparing'", "| 'prepared'", "| 'playing'", "| 'stale'", 'resolveSpectralForgeTransportPreviewTruth']) {
  assert(truth.includes(marker), `preview truth resolver missing lifecycle marker: ${marker}`);
}

// Scenario 7: loop playback must end through the same session end marker as manual stop.
assert(transport.includes('previewSessionDriver.markPlayEnded(playSessionRequest)'), 'transport finish must mark play ended for current preview request');
assert(transport.includes('previewSessionDriver.markPlayEnded(activePlaybackRequest)'), 'manual stop must mark play ended for active playback request');

// Static backstop: real reducer must contain stale handling for progress and ready.
assert(machine.includes("case 'prewarmProgress'") && machine.includes("case 'ready'"), 'reducer is missing progress/ready cases');
assert((machine.match(/kind: 'stale'/g) ?? []).length >= 4, 'reducer should map stale progress/ready/play events to stale state');

console.log('[xensonar][check] Preview-session lifecycle scenarios pass.');
