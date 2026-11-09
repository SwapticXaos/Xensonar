#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { CURRENT_LINE_CANONICAL_GATE_SCRIPTS } from './current-line-gate-manifest.mjs';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const lineCount = (text) => text.split(/\r?\n/).length;

function parseArgs(argv) {
  const args = {
    out: 'reports/xensonar-development-basis.json',
    md: 'reports/xensonar-development-basis.md',
    minLines: 900,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i] || args.out;
    else if (arg === '--md') args.md = argv[++i] || args.md;
    else if (arg === '--min-lines') args.minLines = Number(argv[++i] || args.minLines);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/report-xensonar-development-basis.mjs [--out reports/xensonar-development-basis.json] [--md reports/xensonar-development-basis.md] [--min-lines 900]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function sourceFiles() {
  return walk(path.join(root, 'src'))
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => path.relative(root, file).split(path.sep).join('/'));
}

function largestSourceBodies(minLines) {
  return sourceFiles()
    .map((rel) => {
      const text = read(rel);
      return { file: rel, lines: lineCount(text) };
    })
    .filter((item) => item.lines >= minLines)
    .sort((a, b) => b.lines - a.lines);
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const args = parseArgs(process.argv);
const pkg = JSON.parse(read('package.json'));
const vite = read('vite.config.ts');
const appMain = read('src/features/xensonar/layout/AppMainContent.tsx');
const refactorSuite = read('tools/run-xensonar-refactor-sanity-suite.mjs');
const currentLineGateManifest = read('tools/current-line-gate-manifest.mjs');

const performanceCrisisFiles = [
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  'src/features/xensonar/performanceCrisis/usePerformanceCrisisStableLaneDiagnostics.ts',
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisRootFollowTab.tsx',
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisParticleWaveTabs.tsx',
  'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisPanelControls.tsx',
  'src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts',
].filter(exists).map((file) => ({ file, lines: lineCount(read(file)) }));

const buildProfiles = [
  {
    name: 'full',
    meaning: 'complete instrument + diagnostic surfaces + Xenpolar/Irrlicht extras runtime',
    evidence: hasAll(vite, ['const buildBody = requestedBuildBody || (coreTestBuildEnabled ? "core" : "full")', 'diagnosticSurfacesEnabled', 'extrasEnabled = !coreTestBuildEnabled']),
  },
  {
    name: 'core-test',
    meaning: 'routine core HTML without diagnostic surfaces and without live Xenpolar/Irrlicht runtime ballast',
    evidence: hasAll(vite, ['XENSONAR_CORE_TEST_BUILD', 'xenpolarExtrasBridge.core.ts', 'useAppXenpolarGameArenaRuntimeBoundary.core.ts']),
  },
  {
    name: 'xensonar-only / nodal-patch-basis',
    meaning: 'narrow bridge profiles for reduced room bodies / node-patch basis work',
    evidence: hasAll(vite, ['xensonar-only', 'nodal-patch-basis', 'xenpolarExtrasBridge.xensonarOnly.ts']),
  },
];

const canonicalGates = CURRENT_LINE_CANONICAL_GATE_SCRIPTS.map((script) => ({
  script,
  command: pkg.scripts?.[script] || null,
  registered: Boolean(pkg.scripts?.[script]),
}));

const boundaries = {
  diagnosticSurfaces: {
    status: 'optional/lazy surface; runtime policy props remain core',
    evidence: appMain.includes('PerformanceCrisisManagementPanelLazy') &&
      appMain.includes('XENSONAR_DIAGNOSTIC_SURFACES_ENABLED') &&
      !appMain.includes("import { PerformanceCrisisManagementPanel } from '../performanceCrisis/ui/PerformanceCrisisManagementPanel'"),
  },
  xenpolarExtras: {
    status: 'full runtime in full build, dormant/no-op surface in core-test build',
    evidence: vite.includes('useAppXenpolarGameArenaRuntimeBoundary.core.ts') && vite.includes('xenpolarExtrasBridge.full.ts'),
  },
  refactorSuite: {
    status: 'current-line bridge; old 6.9.x App.tsx extraction matrix is historical, not canonical',
    evidence: refactorSuite.includes('historical 6.9.x App.tsx extraction matrix') &&
      refactorSuite.includes('CURRENT_LINE_GATE_SCRIPTS') &&
      currentLineGateManifest.includes('xensonar:sanity:parallel-refactor'),
  },
};

const noTouchZones = [
  'src/App.tsx',
  'src/features/l3lab/spectralForge/audio/AudioEngine.ts',
  'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts',
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'src/features/xensonar/material/useRootFollowLoopPlayback.ts',
];

const safeNextBranches = [
  {
    name: 'performance-crisis-diagnostics-subhook-split',
    reason: 'usePerformanceCrisisStableLaneDiagnostics is now the largest local diagnostic graph; split by probe family without touching runtime policies.',
    allowed: ['src/features/xensonar/performanceCrisis/usePerformanceCrisisStableLaneDiagnostics.ts', 'new performanceCrisis/*Diagnostics.ts helpers'],
    forbidden: noTouchZones,
  },
  {
    name: 'check-landscape-taxonomy',
    reason: 'many checks remain historical/shape-oriented; classify before consolidation or deletion.',
    allowed: ['tools/*check*.mjs', 'reports/*', 'docs/*'],
    forbidden: ['src/** runtime behavior changes', 'check deletion without replacement proof'],
  },
  {
    name: 'spectralforge-ui-viewmodel-boundary',
    reason: 'SpectralCanvas/Transport/Carrier panels remain large UI bodies; start with view-model extraction, not AudioEngine.',
    allowed: ['src/features/l3lab/spectralForge/components/*', 'new view-model helpers'],
    forbidden: ['src/features/l3lab/spectralForge/audio/AudioEngine.ts', 'root-follow renderer paths'],
  },
  {
    name: 'loop-domain-facade-manifest',
    reason: 'loopDrumDomain remains a broad public bone; reduce future risk by introducing explicit facade/export categories before callsite migration.',
    allowed: ['src/features/l3lab/canonicalForge/loopDrumDomain.ts', 'new loopDrum* facade/type/helper files'],
    forbidden: ['broad callsite rewrites in the same patch', 'melodic-loop behavior changes'],
  },
];

const report = {
  ok: Object.values(boundaries).every((entry) => entry.evidence) && canonicalGates.every((gate) => gate.registered),
  reportKind: 'xensonar-development-basis-map',
  generatedAt: new Date().toISOString(),
  baseline: '3.2.91.7.5.131 development-basis orientation layer',
  intent: 'Give future agents/chats a current-line map before changing runtime code: build profiles, canonical gates, no-touch zones, large bodies, and safe branch candidates.',
  buildProfiles,
  canonicalGates,
  boundaries,
  performanceCrisisFiles,
  largestSourceBodies: largestSourceBodies(args.minLines),
  noTouchZones,
  safeNextBranches,
};

fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));

