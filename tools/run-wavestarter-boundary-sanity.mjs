#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('wavestarter-boundary-sanity');
const { read, readIfExists, requireText, forbidText, requireRegex } = check;

const app = read('src/App.tsx');
const appLines = app.split(/\r?\n/).length;
const sources = {
  app,
  graph: read('src/features/xensonar/audio/waveStarterGradientToneGraph.ts'),
  shape: read('src/features/xensonar/audio/waveStarterGradientToneShape.ts'),
  playback: read('src/features/xensonar/audio/waveStarterGradientTonePlayback.ts'),
  bodyExciterPlan: read('src/features/xensonar/audio/waveStarterBodyExciterPlan.ts'),
  overtonePlan: read('src/features/xensonar/audio/waveStarterOvertonePlaybackPlan.ts'),
  sampleBoundary: read('src/features/xensonar/audio/waveStarterSamplePlaybackBoundary.ts'),
  swellPlan: read('src/features/xensonar/audio/waveStarterSwellReinforcementPlan.ts'),
  fxRouting: read('src/features/xensonar/audio/waveStarterFxRouting.ts'),
  runtime: read('src/features/xensonar/audio/waveStarterLaneRuntime.ts'),
  runtimeBridge: read('src/features/xensonar/audio/waveStarterLaneRuntimeBridge.ts'),
  runtimeGuard: read('src/features/xensonar/audio/waveStarterLaneGuard.ts'),
  runtimePolicy: read('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts'),
  orchestrator: readIfExists('src/features/xensonar/audio/waveStarterHarmonicPlaybackOrchestrator.ts'),
  emitBoundary: readIfExists('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts'),
};
sources.executionHost = sources.orchestrator || sources.app;

const requireTokens = (entries) => {
  for (const [sourceKey, needle, message] of entries) {
    requireText(sourceKey, sources[sourceKey] ?? '', needle, message);
  }
};

const forbidAppTokens = (label, needles) => {
  for (const needle of needles) {
    forbidText(label, sources.app, needle, `${label}: ${needle}`);
  }
};

