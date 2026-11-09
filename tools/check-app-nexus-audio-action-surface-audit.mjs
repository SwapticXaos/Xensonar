#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-nexus-audio-action-surface-audit');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/audio/appNexusAudioActionSurfaceAudit.ts';
const boundaryPath = 'src/features/xensonar/audio/useAppNexusAudioActionSurfaceBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-nexus-audio-action-surface-audit';

for (const rel of [appPath, auditPath, boundaryPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx uses extracted action surface', app, 'useAppNexusAudioActionSurfaceBoundary({');
for (const fn of [
  'const playScheduledTone = (',
  'const playParticleNoiseAccent = (',
  'const triggerRoom3BodyExciter = (',
  'const releaseHeldScheduledTones = () => {',
  'const playNexusAgentTone = (',
]) {
  forbidText('App.tsx action bodies moved after audit', app, fn);
}
for (const marker of [
  'playScheduledToneWithLifecycle({',
  'playParticleNoiseAccentWithLifecycle({',
  'triggerRoom3BodyExciterPlayback({',
  'runParticleNexusToneOrchestrator({',
]) {
  requireText('Boundary keeps audited delegated signal routes', boundary, marker);
}
for (const marker of [
  'startQuantizedCollisionRuntime({',
  'startWaveOvertoneArpRuntime({',
  'useAppResonanceKeyboardInputEffectBoundary({',
]) {
  requireText('App.tsx keeps sibling live routes outside this boundary', app, marker);
}
for (const forbidden of [
  'NexusAudioActionQueue',
  'nexusAudioActionCallPlan',
]) {
  forbidText('App.tsx/boundary no new queue or call plan', app + boundary, forbidden);
}

requireText('audit source', audit, 'APP_NEXUS_AUDIO_ACTION_SURFACE_AUDIT');
requireText('audit source', audit, 'APP_NEXUS_AUDIO_ACTION_SURFACE_AUDIT_CONTRACT');
for (const id of [
  'id: "playScheduledTone"',
  'id: "playParticleNoiseAccent"',
  'id: "triggerRoom3BodyExciter"',
  'id: "releaseHeldScheduledTones"',
  'id: "playNexusAgentTone"',
]) {
  requireText('audit source covers action', audit, id);
}
for (const contract of [
  'thinBoundaryExtracted: true',
  'noWaveStarterPolicyOwnedHere: true',
  'noRootFollowPolicyOwnedHere: true',
  'noNewEventQueue: true',
  'noNewCallPlanLayer: true',
]) {
  requireText('audit contract', audit, contract);
}
for (const semanticMarker of [
  'Wellenstarter Live-Aktionsfläche',
  'Resonance Nexus main loop',
  'Quantized Collision Runtime',
  'Root Follow',
  'Stable Rhythm Lanes',
  'Room3 Body Audio Loop',
  'playScheduledToneWithLifecycle',
  'runParticleNexusToneOrchestrator',
  'triggerRoom3BodyExciterPlayback',
]) {
  requireText('audit source semantic coverage', audit, semanticMarker);
}
for (const forbidden of [
  'new AudioContext',
  'localStorage.',
  'window.addEventListener',
]) {
  forbidText('audit source must remain static and non-runtime', audit, forbidden);
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-nexus-audio-action-surface-audit.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  auditLines: audit.split(/\r?\n/).length,
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
