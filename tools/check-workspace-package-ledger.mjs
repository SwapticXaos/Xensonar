#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const failures = [];
function requireFile(path) {
  if (!existsSync(path)) failures.push(`missing ${path}`);
}
function requireContains(path, needle) {
  if (!existsSync(path)) {
    failures.push(`missing ${path}`);
    return;
  }
  const text = readFileSync(path, 'utf8');
  if (!text.includes(needle)) failures.push(`${path} does not contain ${needle}`);
}

requireFile('src/core/systemMemory/packageImportLedger.ts');
requireContains('src/core/systemMemory/packageImportLedger.ts', 'drumConfigs');
requireContains('src/core/systemMemory/packageImportLedger.ts', 'spectralForgeProjects');
requireContains('src/core/systemMemory/packageImportLedger.ts', 'syntheticForgeSavedWorkspaces');
requireContains('src/core/systemMemory/packageImportLedger.ts', 'syntheticForgeCurrentWorkspace');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts', 'createWorkspacePackageImportLedger');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts', 'recordWorkspacePackageImportLedger');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts', 'formatWorkspacePackageImportLedgerSummary');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts', 'applyDrumConfigLibraryArchivePayload');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts', 'applyForgeProjectLibraryArchivePayload');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts', 'drum-config-library');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts', 'spectral-forge-project-library');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts', 'synthetic-forge-workspace-project-library');
requireContains('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts', 'synthetic-forge-current-workspace');
requireContains('docs/WORKSPACE_PACKAGE_IMPORT_EXPORT_BOUNDARY_3.2.91.6.9.0.2.md', 'WorkspacePackageImportLedger');

if (failures.length) {
  console.error('[xensonar-package-ledger-check] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar-package-ledger-check] ok');
