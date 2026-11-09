import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const fail = (message) => { console.error(`[stable-music-lane-app-wiring] FAIL: ${message}`); process.exit(1); };
for (const marker of [
  'buildStableMusicLaneSnapshot',
  'useStableMusicLaneRuntimeBoundary',
  'stableMusicLaneSnapshotKey',
  'getCurrentRootFollowAnchorHz',
  'getCurrentRootFollowInputHz',
  'rootFollowVoiceEngineMode: performanceCrisisUiPolicyState.rootFollowVoiceEngineMode',
  'audioCtx: audioCtxRef.current ?? audioCtx',
]) {
  if (!app.includes(marker)) fail(`App.tsx missing ${marker}`);
}
const directIdx = app.indexOf('useStableMusicLaneRuntimeBoundary');
const sceneIdx = app.indexOf('useAppRoomSceneRuntimeBoundary(appRoomSceneRuntimeSource)');
if (!(directIdx > 0 && sceneIdx > directIdx)) fail('StableMusicLane boundary should be wired before final room scene assembly');
console.log('[stable-music-lane-app-wiring] PASS App.tsx has minimal stable-lane hook wiring');
