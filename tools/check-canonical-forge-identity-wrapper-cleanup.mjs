#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const fail = (message) => {
  console.error(`[identity-wrapper-cleanup] ${message}`);
  process.exit(1);
};
const read = (path) => readFileSync(path, 'utf8');

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const actionBoundaryPath = 'src/features/l3lab/canonicalForge/canonicalForgeActionBoundaries.ts';
const viewArgsPath = 'src/features/l3lab/canonicalForge/canonicalForgeViewPanelRuntimeArgs.ts';
const room = read(roomPath);

if (existsSync(actionBoundaryPath)) fail(`${actionBoundaryPath} should be removed; identity action wrappers were deleted.`);
if (existsSync(viewArgsPath)) fail(`${viewArgsPath} should be removed; identity runtime-arg wrappers were deleted.`);

for (const token of [
  'buildCanonicalForgeHeaderActions',
  'buildCanonicalForgeMicrotonalActionBoundaries',
  'buildCanonicalForgeHeaderRuntimeArgs',
  'buildCanonicalForgeMicrotonalViewPanelRuntimeArgs',
  'buildCanonicalForgeArchivePanelRuntimeArgs',
  './canonicalForgeActionBoundaries',
  './canonicalForgeViewPanelRuntimeArgs',
]) {
  if (room.includes(token)) fail(`CanonicalForgeRoom.tsx still references ${token}.`);
}

if (!room.includes('const headerRuntimeArgs: CanonicalForgeHeaderProps = {')) {
  fail('CanonicalForgeRoom.tsx should type headerRuntimeArgs directly as CanonicalForgeHeaderProps.');
}
if (!room.includes('const microtonalViewPanelRuntimeArgs: CanonicalMicrotonalWorkspaceConfigArgs = {')) {
  fail('CanonicalForgeRoom.tsx should type microtonalViewPanelRuntimeArgs directly as CanonicalMicrotonalWorkspaceConfigArgs.');
}
if (!room.includes('const archivePanelRuntimeArgs: WaveMaterialArchivePanelsProps = { activeWorkspace };')) {
  fail('CanonicalForgeRoom.tsx should type archivePanelRuntimeArgs directly as WaveMaterialArchivePanelsProps.');
}

const coreBudget = read('tools/coreTypeBudget.config.json');
const forgeBudget = read('tools/forgeTypeBudget.config.json');
for (const stale of ['canonicalForgeActionBoundaries.ts', 'canonicalForgeViewPanelRuntimeArgs.ts']) {
  if (coreBudget.includes(stale) || forgeBudget.includes(stale)) {
    fail(`type budget configs should not reference removed ${stale}.`);
  }
}

console.log('[identity-wrapper-cleanup] ok');
