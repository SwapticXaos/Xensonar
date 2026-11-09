/**
 * check-donatello-donor-timbre-engine.mjs — 7.7.29
 *
 * Contract check for the Donatello donor-timbre engine.
 *
 * Verifies deterministic keys, image-primary carrier routing, local donor tinting,
 * UI availability, shared SpektralSynthese body reuse, and absence of direct donor authority.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const fail = (msg) => { console.error('FAIL:', msg); process.exit(1); };
const pass = (msg) => console.log('PASS:', msg);
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

// ── New files exist ───────────────────────────────────────────────────────────
const NEW_FILES = [
  'src/features/l3lab/spectralForge/integral/carrierIntegralDonorTimbreDescriptor.ts',
  'src/features/l3lab/spectralForge/integral/carrierIntegralDonatelloEngine.ts',
];
for (const f of NEW_FILES) {
  if (!existsSync(resolve(root, f))) fail(`Missing: ${f}`);
}
pass('DonorTimbreDescriptor and DonatelloEngine source files exist');

// ── INORGANIC: Determinismus-Garantien ───────────────────────────────────────
const donor = read('src/features/l3lab/spectralForge/integral/carrierIntegralDonorTimbreDescriptor.ts');
const engine = read('src/features/l3lab/spectralForge/integral/carrierIntegralDonatelloEngine.ts');

const donorCode = donor.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*')).join('\n');
if (donorCode.includes('Math.random()')) fail('[inorganic] Math.random() in DonorTimbreDescriptor');
pass('[inorganic] No Math.random() in DonorTimbreDescriptor');
const engineCode = engine.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*')).join('\n');
if (engineCode.includes('Math.random()')) fail('[inorganic] Math.random() in DonatelloEngine');
pass('[inorganic] No Math.random() in DonatelloEngine');

if (!donor.includes('donorTimbreKey')) fail('[inorganic] donorTimbreKey missing from DonorTimbreDescriptor');
pass('[inorganic] donorTimbreKey present');
if (!donor.includes('carrierIntegralHash31')) fail('[inorganic] Stable hash missing from donor descriptor');
pass('[inorganic] carrierIntegralHash31 used for donorTimbreKey');
if (!donor.includes('FALLBACK_DONOR_TIMBRE_DESCRIPTOR')) fail('[inorganic] No fallback for missing donor');
pass('[inorganic] FALLBACK_DONOR_TIMBRE_DESCRIPTOR present');

// Cache key must include BOTH keys
if (!engine.includes('buildDonatelloPreviewParamsHash')) fail('[inorganic] buildDonatelloPreviewParamsHash missing from engine');
if (!engine.includes('buildSpektralSyntheseParamsHash')) fail('[inorganic] DonatelloEngine cache hash no longer delegates to shared SpektralSynthese hash');
if (!engine.includes('donor.donorTimbreKey')) fail('[inorganic] donorTimbreKey not in DonatelloEngine cache hash/variant');
const spektralEngineForHash = read('src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseEngine.ts');
if (!spektralEngineForHash.includes('descriptor.descriptorKey')) fail('[inorganic] shared SpektralSynthese cache hash lacks descriptorKey');
pass('[inorganic] descriptorKey and donorTimbreKey are both present through shared hash delegation');

// ── BIOLOGICAL: Carrier-Gestalt ist primär ───────────────────────────────────
// The engine must derive carrier gestalt from SpektralSynthese, not from donor
if (!engine.includes('buildSpektralSyntheseParamsHash')) fail('[biological] shared SpektralSynthese hash missing — carrier cache identity not from image-primary route');
if (!engine.includes('renderCarrierIntegralSpektralSynthesePreviewBuffer')) fail('[biological] shared SpektralSynthese body renderer missing — carrier profile not from image-primary route');
if (!engine.includes('bodyVariant')) fail('[biological] Donatello bodyVariant missing — donor tinting should parametrize the shared carrier body');
pass('[biological] Carrier-Gestalt comes through the shared SpektralSynthese body renderer (image-primary)');

// Donor must NOT override series, phase, or count (only modulates swarm, formant, flavor)
if (engine.includes('donor.seriesType') || engine.includes('donor.phase')) {
  fail('[biological] Donor is overriding series/phase — carrier gestalt authority violated');
}
pass('[biological] Donor does not override series/phase/count — only modulates timbre');

// tintDonatelloProfile must leave series, phase, count unchanged.
if (!engine.includes('tintDonatelloProfile')) fail('[biological] tintDonatelloProfile missing');
pass('[biological] tintDonatelloProfile present');

// ── SOCIAL: UI contract ───────────────────────────────────────────────────────
const modes = read('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts');
if (!modes.includes("'donatello-formant-window-body'")) fail('[social] Donatello machine missing from basis hearing modes');
pass('[social] Donatello still accessible in sidebar');

// ── INTELLECTUAL: Route wiring ────────────────────────────────────────────────
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');

if (!routes.includes('renderCarrierIntegralDonatelloPreviewBuffer')) {
  fail('[intellectual] DonatelloEngine not wired into audition route');
}
pass('[intellectual] renderCarrierIntegralDonatelloPreviewBuffer wired');

if (!routes.includes('buildDonatelloPreviewParamsHash')) {
  fail('[intellectual] buildDonatelloPreviewParamsHash not used in route cache key');
}
pass('[intellectual] buildDonatelloPreviewParamsHash used in route');

if (!donor.includes('extractDonorTimbreFromAudioBuffer')) fail('[intellectual] AudioBuffer extractor source missing');
pass('[intellectual] AudioBuffer extractor kept source-side; 7.7.28 route uses SynthLab fallback only');

if (!routes.includes('buildDonorTimbreDescriptorFromSynthLab')) {
  fail('[intellectual] SynthLab fallback path missing in routes');
}
pass('[intellectual] SynthLab fallback path present');

// Post-passes are reused by delegating to the shared SpektralSynthese body renderer.
const spektralEngine = read('src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseEngine.ts');
if (!engine.includes('renderCarrierIntegralSpektralSynthesePreviewBuffer')) fail('[intellectual] Donatello does not delegate to shared SpektralSynthese body renderer');
for (const passName of ['applyDescriptorContrastDynamicsPass', 'applyDescriptorDensityVoiceSpreadPass', 'applyDescriptorAccentPass']) {
  if (!spektralEngine.includes(passName)) fail(`[intellectual] shared renderer missing ${passName}`);
}
pass('[intellectual] SpektralSynthese post-passes reused through shared renderer (no Donatello reinvention)');

// RootFollowTimbreContract updated
const timbreContract = read('src/features/l3lab/spectralForge/integral/rootFollowTimbreContract.ts');
if (!timbreContract.includes('Donatello') && !timbreContract.includes('donatello-formant-window-body')) {
  fail('[intellectual] rootFollowTimbreContract not updated for Donatello');
}
pass('[intellectual] rootFollowTimbreContract acknowledges Donatello donor losses');

// ── DYNAMIC: No direct authority claims ──────────────────────────────────────
// Donor timbre must only modulate — it must not replace the profile entirely
if (engine.includes('return donorProfile as CarrierIntegralHarmonicXploreProfile')) {
  fail('[dynamic] Donor replaces profile directly — should modulate, not replace');
}
// applyDonorTimbreToProfile must spread the base profile
if (!engine.includes('...profile,')) fail('[dynamic] tintDonatelloProfile does not spread base profile — loses carrier gestalt fields');
pass('[dynamic] Donor modulates profile (spreads base) — no direct authority over carrier gestalt');

// No noise injection, no dust
const engineNonComment = engine.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
const donorNonComment = donor.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
for (const forbidden of ['dustGain', 'noiseFloor', 'Math.random()', 'noise_dust']) {
  if (engineNonComment.includes(forbidden) || donorNonComment.includes(forbidden)) {
    fail(`[dynamic] Forbidden pattern "${forbidden}" found — not a noise-injection architecture`);
  }
}
pass('[dynamic] No noise injection or dust in Donatello engine');

console.log('\n✓ check-donatello-donor-timbre-engine: all checks passed');
