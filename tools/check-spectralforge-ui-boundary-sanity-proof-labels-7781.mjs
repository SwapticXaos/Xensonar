#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  SPECTRALFORGE_UI_BOUNDARY_CHECKS,
  SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY,
  SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL,
} from './spectralforge-ui-boundary-proof-labels.mjs';

const root = process.cwd();
const failures = [];
const warnings = [];
const runnerPath = path.join(root, 'tools/run-spectralforge-ui-boundary-sanity.mjs');
const reportPath = path.join(root, 'reports/spectralforge-ui-boundary-sanity.json');
const mdPath = path.join(root, 'reports/spectralforge-ui-boundary-sanity.md');
const pkgPath = path.join(root, 'package.json');

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    failures.push(`Missing readable file: ${path.relative(root, file)} (${error.message})`);
    return '';
  }
}

const runner = read(runnerPath);
if (!runner.includes("./spectralforge-ui-boundary-proof-labels.mjs")) {
  failures.push('run-spectralforge-ui-boundary-sanity.mjs must import the shared proof-label policy.');
}
if (/const checks\s*=\s*\[/.test(runner)) {
  failures.push('run-spectralforge-ui-boundary-sanity.mjs must not keep a private check registry; use SPECTRALFORGE_UI_BOUNDARY_CHECKS.');
}

const pkg = JSON.parse(read(pkgPath) || '{}');
const scripts = pkg.scripts || {};
if (scripts['xensonar:check-spectralforge-ui-boundary-sanity-proof-labels-7781'] !== 'node tools/check-spectralforge-ui-boundary-sanity-proof-labels-7781.mjs') {
  failures.push('package.json is missing xensonar:check-spectralforge-ui-boundary-sanity-proof-labels-7781.');
}

if (!Array.isArray(SPECTRALFORGE_UI_BOUNDARY_CHECKS) || SPECTRALFORGE_UI_BOUNDARY_CHECKS.length < 7) {
  failures.push('SPECTRALFORGE_UI_BOUNDARY_CHECKS must cover the existing seven UI-boundary checks.');
}
for (const check of SPECTRALFORGE_UI_BOUNDARY_CHECKS) {
  if (!check.tool || !check.tool.startsWith('tools/check-') || !check.tool.endsWith('.mjs')) failures.push(`${check.label} is missing a direct check tool path.`);
  else if (!fs.existsSync(path.join(root, check.tool))) failures.push(`${check.label} tool does not exist: ${check.tool}`);
  if ('script' in check) failures.push(`${check.label} must not depend on a package-script alias; use direct tool ownership.`);
  if (!check.proofProfile) failures.push(`${check.label} is missing proofProfile.`);
  if (check.proofProfile?.primaryProofClass !== 'source-shape') failures.push(`${check.label} must remain labelled source-shape.`);
  if (check.proofProfile?.secondaryProofClass !== 'static-boundary') failures.push(`${check.label} must remain labelled static-boundary.`);
  const cannotClaim = check.proofProfile?.cannotClaim || [];
  for (const forbiddenClaim of ['browser DOM', 'subjective Klang', 'IndexedDB persistence']) {
    if (!cannotClaim.some((line) => String(line).includes(forbiddenClaim))) {
      failures.push(`${check.label} cannotClaim must explicitly include ${forbiddenClaim}.`);
    }
  }
}

if (!SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY.proofClasses['browser-dom']) {
  failures.push('Proof taxonomy must define browser-dom as separate from source-shape.');
}
if (!SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY.proofClasses['audio-export']) {
  failures.push('Proof taxonomy must define audio-export as separate from UI-boundary proof.');
}

let report = null;
if (fs.existsSync(reportPath)) {
  report = JSON.parse(read(reportPath));
  if (report.proofLabel?.primaryProofClass !== SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.primaryProofClass) {
    failures.push('spectralforge-ui-boundary-sanity report primaryProofClass does not match shared proof label.');
  }
  if (!report.proofTaxonomy?.proofClasses?.['browser-dom']) {
    failures.push('spectralforge-ui-boundary-sanity report must embed proofTaxonomy including browser-dom.');
  }
  for (const result of report.results || []) {
    if (!result.proofProfile) failures.push(`Report result ${result.label} missing proofProfile.`);
  }
} else {
  warnings.push('reports/spectralforge-ui-boundary-sanity.json does not exist yet; run npm run xensonar:sanity:spectralforge-ui-boundary to populate it.');
}

const md = fs.existsSync(mdPath) ? read(mdPath) : '';
if (md && !md.includes('## Proof taxonomy')) failures.push('Markdown report must include a Proof taxonomy section.');
if (md && !md.includes('CANNOT: subjective Klang')) failures.push('Markdown report must explicitly say it cannot claim subjective Klang.');

const summary = {
  checks: SPECTRALFORGE_UI_BOUNDARY_CHECKS.length,
  failures: failures.length,
  warnings: warnings.length,
  primaryProofClass: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.primaryProofClass,
  secondaryProofClass: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.secondaryProofClass,
};
const out = {
  ok: failures.length === 0,
  reportKind: 'spectralforge-ui-boundary-sanity-proof-labels-7781',
  generatedAt: new Date().toISOString(),
  summary,
  failures,
  warnings,
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/spectralforge-ui-boundary-sanity-proof-labels-7781.json'), JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(root, 'reports/spectralforge-ui-boundary-sanity-proof-labels-7781.md'), [
  '# SpectralForge UI boundary sanity proof labels 7.7.81',
  '',
  `- ok: ${out.ok}`,
  `- checks: ${summary.checks}`,
  `- primaryProofClass: ${summary.primaryProofClass}`,
  `- secondaryProofClass: ${summary.secondaryProofClass}`,
  `- failures: ${summary.failures}`,
  `- warnings: ${summary.warnings}`,
  '',
  '## Failures',
  ...(failures.length ? failures.map((line) => `- ${line}`) : ['- none']),
  '',
  '## Warnings',
  ...(warnings.length ? warnings.map((line) => `- ${line}`) : ['- none']),
  '',
].join('\n'));

console.log(JSON.stringify({ ok: out.ok, summary }, null, 2));
process.exit(out.ok ? 0 : 1);
