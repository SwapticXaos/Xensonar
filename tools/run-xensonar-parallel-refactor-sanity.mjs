#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    html: process.env.XENSONAR_SANITY_HTML || '',
    build: false,
    requireHtml: false,
    skipSetup: true,
    skipTypecheck: true,
    skipRoundtrip: false,
    out: 'reports/xensonar-parallel-refactor-sanity.json',
    md: 'reports/xensonar-parallel-refactor-sanity.md',
    appBaselineSha256: process.env.XENSONAR_APP_BASELINE_SHA256 || '',
    appMaxLines: Number(process.env.XENSONAR_PARALLEL_APP_MAX_LINES || 7050),
    verbose: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--html') args.html = argv[++i] || '';
    else if (arg === '--out') args.out = argv[++i] || args.out;
    else if (arg === '--md') args.md = argv[++i] || args.md;
    else if (arg === '--build') { args.build = true; args.skipSetup = false; }
    else if (arg === '--require-html') args.requireHtml = true;
    else if (arg === '--setup') args.skipSetup = false;
    else if (arg === '--skip-setup') args.skipSetup = true;
    else if (arg === '--skip-typecheck') args.skipTypecheck = true;
    else if (arg === '--skip-roundtrip') args.skipRoundtrip = true;
    else if (arg === '--app-baseline-sha256') args.appBaselineSha256 = argv[++i] || '';
    else if (arg === '--app-max-lines') args.appMaxLines = Number(argv[++i] || args.appMaxLines);
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/run-xensonar-parallel-refactor-sanity.mjs [--setup] [--build] [--html dist/index.html] [--skip-typecheck] [--skip-roundtrip] [--app-baseline-sha256 <sha>] [--out report.json] [--md report.md]\n\nRuns the App.tsx-sparing parallel refactor gate: package import/export payload, Materialspur/Loop fragmentation contracts, Room III node-device path, Wellenstarter micro-orchestration, SpectralForge body/preview cache contracts, performance crisis bindings, and optional built-HTML smoke checks. App.tsx is only measured as a boundary surface; this suite deliberately does not run the App.tsx-refactor extraction gates.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

const root = process.cwd();
const args = parseArgs(process.argv);
const startedAt = new Date().toISOString();
const results = [];

function fileSha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function lineCount(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

function hasScript(scriptName) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return Boolean(pkg.scripts?.[scriptName]);
}

function run(label, command, commandArgs, options = {}) {
  const start = Date.now();
  const display = [command, ...commandArgs].join(' ');
  if (args.verbose) console.error(`[parallel-sanity] ${label}: ${display}`);
  const proc = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 24,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const exitCode = proc.status ?? (proc.error ? 127 : 1);
  const status = exitCode === 0 ? 'pass' : (options.required === false ? 'soft-fail' : 'fail');
  const result = {
    label,
    command: display,
    category: options.category || 'uncategorized',
    required: options.required !== false,
    status,
    exitCode,
    durationMs: Date.now() - start,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-28).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-28).join('\n').trim(),
    spawnError: proc.error ? String(proc.error.message || proc.error) : undefined,
  };
  if (result.spawnError && !result.stderrTail) result.stderrTail = result.spawnError;
  results.push(result);
  if (args.verbose || status === 'fail') {
    console.error(`[parallel-sanity] ${status.toUpperCase()} ${label} (${result.durationMs}ms)`);
    if (result.stderrTail) console.error(result.stderrTail);
    else if (result.stdoutTail) console.error(result.stdoutTail);
  }
  return status === 'pass';
}

function runNpm(label, script, extra = [], options = {}) {
  if (!hasScript(script)) {
    results.push({
      label,
      command: `npm run ${script}`,
      category: options.category || 'uncategorized',
      required: options.required !== false,
      status: options.required === false ? 'soft-fail' : 'fail',
      exitCode: 2,
      durationMs: 0,
      stdoutTail: '',
      stderrTail: `package.json missing script ${script}`,
    });
    return false;
  }
  return run(label, 'npm', ['run', script, ...(extra.length ? ['--', ...extra] : [])], options);
}

