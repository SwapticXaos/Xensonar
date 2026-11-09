#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

const files = {
  reportTool: read('tools/report-xensonar-development-basis.mjs'),
  docs: read('docs/XENSONAR_DEVELOPMENT_BASIS_3.2.91.7.5.131.md'),
  refactorSuite: read('tools/run-xensonar-refactor-sanity-suite.mjs'),
  gateManifest: read('tools/current-line-gate-manifest.mjs'),
};

const checks = {
  reportScriptRegistered:
    pkg.scripts?.['xensonar:report-development-basis'] === 'node tools/report-xensonar-development-basis.mjs',
  checkScriptRegistered:
    pkg.scripts?.['xensonar:check-development-basis-contract'] === 'node tools/check-xensonar-development-basis-contract.mjs',
  reportToolNamesCoreProfiles:
    files.reportTool.includes('diagnosticSurfaces') &&
    files.reportTool.includes('xenpolarExtras') &&
    files.reportTool.includes('refactorSuite'),
  reportToolNamesNoTouchZones:
    files.reportTool.includes('src/features/l3lab/spectralForge/audio/AudioEngine.ts') &&
    files.reportTool.includes('src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts') &&
    files.reportTool.includes('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts'),
  reportToolEmitsSafeNextBranches:
    files.reportTool.includes('performance-crisis-diagnostics-subhook-split') &&
    files.reportTool.includes('spectralforge-ui-viewmodel-boundary') &&
    files.reportTool.includes('loop-domain-facade-manifest'),
  docsExplainCurrentTruth:
    files.docs.includes('Current-line truth') &&
    files.docs.includes('Runtime kernels stay in core') &&
    files.docs.includes('Diagnostic surfaces are optional') &&
    files.docs.includes('Old 6.9.x App.tsx extraction checks are historical'),
  docsExplainVerificationLadder:
    files.docs.includes('Verification ladder') &&
    files.docs.includes('npm run xensonar:sanity:refactor-suite') &&
    files.docs.includes('npm run patch:html:core'),
  sanitySuiteIncludesBasisCheck:
    files.refactorSuite.includes('CURRENT_LINE_GATE_SCRIPTS') &&
    files.gateManifest.includes('Development basis contract') &&
    files.gateManifest.includes('xensonar:check-development-basis-contract'),
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ ok: failures.length === 0, checks, failures }, null, 2));
if (failures.length) process.exit(1);
