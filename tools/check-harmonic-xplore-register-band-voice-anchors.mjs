import fs from 'node:fs';

const enginePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts';
const pkgPath = 'package.json';
const engine = fs.readFileSync(enginePath, 'utf8');
const pkg = fs.readFileSync(pkgPath, 'utf8');

const fail = (message) => {
  console.error(`[harmonic-xplore-register-band-voice-anchors] FAIL: ${message}`);
  process.exit(1);
};
const requireContains = (source, needle, message) => {
  if (!source.includes(needle)) fail(message);
};
const requireRegex = (source, regex, message) => {
  if (!regex.test(source)) fail(message);
};

requireContains(engine, '7.5.175-flat-hearing-flavors', 'engine version must mark current HarmonicXplorE flavor lineage.');
requireContains(engine, 'registerBandVoiceAnchors: true', 'anti-whoop contract must expose register-band anchors.');
requireContains(engine, 'orphanRegisterVoiceActivation: true', 'anti-whoop contract must expose orphan register activation.');
requireContains(engine, 'const pRegisterAnchor = new Uint8Array(MAX_PEAKS)', 'selected peaks must track whether they are protected register anchors.');
requireContains(engine, 'let rawMinLogHz = Number.POSITIVE_INFINITY', 'raw peak pass must record current-column register span.');
requireContains(engine, 'let rawMaxLogHz = Number.NEGATIVE_INFINITY', 'raw peak pass must record current-column register span.');
requireContains(engine, 'const registerBandCount = Math.min(', 'first pass must derive adaptive register bands from the painted span.');
requireRegex(engine, /selectRawPeak\(bestIndex, true\)/, 'register-band best peaks must be selected as protected anchors.');
requireRegex(engine, /selectRawPeak\(r, true\)/, 'energy-distinct seed pass must mark additional register anchors.');
requireContains(engine, 'const orphanRegisterDistance = seedLogDistance * 1.15', 'orphan-register voice activation distance must be explicit.');
requireContains(engine, 'if (pMatched[p] || !pRegisterAnchor[p]) continue;', 'voice stealing must be limited to unmatched register anchors.');
requireContains(engine, 'const redundantRegisterBonus = siblingDistance < seedLogDistance ? -1.0 : 0.0', 'voice stealing must prefer redundant same-register voices.');
requireContains(engine, 'register-band-voice-anchors-v1', 'direct engine key must invalidate cache for register-band anchors.');
requireContains(pkg, 'xensonar:check-harmonic-xplore-register-band-voice-anchors', 'package script is missing.');

for (const forbidden of ['waveStarter', 'StableRhythm', 'AudioWorklet']) {
  const first = engine.indexOf(forbidden);
  if (first !== -1) fail(`unrelated hotpath marker leaked into HarmonicXplore engine: ${forbidden}`);
}

console.log('[harmonic-xplore-register-band-voice-anchors] OK');
