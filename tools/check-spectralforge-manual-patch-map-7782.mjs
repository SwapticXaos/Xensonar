#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const docPath = path.join(root, 'docs/SPECTRALFORGE_MANUAL_PATCH_MAP.md');
const reportJsonPath = path.join(root, 'reports/spectralforge-manual-patch-map-7782.json');
const reportMdPath = path.join(root, 'reports/spectralforge-manual-patch-map-7782.md');

const requiredStrings = [
  '# SpectralForge Manual Patch Map — Xensonar 3.2.91-7.7.82',
  'Antonia ist die Branch-A-/Linienkörper-Lesung.',
  'Nicht wieder `Antonia Voll` und `Antonia Glatt` als aktive Doppelung einführen.',
  'Refactor darf Klangvarianz nicht eindampfen.',
  'Beweist nicht Klickverhalten, Klang, Persistenz, Export oder Browser-DOM-Interaktion.',
  'TransportBar',
  'Toolbar',
  'ToolSettings',
  'SpectralCanvas Viewport / Navigator',
  'MaterialLibrary',
  'CustomStampLibrary',
  'Paketstation / Import / Export',
  'Preview / Playback / AudioEngine',
  'Minimaler manueller Patchablauf',
  'Wann ein Patch abgebrochen werden sollte',
];

const requiredCommands = [
  'npm run xensonar:sanity:spectralforge-ui-boundary',
  'npm run xensonar:check-spectralforge-antonia-branch-a-single-surface-7775',
  'npm run xensonar:check-pitch-axis-truth-probe-7745',
  'npm run xensonar:check-spectralforge-carrier-core-six-surface-7743',
  'npm run xensonar:check-spectralforge-ui-boundary-sanity-proof-labels-7781',
];

function assertFileExists(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root, file)}`);
}

function countHeading(text, prefix) {
  return text.split('\n').filter((line) => line.startsWith(prefix)).length;
}

assertFileExists(docPath);
const doc = fs.readFileSync(docPath, 'utf8');
const failures = [];
for (const value of requiredStrings) {
  if (!doc.includes(value)) failures.push(`missing required text: ${value}`);
}
for (const value of requiredCommands) {
  if (!doc.includes(value)) failures.push(`missing required command: ${value}`);
}
const h2Count = countHeading(doc, '## ');
if (h2Count < 10) failures.push(`expected at least 10 second-level sections, found ${h2Count}`);
if (doc.includes('Antonia Voll ist die aktive')) failures.push('forbidden wording suggests Antonia Voll as active surface');
if (doc.includes('Static Checks beweisen Klang')) failures.push('forbidden wording overclaims static checks as sound proof');

const report = {
  ok: failures.length === 0,
  reportKind: 'spectralforge-manual-patch-map-7782',
  generatedAt: new Date().toISOString(),
  docPath: 'docs/SPECTRALFORGE_MANUAL_PATCH_MAP.md',
  summary: {
    requiredStrings: requiredStrings.length,
    requiredCommands: requiredCommands.length,
    h2Count,
    failures: failures.length,
  },
  proofClass: {
    primary: 'documentation-shape',
    secondary: 'manual-maintenance-map',
    cannotProve: [
      'runtime behaviour',
      'browser clickability',
      'sound identity',
      'persistence correctness',
      'export/import payload correctness',
    ],
  },
  failures,
};

fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + '\n');
const md = [
  '# SpectralForge Manual Patch Map Check — 7.7.82',
  '',
  `- ok: ${report.ok}`,
  `- generatedAt: ${report.generatedAt}`,
  `- doc: ${report.docPath}`,
  `- h2Count: ${h2Count}`,
  `- failures: ${failures.length}`,
  '',
  '## Proof boundary',
  '',
  '- primary: documentation-shape',
  '- secondary: manual-maintenance-map',
  '- cannot prove runtime behaviour, browser clickability, sound identity, persistence correctness or export/import payload correctness.',
  '',
  '## Failures',
  '',
  failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- none',
  '',
].join('\n');
fs.writeFileSync(reportMdPath, md);

if (!report.ok) {
  console.error(`[spectralforge-manual-patch-map-7782] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spectralforge-manual-patch-map-7782] PASS');
