import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const typeFile = read('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts');
const uiFile = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const voiceEngineOptions = read('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts');
const renderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const worklet = read('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts');

const required = [
  [typeFile, "'worklet-stable-lane-primary-audition'", 'RootFollowVoiceEngineMode exposes primary audition mode'],
  [voiceEngineOptions, 'Worklet Stable-Lane Primary Test', 'Root-Follow voice engine options expose stable-lane primary test option'],
  [uiFile, 'ROOT_FOLLOW_VOICE_ENGINE_OPTIONS.map', 'UI consumes centralized Root-Follow voice engine options'],
  [renderer, 'const stableLanePrimaryAuditionEnabled', 'renderer detects primary audition mode'],
  [renderer, 'primaryAudition: stableLanePrimaryAuditionEnabled', 'blend resolver receives primary audition flag'],
  [renderer, 'legacyBlend: 0,\n      stableLaneBlend: 0.86', 'primary audition mutes legacy after proof'],
  [renderer, 'stableLanePrimaryAuditionReady', 'legacy relief gate identifies primary audition'],
  [worklet, 'stableLaneSeamFadeFrames', 'worklet has loop seam fade window'],
  [worklet, 'stableLaneSeamGuardFrameCount', 'worklet counts seam guard frames'],
  [worklet, 'loopLocalFrame >= loopFrameCount - seamFadeFrames', 'worklet applies end-of-loop seam guard'],
];

const missing = required.filter(([text, needle]) => !text.includes(needle));
if (missing.length > 0) {
  console.error('Root-Follow crackle truth-mode contract failed:');
  for (const [, , label] of missing) console.error(`- ${label}`);
  process.exit(1);
}
console.log('Root-Follow crackle truth-mode contract OK');
