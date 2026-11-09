import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function mustContain(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const audio = read('src/features/l3lab/spectralForge/audio/AudioEngine.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');

mustContain(
  audio,
  'const visualCycleDurationSec = loopPreview ? totalDurationSec : previewDurationSec;',
  'Root-Follow synth preview visual cycle full-loop binding',
);
mustContain(
  audio,
  'durationSec: visualCycleDurationSec,',
  'Root-Follow synth preview source registration full-loop duration',
);
mustContain(
  audio,
  '? (elapsed % visualCycleDurationSec) / visualCycleDurationSec',
  'Root-Follow synth preview playhead modulo full-loop duration',
);

const candidateFullLoopCount = routes.split('context.loopPreview ? durationSec : previewDurationSec').length - 1;
if (candidateFullLoopCount < 2) {
  throw new Error(`CarrierLoopBody candidate preview render duration must use full loop while looping; found ${candidateFullLoopCount}`);
}

mustContain(
  routes,
  'playRootFollowSynthPreview(rootFollowBuild.config',
  'synthetic root-follow direct audition path remains present',
);
mustContain(
  routes,
  'previewDurationSec,',
  'synthetic root-follow direct audition still passes preview cap for non-loop preview',
);

console.log('[xensonar] basis hearing loop duration truth check passed');
