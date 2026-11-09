#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const args = {
  build: false,
  requireHtml: false,
  withTypecheck: false,
  out: 'reports/carrier-melodic-import-sanity.json',
  md: 'reports/carrier-melodic-import-sanity.md',
  verbose: false,
  only: null,
};
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === '--build') args.build = true;
  else if (arg === '--require-html') args.requireHtml = true;
  else if (arg === '--with-typecheck') args.withTypecheck = true;
  else if (arg === '--out') args.out = process.argv[++i] || args.out;
  else if (arg === '--md') args.md = process.argv[++i] || args.md;
  else if (arg === '--verbose') args.verbose = true;
  else if (arg === '--only') args.only = process.argv[++i] || args.only;
  else if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
  else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node tools/run-carrier-melodic-import-sanity.mjs [--only id] [--build] [--require-html] [--with-typecheck] [--out file] [--md file]');
    process.exit(0);
  } else throw new Error(`Unknown argument: ${arg}`);
}

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const includes = (source, needle) => source.includes(needle);
const sources = new Map();
function source(file) {
  if (!sources.has(file)) sources.set(file, read(file));
  return sources.get(file);
}
function textCheck(id, label, specs, category = 'contract') {
  const failures = [];
  for (const spec of specs) {
    const text = source(spec.file);
    const ok = spec.not ? !includes(text, spec.needle) : includes(text, spec.needle);
    if (!ok) failures.push(`${spec.label}: ${spec.not ? 'forbidden' : 'missing'} ${spec.needle}`);
  }
  return { id, label, category, status: failures.length ? 'fail' : 'pass', exitCode: failures.length ? 1 : 0, durationMs: 0, stdoutTail: failures.join('\n'), stderrTail: '' };
}
const must = (file, needle, label) => ({ file, needle, label });
const mustNot = (file, needle, label) => ({ file, needle, label, not: true });

