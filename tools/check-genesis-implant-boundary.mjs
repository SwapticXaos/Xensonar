import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const file = path.join(root, 'src/features/xensonar/nativeImplant/waveStarterImplantBoundary.ts');
const s = fs.readFileSync(file, 'utf8');
const forbidden = [
  'AudioContext', 'OfflineAudioContext', 'createOscillator(', 'createGain(',
  'createBufferSource(', '.connect(', 'AudioNode', 'MediaRecorder',
  'nativeRootFollowMaterialBridge', 'RootFollowMaterialWindowRenderPlan',
];
const found = forbidden.filter(x => s.includes(x));
if (found.length) {
  console.error(JSON.stringify({ pass:false, found }));
  process.exit(1);
}
for (const required of ['playbackFreqHz', 'WaveStarterVoiceSpec', 'reference-unknown']) {
  if (!s.includes(required)) {
    console.error(JSON.stringify({ pass:false, missing:required }));
    process.exit(2);
  }
}
console.log(JSON.stringify({pass:true, boundary:'semantic-only', audioAuthority:false}));
