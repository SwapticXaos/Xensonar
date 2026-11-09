import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = 'src/features/xensonar/material/useRootFollowLoopPlayback.ts';
const src = fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`[root-follow-entry-auto-repair] FAIL: ${message}`); process.exit(1); };
for (const marker of [
  'entryAutoRepairTimerRef',
  'entry-auto-repair',
  'manual-reentry-equivalent-after-cold-entry',
  'resetRootFollowSessionState(sessionStateRef.current);',
  'stopRootFollowPlaybackNodesBoundary(refs);',
  'void scheduleSliceTick().catch((error) => {',
]) {
  if (!src.includes(marker)) fail(`${file} missing marker: ${marker}`);
}
const initialIdx = src.indexOf('void scheduleSliceTick().catch((error) => {');
const timerIdx = src.indexOf('entryAutoRepairTimerRef.current = window.setTimeout', initialIdx);
const resetIdx = src.indexOf('resetRootFollowSessionState(sessionStateRef.current);', timerIdx);
const stopIdx = src.indexOf('stopRootFollowPlaybackNodesBoundary(refs);', timerIdx);
const restartIdx = src.indexOf('void scheduleSliceTick().catch((error) => {', timerIdx);
if (!(initialIdx > 0 && timerIdx > initialIdx && resetIdx > timerIdx && stopIdx > resetIdx && restartIdx > stopIdx)) {
  fail('entry auto repair must run after initial schedule and perform reset -> stop -> restart');
}
const cleanupIdx = src.indexOf('return () => {', timerIdx);
const clearIdx = src.indexOf('window.clearTimeout(entryAutoRepairTimerRef.current);', cleanupIdx);
if (!(cleanupIdx > timerIdx && clearIdx > cleanupIdx)) fail('entry auto repair timer must be cleared on cleanup');
console.log('[root-follow-entry-auto-repair] PASS RFL entry auto repair mimics manual exit/re-entry after cold entry');
