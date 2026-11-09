#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  SPECTRALFORGE_UI_BOUNDARY_CHECKS,
  SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY,
  SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL,
} from './spectralforge-ui-boundary-proof-labels.mjs';

const root = process.cwd();
const results = [];
const checks = SPECTRALFORGE_UI_BOUNDARY_CHECKS;

function parseArgs(argv) {
  const args = {
    out: 'reports/spectralforge-ui-boundary-sanity.json',
    md: 'reports/spectralforge-ui-boundary-sanity.md',
    verbose: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i] || args.out;
    else if (arg === '--md') args.md = argv[++i] || args.md;
    else if (arg === '--verbose') args.verbose = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

const args = parseArgs(process.argv);
const startedAt = new Date().toISOString();

for (const check of checks) {
  const start = Date.now();
  const proc = spawnSync('node', [check.tool], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const status = proc.status === 0 ? 'pass' : 'fail';
  const result = {
    label: check.label,
    tool: check.tool,
    category: check.category,
    proofProfile: check.proofProfile,
    command: `node ${check.tool}`,
    status,
    exitCode: proc.status,
    durationMs: Date.now() - start,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-16).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-16).join('\n').trim(),
  };
  results.push(result);
  if (args.verbose || status === 'fail') {
    console.error(`[spectralforge-ui-boundary-sanity] ${status.toUpperCase()} ${check.label}`);
    if (result.stderrTail) console.error(result.stderrTail);
  }
}

const failed = results.filter((result) => result.status !== 'pass');
const summary = {
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
};
const report = {
  ok: failed.length === 0,
  reportKind: 'spectralforge-ui-boundary-sanity',
  generatedAt: new Date().toISOString(),
  startedAt,
  proofClass: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.proofKind,
  proofTaxonomy: SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY,
  proofLabel: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL,
  claimBoundary: {
    canClaim: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.canClaim,
    cannotClaim: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.cannotClaim,
  },
  summary,
  results,
};

fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, args.md), [
  '# SpectralForge UI boundary sanity',
  '',
  `- ok: ${report.ok}`,
  `- proofClass: ${report.proofClass}`,
  `- primaryProofClass: ${report.proofLabel.primaryProofClass}`,
  `- secondaryProofClass: ${report.proofLabel.secondaryProofClass}`,
  `- proofStrength: ${report.proofLabel.proofStrength}`,
  `- total: ${summary.total}`,
  `- passed: ${summary.passed}`,
  `- failed: ${summary.failed}`,
  '',
  '## Claim boundary',
  ...report.claimBoundary.canClaim.map((line) => `- CAN: ${line}`),
  ...report.claimBoundary.cannotClaim.map((line) => `- CANNOT: ${line}`),
  '',
  '## Proof taxonomy',
  ...Object.entries(report.proofTaxonomy.proofClasses).map(([id, description]) => `- ${id}: ${description}`),
  '',
  '## Results',
  ...results.map((result) => [
    `- ${result.status.toUpperCase()} · ${result.label} · ${result.durationMs}ms`,
    `  - proof: ${result.proofProfile.primaryProofClass} + ${result.proofProfile.secondaryProofClass}`,
  ].join('\n')),
  '',
].join('\n'));

console.log(JSON.stringify({ ok: report.ok, summary, report: args.out, markdown: args.md }, null, 2));
process.exit(report.ok ? 0 : 1);
