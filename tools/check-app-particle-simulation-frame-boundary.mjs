#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-particle-simulation-frame-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/rooms/appParticleSimulationFrameBoundary.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-particle-simulation-frame-boundary';

for (const rel of [appPath, boundaryPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_PARTICLE_SIMULATION_FRAME_BOUNDARY_CONTRACT',
  'runAppParticleSimulationFrameBoundary',
  'AppParticleSimulationFrameBoundaryArgs',
  'advanceResonanceParticleSimulationLane({',
  'renderResonanceParticleSimulationLane({',
  'params: args.params',
  'args.playNexusAgentTone(',
  'noUiChangedByBoundary: true',
  'noParticlePolicyRewrite: true',
  'noResidentTrafficPolicyOwnedHere: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noStableLanePolicyOwnedHere: true',
]) requireText('Particle simulation frame boundary source', boundary, marker);

for (const forbidden of [
  'setRoom(',
  'document.createElement',
  'addEventListener',
  'requestAnimationFrame',
  'new AudioContext',
  'createOscillator',
  'createGain',
  'resolveTrafficQuantizeSchedule',
  'mergeQueuedCollisionTrigger',
  'waveCollisionQueueRef',
]) forbidText('Particle simulation boundary must remain a thin frame callsite helper', boundary, forbidden);

for (const marker of [
  'runAppParticleSimulationFrameBoundary({',
  'ctx: c,',
  'state,',
  'particleSystem: p.particleSystem,',
  'performancePolicy: performanceCrisisRuntimePolicy.particles,',
  'frameNowMs,',
  't,',
  'particleMotionScale,',
  'waveMotionScale,',
  'baseWaveSpeed: BASE_WAVE_SPEED,',
  'targetFreq,',
  'installationAttractors,',
  'fieldWidth: GAME_WIDTH,',
  'fieldHeight: GAME_HEIGHT,',
  'audioNowSec: () => getAudioNowSec(audioCtxRef.current ?? audioCtx),',
  'playNexusAgentTone,',
  'echoOn: p.echoOn,',
  'delayNode: state.delayNode,',
  'noUiChangedByBoundary: true,',
  'noParticlePolicyRewrite: true,',
  'noResidentTrafficPolicyOwnedHere: true,',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true,',
]) requireText('App.tsx particle simulation frame boundary callsite', app, marker);

for (const forbidden of [
  'advanceResonanceParticleSimulationLane({\n        state,',
  'renderResonanceParticleSimulationLane({\n        ctx: c,',
  'import { advanceResonanceParticleSimulationLane, renderResonanceParticleSimulationLane }',
]) forbidText('App.tsx should delegate particle advance/render callsites after frame boundary extraction', app, forbidden);

for (const marker of [
  "| 'particle-simulation-frame-boundary-extracted'",
  "status: 'particle-simulation-frame-boundary-extracted'",
  'Particle simulation frame boundary extracted as pure refactor; no UI changed, no particle policy rewrite, no resident traffic policy ownership, no Wellenstarter/Root-Follow live policy change',
  "splitTarget: 'particle-simulation-frame-boundary'",
  "firstSafeMove: 'particle-simulation-frame-boundary-extracted'",
]) requireText('monolith partition map updated for particle simulation frame boundary', map, marker);

for (const marker of [
  "status: 'resident-traffic-bridge-frame-boundary-extracted'",
  "firstSafeMove: 'resident-traffic-bridge-frame-boundary-extracted'",
]) requireText('monolith partition map preserves predecessor resident traffic bridge lineage markers', map, marker);

if (!String(pkg.version || '').startsWith('3.2.91.6.9.245')) failures.push(`package version expected 3.2.91.6.9.245, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-particle-simulation-frame-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 2920) failures.push(`App.tsx should shrink below the 9.244 line region, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    pureRefactor: true,
    noUiChangedByBoundary: true,
    noParticlePolicyRewrite: true,
    noResidentTrafficPolicyOwnedHere: true,
    noWellenstarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

check.finish(report);
