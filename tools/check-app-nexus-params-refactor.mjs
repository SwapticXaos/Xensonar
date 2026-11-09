#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const modulePath = 'src/features/xensonar/rooms/nexusParamsInitialState.ts';
const moduleSource = read(modulePath);

const requiredModuleTokens = [
  'export const PARTICLE_SAMPLE_PROFILE_STORAGE_KEY',
  'export const readStoredParticleSampleProfileMode',
  'export const createInitialNexusParams',
  'export type NexusUiPatch',
  'export const buildMaterialFocusNexusPatch',
  'droneJIOvertonesByPreset: cloneOvertoneMixByPreset(initialOvertonesByPreset)',
  'createInitialNexusLoopLaneUiState()',
];

const requiredAppTokens = [
  'useAppNexusParamsState()',
  'useResonanceMaterialFocusDefaults({',
];

const forbiddenAppTokens = [
  'const PARTICLE_SAMPLE_PROFILE_STORAGE_KEY =',
  'const readStoredParticleSampleProfileMode =',
  'const nexusParamsRef = useRef({',
  'const defaultParticleSystem: ParticleSystem = "ji";',
  'const defaultGridTuning: GridTuning = "12edo";',
];

const protectedAudioFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
];

const checks = [];
for (const token of requiredModuleTokens) {
  checks.push({ name: `module has ${token}`, pass: moduleSource.includes(token) });
}
for (const token of requiredAppTokens) {
  checks.push({ name: `App uses ${token}`, pass: app.includes(token) });
}
for (const token of forbiddenAppTokens) {
  checks.push({ name: `App no longer inlines ${token}`, pass: !app.includes(token) });
}
const protectedFileChecks = [
  { rel: 'src/features/resonance/refactorTopologyLegacyAudio.ts', tokens: ['nodeColorOsc', 'nodeNoiseSource', 'nodeDriveShaper', 'setTargetAtTime'] },
  { rel: 'src/features/resonance/refactorTopologyNodeAura.ts', tokens: ['export const getNodeAuraSignature', 'createMyzelNodeColorDriveCurve', 'createMyzelNoiseBuffer'] },
  { rel: 'src/features/resonance/refactorTopologyLegacyAudioFrame.ts', tokens: ['getNodeAuraSignature', 'deriveRefactorTopologyLegacyAudioFrame', 'myzelNearestPresetId'] },
];
for (const { rel, tokens } of protectedFileChecks) {
  const source = read(rel);
  for (const token of tokens) {
    checks.push({ name: `${rel} keeps ${token}`, pass: source.includes(token) });
  }
}

const appLines = app.split(/\r?\n/).length;
checks.push({ name: 'App.tsx line count below 7200 after nexus hook extraction', pass: appLines < 7200, value: appLines });

const failures = checks.filter((entry) => !entry.pass);
const report = { ok: failures.length === 0, appLines, modulePath, checks };
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