const appPath = path.join(root, 'src', 'App.tsx');
const appMetrics = {
  lines: lineCount(appPath),
  sha256: fileSha256(appPath),
  baselineSha256: args.appBaselineSha256 || null,
  baselineMatches: args.appBaselineSha256 ? fileSha256(appPath) === args.appBaselineSha256 : null,
  maxLines: args.appMaxLines,
};
if (appMetrics.lines != null && appMetrics.lines > args.appMaxLines) {
  results.push({
    label: 'App.tsx parallel boundary line-count guard',
    command: `App.tsx lines <= ${args.appMaxLines}`,
    category: 'app-boundary',
    required: true,
    status: 'fail',
    exitCode: 1,
    durationMs: 0,
    stdoutTail: '',
    stderrTail: `App.tsx has ${appMetrics.lines} lines; this parallel lane should not expand App.tsx.`,
  });
}
if (args.appBaselineSha256 && appMetrics.baselineMatches === false) {
  results.push({
    label: 'App.tsx parallel boundary hash guard',
    command: 'sha256(src/App.tsx) equals supplied baseline',
    category: 'app-boundary',
    required: true,
    status: 'fail',
    exitCode: 1,
    durationMs: 0,
    stdoutTail: '',
    stderrTail: `App.tsx hash changed from supplied baseline ${args.appBaselineSha256}.`,
  });
}

if (!args.skipSetup) runNpm('Patch setup / portable toolchain', 'patch:setup', [], { category: 'setup' });

