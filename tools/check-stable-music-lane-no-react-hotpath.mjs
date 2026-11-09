import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const processor = fs.readFileSync(path.join(root, 'src/features/xensonar/audio/stableMusicLaneWorkletProcessorSource.ts'), 'utf8');
const forbidden = ['import React', 'useState(', 'setNParams', 'updateNParams', 'document.', 'window.', 'querySelector', 'localStorage', 'emitWaveStarter', 'buildWaveStarterVoiceSpec'];
for (const marker of forbidden) {
  if (processor.includes(marker)) {
    console.error(`[stable-music-lane-no-react-hotpath] FAIL: processor source contains ${marker}`);
    process.exit(1);
  }
}
const hook = fs.readFileSync(path.join(root, 'src/features/xensonar/audio/useStableMusicLaneRuntimeBoundary.ts'), 'utf8');
if (hook.includes('ensureAudioReady')) {
  console.error('[stable-music-lane-no-react-hotpath] FAIL: 7.1 shadow boundary must not request AudioContext from the hotpath');
  process.exit(1);
}
console.log('[stable-music-lane-no-react-hotpath] PASS Worklet processor has no React/UI/hotpath coupling');
