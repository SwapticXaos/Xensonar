#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function requireFile(path) {
  if (!existsSync(path)) failures.push(`missing ${path}`);
}
function read(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}
function requireContains(path, needle) {
  if (!read(path).includes(needle)) failures.push(`${path} does not contain ${needle}`);
}
function requireNotContains(path, needle) {
  if (read(path).includes(needle)) failures.push(`${path} must not contain ${needle}`);
}

requireFile('src/features/xensonar/material/workspacePackageActivationBoundary.ts');
requireFile('src/features/xensonar/material/workspacePackageActivationReport.ts');
requireFile('src/core/systemMemory/packageImportLedger.ts');

requireContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'readLastWorkspacePackageImportLedger');
requireContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'readPersistedRootFollowBank');
requireContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'unresolvedMaterialRefs');
requireContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'active-from-package');
requireContains('src/features/xensonar/material/workspacePackageActivationBoundary.ts', 'buildWorkspacePackageActivationReport');
requireContains('src/features/xensonar/material/workspacePackageActivationBoundary.ts', 'activationReport');
requireContains('src/App.tsx', 'workspacePackageActivationReport');
requireContains('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Letzter Paketvertrag');
requireContains('src/features/xensonar/rooms/resonancePanelRuntimeBindings.ts', 'workspacePackageActivationReport');
requireContains('docs/WORKSPACE_PACKAGE_ACTIVATION_CONTRACT_3.2.91.4.114.32.md', 'Import ≠ Aktivierung');

requireNotContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'writePersistedRootFollowBank(');
requireNotContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'updateNParams(');
requireNotContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'dispatchEvent(');
requireNotContains('src/features/xensonar/material/workspacePackageActivationReport.ts', 'setStatus(');

if (failures.length) {
  console.error('[xensonar-workspace-activation-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar-workspace-activation-contract] ok');
