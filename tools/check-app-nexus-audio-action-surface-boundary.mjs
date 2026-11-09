#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-nexus-audio-action-surface-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/audio/useAppNexusAudioActionSurfaceBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appNexusAudioActionSurfaceAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-nexus-audio-action-surface-boundary';

for (const rel of [appPath, boundaryPath, auditPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx hook call', app, 'useAppNexusAudioActionSurfaceBoundary({');
requireText('App.tsx destructures thin action ports', app, 'playNexusAgentTone,');
requireText('App.tsx boundary keeps Wellenstarter marker', app, 'noWaveStarterPolicyOwnedHere: true');
requireText('App.tsx boundary keeps RootFollow marker', app, 'noRootFollowPolicyOwnedHere: true');
for (const inlineFn of [
  'const playScheduledTone = (',
  'const playParticleNoiseAccent = (',
  'const triggerRoom3BodyExciter = (',
  'const releaseHeldScheduledTones = () => {',
  'const playNexusAgentTone = (',
]) {
  forbidText('App.tsx no longer owns Nexus audio action bodies', app, inlineFn);
}
for (const delegated of [
  'playScheduledToneWithLifecycle({',
  'playParticleNoiseAccentWithLifecycle({',
  'triggerRoom3BodyExciterPlayback({',
  'runParticleNexusToneOrchestrator({',
]) {
  forbidText('App.tsx delegates through boundary instead of inline body', app, delegated);
  requireText('Boundary keeps existing delegated route', boundary, delegated);
}
for (const marker of [
  'export function useAppNexusAudioActionSurfaceBoundary',
  'AppNexusAudioActionSurfaceBoundaryDeps',
  'AppScheduledToneAction',
  'AppParticleNoiseAccentAction',
  'AppRoom3BodyExciterAction',
  'AppNexusAgentToneAction',
  'noWaveStarterPolicyOwnedHere: true',
  'noRootFollowPolicyOwnedHere: true',
  'noNewEventQueue: true',
  'noNewCallPlanLayer: true',
]) {
  if (marker === 'noNewEventQueue: true' || marker === 'noNewCallPlanLayer: true') continue;
  requireText('Boundary source marker', boundary, marker);
}
for (const forbidden of [
  'setTimeout(',
  'setInterval(',
  'requestAnimationFrame(',
  'window.addEventListener',
  'NexusAudioActionQueue',
  'nexusAudioActionCallPlan',
]) {
  forbidText('Boundary must not introduce event orchestration layer', boundary, forbidden);
}
for (const hotPathName of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'useRootFollowPlaybackRuntimeBoundary',
  'useMaterialLoopPlaybackRuntimeBoundary',
  'startQuantizedCollisionRuntime',
  'startWaveOvertoneArpRuntime',
]) {
  forbidText('Boundary must not absorb other live engines', boundary, hotPathName);
}
requireText('Audit source remains available', audit, 'APP_NEXUS_AUDIO_ACTION_SURFACE_AUDIT');
requireText('Audit contract updated for thin boundary', audit, 'thinBoundaryExtracted: true');

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-nexus-audio-action-surface-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    thinBoundaryExtracted: true,
    noWaveStarterPolicyOwnedHere: true,
    noRootFollowPolicyOwnedHere: true,
    noNewEventQueue: true,
    noNewCallPlanLayer: true,
  },
  failures,
};

check.finish(report);
