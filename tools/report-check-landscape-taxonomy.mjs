#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { currentLineGateCheckFileSet } from './current-line-gate-manifest.mjs';

const root = process.cwd();
const toolsDir = path.join(root, 'tools');
const defaultJson = 'reports/check-landscape-taxonomy.json';
const defaultMd = 'reports/CHECK_LANDSCAPE_TAXONOMY.md';

const CATEGORY_DEFINITIONS = {
  'current-line-gate': 'Part of the current 7.5.x canonical refactor/build-profile gate surface.',
  'behavioral-execution-test': 'Executes code, performs a runtime/proof run, or validates behavior beyond static source shape.',
  'integration-smoke-test': 'Exercises a mounted/build/runtime-ish integration surface or roundtrip-style flow.',
  'contract-check': 'Protects an explicit project contract, ownership boundary, payload shape, or semantic policy.',
  'import-boundary-check': 'Checks import direction, dependency shape, or boundary-file usage.',
  'string-dom-marker-check': 'Checks source strings, DOM/data markers, UI labels, or marker attributes.',
  'historical-patch-artifact': 'Appears to protect a named historical patch step, branch label, or versioned migration memory.',
  'source-audit-check': 'Audits source organization, line/shape/sediment, or source/tool boundary hygiene.',
  'consolidation-candidate': 'Likely belongs in a grouped checker or manifest-driven suite later; do not delete by default.',
};

const CURRENT_LINE_CHECKS = currentLineGateCheckFileSet();