const textChecks = {
  'menu-routing': () => textCheck('menu-routing', 'Carrier→Melodic menu routing', [
    must('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts', "label: 'Fretless-Feld'", 'renamed former last-hearing mode'),
    must('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts', "label: 'Raw Audio'", 'raw-audio mode label'),
    mustNot('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts', "label: 'gekörnt'", 'old misleading grained label'),
    mustNot('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts', "label: 'letzte Hörweise'", 'old misleading last-hearing label'),
    must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'Pinke-Spur-Modus', 'shared four-mode selector label'),
    must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'Fretless-Feld, zerstreut, Raw Audio oder monoton', 'dialog explains all four modes'),
    must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', "const confirmLabel = 'An Melodic Loop senden';", 'single confirm wording'),
    must('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts', "setCarrierPinkVariant('grained')", 'raw handoff preselects Raw Audio mode'),
    must('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts', 'setShowMaterialImportMenu(true)', 'handoffs open import menu'),
    must('src/features/l3lab/canonicalForge/melodicImportTransactions.ts', 'executeCarrierMelodicImport({', 'commit transaction delegates to executor'),
    mustNot('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts', 'rawCarrierAutoImportInFlightRef', 'raw handoff must not auto-import anymore'),
    must('src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts', 'uiButtonLabel: "An Melodic Loop senden"', 'raw handoff keeps unified button label'),
    must('src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts', 'usesAudioPaintImportDetail: true', 'raw handoff stores field detail for four-mode dialog'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', 'carrierModeCandidate', 'raw carrier summaries can carry field detail'),
    must('src/features/l3lab/canonicalForge/materialBaseActions.ts', "materialPitchMode: rawCarrierMaterial ? 'source-granular' : 'grid-elastic'", 'raw carrier remains source-granular'),
  ]),
  'source-contract': () => textCheck('source-contract', 'Carrier→Melodic source contract', [
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', 'export type CarrierMelodicImportModeAvailability', 'mode availability type is centralized'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', 'export const CARRIER_MELODIC_IMPORT_MODES', 'single mode list exists'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', 'export function materialImportEntryUsesCarrierModeMenu', 'carrier menu detection is centralized'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', 'export function resolveCarrierMelodicImportModeAvailability(', 'single mode availability resolver exists'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', "kind: 'raw-audio'", 'resolver distinguishes raw-audio mode'),
    must('src/features/l3lab/canonicalForge/materialImportChannel.ts', "kind: 'structured-carrier'", 'resolver distinguishes structured modes'),
    must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'resolveCarrierMelodicImportModeAvailabilityMap', 'dialog uses shared availability map'),
    must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'modeAvailabilityById[variant.id]', 'each option is driven by shared availability'),
    mustNot('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'variantIsRawAudio ? !rawAudioReady : !structuredCarrierModesReady', 'dialog must not duplicate availability logic'),
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'resolveCarrierMelodicImportModeAvailability(entry, args.mode)', 'executor uses shared selected-mode availability'),
    mustNot('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'entry.rawAudioReady', 'executor must not duplicate raw readiness logic'),
  ]),
  'ui-liveness': () => {
    const base = textCheck('ui-liveness', 'Carrier→Melodic UI liveness sanity', [
      must('src/features/l3lab/canonicalForge/MelodicSampleLibraryPanel.tsx', 'if (showMaterialImportMenu) setSampleLibraryOpen(true);', 'dialog forces sample library open'),
      must('src/features/l3lab/canonicalForge/MelodicSampleLibraryPanel.tsx', '<MaterialImportDialog\n        open={showMaterialImportMenu}', 'dialog is mounted outside collapsed body'),
      must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'data-xensonar-material-import-dialog-layout', 'dialog layout marker exists'),
      must('src/features/l3lab/canonicalForge/MaterialImportDialog.tsx', 'disabled={!selectedEntry || !selectedModeReady || busy}', 'confirm is gated by selected mode readiness'),
      must('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx', 'Melodic Loop öffnet den gemeinsamen Importdialog', 'signal section describes dialog behavior'),
      must('package.json', 'xensonar:sanity:carrier-melodic-import', 'sanity suite script is registered'),
    ], 'lamp-liveness');
    const htmlPath = path.join(root, 'dist/index.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      for (const marker of ['An Melodic Loop senden', 'Fretless-Feld', 'Raw Audio']) {
        if (!html.includes(marker)) base.stdoutTail += `${base.stdoutTail ? '\n' : ''}built-html missing ${marker}`;
      }
      if (base.stdoutTail) base.status = 'fail';
    } else if (args.requireHtml) {
      base.status = 'fail';
      base.stdoutTail += `${base.stdoutTail ? '\n' : ''}dist/index.html missing after requested HTML sanity run`;
    }
    base.exitCode = base.status === 'pass' ? 0 : 1;
    return base;
  },
  'executor-unification': () => textCheck('executor-unification', 'Carrier→Melodic executor unification', [
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'export type CarrierMelodicImportExecutionResult', 'executor exposes result contract'),
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'resolveCarrierMelodicImportModeAvailability(entry, args.mode)', 'executor resolves availability once'),
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', "availability.kind === 'structured-carrier'", 'structured branch selected by resolver kind'),
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'cloneLoopComposerState(args.loopComposer)', 'structured branch preflights on cloned composer'),
    must('src/features/l3lab/canonicalForge/carrierMelodicImportExecutor.ts', 'await args.onImportMaterialToMelodicLoop(entry.id, args.anchorHz, args.lanePlacement)', 'raw branch uses material importer with explicit lane placement through same executor'),
    must('src/features/l3lab/canonicalForge/melodicImportTransactions.ts', "import { executeCarrierMelodicImport } from './carrierMelodicImportExecutor';", 'import transaction owns executor delegation'),
    must('src/features/l3lab/canonicalForge/melodicImportTransactions.ts', 'const result = await executeCarrierMelodicImport({', 'commit transaction delegates execution'),
    mustNot('src/features/l3lab/canonicalForge/useMelodicMaterialImportGateway.ts', 'const useRawAudioMode =', 'commit must not locally decide raw mode'),
  ]),
};

function runCommand(id, label, commandParts, category) {
  const started = Date.now();
  const [command, ...commandArgs] = commandParts;
  if (args.verbose) console.error(`[carrier-melodic-import-sanity] ${label}: ${commandParts.join(' ')}`);
  const proc = spawnSync(command, commandArgs, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 24, env: { ...process.env, FORCE_COLOR: '0' } });
  return {
    id,
    label,
    category,
    command: commandParts.join(' '),
    status: proc.status === 0 ? 'pass' : 'fail',
    exitCode: proc.status,
    durationMs: Date.now() - started,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-24).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-24).join('\n').trim(),
  };
}

