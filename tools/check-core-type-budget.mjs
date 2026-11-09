import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configArg = process.argv[2];
const configPath = configArg ? path.resolve(root, configArg) : path.join(root, 'tools', 'coreTypeBudget.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const reportName = config.name ?? 'Core Type Budget Summary';
const trackedFiles = new Set(config.files);
const perFileBudget = config.budgets?.perFile ?? {};
const totalBudget = Number(config.budgets?.total ?? Number.POSITIVE_INFINITY);

const tscBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const tscArgs = ['--noEmit', '--pretty', 'false'];
const result = spawnSync(tscBin, tscArgs, {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
const lines = output.split(/\r?\n/).filter(Boolean);
const errorPattern = /^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

const summary = new Map();
const codeSummary = new Map();
let totalTracked = 0;

for (const line of lines) {
  const match = line.match(errorPattern);
  if (!match) continue;
  const [, file, lineNo, colNo, code, message] = match;
  if (!trackedFiles.has(file)) continue;
  totalTracked += 1;
  const current = summary.get(file) ?? { count: 0, examples: [] };
  current.count += 1;
  if (current.examples.length < 3) {
    current.examples.push({ line: Number(lineNo), column: Number(colNo), code, message });
  }
  summary.set(file, current);
  codeSummary.set(code, (codeSummary.get(code) ?? 0) + 1);
}

const orderedFiles = [...trackedFiles].sort((a, b) => (summary.get(b)?.count ?? 0) - (summary.get(a)?.count ?? 0) || a.localeCompare(b));
console.log(reportName);
console.log('='.repeat(reportName.length));
console.log(`Tracked files: ${trackedFiles.size}`);
console.log(`Tracked errors: ${totalTracked}`);
console.log(`Total budget: ${Number.isFinite(totalBudget) ? totalBudget : 'unbounded'}`);
console.log('');
if (config.description) {
  console.log(config.description);
  console.log('');
}

for (const file of orderedFiles) {
  const item = summary.get(file);
  if (!item) continue;
  const budget = perFileBudget[file];
  const budgetLabel = typeof budget === 'number' ? ` / budget ${budget}` : '';
  console.log(`${item.count}${budgetLabel}  ${file}`);
  for (const ex of item.examples) {
    console.log(`  - ${ex.code} @ ${ex.line}:${ex.column} — ${ex.message}`);
  }
}

if (codeSummary.size > 0) {
  console.log('');
  console.log('Error codes in tracked corridor:');
  for (const [code, count] of [...codeSummary.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log(`  ${code}: ${count}`);
  }
}

const violations = [];
if (totalTracked > totalBudget) {
  violations.push(`tracked total ${totalTracked} exceeds budget ${totalBudget}`);
}
for (const [file, budget] of Object.entries(perFileBudget)) {
  const actual = summary.get(file)?.count ?? 0;
  if (actual > budget) {
    violations.push(`${file} has ${actual} errors, exceeds budget ${budget}`);
  }
}

if (violations.length > 0) {
  console.log('');
  console.log('Budget violations:');
  for (const violation of violations) {
    console.log(`  - ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log('');
  console.log('Core type budget holds.');
}

process.exitCode ||= result.status ?? 0;