function parseArgs(argv) {
  const args = {
    out: defaultJson,
    md: defaultMd,
    strict: false,
    quiet: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i] || args.out;
    else if (arg === '--md') args.md = argv[++i] || args.md;
    else if (arg === '--strict') args.strict = true;
    else if (arg === '--quiet') args.quiet = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tools/report-check-landscape-taxonomy.mjs [--out reports/check-landscape-taxonomy.json] [--md reports/CHECK_LANDSCAPE_TAXONOMY.md] [--strict]\n\nRead-only taxonomy for tools/check-*.mjs. It classifies checks; it does not delete, rewrite, or consolidate them.`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function listCheckScripts() {
  return fs.readdirSync(toolsDir)
    .filter((name) => /^check-.*\.mjs$/.test(name))
    .sort();
}

function countOccurrences(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function classifyScript(name, source) {
  const lowerName = name.toLowerCase();
  const categories = new Set();
  const evidence = [];

  if (CURRENT_LINE_CHECKS.has(name)) {
    categories.add('current-line-gate');
    evidence.push('listed as current 7.5.x refactor/build-profile gate');
  }

  const usesChildProcess = /from ['"]node:child_process['"]|require\(['"]node:child_process['"]\)|spawnSync|execFileSync|execSync/.test(source);
  const executesCode = hasAny(source, ['transpileSource', 'new Function', 'vm.runIn', 'JSDOM', 'happy-dom', 'tsx', 'vite', 'npm run', 'patch:html', 'runtime_test']);
  const hasAssertions = /assert\(|assert\.|strictEqual|deepStrictEqual|notStrictEqual|expect\(/.test(source);
  if ((usesChildProcess || executesCode) && (hasAssertions || /runtime_test|prove|roundtrip|smoke|harness|runner/.test(lowerName))) {
    categories.add('behavioral-execution-test');
    evidence.push('uses execution-oriented primitives or subprocesses with assertions/errors');
  }

  if (/smoke|roundtrip|sanity|prove|runner|harness|runtime|mount|html|build/.test(lowerName) || hasAny(source, ['querySelector', 'dispatchEvent', 'click()', 'dist/index.html', 'dist-core/index.html'])) {
    categories.add('integration-smoke-test');
    evidence.push('name/source suggests smoke, roundtrip, runtime, mount, HTML, build, prove, runner, or harness behavior');
  }

  if (/contract|policy|payload|lifecycle|ownership|boundary|gate|profile|invariant/.test(lowerName)) {
    categories.add('contract-check');
    evidence.push('file name protects a contract, policy, ownership, boundary, gate, profile, or invariant');
  }

  const importNeedleCount = countOccurrences(source, /import |from ['"]/g);
  const dependencyWords = /dependency|dependencies|forbidden import|allowed import|import boundary|from ['"][.][.]/i.test(source);
  if (dependencyWords || (importNeedleCount >= 8 && /readFileSync/.test(source))) {
    categories.add('import-boundary-check');
    evidence.push('source checks imports/dependencies or many import/from markers');
  }

  const markerCount = countOccurrences(source, /data-[a-z0-9-]+|data[A-Z][A-Za-z]+|querySelector|className|aria-|title=|textContent|innerHTML/g);
  const literalNeedleCount = countOccurrences(source, /requireContains|mustContain|includes\(|needle|marker|process\.exit\(1\)/g);
  if (markerCount > 0 || literalNeedleCount >= 3) {
    categories.add('string-dom-marker-check');
    evidence.push('checks DOM/data markers or literal source needles');
  }

  if (/\b(3\.2\.91|6\.9|90\.61|879|5\.\d+|patch|probe|audit|cleanup|migration|legacy|historical)\b/i.test(`${name}\n${source.slice(0, 4000)}`)) {
    categories.add('historical-patch-artifact');
    evidence.push('name/source carries version, patch, probe, audit, cleanup, migration, legacy, or historical vocabulary');
  }

  if (/audit|source|sediment|shape|line|size|boundary/.test(lowerName)) {
    categories.add('source-audit-check');
    evidence.push('audits source shape, size, sediment, or boundary hygiene');
  }

  if (!categories.has('current-line-gate') && (categories.has('string-dom-marker-check') || categories.has('historical-patch-artifact'))) {
    categories.add('consolidation-candidate');
    evidence.push('string/historical marker check may be foldable into a grouped manifest later; not a deletion recommendation');
  }

  if (categories.size === 0) {
    categories.add('contract-check');
    evidence.push('defaulted to contract-check: no stronger category matched');
  }

  return {
    name,
    path: `tools/${name}`,
    categories: Array.from(categories).sort(),
    primaryCategory: selectPrimaryCategory(categories),
    lineCount: source.split(/\r?\n/).length,
    markerCount,
    literalNeedleCount,
    evidence,
  };
}

function selectPrimaryCategory(categories) {
  const priority = [
    'current-line-gate',
    'behavioral-execution-test',
    'integration-smoke-test',
    'import-boundary-check',
    'contract-check',
    'source-audit-check',
    'string-dom-marker-check',
    'historical-patch-artifact',
    'consolidation-candidate',
  ];
  return priority.find((category) => categories.has(category)) || 'contract-check';
}

function summarize(entries) {
  const byPrimary = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map((category) => [category, 0]));
  const byTag = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map((category) => [category, 0]));
  for (const entry of entries) {
    byPrimary[entry.primaryCategory] = (byPrimary[entry.primaryCategory] || 0) + 1;
    for (const category of entry.categories) byTag[category] = (byTag[category] || 0) + 1;
  }
  const largest = [...entries].sort((a, b) => b.lineCount - a.lineCount).slice(0, 20);
  const consolidationCandidates = entries.filter((entry) => entry.categories.includes('consolidation-candidate')).length;
  const behavioral = entries.filter((entry) => entry.categories.includes('behavioral-execution-test')).length;
  const currentLine = entries.filter((entry) => entry.categories.includes('current-line-gate')).length;
  return {
    totalCheckScripts: entries.length,
    currentLineGateCount: currentLine,
    behavioralExecutionCount: behavioral,
    consolidationCandidateCount: consolidationCandidates,
    byPrimaryCategory: byPrimary,
    byTagCategory: byTag,
    largest: largest.map(({ name, lineCount, primaryCategory }) => ({ name, lineCount, primaryCategory })),
  };
}

function writeMarkdown(report, mdPath) {
  const lines = [
    '# Xensonar Check Landscape Taxonomy',
    '',
    `- generatedAt: ${report.generatedAt}`,
    `- total check scripts: ${report.summary.totalCheckScripts}`,
    `- current-line gates: ${report.summary.currentLineGateCount}`,
    `- behavioral/execution-tagged checks: ${report.summary.behavioralExecutionCount}`,
    `- consolidation candidates: ${report.summary.consolidationCandidateCount}`,
    '',
    '## Important limitation',
    '',
    'This report is a read-only taxonomy. It does not delete, disable, or consolidate checks. Categories are heuristic and intended to guide future review, not to prove that a check is useless.',
    '',
    '## Category definitions',
    '',
    ...Object.entries(CATEGORY_DEFINITIONS).map(([category, description]) => `- **${category}**: ${description}`),
    '',
    '## Primary category counts',
    '',
    '| Category | Count |',
    '|---|---:|',
    ...Object.entries(report.summary.byPrimaryCategory).map(([category, count]) => `| ${category} | ${count} |`),
    '',
    '## Tag category counts',
    '',
    '| Category | Count |',
    '|---|---:|',
    ...Object.entries(report.summary.byTagCategory).map(([category, count]) => `| ${category} | ${count} |`),
    '',
    '## Largest check scripts',
    '',
    '| File | Lines | Primary category |',
    '|---|---:|---|',
    ...report.summary.largest.map((entry) => `| ${entry.name} | ${entry.lineCount} | ${entry.primaryCategory} |`),
    '',
    '## Recommended use',
    '',
    '- Use this report before deleting or consolidating checks.',
    '- Prefer moving historical marker checks into manifest-driven grouped checks rather than dropping coverage.',
    '- Keep behavioral and integration-smoke tests visible as a separate trust layer from contract/string checks.',
    '- Treat current-line gates as the active 7.5.x acceptance surface unless a new development-basis report supersedes it.',
    '',
  ];
  fs.mkdirSync(path.dirname(path.join(root, mdPath)), { recursive: true });
  fs.writeFileSync(path.join(root, mdPath), lines.join('\n'));
}

const args = parseArgs(process.argv);
const scripts = listCheckScripts();
const entries = scripts.map((name) => classifyScript(name, fs.readFileSync(path.join(toolsDir, name), 'utf8')));
const report = {
  ok: true,
  reportKind: 'xensonar-check-landscape-taxonomy',
  generatedAt: new Date().toISOString(),
  description: 'Read-only taxonomy for tools/check-*.mjs. It classifies checks to separate behavioral protection, current-line gates, contract checks, marker checks, historical artifacts, and future consolidation candidates.',
  categoryDefinitions: CATEGORY_DEFINITIONS,
  summary: summarize(entries),
  entries,
};

fs.mkdirSync(path.dirname(path.join(root, args.out)), { recursive: true });
fs.writeFileSync(path.join(root, args.out), JSON.stringify(report, null, 2));
writeMarkdown(report, args.md);

if (!args.quiet) {
  console.log(JSON.stringify({ ok: true, report: args.out, markdown: args.md, summary: report.summary }, null, 2));
}

if (args.strict) {
  const hasCurrentLineGate = report.summary.currentLineGateCount >= 5;
  const hasBehavioralLayer = report.summary.behavioralExecutionCount > 0;
  if (!hasCurrentLineGate || !hasBehavioralLayer) {
    console.error('[check-landscape-taxonomy] strict mode failed: expected current-line gates and at least one execution-tagged check.');
    process.exit(1);
  }
}