const commandChecks = [
  ['carrier-pink-handoff', 'Carrier pink handoff direct apply', ['npm', 'run', 'xensonar:check-carrier-pink-handoff-direct-apply'], 'handoff'],
  ['carrier-raw-handoff', 'Carrier raw melodic handoff direct import', ['npm', 'run', 'xensonar:check-carrier-raw-melodic-handoff-direct-import'], 'handoff'],
  ['carrier-core-six-surface', 'Carrier core six hearing surface', ['npm', 'run', 'xensonar:check-spectralforge-carrier-core-six-surface-7743'], 'core-surface'],
  ['root-follow-hybrid', 'Root-Follow hybrid event contract', ['npm', 'run', 'xensonar:check-root-follow-hybrid-event-contract'], 'regression-neighbor'],
  ['pink-variant-registry', 'Carrier pink variant registry', ['node', 'tools/check-spectralforge-carrier-integral-pink-variants-5116.mjs'], 'variant-registry'],
];
const buildChecks = [
  ['build', 'Vite HTML build', ['npm', 'run', 'build'], 'build'],
  ['inspect-html', 'HTML inspect', ['npm', 'run', 'inspect:html'], 'build'],
  ['html-size', 'HTML size threshold', ['npm', 'run', 'assert:html-budget'], 'build'],
];

const startedAt = new Date().toISOString();
const results = [];
if (args.withTypecheck) results.push(runCommand('typecheck', 'TypeScript app typecheck', ['npm', 'run', 'typecheck'], 'typescript'));
if (args.only) {
  if (!textChecks[args.only]) throw new Error(`Unknown --only check: ${args.only}`);
  results.push(textChecks[args.only]());
} else {
  results.push(...Object.values(textChecks).map((fn) => fn()));
  for (const [id, label, command, category] of commandChecks) results.push(runCommand(id, label, command, category));
  if (args.build) {
    for (const [id, label, command, category] of buildChecks) results.push(runCommand(id, label, command, category));
    results.push(textChecks['ui-liveness']());
  }
}
for (const result of results) {
  if (result.status === 'fail' || args.verbose) {
    console.error(`[carrier-melodic-import-sanity] ${result.status.toUpperCase()} ${result.label}`);
    if (result.stderrTail) console.error(result.stderrTail);
    else if (result.stdoutTail) console.error(result.stdoutTail);
  }
}
const failed = results.filter((result) => result.status !== 'pass');
const summary = { total: results.length, passed: results.length - failed.length, failed: failed.length };
const claimBoundaries = {
  canClaim: [
    'Carrier Integral exposes one unified "An Melodic Loop senden" route into the shared pink-spur import menu.',
    'The four import modes are controlled by a shared availability resolver rather than manual lamp-style user checks.',
    'The sanity run checks dialog mount visibility, mode availability, raw handoff routing, structured carrier routing, and built HTML smoke markers when --build is used.',
  ],
  cannotClaim: [
    'This does not judge Klangqualität, musical usefulness, carrier timbre identity, or whether a mode is artistically preferable.',
    'This does not prove every browser/audio scheduling edge case; it is a liveness and contract gate for the route.',
  ],
  creativeDirectorHandoff: ['The user should evaluate sound, musical fit, visual coherence, and UI feel, not whether the dialog/button lamp turns on.'],
};
const report = { ok: failed.length === 0, reportKind: 'carrier-melodic-import-sanity', generatedAt: new Date().toISOString(), startedAt, summary, claimBoundaries, results };
fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(root, args.md), [
  '# Carrier → Melodic import sanity', '',
  `- ok: ${report.ok}`, `- total: ${summary.total}`, `- passed: ${summary.passed}`, `- failed: ${summary.failed}`, '',
  '## What this sanity suite can claim', ...claimBoundaries.canClaim.map((line) => `- ${line}`), '',
  '## What this sanity suite cannot claim', ...claimBoundaries.cannotClaim.map((line) => `- ${line}`), '',
  '## Creative Director handoff', ...claimBoundaries.creativeDirectorHandoff.map((line) => `- ${line}`), '',
  '## Results', ...results.map((result) => `- ${result.status.toUpperCase()} · ${result.label} · ${result.durationMs}ms`), '',
].join('\n'));
console.log(JSON.stringify({ ok: report.ok, summary, report: args.out, markdown: args.md }, null, 2));
process.exit(report.ok ? 0 : 1);
