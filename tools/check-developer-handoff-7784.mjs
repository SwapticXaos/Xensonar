#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const reportJsonPath = path.join(root, 'reports/developer-handoff-7784.json');
const reportMdPath = path.join(root, 'reports/developer-handoff-7784.md');

const requiredDocs = [
  'docs/DEVELOPER_HANDOFF.md',
  'docs/MANUAL_PATCH_RECIPES.md',
  'docs/CURRENT_LINE_STATUS.md',
  'docs/KNOWN_RISKS_FOR_HUMAN_DEVELOPMENT.md',
  'docs/CHECKS_GUIDE.md',
  'docs/FIRST_TASKS_FOR_PROGRAMMER.md',
  'docs/SPECTRALFORGE_MANUAL_PATCH_MAP.md',
];

const requiredScripts = [
  'xensonar:check-developer-handoff-7784',
  'xensonar:sanity:spectralforge-ui-boundary',
  'xensonar:check-spectralforge-antonia-branch-a-single-surface-7775',
  'xensonar:check-pitch-axis-truth-probe-7745',
  'xensonar:codex:runtime-touch-guard',
  'xensonar:codex:refactor-delta',
];

const docMarkers = {
  'docs/DEVELOPER_HANDOFF.md': [
    'manual maintenance line 3.2.91-7.7.84',
    'Antonia is the Branch-A / Linienkörper reading.',
    'Do not reintroduce `Antonia Voll` and `Antonia Glatt` as active UI split.',
    'do not prove sound identity or timing correctness',
    'When to stop a patch',
  ],
  'docs/MANUAL_PATCH_RECIPES.md': [
    'Recipe: Change a SpectralForge UI label',
    'Recipe: Change a carrier hearing mode',
    'Manual listening is required',
    'Antonia = Branch-A / Linienkörper reading.',
    'Every new check should state what it cannot prove.',
  ],
  'docs/CURRENT_LINE_STATUS.md': [
    'Current Line Status — Xensonar 3.2.91-7.7.84',
    'Guard baseline refreshed in `3.2.91-7.7.83`.',
    'Not done',
    'broad musical refactors',
  ],
  'docs/KNOWN_RISKS_FOR_HUMAN_DEVELOPMENT.md': [
    'Refactor can destroy musical variance',
    'Antonia surface confusion',
    'Static sanity is overtrusted',
    'AudioEngine becomes a casual refactor target',
    'Paketstation payload loss',
  ],
  'docs/CHECKS_GUIDE.md': [
    'source-shape',
    'static-boundary',
    'browser-dom',
    'behavioural-audio-export',
    'Do not overclaim them.',
  ],
  'docs/FIRST_TASKS_FOR_PROGRAMMER.md': [
    'Safe first tasks',
    'Not as first tasks',
    '`AudioEngine.ts` refactor',
    'Good first success definition',
  ],
};

const forbiddenClaims = [
  'static checks prove sound',
  'source-shape proves browser behaviour',
  'Antonia Voll is the active Antonia',
  'legacy-supernote-5.69 is the active Antonia',
  'safe to refactor AudioEngine casually',
];

const failures = [];
const warnings = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const exists = (file) => fs.existsSync(file);

for (const doc of requiredDocs) {
  if (!exists(doc)) failures.push(`missing required doc: ${doc}`);
}

for (const [doc, markers] of Object.entries(docMarkers)) {
  const text = read(doc);
  for (const marker of markers) {
    if (!text.includes(marker)) failures.push(`${doc} missing marker: ${marker}`);
  }
  for (const forbidden of forbiddenClaims) {
    if (text.includes(forbidden)) failures.push(`${doc} contains forbidden overclaim: ${forbidden}`);
  }
}

const pkg = JSON.parse(read('package.json') || '{}');
if (pkg.version !== '3.2.91-7.7.84') failures.push(`package version ${pkg.version} != 3.2.91-7.7.84`);
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script: ${script}`);
}

const contract = read('tools/codex-refactor-harness-contract.mjs');
if (!contract.includes("codexRefactorHarnessVersion = '3.2.91-7.7.84'")) {
  failures.push('codexRefactorHarnessVersion is not 3.2.91-7.7.84');
}
if (!contract.includes("'xensonar:check-developer-handoff-7784'")) {
  failures.push('requiredHarnessScripts missing xensonar:check-developer-handoff-7784');
}

const agents = read('AGENTS.md');
for (const marker of ['Developer handoff / manual maintenance contract', 'Antonia is the Branch-A / Linienkörper reading', 'source-shape check as evidence of musical behaviour']) {
  if (!agents.includes(marker)) failures.push(`AGENTS.md missing marker: ${marker}`);
}

const allDocs = requiredDocs.map((doc) => read(doc)).join('\n\n');
for (const marker of [
  'AudioEngine.ts',
  'Paketstation',
  'Runtime Touch Guard',
  'Delta Guard',
  'Patch Scope Guard',
  'Antonia',
  'Bert',
  'Cecilia',
]) {
  if (!allDocs.includes(marker)) warnings.push(`handoff corpus does not mention ${marker}`);
}

const report = {
  ok: failures.length === 0,
  reportKind: 'developer-handoff-7784',
  generatedAt: new Date().toISOString(),
  version: '3.2.91-7.7.84',
  summary: {
    requiredDocs: requiredDocs.length,
    requiredScripts: requiredScripts.length,
    failures: failures.length,
    warnings: warnings.length,
  },
  proofClass: {
    primary: 'documentation-shape',
    secondary: 'manual-maintenance-handoff',
    cannotProve: [
      'browser interaction',
      'sound identity',
      'preview timing',
      'persistence correctness',
      'export/import payload correctness',
    ],
  },
  docs: requiredDocs,
  failures,
  warnings,
};

fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(reportMdPath, [
  '# Developer Handoff Check — 7.7.84',
  '',
  `- ok: ${report.ok}`,
  `- generatedAt: ${report.generatedAt}`,
  `- requiredDocs: ${requiredDocs.length}`,
  `- failures: ${failures.length}`,
  `- warnings: ${warnings.length}`,
  '',
  '## Proof boundary',
  '',
  '- primary: documentation-shape',
  '- secondary: manual-maintenance-handoff',
  '- cannot prove browser interaction, sound identity, preview timing, persistence correctness, or export/import payload correctness.',
  '',
  '## Failures',
  '',
  failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- none',
  '',
  '## Warnings',
  '',
  warnings.length ? warnings.map((warning) => `- ${warning}`).join('\n') : '- none',
  '',
].join('\n'));

if (!report.ok) {
  console.error(`[developer-handoff-7784] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[developer-handoff-7784] PASS');
