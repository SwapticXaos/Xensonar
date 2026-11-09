#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  agentsInstructionsPath,
  codexRefactorHarnessVersion,
  focusProfileNames,
  focusProfiles,
  forbiddenRuntimeClaims,
  isKnownFocusProfile,
  radarIndexPaths,
  reportPathsForFocus,
  requiredHarnessScripts,
} from './codex-refactor-harness-contract.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = {
    focus: 'core-refactor',
    all: false,
    list: false,
    runGates: false,
    out: null,
    md: null,
    outExplicit: false,
    mdExplicit: false,
    maxLargest: 18,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--focus') args.focus = argv[++i] || args.focus;
    else if (arg === '--all') args.all = true;
    else if (arg === '--list') args.list = true;
    else if (arg === '--run-gates') args.runGates = true;
    else if (arg === '--out') { args.out = argv[++i] || args.out; args.outExplicit = true; }
    else if (arg === '--md') { args.md = argv[++i] || args.md; args.mdExplicit = true; }
    else if (arg === '--max-largest') args.maxLargest = Number(argv[++i] || args.maxLargest);
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/run-codex-refactor-harness.mjs [--focus <profile>|--all|--list] [--run-gates]\n\nProfiles: ${focusProfileNames().join(', ')}`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.all && (args.outExplicit || args.mdExplicit)) {
    throw new Error('--all writes the radar index paths and per-profile reports; do not combine it with --out or --md.');
  }
  if (!Number.isFinite(args.maxLargest) || args.maxLargest < 1) args.maxLargest = 18;
  if (!args.all && !args.list && !isKnownFocusProfile(args.focus)) {
    throw new Error(`Unknown focus profile ${args.focus}. Known profiles: ${focusProfileNames().join(', ')}`);
  }
  return args;
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readOptional(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function textDigest(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return {
    present: normalized.length > 0,
    bytes: Buffer.byteLength(text, 'utf8'),
    fnv1a32: hash.toString(16).padStart(8, '0'),
  };
}

function walk(dir, acc = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return acc;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

function fileMetrics(rel) {
  const text = read(rel);
  const lines = text.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(text, 'utf8');
  const importCount = (text.match(/^import\s/mg) || []).length;
  const exportCount = (text.match(/^export\s/mg) || []).length;
  return { file: rel, lines, bytes, importCount, exportCount };
}

function shellCommand(commandText) {
  const started = Date.now();
  const proc = spawnSync('/bin/bash', ['-lc', commandText], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 1024 * 1024 * 16,
  });
  return {
    command: commandText,
    status: proc.status === 0 ? 'pass' : 'fail',
    exitCode: proc.status,
    durationMs: Date.now() - started,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-20).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-20).join('\n').trim(),
  };
}

function collectPackageInfo() {
  const pkg = JSON.parse(read('package.json'));
  return {
    name: pkg.name,
    version: pkg.version,
    scriptCount: Object.keys(pkg.scripts || {}).length,
    hasHarnessScripts: requiredHarnessScripts.every((name) => Boolean(pkg.scripts?.[name])),
  };
}

function detectSediment(largest) {
  return largest
    .filter((item) => item.lines >= 900 || item.bytes >= 45000)
    .map((item) => ({
      ...item,
      warning: item.lines >= 1800
        ? 'riesiger Knoten: vor weiterer Extraktion zuerst Zuständigkeiten und runtime contracts lesen'
        : 'großer Knoten: nur dünnen Slice extrahieren und Callsite-Form prüfen',
    }));
}

function buildPrompt({ focus, profile, pkg, largest, sediment, missingPrimaryFiles, agentInstructions }) {
  const largestList = largest.slice(0, 8).map((item) => `- ${item.file}: ${item.lines} Zeilen, ${item.bytes} Bytes`).join('\n');
  const gateList = profile.gates.map((gate) => `- ${gate}`).join('\n');
  const primaryList = profile.primaryFiles.map((file) => `- ${file}${missingPrimaryFiles.includes(file) ? ' (nicht gefunden / ggf. Verzeichnis- oder Namensdrift prüfen)' : ''}`).join('\n');
  return `Du arbeitest in Xensonar ${pkg.version} (${pkg.name}). Zielprofil: ${profile.label}.