const cases = {
  'gradient-tone-graph': () => {
    requireTokens([
      ['graph', 'export function createWaveStarterGradientToneGraph', 'gradient tone graph factory missing'],
      ['graph', 'export function disconnectWaveStarterGradientToneGraph', 'gradient tone graph disconnect helper missing'],
      ['graph', 'makeDriveCurve(waveGradient.exciterDrive)', 'exciter drive curve must live in graph boundary'],
      ['graph', 'jawariShaper.curve = makeDriveCurve(waveGradient.jawariDrive)', 'jawari drive curve must live in graph boundary'],
      ['graph', 'osc.connect(dryFilter)', 'dry path wiring must live in graph boundary'],
      ['graph', 'colorExciter.connect(vowel1)', 'color/vowel wiring must live in graph boundary'],
      ['graph', 'finalOut.connect(mainOutput)', 'main output wiring must live in graph boundary'],
      ['shape', 'startAt: args.now', 'render plan must carry startAt for graph boundary'],
      ['playback', 'createWaveStarterGradientToneGraph({', 'gradient playback boundary must use gradient tone graph boundary'],
      ['playback', 'disconnectWaveStarterGradientToneGraph(gradientGraph)', 'gradient playback boundary must use graph disconnect helper'],
    ]);
    forbidAppTokens('App.tsx gradient graph detail still present', [
      'const colorExciter = ctx.createWaveShaper()',
      'const jawariShaper = ctx.createWaveShaper()',
      'colorExciter.curve = makeDriveCurve',
      'jawariShaper.curve = makeDriveCurve',
      'colorExciter.connect(vowel1)',
      'colorExciter.connect(shineHighpass)',
      'finalOut.connect(mainOutput)',
    ]);
    forbidText('App.tsx Wellenstarter imports', sources.app, '  makeDriveCurve,\n', 'App.tsx should not import makeDriveCurve for Wellenstarter gradient graph wiring');
  },
  'gradient-tone-shape': () => {
    requireTokens([
      ['shape', 'export function resolveWaveStarterGradientToneShape', 'gradient tone shape resolver missing'],
      ['shape', 'export function resolveWaveStarterGradientToneRenderPlan', 'gradient tone render plan resolver missing'],
      ['shape', 'useScheduledTonePath: args.waveGradient.amount <= 0.018', 'scheduled-tone threshold must stay in boundary'],
      ['shape', 'jawariPeak', 'jawari peak plan must stay in boundary'],
      ['shape', 'vowel1Peak', 'vowel1 peak plan must stay in boundary'],
      ['shape', 'vowel2Peak', 'vowel2 peak plan must stay in boundary'],
      ['playback', 'resolveWaveStarterGradientToneShape', 'gradient playback boundary must use gradient tone shape boundary'],
      ['playback', 'resolveWaveStarterGradientToneRenderPlan', 'gradient playback boundary must use gradient tone render plan boundary'],
    ]);
    forbidAppTokens('App.tsx gradient tone shaping detail still present', [
      'const noteTilt = Math.pow(clamp(toneFreq / 220, 0.5, 4), 0.08)',
      'const coreLevel = masterLevel * lerp(0.98, 0.78, waveGradient.amount)',
      'Math.max(jawariStart * 1.02, lerp(jawariStart, jawariEnd, 0.58))',
      'Math.max(vowel1Start * 1.02, lerp(vowel1Start, vowel1End, 0.52))',
      'Math.max(vowel2Start * 1.03, lerp(vowel2Start, vowel2End, 0.62))',
    ]);
    forbidText('App.tsx Wellenstarter imports', sources.app, '  lerp,\n', 'App.tsx should not import lerp only for Wellenstarter gradient-tone shaping');
  },
  'gradient-tone-playback': () => {
    requireTokens([
      ['playback', 'export function playWaveStarterGradientTone', 'gradient tone playback boundary missing'],
      ['playback', 'resolveWaveStarterGradientToneShape({', 'playback boundary must own gradient shape resolution'],
      ['playback', 'resolveWaveStarterGradientToneRenderPlan({', 'playback boundary must own render plan resolution'],
      ['playback', 'createWaveStarterGradientToneGraph({', 'playback boundary must own graph factory call'],
      ['playback', 'registerScheduledToneLifecycle({', 'playback boundary must own graph lifecycle registration'],
      ['playback', 'recordHotPathCount("scheduled-tone-oscillator", "voice-rejected", 1)', 'voice rejection counter must stay with playback admission'],
      ['emitBoundary', 'playWaveStarterGradientTone({', 'emit boundary must call gradient playback boundary'],
      ['emitBoundary', 'playScheduledTone: args.playScheduledTone', 'emit boundary must pass the legacy scheduled-tone fallback into playback boundary'],
    ]);
    forbidAppTokens('App.tsx gradient playback detail still present', [
      'resolveWaveStarterGradientToneShape({',
      'resolveWaveStarterGradientToneRenderPlan({',
      'createWaveStarterGradientToneGraph({',
      'disconnectWaveStarterGradientToneGraph(gradientGraph)',
      'let overloadSoftening = 1;\n      let gainScale = 1;\n      let auxTargets: Array<AudioNode | null | undefined> = [...waveTargets];',
    ]);
  },
  'body-exciter-plan': () => {
    requireTokens([
      ['bodyExciterPlan', 'export function resolveWaveStarterBodyExciterPlan', 'body exciter plan resolver missing'],
      ['bodyExciterPlan', 'getWaveBodyExciterProfile(preset)', 'wave body exciter profile lookup must stay in resolver'],
      ['bodyExciterPlan', 'gain: volume * (isSector ? 2.4 : 1.9)', 'body exciter gain scaling must stay in resolver'],
      ['bodyExciterPlan', 'voiceBudget: transientBodyScale >= 0.84 ? 4 : transientBodyScale >= 0.56 ? 2 : 1', 'body voice-budget rule must stay in resolver'],
      ['bodyExciterPlan', 'bodyScale: transientBodyScale * (gradientAmount > 0.1 ? 0.9 : 1)', 'gradient body-scale attenuation must stay in resolver'],
      ['executionHost', 'resolveWaveStarterBodyExciterPlan({', 'body exciter plan boundary must be called from App.tsx or harmonic orchestrator'],
      ['executionHost', 'callbacks.triggerBodyExciter(bodyExciterPlan.profile, bodyExciterPlan.freq, bodyExciterPlan.gain', 'harmonic execution must trigger body exciter from plan'],
      ['emitBoundary', 'playWaveStarterHarmonicPlaybackPlans({', 'emit boundary must delegate harmonic body/overtone/swell execution to orchestrator'],
    ]);
    forbidAppTokens('App.tsx body exciter plan detail still present', [
      'getWaveBodyExciterProfile(resolvedWavePreset)',
      'const bodyVoiceBudget = wavePlan.bodyScale >= 0.84 ? 4 : wavePlan.bodyScale >= 0.56 ? 2 : 1',
      'vol * (isSector ? 2.4 : 1.9)',
      'wavePlan.bodyScale * (waveGradient.amount > 0.1 ? 0.9 : 1)',
    ]);
    forbidText('App.tsx body exciter imports', sources.app, 'getWaveBodyExciterProfile,', 'App.tsx still imports getWaveBodyExciterProfile directly');
  },
  'overtone-playback-plan': () => {
    requireTokens([
      ['overtonePlan', 'export function resolveWaveStarterOvertonePlaybackPlan', 'overtone playback plan resolver missing'],
      ['overtonePlan', 'DRONE_JI_OVERTONES', 'resolver must own JI overtone source list'],
      ['overtonePlan', 'mode === "hybrid" ? strongestFirst.slice(0, 2)', 'hybrid direct-overtone cap must stay in resolver'],
      ['overtonePlan', 'directScalar = mode === "hybrid" ? 0.46 : 1', 'hybrid direct-overtone scalar must stay in resolver'],
      ['overtonePlan', 'overtoneGlobalLevel = clamp(globalLevel, 0, 2.5)', 'overtone global level clamp must stay in resolver'],
      ['executionHost', 'resolveWaveStarterOvertonePlaybackPlan({', 'overtone playback plan boundary must be called from App.tsx or harmonic orchestrator'],
      ['executionHost', 'callbacks.enqueueOvertoneArp(freq, volume, overtonePlan.activeMix, isSector)', 'harmonic execution must keep ARP runtime call fed by plan active mix'],
      ['emitBoundary', 'playWaveStarterHarmonicPlaybackPlans({', 'emit boundary must delegate harmonic overtone execution to orchestrator'],
    ]);
    forbidAppTokens('App.tsx overtone playback plan detail still present', [
      'const activeMix = DRONE_JI_OVERTONES\n        .map((node) => ({ node, amount: clamp(nexusParamsRef.current.waveOvertones[node.label] ?? 0, 0, 1) }))',
      'const strongestFirst = [...activeMix].sort((a, b) => b.amount - a.amount || a.node.ratio - b.node.ratio)',
      'const directMix = overtoneMode === "hybrid" ? strongestFirst.slice(0, 2) : strongestFirst',
      'const normalizer = directMix.length > 0 ? 1 / Math.sqrt(directMix.length) : 1',
      'const directScalar = overtoneMode === "hybrid" ? 0.46 : 1',
      'const overtoneGlobalLevel = clamp(nexusParamsRef.current.waveOvertoneGlobalLevel ?? 1, 0, 2.5)',
    ]);
  },
  'sample-playback': () => {
    requireTokens([
      ['sampleBoundary', 'export function isWaveStarterSampleSelection', 'sample type guard missing'],
      ['sampleBoundary', 'export function playWaveStarterSampleSelection', 'sample playback boundary function missing'],
      ['sampleBoundary', 'playWaveStarterSample({', 'boundary must delegate to existing sample playback implementation'],
      ['sampleBoundary', 'sampleId: args.selection.sampleId', 'boundary must own sampleId extraction'],
      ['emitBoundary', 'isWaveStarterSampleSelection(resolvedWaveSelection)', 'emit boundary must use the sample selection guard'],
      ['emitBoundary', 'playWaveStarterSampleSelection({', 'emit boundary must call the sample playback boundary'],
    ]);
    forbidAppTokens('App.tsx sample playback detail still present', ['playWaveStarterSample({', 'sampleId: resolvedWaveSelection.sampleId']);
    forbidText('App.tsx sample playback imports', sources.app, 'from "./features/soundLibrary/waveStarterSamplePlayback"', 'App.tsx still imports the raw wave-starter sample playback implementation');
  },
  'swell-reinforcement-plan': () => {
    requireTokens([
      ['swellPlan', 'export function resolveWaveStarterSwellReinforcementPlan', 'swell reinforcement plan resolver missing'],
      ['swellPlan', 'if (swellBlend <= 0.02) return null', 'swell threshold must stay in resolver'],
      ['swellPlan', "preset === 'clean_pluck' || preset === 'reed_sigh'", 'reinforcement waveform preset rule must stay in resolver'],
      ['swellPlan', 'toneFreq: baseFreq * 2', 'reinforcement octave-frequency rule must stay in resolver'],
      ['swellPlan', 'duration: 0.2 + swellBlend * 0.14', 'reinforcement duration rule must stay in resolver'],
      ['swellPlan', 'gain: runtimeVolume * (0.12 + swellBlend * 0.3) * (isSector ? 1.08 : 1)', 'reinforcement gain rule must stay in resolver'],
      ['swellPlan', 'cutoffHz: 1600 + swellBlend * 1800', 'reinforcement cutoff rule must stay in resolver'],
      ['executionHost', 'resolveWaveStarterSwellReinforcementPlan({', 'swell reinforcement plan boundary must be called from App.tsx or harmonic orchestrator'],
      ['executionHost', 'playTone(swellReinforcement)', 'harmonic execution must render returned swell reinforcement tone through the admitted-tone counter'],
      ['emitBoundary', 'playWaveStarterHarmonicPlaybackPlans({', 'emit boundary must delegate harmonic swell execution to orchestrator'],
    ]);
    forbidAppTokens('App.tsx swell reinforcement detail still present', [
      'const swellBlend = waveSoundSwellRef.current;\n    if (swellBlend > 0.02)',
      'const reinforcementFreq = freq * 2',
      'const reinforcementWave: OscillatorType = resolvedWavePreset === "clean_pluck"',
      '0.2 + swellBlend * 0.14',
      'runtime.volume * (0.12 + swellBlend * 0.3) * (isSector ? 1.08 : 1)',
      '1600 + swellBlend * 1800',
      '0.44 + swellBlend * 0.18',
    ]);
  },
  'fx-routing': () => {
    requireTokens([
      ['fxRouting', 'export function ensureWaveStarterFxRoutes', 'FX route ensure boundary missing'],
      ['fxRouting', 'export function buildWaveStarterAuxTargets', 'FX aux target boundary missing'],
      ['fxRouting', 'args.ensureCollectiveMemoryFx(args.ctx)', 'collective memory route must be ensured by boundary'],
      ['fxRouting', 'args.ensurePsychedelicSpiralDevice(args.ctx)', 'psychedelic spiral route must be ensured by boundary'],
      ['fxRouting', 'args.enterHoldPsyFxEnabled && args.enterHoldActive ? args.enterHoldPsyFxWaves : null', 'enter-hold conditional routing must stay in boundary'],
      ['emitBoundary', 'ensureWaveStarterFxRoutes({', 'emit boundary must call the FX route ensure boundary'],
      ['emitBoundary', 'buildWaveStarterAuxTargets({', 'emit boundary must call the FX aux target boundary'],
    ]);
    forbidAppTokens('App.tsx FX routing fragment still present', [
      'if (!essentialWaveOnly) {\n      ensureCollectiveMemoryFx(ctx);',
      'const waveTargets = essentialWaveOnly ? [] : [',
      'enterHoldPsyFxEnabled && enterHoldRef.current ? enterHoldPsyFxSendsRef.current.waves : null',
    ]);
  },
  'runtime-boundary': () => {
    check.require(!sources.runtime.includes('enqueueDeferredAttack') && !sources.runtime.includes('resolveWaveStarterMicroRelease'), 'special runtime must not replay or soften old attacks');
    requireTokens([
      ['runtime', 'createWaveStarterLaneRuntime', 'runtime: missing createWaveStarterLaneRuntime'],
      ['runtime', 'createWaveStarterDirectSafeLane', 'runtime: missing immediate shared gate'],
      ['runtime', 'getPolicy', 'runtime: missing getPolicy'],
      ['runtime', 'wave-starter-lane-stale-dropped', 'runtime: missing stale dropped label'],
      ['runtime', 'wave-starter-lane-admitted', 'runtime: missing admitted label'],
      ['runtimeGuard', 'policy?: WaveStarterRuntimePolicy', 'guard: missing WaveStarterRuntimePolicy option'],
      ['runtimePolicy', 'WaveStarterRuntimePolicy', 'policy: missing WaveStarterRuntimePolicy'],
      ['runtimeBridge', 'createWaveStarterLaneRuntime', 'bridge: missing createWaveStarterLaneRuntime'],
      ['runtimeBridge', 'requestWaveStarterLaneAttack', 'bridge: missing requestWaveStarterLaneAttack'],
      ['runtimeBridge', 'disposeWaveStarterLaneRuntimeRef', 'bridge: missing disposeWaveStarterLaneRuntimeRef'],
      ['app', 'waveStarterLaneRuntimeRef', 'App.tsx: missing waveStarterLaneRuntimeRef'],
      ['app', 'requestWaveStarterLaneAttack', 'App.tsx: missing requestWaveStarterLaneAttack'],
      ['app', 'performanceCrisisRuntimePolicy.waveStarter', 'App.tsx: missing performanceCrisisRuntimePolicy.waveStarter'],
      ['app', 'emitWaveStartSound', 'App.tsx: missing emitWaveStartSound'],
    ]);
    forbidAppTokens('App.tsx forbidden legacy Wellenstarter runtime text still present', [
      'createWaveStarterLaneRuntime',
      'createWaveStarterLaneState',
      'resolveWaveStarterLaneAdmission',
      'commitWaveStarterLaneAdmission',
      'waveStarterDeferredAttacksRef',
      'waveStarterDeferredTimerRef',
      'WAVE_STARTER_DEFER_FORCE_DROP_MS',
      'enqueueWaveStarterDeferredAttack',
      'flushWaveStarterDeferredAttacks',
    ]);
    check.require(appLines < 7765, `App.tsx line count ${appLines} is not below 6.8.7 threshold 7765`);
    requireRegex('App.tsx old inline Wellenstarter admission/deferred block absence', sources.app, /^(?![\s\S]*const\s+waveLaneAdmission\s*=\s*resolveWaveStarterLaneAdmission[\s\S]{0,900}?enqueueWaveStarterDeferredAttack)/, 'App.tsx still contains the old inline Wellenstarter admission/deferred block');
  },
};

const aliasMap = {
  'gradient-tone-graph-boundary': 'gradient-tone-graph',
  'gradient-tone-shape-boundary': 'gradient-tone-shape',
  'gradient-tone-playback-boundary': 'gradient-tone-playback',
  'body-exciter-plan-boundary': 'body-exciter-plan',
  'overtone-playback-plan-boundary': 'overtone-playback-plan',
  'sample-playback-boundary': 'sample-playback',
  'swell-reinforcement-plan-boundary': 'swell-reinforcement-plan',
  'fx-routing-boundary': 'fx-routing',
  'runtime-boundary': 'runtime-boundary',
};

const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyRaw = onlyArg ? onlyArg.slice('--only='.length) : null;
const selected = onlyRaw ? [aliasMap[onlyRaw] ?? onlyRaw] : Object.keys(cases);

for (const name of selected) {
  const run = cases[name];
  check.require(typeof run === 'function', `unknown WaveStarter boundary sanity case: ${name}`);
  if (typeof run === 'function') run();
}

check.finish({ checked: selected, appLines });
