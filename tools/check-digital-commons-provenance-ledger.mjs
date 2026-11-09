#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'LICENSE_STATUS.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/PROVENANCE_LEDGER.md',
];
const requiredMarkers = {
  'LICENSE_STATUS.md': [
    'No final project-wide license is declared',
    'not a permissive license grant',
    'src/external/microto',
  ],
  'THIRD_PARTY_NOTICES.md': [
    'Third-Party Notices',
    'Runtime npm dependencies',
    'Development / build dependencies',
    'External / collaborative source boundary',
    'AI-assisted patch provenance',
  ],
  'docs/PROVENANCE_LEDGER.md': [
    'Xensonar Provenance Ledger',
    'digital commons under AI conditions',
    'Microto / mPRG boundary',
    'Dependency ledger rule',
    'Patch reporting rule',
  ],
  'AGENTS.md': [
    'Digital Commons / Provenance contract',
    'THIRD_PARTY_NOTICES.md',
    'PROVENANCE_LEDGER.md',
  ],
};

function rel(...parts) {
  return path.join(root, ...parts);
}

function exists(file) {
  return fs.existsSync(rel(file));
}

function read(file) {
  return fs.readFileSync(rel(file), 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function walkFiles(startRel, options = {}, acc = []) {
  const start = rel(startRel);
  if (!fs.existsSync(start)) return acc;
  const excluded = options.excluded || new Set(['node_modules', 'dist', '.git']);
  for (const entry of fs.readdirSync(start, { withFileTypes: true })) {
    if (entry.isDirectory() && excluded.has(entry.name)) continue;
    const full = path.join(start, entry.name);
    const childRel = path.relative(root, full).split(path.sep).join('/');
    if (entry.isDirectory()) walkFiles(childRel, options, acc);
    else if (entry.isFile()) acc.push(childRel);
  }
  return acc;
}

function collectLockfileLicenseStats() {
  if (!exists('package-lock.json')) return null;
  const lock = readJson('package-lock.json');
  const packages = Object.entries(lock.packages || {})
    .filter(([name]) => name.startsWith('node_modules/'))
    .map(([name, meta]) => ({ name: name.replace(/^node_modules\//, ''), license: meta.license || null, version: meta.version || null }));
  const withLicense = packages.filter((item) => item.license).length;
  const withoutLicense = packages.filter((item) => !item.license);
  const byLicense = new Map();
  for (const item of packages) if (item.license) byLicense.set(item.license, (byLicense.get(item.license) || 0) + 1);
  return {
    packageCount: packages.length,
    withLicense,
    withoutLicense: withoutLicense.length,
    missingLicenseExamples: withoutLicense.slice(0, 25).map((item) => item.name),
    licenseHistogram: [...byLicense.entries()].map(([license, count]) => ({ license, count })).sort((a, b) => b.count - a.count || a.license.localeCompare(b.license)),
  };
}

function collectPackageDependencyStats() {
  const pkg = exists('package.json') ? readJson('package.json') : {};
  const deps = Object.entries(pkg.dependencies || {}).map(([name, version]) => ({ name, version, kind: 'runtime' }));
  const devDeps = Object.entries(pkg.devDependencies || {}).map(([name, version]) => ({ name, version, kind: 'development' }));
  return { runtimeDependencies: deps, developmentDependencies: devDeps, runtimeCount: deps.length, developmentCount: devDeps.length };
}

function collectExternalBoundaryStats() {
  const externalRoot = 'src/external/microto';
  const files = walkFiles(externalRoot);
  const sourceFiles = files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html|md|txt)$/i.test(file));
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(rel(file)).size, 0);
  return { externalRoot, exists: exists(externalRoot), fileCount: files.length, sourceLikeFileCount: sourceFiles.length, totalBytes, sampleFiles: files.slice(0, 12) };
}

const failures = [];
for (const file of requiredFiles) {
  if (!exists(file)) failures.push(`missing ${file}`);
}
for (const [file, markers] of Object.entries(requiredMarkers)) {
  if (!exists(file)) {
    failures.push(`missing ${file}`);
    continue;
  }
  const text = read(file);
  for (const marker of markers) {
    if (!text.includes(marker)) failures.push(`${file} missing marker: ${marker}`);
  }
}
if (!exists('package-lock.json')) failures.push('missing package-lock.json');
if (!exists('package.json')) failures.push('missing package.json');

const dependencyStats = collectPackageDependencyStats();
const lockfileLicenseStats = collectLockfileLicenseStats();
const externalBoundary = collectExternalBoundaryStats();
const rootLicensePresent = exists('LICENSE') || exists('LICENSE.md') || exists('LICENSE.txt');

const warnings = [];
if (!rootLicensePresent) warnings.push('No root LICENSE file present; LICENSE_STATUS.md must remain explicit until a human maintainer chooses a license.');
if (lockfileLicenseStats?.withoutLicense) warnings.push(`${lockfileLicenseStats.withoutLicense} lockfile package records have no license field; verify upstream metadata before redistribution.`);
if (externalBoundary.exists) warnings.push(`${externalBoundary.externalRoot} exists and should remain treated as an external/collaborative provenance boundary.`);

const report = {
  ok: failures.length === 0,
  reportKind: 'xensonar-digital-commons-provenance-ledger',
  version: '3.2.91-7.7.69',
  generatedAt: new Date().toISOString(),
  files: {
    required: requiredFiles,
    rootLicensePresent,
    statusMarker: 'LICENSE_STATUS.md',
    notices: 'THIRD_PARTY_NOTICES.md',
    provenanceLedger: 'docs/PROVENANCE_LEDGER.md',
  },
  dependencyStats,
  lockfileLicenseStats,
  externalBoundary,
  warnings,
  failures,
  interpretation: {
    proofClass: 'provenance/tooling check, not legal advice and not runtime behaviour proof',
    commonsRiskAddressed: 'makes licensing uncertainty, dependency obligations, external source boundaries and AI-assisted patch provenance visible',
    remainingRisk: 'human maintainer must still choose project license and verify third-party terms before public release',
  },
};

fs.mkdirSync(rel('reports'), { recursive: true });
fs.writeFileSync(rel('reports/digital-commons-provenance-ledger.json'), JSON.stringify(report, null, 2) + '\n');

const md = [
  '# Digital Commons Provenance Ledger Check',
  '',
  `- ok: ${report.ok}`,
  `- generatedAt: ${report.generatedAt}`,
  `- version: ${report.version}`,
  `- proof class: ${report.interpretation.proofClass}`,
  '',
  '## Required files',
  '',
  `- Root LICENSE present: ${rootLicensePresent}`,
  `- License status marker: ${exists('LICENSE_STATUS.md')}`,
  `- Third-party notices: ${exists('THIRD_PARTY_NOTICES.md')}`,
  `- Provenance ledger: ${exists('docs/PROVENANCE_LEDGER.md')}`,
  '',
  '## Dependency surface',
  '',
  `- runtime dependencies: ${dependencyStats.runtimeCount}`,
  `- development dependencies: ${dependencyStats.developmentCount}`,
  `- lockfile packages: ${lockfileLicenseStats?.packageCount ?? 'n/a'}`,
  `- lockfile packages with license field: ${lockfileLicenseStats?.withLicense ?? 'n/a'}`,
  `- lockfile packages without license field: ${lockfileLicenseStats?.withoutLicense ?? 'n/a'}`,
  '',
  '## External boundary',
  '',
  `- path: ${externalBoundary.externalRoot}`,
  `- exists: ${externalBoundary.exists}`,
  `- files: ${externalBoundary.fileCount}`,
  `- source-like files: ${externalBoundary.sourceLikeFileCount}`,
  '',
  '## Warnings',
  '',
  ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ['- —']),
  '',
  '## Failures',
  '',
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ['- —']),
  '',
  '## Falsifikationsfrage',
  '',
  'Macht dieser Handoff Ursprung, Lizenzstatus, externe/collaborative Boundary und AI-assisted Patch-Provenienz sichtbar, oder verschiebt er diese Prüfkosten wieder unsichtbar auf spätere Commons-Arbeit?',
  '',
];
fs.writeFileSync(rel('reports/digital-commons-provenance-ledger.md'), md.join('\n'));

console.log(JSON.stringify({ ok: report.ok, report: 'reports/digital-commons-provenance-ledger.json', markdown: 'reports/digital-commons-provenance-ledger.md', warnings: warnings.length, failures: failures.length }, null, 2));
process.exit(report.ok ? 0 : 1);