const matrix = [
  { category: 'suite-contract', label: 'Parallel refactor sanity suite contract', script: 'xensonar:check-parallel-refactor-sanity-contract' },
  { category: 'package', label: 'Complete musical package payload contract', script: 'xensonar:check-package-complete-musical-payload-contract' },
  { category: 'package', label: 'Package Station bridge contract', script: 'xensonar:check-package-station-bridge-contract' },
  { category: 'package', label: 'Bass clip workspace package contract', script: 'xensonar:check-bass-clip-workspace-package-contract' },
  { category: 'material/loop', label: 'Loop import fragment contract', script: 'xensonar:check-loop-import-fragment-contract' },
  { category: 'material/loop', label: 'Material fragmentation boundary', script: 'xensonar:check-material-fragmentation-boundary' },
  { category: 'material/loop', label: 'Loop Lane UI state contract', script: 'xensonar:check-loop-lane-ui-state-contract' },
  { category: 'material/loop', label: 'Melodic editor selection-mask contract', script: 'xensonar:check-melodic-editor-selection-mask-contract' },
  { category: 'material/loop', label: 'Melodic runtime behavior probes 311', script: 'xensonar:check-melodic-runtime-behavior-probes-311' },
  { category: 'material/loop', label: 'Loop/drum domain ownership 312', script: 'xensonar:check-loop-drum-domain-ownership-312' },
  { category: 'material/loop', label: 'Loop composition domain ownership 313', script: 'xensonar:check-loop-composition-domain-ownership-313' },
  { category: 'material/loop', label: 'Loop Microto domain ownership 314', script: 'xensonar:check-loop-microto-domain-ownership-314' },
  { category: 'material/loop', label: 'Material loop panel manager boundary', script: 'xensonar:check-material-loop-panel-boundary' },
  { category: 'groove/bass', label: 'Groove/Bass panel manager boundary', script: 'xensonar:check-groove-bass-panel-boundary' },
  { category: 'spectralforge/transport', label: 'SpectralForge TransportBar import/export boundary', script: 'xensonar:check-transport-bar-boundary' },
  { category: 'grid/tuning', label: 'Grid tuning rack editor-domain boundary', script: 'xensonar:check-grid-tuning-rack-boundary' },
  { category: 'material/intake', label: 'Material Intake panel canvas/drag boundary', script: 'xensonar:check-material-intake-panel-boundary' },
  { category: 'material/intake', label: 'Material Intake mask center drag 315', script: 'xensonar:check-material-intake-mask-center-drag-315' },
  { category: 'package/workspace', label: 'Melodic workspace archive codec ownership 316', script: 'xensonar:check-melodic-workspace-archive-codec-ownership-316' },
  { category: 'spectralforge/canvas', label: 'SpectralCanvas HUD/visual helper boundary', script: 'xensonar:check-spectral-canvas-boundary' },
  { category: 'spectralforge/audio', label: 'SpectralForge AudioEngine utility boundary', script: 'xensonar:check-spectralforge-audio-engine-utility-boundary' },
  { category: 'root-follow/audio', label: 'Root-Follow local field automation boundary', script: 'xensonar:check-root-follow-local-field-boundary' },
  { category: 'root-follow/audio', label: 'Root-Follow infrastructure boundary', script: 'xensonar:check-root-follow-infrastructure' },
  { category: 'root-follow/audio', label: 'Root-Follow direct event window boundary', script: 'xensonar:check-root-follow-direct-event-window-boundary' },
  { category: 'root-follow/audio', label: 'Root-Follow active voice runtime boundary', script: 'xensonar:check-root-follow-active-voice-runtime-boundary' },
  { category: 'root-follow/audio', label: 'Root-Follow public facade boundary', script: 'xensonar:check-root-follow-public-facade-boundary' },
  { category: 'root-follow/audio', label: 'Root-Follow audio node registry boundary', script: 'xensonar:check-root-follow-audio-node-registry-boundary' },
  { category: 'spectralforge/state', label: 'SpectralForge store support boundary', script: 'xensonar:check-spectralforge-store-support-boundary' },
  { category: 'spectralforge/routing', label: 'Carrier Integral current sanity', script: 'xensonar:sanity:spectralforge-carrier-integral' },
  { category: 'canonicalforge', label: 'CanonicalForge room contract boundary', script: 'xensonar:check-canonical-forge-room-contract-boundary' },
  { category: 'events', label: 'Typed Xensonar event channels', script: 'xensonar:check-event-channels-contract' },
  { category: 'room3/audio', label: 'Room III UI node aura audio layer', script: 'xensonar:check-room3-ui-node-aura-audio-layer' },
  { category: 'room3/audio', label: 'Room III legacy audio graph boundary', script: 'xensonar:check-room3-legacy-audio-graph-boundary' },
  { category: 'room3/audio', label: 'Room III 8.79 node device audio path', script: 'xensonar:check-room3-879-node-device-audio-path' },
  { category: 'room3/audio', label: 'Myzel synth registry boundary', script: 'xensonar:check-myzel-synth-registry-boundary', optional: true },
  { category: 'wellenstarter', label: 'Wellenstarter micro-orchestrator', script: 'xensonar:check-wave-starter-micro-orchestrator' },
  { category: 'wellenstarter', label: 'Wellenstarter overtone arp runtime contract', script: 'xensonar:check-wave-overtone-arp-contract' },
  { category: 'wellenstarter', label: 'Wellenstarter overtone arp traffic contract', script: 'xensonar:check-wave-overtone-arp-traffic-contract' },
  { category: 'performance', label: 'Performance crisis management contract', script: 'xensonar:check-performance-crisis-management-contract' },
  { category: 'performance', label: 'Performance crisis particle/wave binding', script: 'xensonar:check-performance-crisis-particle-wave-binding', optional: true },
];

for (const item of matrix) {
  runNpm(item.label, item.script, [], { category: item.category, required: item.optional ? false : true });
}

if (!args.skipRoundtrip) {
  runNpm('Package complete musical payload roundtrip', 'xensonar:prove-package-complete-musical-payload-roundtrip', ['--out', 'reports/xensonar-parallel-package-roundtrip.json', '--package-out', 'reports/xensonar-parallel-package-roundtrip.download-package.json'], { category: 'package' });
}

