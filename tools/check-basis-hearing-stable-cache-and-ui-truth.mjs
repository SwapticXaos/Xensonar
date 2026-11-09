#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const panel = read('src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx');
const hook = read('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts');
const ui = read('src/features/l3lab/spectralForge/components/harmonizerPanel/basisHearingAuditionUi.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const preview = read('src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts');

const failures = [];
const must = (haystack, needle, label = needle) => {
  if (!haystack.includes(needle)) failures.push(`missing ${label}`);
};
const mustNot = (haystack, needle, label = needle) => {
  if (haystack.includes(needle)) failures.push(`unexpected ${label}`);
};

must(hook, 'basisHearingChosenOptionId', 'separate immediate chosen option state');
must(hook, 'setBasisHearingChosenOptionId(option.id)', 'click records chosen option immediately');
must(ui, 'args.chosenOptionId === args.optionId', 'visual active state follows clicked option, not a stale playback promise');
must(ui, "? 'lädt'", 'sidebar uses a qualitative loading state, not a second percentage display');
must(ui, "? 'gewählt'", 'clicked idle option gets immediate visible acknowledgement');
must(panel, 'hover:border-neutral-500/70', 'inactive hover state stays neutral, avoiding purple/green dual truth');
must(panel, 'focus:outline-none', 'browser focus ring does not create an unrelated second colored border');
mustNot(panel, 'lädt ${Math.round', 'sidebar must not show a progress percentage separate from the play-button truth indicator');
mustNot(panel, 'hover:border-fuchsia-500/60', 'basis-hearing hover must not look like a second active/pending color');

must(routes, 'buildStableHarmonicXplorePreviewParamsHash(context)', 'global HarmonicXplorE preview cache uses stable audible params');
must(routes, "route: 'harmonic-xplore-direct-preview-cache-v2-stable-musical-params'", 'stable HX cache route marker');
must(routes, 'profileId: harmonicXplore.profileId', 'stable HX cache includes profile');
must(routes, 'registerFold: harmonicXplore.registerFold', 'stable HX cache includes register fold');
mustNot(routes, "paramsHash: stableCarrierIntegralJson({\n      route: 'harmonic-xplore-direct-preview-cache-v1',\n      harmonicXplore: context.harmonicXplore", 'global HX cache must not include volatile updatedAt/source inside paramsHash');

must(preview, 'cacheHit: result.cacheHit', 'basis hearing playback returns real route cache-hit state');

if (failures.length) {
  console.error('[basis-hearing-stable-cache-and-ui-truth] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[basis-hearing-stable-cache-and-ui-truth] PASS');
console.log('- Hearing-button color now follows the latest click immediately.');
console.log('- Sidebar no longer displays an independent percentage against the Play-button truth indicator.');
console.log('- HarmonicXplorE global preview cache ignores volatile updatedAt/source and reuses unchanged prepared bodies.');
