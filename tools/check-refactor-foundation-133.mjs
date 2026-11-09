#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  'tools/check-xensonar-check-taxonomy-manifest.mjs',
  'tools/check-spectralforge-store-carrier-donor-scenarios.mjs',
  'tools/check-spectralforge-store-carrier-donor-lifecycle-boundary.mjs',
  'tools/check-spectralforge-audio-engine-utility-boundary.mjs',
  'tools/check-stable-lane-state-plan-binding.mjs',
  'tools/check-stable-lane-proven-legacy-slice-relief.mjs',
  'tools/check-stable-lane-legacy-blend-boundary.mjs',
  'tools/check-root-follow-infrastructure.mjs',
  'tools/check-spectral-canvas-boundary.mjs',
  'tools/check-spectralforge-canvas-viewport-boundary-refactor-7771.mjs',
  'tools/check-spectral-canvas-edit-boundaries-133.mjs',
  'tools/check-loop-drum-domain-facade-133.mjs',
  'tools/check-canonical-session-persistence-corridor.mjs',
  'tools/check-material-fragmentation-boundary-6907.mjs',
  'tools/check-audio-paint-fretless-field-contract-5126.mjs',
  'tools/check-carrier-donor-identity-contract-133.mjs',
  'tools/check-burst-diagnostics-source-audit-sediment-boundary.mjs',
];

const results = [];
for (const check of checks) {
  const run = spawnSync(process.execPath, [check], { encoding: 'utf8' });
  results.push({
    check,
    ok: run.status === 0,
    status: run.status,
    stdout: (run.stdout || '').trim().slice(-1200),
    stderr: (run.stderr || '').trim().slice(-1200),
  });
}

const lineCount = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
const physicalCheckCount = fs.readdirSync('tools').filter((name) => /^check-.*\.mjs$/.test(name)).length;
const physicalCheckBudget = Number.parseInt(process.env.XENSONAR_MAX_PHYSICAL_CHECKS || '830', 10);
const metrics = {
  physicalCheckCount,
  audioEngineLines: lineCount('src/features/l3lab/spectralForge/audio/AudioEngine.ts'),
  spectralCanvasLines: lineCount('src/features/l3lab/spectralForge/components/SpectralCanvas.tsx'),
  rootFollowMaterialRendererLines: lineCount('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts'),
  loopDrumDomainLines: lineCount('src/features/l3lab/canonicalForge/loopDrumDomain.ts'),
};
const metricChecks = {
  physicalCheckCountWithinBudget: metrics.physicalCheckCount <= physicalCheckBudget,
  audioEngineAtMost2385: metrics.audioEngineLines <= 2385,
  spectralCanvasAtMost1450: metrics.spectralCanvasLines <= 1450,
  rootFollowMaterialRendererAtMost1230: metrics.rootFollowMaterialRendererLines <= 1230,
  loopDrumDomainAtMost1200: metrics.loopDrumDomainLines <= 1200,
};
const failures = [
  ...results.filter((entry) => !entry.ok).map((entry) => entry.check),
  ...Object.entries(metricChecks).filter(([, ok]) => !ok).map(([name]) => `metric:${name}`),
];

const report = {
  ok: failures.length === 0,
  patch: 133,
  purpose: 'refactor-foundation-without-live-audio-semantic-change',
  metrics: { ...metrics, physicalCheckBudget },
  metricChecks,
  checks: results.map(({ check, ok, status }) => ({ check, ok, status })),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