let htmlPath = args.html;
if (args.build) {
  runNpm('Core HTML build', 'patch:html:core', [], { category: 'build' });
  htmlPath = htmlPath || 'dist/index.html';
}
// Do not auto-consume a stale dist/index.html merely because a prior patch
// build left it in the workspace. HTML/browser smoke belongs to explicit
// --build, --html, or --require-html runs; the default source sanity gate
// should remain a fast current-source gate.
if (htmlPath) {
  run('Built HTML: Hauptraum Power sanity', 'node', ['tools/check-hauptraum-power-sanity.mjs', htmlPath], { category: 'html' });
  run('Built HTML: SyntheticForge mount sanity', 'node', ['tools/check-synthetic-forge-mount-sanity.mjs', htmlPath], { category: 'html' });
  run('Built HTML: Room III built markers sanity', 'node', ['tools/check-room3-built-html-sanity.mjs', htmlPath], { category: 'html' });
} else if (args.requireHtml) {
  results.push({
    label: 'Built HTML smoke checks',
    command: 'missing --html or --build',
    category: 'html',
    required: true,
    status: 'fail',
    exitCode: 2,
    durationMs: 0,
    stdoutTail: '',
    stderrTail: 'No built HTML path supplied. Use --build or --html dist/index.html.',
  });
}

const requiredFailures = results.filter((entry) => entry.required && entry.status !== 'pass');
const byCategory = results.reduce((acc, entry) => {
  const bucket = acc[entry.category] || { passed: 0, failed: 0, softFailed: 0, total: 0 };
  bucket.total += 1;
  if (entry.status === 'pass') bucket.passed += 1;
  else if (entry.status === 'soft-fail') bucket.softFailed += 1;
  else bucket.failed += 1;
  acc[entry.category] = bucket;
  return acc;
}, {});

const report = {
  ok: requiredFailures.length === 0,
  startedAt,
  finishedAt: new Date().toISOString(),
  suite: 'xensonar-parallel-refactor-sanity',
  intent: 'App.tsx-sparing checks for independent module refactors before later merge into the active App.tsx-refactor line.',
  inputs: {
    html: htmlPath || null,
    build: args.build,
    skipSetup: args.skipSetup,
    skipTypecheck: args.skipTypecheck,
    skipRoundtrip: args.skipRoundtrip,
  },
  appBoundary: appMetrics,
  summary: {
    total: results.length,
    passed: results.filter((entry) => entry.status === 'pass').length,
    failed: results.filter((entry) => entry.status === 'fail').length,
    softFailed: results.filter((entry) => entry.status === 'soft-fail').length,
  },
  byCategory,
  results,
  failures: requiredFailures.map((entry) => ({ label: entry.label, command: entry.command, stderrTail: entry.stderrTail, stdoutTail: entry.stdoutTail })),
};

fs.mkdirSync(path.dirname(args.out), { recursive: true });
fs.writeFileSync(args.out, JSON.stringify(report, null, 2));
const md = [
  `# Xensonar Parallel Refactor Sanity`,
  ``,
  `- OK: ${report.ok ? 'yes' : 'no'}`,
  `- Started: ${report.startedAt}`,
  `- Finished: ${report.finishedAt}`,
  `- App.tsx lines: ${appMetrics.lines ?? 'n/a'}`,
  `- App.tsx sha256: ${appMetrics.sha256 ?? 'n/a'}`,
  `- Build HTML supplied: ${htmlPath || 'no'}`,
  `- Typecheck skipped: ${args.skipTypecheck ? 'yes' : 'no'}`,
  `- Roundtrip skipped: ${args.skipRoundtrip ? 'yes' : 'no'}`,
  ``,
  `## Category summary`,
  ``,
  ...Object.entries(byCategory).map(([category, value]) => `- ${category}: ${value.passed}/${value.total} pass, ${value.failed} fail, ${value.softFailed} soft-fail`),
  ``,
  `## Failures`,
  ``,
  ...(requiredFailures.length ? requiredFailures.map((entry) => `- **${entry.label}** — \`${entry.command}\`\n  - ${entry.stderrTail || entry.stdoutTail || 'no output'}`) : ['None.']),
  ``,
  `## Full results`,
  ``,
  ...results.map((entry) => `- ${entry.status === 'pass' ? 'PASS' : entry.status === 'soft-fail' ? 'SOFT' : 'FAIL'} · ${entry.category} · ${entry.label} (${entry.durationMs}ms)`),
  ``,
].join('\n');
fs.mkdirSync(path.dirname(args.md), { recursive: true });
fs.writeFileSync(args.md, md);

process.stdout.write(JSON.stringify({ ok: report.ok, summary: report.summary, appBoundary: report.appBoundary, report: args.out, markdown: args.md }, null, 2) + '\n');
if (!report.ok) process.exit(1);