const md = [
  '# Xensonar development basis map',
  '',
  `- ok: ${report.ok}`,
  `- generatedAt: ${report.generatedAt}`,
  `- baseline: ${report.baseline}`,
  '',
  '## Intent',
  report.intent,
  '',
  '## Build profiles',
  ...buildProfiles.map((profile) => `- ${profile.evidence ? 'OK' : 'MISSING'} · ${profile.name}: ${profile.meaning}`),
  '',
  '## Canonical gates',
  ...canonicalGates.map((gate) => `- ${gate.registered ? 'OK' : 'MISSING'} · ${gate.script}`),
  '',
  '## Current boundaries',
  ...Object.entries(boundaries).map(([name, boundary]) => `- ${boundary.evidence ? 'OK' : 'MISSING'} · ${name}: ${boundary.status}`),
  '',
  '## Performance crisis local bodies',
  ...performanceCrisisFiles.map((item) => `- ${item.lines} · ${item.file}`),
  '',
  `## Largest source bodies (>= ${args.minLines} lines)`,
  ...report.largestSourceBodies.map((item) => `- ${item.lines} · ${item.file}`),
  '',
  '## No-touch zones for routine refactor',
  ...noTouchZones.map((file) => `- ${file}`),
  '',
  '## Safe next branch candidates',
  ...safeNextBranches.flatMap((branch) => [
    `- ${branch.name}: ${branch.reason}`,
    `  - allowed: ${branch.allowed.join('; ')}`,
    `  - forbidden: ${branch.forbidden.join('; ')}`,
  ]),
  '',
].join('\n');
fs.writeFileSync(path.join(root, args.md), md);

console.log(JSON.stringify({ ok: report.ok, report: args.out, markdown: args.md, largestSourceBodies: report.largestSourceBodies.length }, null, 2));
if (!report.ok) process.exit(1);
