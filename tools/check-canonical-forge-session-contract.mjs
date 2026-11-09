#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const session = read('src/features/l3lab/canonicalForge/session.ts');
const sessionTypes = read('src/features/l3lab/canonicalForge/sessionTypes.ts');
const snapshotContract = read('src/features/l3lab/canonicalForge/canonicalForgeWorkspaceSnapshotContract.ts');
const room = read('src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const hydration = read('src/features/l3lab/canonicalForge/projectHydrationActions.ts');
const sync = read('src/features/l3lab/canonicalForge/useCanonicalForgeSessionSync.ts');

const requireIncludes = (label, text, needle) => {
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`);
};
const forbidIncludes = (label, text, needle) => {
  if (text.includes(needle)) failures.push(`${label}: still contains ${needle}`);
};

requireIncludes('session-types', sessionTypes, 'export type CanonicalDrumViewportState');
requireIncludes('session-types', sessionTypes, 'drumViewport?: CanonicalDrumViewportState');
requireIncludes('session-runtime', session, 'let cachedSession: CanonicalForgeSessionState | null = null;');
requireIncludes('session-runtime', session, 'export function getCanonicalForgeSession');
requireIncludes('session-runtime', session, 'export function setCanonicalForgeSession');
requireIncludes('snapshot-contract', snapshotContract, "import type { CanonicalForgeSessionState } from './sessionTypes';");
requireIncludes('snapshot-contract', snapshotContract, "rawSourceAsset: CanonicalForgeSessionState['rawSourceAsset'];");
requireIncludes('snapshot-contract', snapshotContract, "safeDrumViewport: NonNullable<CanonicalForgeSessionState['drumViewport']>;");
requireIncludes('sync', sync, 'snapshot: CanonicalForgeWorkspaceSnapshotContract;');
requireIncludes('sync', sync, 'setCanonicalForgeSession({');
forbidIncludes('sync', sync, '} as any);');
forbidIncludes('sync', sync, 'MaterialExportLike');
forbidIncludes('room', room, '(initialSession as any)');
forbidIncludes('hydration', hydration, '(snapshot as any)');

if (failures.length) {
  console.error('[canonical-forge-session-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[canonical-forge-session-contract] PASS');
process.exit(0);
