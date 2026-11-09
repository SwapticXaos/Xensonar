import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function mustContain(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const directEngine = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');

mustContain(
  routes,
  'previewDurationSec: context.loopPreview ? context.durationSec : context.previewDurationSec,',
  'HarmonicXplorE/SpektralSynthese loop playback uses full BPM/bars duration instead of capped audition duration',
);

mustContain(
  directEngine,
  'const durationSec = Math.max(0.25, Math.min(Math.max(args.durationSec, args.previewDurationSec), args.previewDurationSec || args.durationSec || 2));',
  'direct engine duration remains controlled by caller-provided previewDurationSec contract',
);

const loopFullDurationCount = routes.split('previewDurationSec: context.loopPreview ? context.durationSec : context.previewDurationSec,').length - 1;
if (loopFullDurationCount < 2) {
  throw new Error(`Expected audition and prewarm direct render args to bind loop previews to full BPM duration; found ${loopFullDurationCount}`);
}

console.log('[xensonar] basis hearing BPM truth check passed');
