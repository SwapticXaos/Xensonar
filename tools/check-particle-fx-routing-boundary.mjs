#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particleFxRouting.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function ensureParticleFxRoutes', 'particle FX routing boundary export missing'],
  [boundary, 'export function buildParticleAuxTargets', 'particle aux target builder export missing'],
  [boundary, 'ensureCollectiveMemoryFx(args.ctx)', 'boundary must preserve Collective Memory route ensure'],
  [boundary, 'ensurePsychedelicSpiralDevice(args.ctx)', 'boundary must preserve Psychedelic Spiral route ensure'],
  [boundary, 'ensureTransientDriveDevice(args.ctx)', 'boundary must preserve Transient Drive route ensure'],
  [boundary, 'ensureEnterHoldPsyFxDevice(args.ctx)', 'boundary must preserve Enter-Hold PsyFX route ensure'],
  [boundary, 'ensureSchwarmdeuterDevice(args.ctx)', 'boundary must preserve Schwarmdeuter route ensure'],
  [boundary, 'ensureMyzelPostFxRouter(args.ctx)', 'boundary must preserve Myzel post-FX route ensure'],
  [boundary, 'args.targetDestination', 'boundary must preserve direct target as first aux target'],
  [boundary, 'args.transientDriveParticles', 'boundary must preserve particle transient-drive target'],
  [boundary, 'args.psychedelicSpiralParticles', 'boundary must preserve particle spiral target'],
  [boundary, 'args.collectiveMemoryParticles', 'boundary must preserve particle collective-memory target'],
  [boundary, 'args.schwarmdeuterParticles', 'boundary must preserve particle Schwarmdeuter target'],
  [boundary, 'args.myzelPostFxParticles', 'boundary must preserve particle Myzel post-FX target'],
  [host, 'ensureParticleFxRoutes({', 'particle nexus tone path must delegate particle FX route ensures into boundary'],
  [host, 'buildParticleAuxTargets({', 'particle nexus tone path must delegate particle aux target list into boundary'],
  [app, 'ensureCollectiveMemoryFx', 'App.tsx must pass the existing route ensure callbacks toward FX boundary'],
  [app, 'transientDriveParticles: transientDriveSendsRef.current.particles', 'App.tsx must pass transient-drive particle send toward FX boundary'],
  [app, 'collectiveMemoryParticles: collectiveFxRef.current.particles?.input', 'App.tsx must pass collective-memory particle send toward FX boundary'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const playMatch = app.match(/const playNexusAgentTone = \([\s\S]*?\n  const spawnNexusRipple = /);
if (!playMatch) {
  failures.push('Could not locate playNexusAgentTone slice in App.tsx');
} else {
  const playSlice = playMatch[0];
  const forbiddenInPlaySlice = [
    'ensureCollectiveMemoryFx(ctx);',
    'ensurePsychedelicSpiralDevice(ctx);',
    'ensureTransientDriveDevice(ctx);',
    'ensureEnterHoldPsyFxDevice(ctx);',
    'ensureSchwarmdeuterDevice(ctx);',
    'ensureMyzelPostFxRouter(ctx);',
    'const particleTargets = [',
    'targetDestination,\n      transientDriveSendsRef.current.particles',
    'ensureParticleFxRoutes({',
    'buildParticleAuxTargets({',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle FX/routing detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle FX routing through the nexus tone orchestrator');
  }
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'nexusParamsRef',
  'collectiveFxRef',
  'psychedelicSpiralSendsRef',
  'transientDriveSendsRef',
  'schwarmdeuterSendsRef',
  'myzelPostFxSendsRef',
  'playScheduledTone',
  'playParticleSample',
  'playResidentSample',
  'beginTransientEvent',
  'triggerRoom3BodyExciter',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle FX routing boundary owns runtime/playback detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-fx-routing-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-fx-routing-boundary] OK');
