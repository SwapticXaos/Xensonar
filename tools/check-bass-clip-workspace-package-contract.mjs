#!/usr/bin/env node
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const failures = [];
function fail(message) {
  failures.push(message);
}
function requireText(label, content, needle) {
  if (!content.includes(needle)) fail(`${label} missing ${needle}`);
}
function requireRegex(label, content, regex, description) {
  if (!regex.test(content)) fail(`${label} missing ${description}`);
}
function summarizeArchiveAliases(content) {
  return {
    sectionAliases: [
      /JsonPackageSection\s*<\s*["']bass-clip-library["']\s*,\s*BassClipLibraryArchivePayload\s*\|\s*null\s*>/s.test(content),
      /JsonPackageSection\s*<\s*["']bass-pattern-library["']\s*,\s*BassClipLibraryArchivePayload\s*\|\s*null\s*>/s.test(content),
      /JsonPackageSection\s*<\s*["']bass-patterns["']\s*,\s*BassClipLibraryArchivePayload\s*\|\s*null\s*>/s.test(content),
    ].filter(Boolean).length,
    topLevelAliases: [
      /bassClipLibrary\s*:\s*BassClipLibraryArchivePayload\s*\|\s*null/.test(content),
      /bassPatternLibrary\s*:\s*BassClipLibraryArchivePayload\s*\|\s*null/.test(content),
      /bassPatterns\s*:\s*BassClipLibraryArchivePayload\s*\|\s*null/.test(content),
    ].filter(Boolean).length,
  };
}

const pkg = read('src/features/l3lab/canonicalForge/melodicWorkspacePackage.ts');
const codec = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec.ts');
const archiveTypes = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveTypes.ts');
const pkgTypes = pkg + archiveTypes;
const pkgImplementation = pkg + codec + archiveTypes;
const actions = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts');
const ledger = read('src/core/systemMemory/packageImportLedger.ts');
const bassPkg = read('src/features/xensonar/groove/bassClipLibraryPackage.ts');

const aliasSummary = summarizeArchiveAliases(pkgTypes);
if (aliasSummary.sectionAliases !== 3) {
  fail(`workspace package must expose all three bass archive section aliases; found ${aliasSummary.sectionAliases}/3`);
}
if (aliasSummary.topLevelAliases !== 3) {
  fail(`workspace package must expose all three bass archive top-level aliases; found ${aliasSummary.topLevelAliases}/3`);
}

for (const [kind, field, constantName] of [
  ['bass-clip-library', 'bassClipLibrary', 'WORKSPACE_ARCHIVE_SECTION_KINDS.bassClipLibrary'],
  ['bass-pattern-library', 'bassPatternLibrary', 'WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatternLibrary'],
  ['bass-patterns', 'bassPatterns', 'WORKSPACE_ARCHIVE_SECTION_KINDS.bassPatterns'],
]) {
  const directBuilder = new RegExp(String.raw`buildJsonPackageSection\(\s*["']${kind}["']\s*,\s*${field}`, 's').test(pkg);
  const constantBuilder = pkg.includes(`createArchiveSection(\n      ${constantName},\n      ${field},`);
  if (!directBuilder && !constantBuilder) fail(`workspace package section builder missing ${kind} section built from ${field}`);

  const directParser = new RegExp(String.raw`readJsonPackageSectionPayload\([\s\S]*?["']${kind}["']`, 's').test(pkgImplementation);
  const sharedAliasParser = pkgImplementation.includes('readFirstWorkspaceArchiveSectionPayload') && pkgImplementation.includes('WORKSPACE_ARCHIVE_SECTION_ALIASES.bassClipLibrary');
  const topLevelAliasParser = pkgImplementation.includes('readFirstWorkspaceArchiveTopLevelPayload') && pkgImplementation.includes('WORKSPACE_ARCHIVE_TOP_LEVEL_ALIASES.bassClipLibrary');
  if (!directParser && !(sharedAliasParser && topLevelAliasParser)) fail(`workspace package parser missing ${kind} section parser`);

  requireText('workspace package compact-section manifest', pkgImplementation, `"${kind}"`);
}


for (const marker of [
  'parseBassClipLibraryArchivePayload',
  'buildMelodicWorkspaceArchiveBlobParts',
  'bassPatternLibraryV1',
]) requireText('workspace package/codec', pkgImplementation, marker);

for (const marker of [
  'exportBassClipLibraryArchivePayload()',
  'applyBassClipLibraryArchivePayload',
  'ledger.bassClips.present',
  'ledger.bassClips.imported',
  'bassClipStatusSuffix',
  'Bass-Patterns/Bassläufe',
]) requireText('archive actions', actions, marker);

for (const marker of [
  'bassClips: WorkspacePackageImportLedgerDomain',
  'bassClips: emptyDomain(false)',
  'copyDomain(ledger.bassClips, raw.bassClips)',
  "domainSummary('Bass-Patterns/Bassläufe', ledger.bassClips)",
]) requireText('import ledger', ledger, marker);

for (const marker of [
  'exportBassClipLibraryArchivePayload',
  'parseBassClipLibraryArchivePayload',
  'combineBassClipLibraryArchivePayload',
  'applyBassClipLibraryArchivePayload',
  'clipMetadataSignature',
  'clipContentSignature',
  "args.mode === 'differential'",
]) requireText('bass package adapter', bassPkg, marker);

if (failures.length) {
  console.error('[check-bass-clip-workspace-package-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  contract: 'bass-clip-workspace-package-contract',
  verified: {
    sectionAliases: ['bass-clip-library', 'bass-pattern-library', 'bass-patterns'],
    topLevelAliases: ['bassClipLibrary', 'bassPatternLibrary', 'bassPatterns'],
    importer: 'applyBassClipLibraryArchivePayload',
    ledgerDomain: 'bassClips',
    differentialMode: true,
  },
}, null, 2));
