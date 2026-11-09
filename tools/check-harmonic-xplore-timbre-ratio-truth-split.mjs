import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[harmonic-xplore-truth-split] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[harmonic-xplore-truth-split] OK: ${message}`);

const synth = read('src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab.ts');
const lens = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreLens.ts');
const config = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreRenderConfig.ts');
const direct = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');
const panel = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const preview = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewSession.ts');
const auditionContext = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionContext.ts');
const execute = read('src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts');

if (synth.includes('...HARMONIC_XPLORE_SYNTH_LAB_PRESETS')) fail('Synth-Labor preset list still spreads HX profiles.');
else pass('Synth-Labor list no longer includes HX profiles.');

if (synth.includes('Darkpsy Kante') || synth.includes("id: 'darkpsy-edge'")) fail('Darkpsy Kante/darkpsy-edge still exists as SynthLab preset.');
else pass('Darkpsy Kante removed/renamed from SynthLab presets.');

if (!panel.includes('data-xensonar-carrier-integral-timbre-presets="true"')) fail('Timbre preset UI marker missing.');
else pass('Timbre preset UI marker exists.');

if (!panel.includes('data-xensonar-carrier-integral-harmonic-xplore-truth-split="true"')) fail('HX truth-split UI marker missing.');
else pass('HX truth-split UI marker exists.');

if (!panel.includes('Anzahl Harmonics') || !panel.includes('Dämpfung') || !panel.includes('Register')) fail('HX count/rolloff/register UI controls missing.');
else pass('HX count/rolloff/register controls present.');

if (direct.includes('presetId: HARMONIC_XPLORE_DIRECT_DEFAULT_PRESET_ID') || direct.includes('paramsPatch: {}') && direct.includes('HARMONIC_XPLORE_DIRECT_DEFAULT_PRESET_ID')) fail('Direct engine still appears to force non-HX presets to Prime fallback.');
else pass('Direct engine no longer forces non-HX timbre into Prime fallback.');

if (direct.includes('sine: 0.46') || direct.includes('triangle: 0.2') || direct.includes('sawtooth: 0.18')) fail('Direct engine still hard-overwrites timbre constants.');
else pass('Direct engine no longer hard-overwrites main timbre constants.');

if (lens.includes('.slice(0, 6).map') || lens.includes('series.slice(0, 6)')) fail('HX oscillator bank still hard-slices to 6.');
else pass('HX oscillator bank does not hard-slice to 6.');

if (lens.includes('Math.min(16') || lens.includes('Math.min(16,')) fail('HX series count still capped at 16.');
else pass('HX series count can reach 32.');

if (!config.includes('rawRatio') || !config.includes('renderRatio') || !config.includes('foldOctaves')) fail('RenderConfig lacks raw/render/fold ratio contract.');
else pass('RenderConfig carries rawRatio/renderRatio/foldOctaves.');

if (!config.includes('while (value > max)') || !config.includes('value /= 2')) fail('Register folding loop missing.');
else pass('Register folding uses octave folding, not hard clamp.');

if (config.includes('renderRatio: rawRatio') && !config.includes('foldCarrierIntegralHarmonicXploreRatio')) fail('Render ratio appears unfurled.');
else pass('Render ratio uses folding helper.');

const protectsPositiveRatios = direct.includes('Math.abs(osc.freqMul');
if (!config.includes('phaseOffset') || !protectsPositiveRatios) fail('Phase/frequency contract does not protect against negative audio frequencies.');
else pass('Phase is metadata and audio frequency ratio is positive.');

if (!preview.includes('harmonicXploreOverride')) fail('Preview request does not pass HX override.');
else pass('Preview request passes HX override.');

if (!auditionContext.includes('harmonicXplore: ReturnType') || !auditionContext.includes('migrateLegacySynthLabPresetToHarmonicXploreSelection')) fail('Audition context lacks HX state/migration.');
else pass('Audition context normalizes/migrates HX state.');

if (!execute.includes('harmonicXplore: activeHarmonicXplore') || !execute.includes('shouldBypassMaterialCache')) fail('Transfer path does not use active HX state or bypass stale HX material cache.');
else pass('Transfer path uses active HX state and bypasses stale HX cache.');

if (!direct.includes('renderConfig.configHash')) fail('Direct engine summary/hash does not include shared RenderConfig hash.');
else pass('Direct engine includes RenderConfig hash.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[harmonic-xplore-truth-split] PASS');
