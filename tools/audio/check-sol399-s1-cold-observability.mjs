import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const between = (src, start, end) => {
  const a = src.indexOf(start);
  assert(a >= 0, `missing start anchor: ${start}`);
  const b = src.indexOf(end, a + start.length);
  assert(b >= 0, `missing end anchor: ${end}`);
  return src.slice(a, b);
};

const wave = read('src/features/xensonar/browserImplant/useBrowserWaveStarterImplant.ts');
const ent = read('src/features/xensonar/browserImplant/useBrowserEntrophonImplant.ts');
const lane = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');

// Direct implant: ingress rejection stays owned but no per-rejection diagnostic/React work.
const reject = between(wave, 'if (!sent) {', "      const telemetry = liveAttackTelemetryRef.current;\n      telemetry.submittedAttacks");
assert(!reject.includes('recordBrowserImplantDiagnostic'), 'attack-submit-full still creates per-event diagnostic');
assert(!reject.includes('setSnapshot'), 'attack-submit-full still performs per-event React update');
assert(reject.includes('telemetry.failedSubmissions += 1'), 'failed submission counter missing');
assert(reject.includes('telemetry.failedSinceFlush += 1'), 'failed-since-flush counter missing');
assert(reject.includes("telemetry.lastSubmissionOutcome = 'ingress-full'"), 'ordered failure outcome missing');
assert(reject.includes('telemetry.dirty = true'), 'pure rejection burst would not trigger cold flush');
assert(reject.includes('return true'), 'owned rejection no longer blocks Legacy fallback');

const flush = between(wave, 'const timer = window.setInterval', '  const failOwned = useCallback');
assert(flush.includes('failedSubmissions: telemetry.failedSubmissions'), 'cold flush omits failed total');
assert(flush.includes('failedSinceFlush'), 'cold diagnostic omits failed delta');
assert(flush.includes("lastSubmissionOutcome === 'ingress-full'"), 'cold flush does not restore ingress-full state');
assert(flush.includes("lastSubmissionOutcome === 'submitted'"), 'success-after-failure cannot clear cold ingress state');

// Sound/lead invariants remain; Astra 400 maps absolute Context frames in the consumer.
for (const anchor of [
  'const peak = clamp(attack.volume * 0.35, 0.025, 0.12);',
  'const leadFrames = 256;',
  'const ageOffsetFrames = Math.round((requestedAtMs - nowMs) * ctx.sampleRate / 1000);',
  'const targetFrame = host.currentContextFrame() + leadFrames + ageOffsetFrames;',
  'const sent = host.trySubmitTonePlan(record);',
]) assert(wave.includes(anchor), `musical/scheduling anchor changed: ${anchor}`);

// Entrophon: per-submit path only marks cold publication; full host snapshot is off the attack path.
const entSubmit = between(ent, 'export function trySubmitBrowserEntrophonVoice', 'export function useBrowserEntrophonImplant');
assert(!entSubmit.includes('publishRouteSnapshot(ctx, state)'), 'Entrophon submit still builds full route snapshot per event');
assert(!entSubmit.includes('state.updateUi?.'), 'Entrophon submit still updates React directly per event');
assert(entSubmit.includes('scheduleRouteSnapshot(ctx, state)'), 'Entrophon submit does not schedule cold snapshot');
assert(ent.includes('const ROUTE_SNAPSHOT_FLUSH_MS = 900;'), 'Entrophon cold cadence missing');
assert(ent.includes('if (state.failedAfterOwnership)'), 'terminal Entrophon state is not deduplicated');
assert(ent.includes('clearScheduledRouteSnapshot(state);'), 'Entrophon unmount does not clear pending snapshot timer');

// Modern lane reports: hot decisions mark a one-shot cold report; explicit read/dispose remain immediate.
assert(lane.includes('const LIVE_REPORT_FLUSH_MS = 900;'), 'live-report cold cadence missing');
const reportGate = between(lane, 'const publishLiveReportIfAllowed = () => {', '  const gate=');
assert(reportGate.includes('liveReportDirty = true'), 'live report dirty flag missing');
assert(reportGate.includes('if (liveReportTimer !== null) return;'), 'live reports can queue more than one timer');
assert(reportGate.includes('liveReportTimer = setTimer'), 'live report not moved to timer');
assert(lane.includes('clearLiveReportTimer();\n      liveReportDirty = false;\n      gate.dispose();'), 'dispose does not clear cold live-report state');

console.log(JSON.stringify({ pass: true, checks: 27 }, null, 2));
