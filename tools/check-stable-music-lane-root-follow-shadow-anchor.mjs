import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`[stable-music-lane-root-follow-shadow-anchor] FAIL: ${message}`); process.exit(1); };
const builder = read('src/features/xensonar/audio/stableMusicLaneSnapshotBuilders.ts');
for (const marker of [
  'getCurrentRootFollowAnchorHz()',
  'getCurrentRootFollowInputHz()',
  "lane: 'rootFollow'",
  'anchorHz',
  'targetHz',
  'freezeIfControlStale: true',
]) {
  if (!builder.includes(marker)) fail(`snapshot builder missing ${marker}`);
}
const app = read('src/App.tsx');
if (!app.includes('getDefaultRootFollowAnchorHz: () => Math.max(1, nexusParamsRef.current.gridBase / 2)')) fail('existing 220Hz fixed-anchor default guard missing from App.tsx');
console.log('[stable-music-lane-root-follow-shadow-anchor] PASS Root-Follow anchor/target is shadow-posted into stable lane');
