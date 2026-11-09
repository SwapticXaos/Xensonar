#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/rooms/buildAppParticleSystemPanelBoundary.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const shapeGuardPath = 'tools/check-app-resonance-panel-boundary-shape-audit.mjs';
const contractGuardPath = 'tools/check-app-resonance-panel-boundary-contract-cleanup.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const index = exists(indexPath) ? read(indexPath) : '';
const shapeGuard = exists(shapeGuardPath) ? read(shapeGuardPath) : '';
const contractGuard = exists(contractGuardPath) ? read(contractGuardPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playParticleNoiseAccentWithLifecycle(',
  'runParticleNexusToneOrchestrator(',
  'advanceResonanceParticleSimulationLane(',
  'renderResonanceParticleSimulationLane(',
  'startQuantizedCollisionRuntime(',
  'resolveTrafficQuantizeSchedule(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
];

const instrumentDataImportBlock = (app.match(/import \{[\s\S]*?\} from "\.\/features\/xensonar\/domain\/instrumentData";/) || [''])[0];

const checks = {
  expectedFilesExist: [appPath, boundaryPath, indexPath, shapeGuardPath, contractGuardPath].every(exists),
  appPassesParticleSystemSourceIntoPropsBoundary: app.includes('particleSystem: {') && !app.includes('particleSystem: buildAppParticleSystemPanelBoundary({'),
  appPassesOnlyDynamicParticlePresetCatalogSource: app.includes('presetCatalogSource: { particlePresets: particleSoundMenuOptions },'),
  appStillPassesSelectionAndAgentActionsExplicitly: [
    'selection: { setParticleSystem, activeParticleNodes },',
    'agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume },',
  ].every((needle) => app.includes(needle)),
  appNoLongerPassesStaticParticleCatalogConstants:
    !app.includes('catalog: { particlePresets: particleSoundMenuOptions') &&
    !app.includes('particleGradientPresets: PARTICLE_GRADIENT_PRESETS') &&
    !app.includes('agentKeys: AGENT_KEYS') &&
    !app.includes('particleVolumeMax: PARTICLE_VOLUME_MAX },'),
  appNoLongerImportsParticleStaticCatalogConstants:
    !instrumentDataImportBlock.includes('AGENT_KEYS,') &&
    !instrumentDataImportBlock.includes('PARTICLE_GRADIENT_PRESETS,'),
  appKeepsParticleVolumeMaxForPressureReadoutOnly: instrumentDataImportBlock.includes('PARTICLE_VOLUME_MAX,'),
  boundaryOwnsStaticParticlePanelCatalog: [
    "import { AGENT_KEYS, PARTICLE_GRADIENT_PRESETS, PARTICLE_VOLUME_MAX } from '../domain/instrumentData';",
    'export type AppParticleSystemPresetCatalogSourceBoundary',
    "| 'particlePresets'",
    'presetCatalogSource: AppParticleSystemPresetCatalogSourceBoundary;',
    'presetCatalogSource,',
    '...presetCatalogSource,',
    'particleGradientPresets: PARTICLE_GRADIENT_PRESETS,',
    'agentKeys: AGENT_KEYS,',
    'particleVolumeMax: PARTICLE_VOLUME_MAX,',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsSelectionAndAgentActionContractsTyped: [
    'export type AppParticleSystemSelectionBoundary = Pick<',
    "| 'setParticleSystem'",
    "| 'activeParticleNodes'",
    'export type AppParticleSystemAgentActionBoundary = Pick<',
    "| 'previewParticlePresetSelection'",
    "| 'toggleNexusAgent'",
    "| 'setNexusAgentVolume'",
    '): ParticleSystemRuntimeProps',
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveParticleRuntimeOrScheduling: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  indexAndShapeGuardsNamePresetCatalogSource: [
    "| 'presetCatalogSource'",
    "inputGroups: ['selection', 'presetCatalogSource', 'agentActions']",
  ].every((needle) => index.includes(needle)) &&
    shapeGuard.includes("inputGroups: ['selection', 'presetCatalogSource', 'agentActions']") &&
    contractGuard.includes("'presetCatalogSource'"),
  appStillOwnsParticleStateAndRuntimeSites: [
    'const setParticleSystem = (system: ParticleSystem) => {',
    'buildParticleSystemContract(',
    'const cycleParticleSystem = (direction: 1 | -1 = 1) => {',
    'playParticleNoiseAccentWithLifecycle({',
    'runParticleNexusToneOrchestrator({',
    'advanceResonanceParticleSimulationLane({',
    'renderResonanceParticleSimulationLane({',
    'resolveTrafficQuantizeSchedule({',
  ].every((needle) => app.includes(needle)),
  appLineCountDidNotInflate: appLines <= 5490,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Static Particle-System panel catalog constants are no longer passed through the App.tsx callsite.',
    'The Particle-System boundary now derives agent keys, gradient presets, and panel volume maximum from the canonical instrument data catalog.',
    'App.tsx still supplies only the live particle selection, dynamic sound preset menu, and explicit agent action callbacks.',
  ],
  explicitlyNotMoved: [
    'Particle audio playback/orchestration runtime',
    'Particle simulation lane advance/render runtime',
    'Particle quantize scheduling and traffic queue runtime',
    'Particle state transitions, hotkeys, and agent actions',
    'Root-Follow, Materialspur, Wellenstarter, Drum/Bass, Worklet, Paketstation, and Room III behavior',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
