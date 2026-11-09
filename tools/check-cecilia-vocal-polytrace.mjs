#!/usr/bin/env node
import fs from 'node:fs';

const route = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts', 'utf8');
const preview = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralBertHarmonicPolytracePreview.ts', 'utf8');
const modes = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts', 'utf8');
const ui = fs.readFileSync('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts', 'utf8');

const require = (cond, msg) => { if (!cond) { console.error('[check-c-vocal] FAIL:', msg); process.exit(1); } };

require(preview.includes("'vocal'"), 'Polytrace module must expose a vocal/formant timbre branch for Cecilia.');
require(preview.includes('logBell') && preview.includes('f1 =') && preview.includes('f2 =') && preview.includes('f3 ='), 'Cecilia vocal path must use formant-like spectral weighting.');
require(preview.includes('glottal') && preview.includes('safeTriangleFromPhase'), 'Cecilia vocal path must synthesize a soft glottal-like carrier, not reuse acid/wavetable tone.');
require(preview.includes('currentColumnStillPainted') && preview.includes('vocalReleaseActive') && preview.includes('vocalReleaseSilence'), 'Cecilia vocal path must smooth active painted columns while preserving silence behavior.');
require(preview.includes('buildColumnPeaks({ spectralData, x, baseHz, detailBoost, maxVoices })'), 'Cecilia vocal path must retain direct SpectralData column scanning for carrier truth.');
require(preview.includes('if (!descriptor.hasMaterial'), 'Cecilia vocal path must render visual silence as silence.');
require(!/Math\.random\s*\(/.test(preview), 'Polytrace module must remain free of unseeded Math.random.');
require(route.includes('getOrRenderCeciliaVocalPreview'), 'Cecilia must use the direct vocal polytrace route.');
require(route.includes("String(request.machineId) === \"branch-c-interval-body\""), 'Cecilia route must be intercepted explicitly.');
require(route.includes("timbre: 'vocal'"), 'Cecilia route must request vocal polytrace timbre.');
require(route.includes('cecilia-vocal-polytrace'), 'Cecilia cache key must identify the new vocal polytrace path.');
require(modes.includes('Vocal-Polytrace') && ui.includes('Vocal / Polytrace'), 'Cecilia UI summary must describe the vocal/polytrace role without methodology jargon.');
require(!route.includes('Moq') && !route.includes('GRIT') && !route.includes('TOUGH') && !route.includes('JUNK'), 'Live route must not import toolkit-only methodology terms.');

console.log('[check-c-vocal] OK');
