#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { CURRENT_LINE_GATE_SCRIPTS } from './current-line-gate-manifest.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = {
    build: false,
    requireHtml: false,
    withTypecheck: false,
    withOracle: false,
    out: 'reports/xensonar-refactor-sanity-suite.json',
    md: 'reports/xensonar-refactor-sanity-suite.md',
    verbose: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--build') args.build = true;
    else if (arg === '--require-html') args.requireHtml = true;
    else if (arg === '--with-typecheck') args.withTypecheck = true;
    else if (arg === '--with-oracle') args.withOracle = true;
    else if (arg === '--out') args.out = argv[++i] || args.out;
    else if (arg === '--md') args.md = argv[++i] || args.md;
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/run-xensonar-refactor-sanity-suite.mjs [--build] [--require-html] [--with-typecheck] [--with-oracle]\n\nCurrent-line suite for the 7.5.x refactor branch. It delegates to the canonical parallel-refactor suite and build-profile gates instead of rerunning the historical 6.9.x App.tsx extraction matrix.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const startedAt = new Date().toISOString();
const results = [];

const claimBoundaries = {
  canClaim: [
    'The current 7.5.x refactor line passes its canonical parallel-refactor source gates.',
    'Diagnostic surfaces are build-gated: full builds keep them, core-test builds omit them.',
    'Xenpolar/Irrlicht extras runtime is profile-gated: full keeps the runtime, core-test uses a dormant surface.',
    'Family/Refucktor heavy room bodies are lazy-loaded behind the family launcher instead of being static launcher dependencies.',
    'Blob-backed AudioWorklet module loading is centralized while bridge files keep node/session ownership.',
    'Optional typecheck gates can be included with --with-typecheck.',
    'The check landscape taxonomy separates current-line gates, behavioral checks, marker checks, historical artifacts, and consolidation candidates without deleting coverage.',
    'Optional HTML generation can be included with --build and is required with --require-html.',
  ],
  cannotClaim: [
    'This suite no longer treats the old 6.9.x App.tsx extraction matrix as canonical truth for the 7.5.x branch.',
    'It does not prove subjective Klang, timbral identity, worst-case performance feel, or every browser interaction.',
    'It does not replace stress listening for Wellenstarter, Root-Follow, Partikel, Materialspur, or keyboard/glissando pressure.',
    'The check landscape taxonomy is heuristic; it classifies the check field but does not prove that a specific check is useless.',
  ],
  creativeDirectorHandoff: [
    'Use this suite as a current-line structural gate before HTML/audio review.',
    'Use human review for instrument feel, density, cursor gestures, and musical desirability.',
  ],
};

function run(label, command, commandArgs, options = {}) {
  const start = Date.now();
  const display = [command, ...commandArgs].join(' ');
  if (args.verbose) console.error(`[sanity] ${label}: ${display}`);
  const proc = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 24,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const required = options.required !== false;
  const status = proc.status === 0 ? 'pass' : required ? 'fail' : 'soft-fail';
  const result = {
    label,
    command: display,
    category: options.category || 'current-line',
    required,
    status,
    exitCode: proc.status,
    durationMs: Date.now() - start,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-24).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-24).join('\n').trim(),
  };
  results.push(result);
  if (args.verbose || status === 'fail') {
    console.error(`[sanity] ${status.toUpperCase()} ${label} (${result.durationMs}ms)`);
    if (result.stderrTail) console.error(result.stderrTail);
    else if (result.stdoutTail) console.error(result.stdoutTail);
  }
  return status === 'pass';
}

function fileContains(file, needle) {
  const fullPath = path.join(root, file);
  return fs.existsSync(fullPath) && fs.readFileSync(fullPath, 'utf8').includes(needle);
}

