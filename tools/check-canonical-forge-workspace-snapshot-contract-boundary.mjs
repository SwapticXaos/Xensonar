import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roomPath = path.join(root, 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx');
const contractPath = path.join(root, 'src/features/l3lab/canonicalForge/canonicalForgeWorkspaceSnapshotContract.ts');

const room = fs.readFileSync(roomPath, 'utf8');
const contract = fs.readFileSync(contractPath, 'utf8');
const failures = [];

if (!room.includes("./canonicalForgeWorkspaceSnapshotContract")) {
  failures.push('CanonicalForgeRoom.tsx must import the workspace snapshot contract boundary.');
}
if (!room.includes('const workspaceSnapshot = buildCanonicalForgeWorkspaceSnapshotContract')) {
  failures.push('CanonicalForgeRoom.tsx must build a single workspaceSnapshot contract.');
}
if (!room.includes('snapshot: buildCanonicalForgeProjectSnapshotArgs(workspaceSnapshot)')) {
  failures.push('Project persistence must derive its snapshot args from the workspaceSnapshot contract.');
}
if (/snapshot:\s*{\s*\n\s*materialExport,\s*\n\s*sourceAsset,\s*\n\s*spectralData,/.test(room)) {
  failures.push('CanonicalForgeRoom.tsx still contains the old inline project snapshot block.');
}
if (!contract.includes('export type CanonicalForgeWorkspaceSnapshotContract')) {
  failures.push('canonicalForgeWorkspaceSnapshotContract.ts must export the shared snapshot contract type.');
}
if (!contract.includes('buildCanonicalForgeWorkspaceSnapshotContract')) {
  failures.push('canonicalForgeWorkspaceSnapshotContract.ts must export the workspace snapshot builder.');
}
if (!contract.includes('buildCanonicalForgeProjectSnapshotArgs')) {
  failures.push('canonicalForgeWorkspaceSnapshotContract.ts must export the project snapshot adapter.');
}
for (const forbidden of ['useEffect', 'useState', 'audioEngine', 'window.addEventListener', 'createCanonicalWorkspacePersistenceController']) {
  if (contract.includes(forbidden)) {
    failures.push(`canonicalForgeWorkspaceSnapshotContract.ts must stay pure and not contain ${forbidden}.`);
  }
}
if (failures.length) {
  console.error('[xensonar][canonical-forge-workspace-snapshot-contract-boundary] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][canonical-forge-workspace-snapshot-contract-boundary] ok');