AGENTS.md ist die projektweite Codex-Anweisung und muss vor dem task-spezifischen Patchprompt gelesen werden. Der aktuelle Inhalt ist hier eingebettet, damit externe Handoffs nicht ohne Agentenvertrag laufen:

--- AGENTS.md ---
${agentInstructions.trim()}
--- /AGENTS.md ---

Aufgabe: ${profile.intent}

Arbeitsmodus:
1. Lies zuerst AGENTS.md und die Primärdateien; benenne die tatsächlich berührte Grenze.
2. Formuliere vor dem Patch eine Falsifikationsfrage: Welche bestehende Funktion könnte durch den Slice leiser, falscher, größer oder unehrlicher werden?
3. Mache nur einen dünnen Refactor-Slice. Keine Klangrenderer, Scheduler, Zufallspfade, Import-/Export-Payloads oder UI-Labels nebenbei ändern.
4. Wenn zwei Strukturen ähnlich aussehen, entscheide ausdrücklich zwischen technischer Redundanz und musikalisch/künstlerischer Varianz.
5. Erweitere bei klickbarem, hörbarem oder persistiertem Verhalten einen Behaviour-/Contract-Test; reine Markerchecks zählen dort nicht als Beweis.
6. Schreibe am Ende: geändert, nicht geändert, Trade-off, Gates, manuell kreativ zu prüfen.

Primärdateien:
${primaryList}

Auffällige große Knoten:
${largestList}

Sediment-Warnungen: ${sediment.length}

Mindest-Gates für dieses Profil:
${gateList}

Verbotene Kurzschlüsse:
${forbiddenRuntimeClaims.map((line) => `- ${line}`).join('\n')}
`;
}

function writeReport({ args, focus, pkg, agentInstructions, agentInstructionsDigest, sourceFiles }) {
  const profile = focusProfiles[focus];
  const largest = sourceFiles.map(fileMetrics).sort((a, b) => b.lines - a.lines).slice(0, args.maxLargest);
  const sediment = detectSediment(largest);
  const missingPrimaryFiles = profile.primaryFiles.filter((file) => !exists(file));
  const gateResults = [];

  if (args.runGates) {
    gateResults.push(shellCommand('node tools/check-codex-refactor-harness-contract.mjs'));
    for (const gate of profile.gates) gateResults.push(shellCommand(gate));
  }

  const paths = {
    json: args.out || reportPathsForFocus(focus).json,
    markdown: args.md || reportPathsForFocus(focus).markdown,
  };
  const report = {
    ok: gateResults.every((result) => result.status === 'pass'),
    reportKind: 'xensonar-codex-refactor-harness',
    harnessVersion: codexRefactorHarnessVersion,
    generatedAt: new Date().toISOString(),
    baseAssumption: '7.7.58 diff is applied; 7.7.59 added the Codex/refactor harness; 7.7.60 adds AGENTS.md; 7.7.61 separates reusable harness contracts and adds the multi-profile Refactor Radar; 7.7.62 adds the concrete Refactor Candidate Planner.',
    agentsInstructionsPath,
    agentInstructionsDigest,
    focus,
    profile,
    package: pkg,
    missingPrimaryFiles,
    largest,
    sediment,
    forbiddenRuntimeClaims,
    gateResults,
  };
  report.codexPrompt = buildPrompt({ focus, profile, pkg, largest, sediment, missingPrimaryFiles, agentInstructions });

  fs.mkdirSync(path.dirname(path.join(root, paths.json)), { recursive: true });
  fs.writeFileSync(path.join(root, paths.json), JSON.stringify(report, null, 2));
  const md = [
    '# Xensonar Codex Refactor Harness Report',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- package: ${pkg.name}`,
    `- version: ${pkg.version}`,
    `- AGENTS.md: ${agentInstructionsDigest.present ? `present / ${agentInstructionsDigest.bytes} bytes / ${agentInstructionsDigest.fnv1a32}` : 'missing'}`,
    `- focus: ${focus} — ${profile.label}`,
    `- sediment warnings: ${sediment.length}`,
    '',
    '## Codex handoff prompt',
    '',
    '```text',
    report.codexPrompt.trim(),
    '```',
    '',
    '## Largest source/tool files',
    '',
    ...largest.map((item) => `- ${item.file} — ${item.lines} lines / ${item.bytes} bytes`),
    '',
    '## Gate results',
    '',
    ...(gateResults.length ? gateResults.map((result) => `- ${result.status.toUpperCase()} · ${result.command} · ${result.durationMs}ms`) : ['- not run; use `npm run xensonar:codex:refactor-harness:gates` for the selected default profile']),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, paths.markdown), md);
  return { report, paths };
}

