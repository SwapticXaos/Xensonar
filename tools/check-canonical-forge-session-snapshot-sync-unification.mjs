import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roomPath = path.join(root, 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const syncPath = path.join(root, 'src/features/l3lab/canonicalForge/useCanonicalForgeSessionSync.ts');
const contractPath = path.join(root, 'src/features/l3lab/canonicalForge/canonicalForgeWorkspaceSnapshotContract.ts');
const room = fs.readFileSync(roomPath, 'utf8');
const sync = fs.readFileSync(syncPath, 'utf8');
const contract = fs.readFileSync(contractPath, 'utf8');
const failures = [];

if (!room.includes('snapshot: workspaceSnapshot')) {
  failures.push('CanonicalForgeRoom.tsx must pass workspaceSnapshot into useCanonicalForgeSessionSync.');
}
if (/useCanonicalForgeSessionSync\(\{[\s\S]*?materialExport,[\s\S]*?rawSourceAsset,[\s\S]*?sourceAsset,/.test(room)) {
  failures.push('CanonicalForgeRoom.tsx still passes the old flat session-sync state list.');
}
if (!sync.includes("import type { CanonicalForgeWorkspaceSnapshotContract } from './canonicalForgeWorkspaceSnapshotContract';")) {
  failures.push('useCanonicalForgeSessionSync.ts must consume the shared workspace snapshot contract type.');
}
if (!sync.includes('snapshot: CanonicalForgeWorkspaceSnapshotContract')) {
  failures.push('useCanonicalForgeSessionSync.ts must accept snapshot: CanonicalForgeWorkspaceSnapshotContract.');
}
if (!sync.includes('const { forgeRootRef, forgeHotkeyScopeActiveRef, snapshot } = args;')) {
  failures.push('useCanonicalForgeSessionSync.ts must destructure snapshot from args.');
}
if (!sync.includes('toolSettings: { ...toolSettings }')) {
  failures.push('Session sync must persist toolSettings from the shared snapshot contract.');
}
if (!sync.includes('drumViewport: { ...safeDrumViewport }')) {
  failures.push('Session sync must persist safeDrumViewport from the shared snapshot contract.');
}
for (const oldField of ['brushSize:', 'intensity:', 'hardness:', 'eraseMode:', 'morphMode:']) {
  if (sync.includes(oldField) && sync.includes('export function useCanonicalForgeSessionSync(args: {')) {
    failures.push(`useCanonicalForgeSessionSync.ts should not expose old flat ${oldField} args.`);
  }
}
if (!contract.includes('rawSourceAsset') || !contract.includes('safeDrumViewport') || !contract.includes('status')) {
  failures.push('Workspace snapshot contract must cover session-only fields needed by session sync.');
}
if (failures.length) {
  console.error('[xensonar][canonical-forge-session-snapshot-sync-unification] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][canonical-forge-session-snapshot-sync-unification] ok');