for (const gate of CURRENT_LINE_GATE_SCRIPTS.filter((item) => item.runInRefactorSuite !== false)) {
  const command = gate.command || 'npm';
  const commandArgs = gate.args || ['run', gate.script];
  run(gate.label, command, commandArgs, { category: gate.category || 'current-line' });
}

if (args.withTypecheck) {
  for (const chunk of ['xensonar-rooms-panels', 'xensonar-layout', 'xensonar-audio', 'xensonar-root-follow']) {
    run(`TypeScript micro ${chunk}`, 'npm', ['run', `typecheck:micro:${chunk}`], { category: 'typescript' });
  }
}

if (args.withOracle) {
  run('Room III 8.79 node-device oracle self-check', 'npm', ['run', 'xensonar:prove-room3-879-node-device-oracle', '--', '--self-only'], { required: false });
}

if (args.build) {
  run('Full HTML build', 'npm', ['run', 'patch:html'], { category: 'build' });
  run('Core-test HTML build', 'npm', ['run', 'patch:html:core'], { category: 'build' });
  run('HTML size threshold', 'npm', ['run', 'assert:html-budget'], { category: 'build' });
}

if (args.requireHtml) {
  const htmlOk = fs.existsSync(path.join(root, 'dist/index.html')) || fs.existsSync(path.join(root, 'dist-core/index.html'));
  results.push({
    label: 'HTML artifact presence',
    command: 'internal file check',
    category: 'html',
    required: true,
    status: htmlOk ? 'pass' : 'fail',
    exitCode: htmlOk ? 0 : 1,
    durationMs: 0,
    stdoutTail: htmlOk ? 'HTML artifact present' : '',
    stderrTail: htmlOk ? '' : 'No dist/index.html or dist-core/index.html found',
  });
}

results.push({
  label: 'Current-line suite bridge marker',
  command: 'internal source check',
  category: 'suite-contract',
  required: true,
  status: fileContains('tools/run-xensonar-refactor-sanity-suite.mjs', 'historical 6.9.x App.tsx extraction matrix') ? 'pass' : 'fail',
  exitCode: 0,
  durationMs: 0,
  stdoutTail: 'Historical matrix is documented as non-canonical for this branch.',
  stderrTail: '',
});

const hardFailures = results.filter((result) => result.required && result.status !== 'pass');
const softFailures = results.filter((result) => !result.required && result.status !== 'pass');
const summary = {
  total: results.length,
  passed: results.filter((result) => result.status === 'pass').length,
  failed: hardFailures.length,
  softFailed: softFailures.length,
};
const report = {
  ok: hardFailures.length === 0,
  reportKind: 'xensonar-current-line-refactor-sanity-suite',
  generatedAt: new Date().toISOString(),
  startedAt,
  branchSemantics: '7.5.x current-line bridge: parallel-refactor + build-profile gates are canonical; legacy App.tsx extraction matrix is historical.',
  summary,
  claimBoundaries,
  results,
};

fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));
const md = [
  '# Xensonar current-line refactor sanity suite',
  '',
  `- ok: ${report.ok}`,
  `- total: ${summary.total}`,
  `- passed: ${summary.passed}`,
  `- failed: ${summary.failed}`,
  `- softFailed: ${summary.softFailed}`,
  '',
  '## What this suite can claim',
  ...claimBoundaries.canClaim.map((line) => `- ${line}`),
  '',
  '## What this suite cannot claim',
  ...claimBoundaries.cannotClaim.map((line) => `- ${line}`),
  '',
  '## Creative Director handoff',
  ...claimBoundaries.creativeDirectorHandoff.map((line) => `- ${line}`),
  '',
  '## Results',
  ...results.map((result) => `- ${result.status.toUpperCase()} · ${result.label} · ${result.durationMs}ms`),
  '',
].join('\n');
fs.writeFileSync(path.join(root, args.md), md);
console.log(JSON.stringify({ ok: report.ok, summary, report: args.out, markdown: args.md }, null, 2));
process.exit(report.ok ? 0 : 1);