function writeRadarIndex({ pkg, reports, agentInstructionsDigest }) {
  const summary = reports.map(({ report, paths }) => ({
    focus: report.focus,
    label: report.profile.label,
    ok: report.ok,
    missingPrimaryFiles: report.missingPrimaryFiles,
    sedimentWarnings: report.sediment.length,
    gatesRun: report.gateResults.length,
    failingGates: report.gateResults.filter((gate) => gate.status !== 'pass').map((gate) => gate.command),
    report: paths.json,
    markdown: paths.markdown,
  }));
  const index = {
    ok: summary.every((item) => item.ok) && summary.every((item) => item.missingPrimaryFiles.length === 0),
    reportKind: 'xensonar-codex-refactor-radar',
    harnessVersion: codexRefactorHarnessVersion,
    generatedAt: new Date().toISOString(),
    package: pkg,
    agentInstructionsDigest,
    profileCount: summary.length,
    profiles: summary,
  };
  fs.writeFileSync(path.join(root, radarIndexPaths.json), JSON.stringify(index, null, 2));
  const md = [
    '# Xensonar Codex Refactor Radar',
    '',
    `- ok: ${index.ok}`,
    `- generatedAt: ${index.generatedAt}`,
    `- harnessVersion: ${index.harnessVersion}`,
    `- package: ${pkg.name}`,
    `- version: ${pkg.version}`,
    `- profiles: ${index.profileCount}`,
    `- AGENTS.md: ${agentInstructionsDigest.present ? `present / ${agentInstructionsDigest.bytes} bytes / ${agentInstructionsDigest.fnv1a32}` : 'missing'}`,
    '',
    '## Profile matrix',
    '',
    '| Focus | Label | Missing primary files | Sediment warnings | Gates run | Report |',
    '|---|---|---:|---:|---:|---|',
    ...summary.map((item) => `| ${item.focus} | ${item.label} | ${item.missingPrimaryFiles.length} | ${item.sedimentWarnings} | ${item.gatesRun} | ${item.markdown} |`),
    '',
    '## Lesart',
    '',
    'Der Radar ist kein Klang- oder UI-Beweis. Er ist die Vorauswahl-Schicht für dünne, falsifizierbare Refactor-Slices: welche Grenze wird berührt, welche Primärdateien müssen gelesen werden, welche Gates gehören mindestens dazu, und wo sitzen große Sedimentknoten.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, radarIndexPaths.markdown), md);
  return index;
}

const args = parseArgs(process.argv);
if (args.list) {
  console.log(JSON.stringify({ ok: true, profiles: focusProfileNames().map((focus) => ({ focus, ...focusProfiles[focus] })) }, null, 2));
  process.exit(0);
}

const pkg = collectPackageInfo();
const agentInstructions = readOptional(agentsInstructionsPath);
const agentInstructionsDigest = textDigest(agentInstructions);
const sourceFiles = [...walk('src'), ...walk('tools')]
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => exists(file));

const focuses = args.all ? focusProfileNames() : [args.focus];
const reports = focuses.map((focus) => writeReport({ args: { ...args, focus, out: null, md: null }, focus, pkg, agentInstructions, agentInstructionsDigest, sourceFiles }));
const radarIndex = args.all ? writeRadarIndex({ pkg, reports, agentInstructionsDigest }) : null;
const ok = reports.every(({ report }) => report.ok) && (!radarIndex || radarIndex.ok);

console.log(JSON.stringify(args.all
  ? { ok, radar: radarIndexPaths.json, markdown: radarIndexPaths.markdown, profiles: reports.length }
  : { ok, focus: reports[0].report.focus, report: reports[0].paths.json, markdown: reports[0].paths.markdown, sedimentWarnings: reports[0].report.sediment.length }, null, 2));
process.exit(ok ? 0 : 1);
