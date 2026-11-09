#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const must = (ok, label) => { if (!ok) failures.push(label); };
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const corePath = 'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.core.ts';
const registryPath = 'src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts';
const typesPath = 'src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts';
const renderer = read(rendererPath);
const core = read(corePath);
const registry = fs.existsSync(registryPath) ? read(registryPath) : '';
const types = fs.existsSync(typesPath) ? read(typesPath) : '';

must(!renderer.includes('ROOT_FOLLOW_MATERIAL_TRANSPORT_STABLE_RATE'), '104 unity-rate constant must be absent');
must(!renderer.includes('resolveRootFollowTransportStableMaterialPlaybackRate'), '104 unity-rate resolver must be absent');
must(!/\bmaterialPlaybackRate\b/.test(renderer), 'materialPlaybackRate alias must be absent; use pitchInfo.elasticRate directly');
must((renderer.match(/playbackRate:\s*pitchInfo\.elasticRate/g) ?? []).length >= 8, 'renderer must route audible Root-Follow material playbackRate to pitchInfo.elasticRate');
must(renderer.includes('kind: "retune-sample"') || renderer.includes("kind: 'retune-sample'"), 'retune-sample traffic probe must remain present');
must(renderer.includes('safeRootFollowVoiceEngineMode'), 'renderer must protect material path from stale worklet/stable-lane default state');
must(renderer.includes('electron-browser-reference-restore-keeps-worklet-auditions-out-of-default-material-path'), 'demotion reason must document browser-reference material path restoration');
must(/const BALANCED_ROOT_FOLLOW_ENGINE:\s*RootFollowVoiceEngineMode\s*=\s*["']shadow-plan["']/.test(core), 'core default Root-Follow engine must be shadow-plan');
must(core.includes('lateGrainStrategy: "smear"') || core.includes("lateGrainStrategy: 'smear'"), 'core lateGrainStrategy must be smear, not drop');
must(core.includes('staleWindowMs: 96'), 'core staleWindowMs must be 96 for Electron/dev jitter');
must(core.includes('densityReductionUnderLoad: 0.12'), 'core density reduction must be softened to 0.12');
if (registry) {
  must(registry.includes('lateGrainStrategy: "smear"') || registry.includes("lateGrainStrategy: 'smear'"), 'registry balanced/root-follow policy must include smear');
  must(registry.includes('leadMs: 108'), 'registry balanced granular setting must include leadMs 108');
  must(registry.includes('startLeadMs: 34'), 'registry balanced granular setting must include startLeadMs 34');
  must(registry.includes('stepMs: 34'), 'registry balanced granular setting must include stepMs 34');
}
if (types) {
  must(types.includes("'shadow-plan'") || types.includes('"shadow-plan"'), 'worklet branch test default must not force stable-lane');
}
if (failures.length) {
  console.error('[root-follow-electron-reference-restore] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-electron-reference-restore] OK');
console.log(JSON.stringify({
  rendererPlaybackRateElasticCallsites: (renderer.match(/playbackRate:\s*pitchInfo\.elasticRate/g) ?? []).length,
  coreEngine: 'shadow-plan',
  lateGrainStrategy: 'smear',
  staleWindowMs: 96,
  densityReductionUnderLoad: 0.12,
}, null, 2));
