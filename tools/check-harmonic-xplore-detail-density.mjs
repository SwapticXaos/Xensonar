import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[harmonic-xplore-detail-density] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[harmonic-xplore-detail-density] OK: ${message}`);

const config = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreRenderConfig.ts');
const direct = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');
const panel = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const pkg = read('package.json');

if (!config.includes('detailDensity: number') || !config.includes("detailMode: CarrierIntegralHarmonicXploreDetailMode")) fail('HX selection/config lacks detailDensity/detailMode contract.');
else pass('HX selection/config carries detailDensity and detailMode.');

if (!config.includes("'dense'") || !config.includes('Math.max(hx.detailDensity, 0.86)')) fail('Dense mode does not force a high detail floor.');
else pass('Dense mode has a high detail floor.');

if (!direct.includes('detailVoiceTarget') || !direct.includes('detailPeakTarget')) fail('Direct engine does not scale voice/peak targets with detail density.');
else pass('Direct engine scales voice and peak targets.');

if (!direct.includes('contourCandidate') || !direct.includes('filledBandCandidate')) fail('Direct engine lacks neutral contour / filled-band candidate detection.');
else pass('Contour and filled-band candidates are explicitly detected.');

if (!direct.includes('peakThreshold') || !direct.includes('matchDistanceLimit') || !direct.includes('voiceVelocityFollow')) fail('Detail density does not tune threshold, matching, and velocity follow.');
else pass('Detail density tunes peak threshold, matching, and velocity follow.');

if (!direct.includes('voiceGainTrim = Math.sqrt(6 / Math.max(6, detailVoiceTarget))')) fail('Higher voice counts are not gain-trimmed.');
else pass('Higher voice counts are gain-trimmed.');

if (!direct.includes('maxPeaks: detailPeakTarget') || !direct.includes('detailDensity') || !direct.includes('detailMode')) fail('Render summary does not expose detail-density forensic fields.');
else pass('Render summary exposes detail-density forensic fields.');

if (!panel.includes('Detaildichte') || !panel.includes('dicht') || !panel.includes('data-xensonar-carrier-integral-harmonic-xplore-detail-density="true"')) fail('UI lacks neutral Detaildichte / dicht controls.');
else pass('UI exposes neutral Detaildichte and dicht controls.');

const forbiddenUserFacing = ['Stempel-dicht', 'Stempelstaub', 'feine Stempelspuren', 'Mirror Waltz', 'Ziczac pentatonic'];
const offender = forbiddenUserFacing.find((needle) => panel.includes(needle));
if (offender) fail(`UI still contains example/category leakage: ${offender}`);
else pass('UI contains no stamp/example-specific detail-density claims.');

if (!panel.includes('harmonicXplore.detailDensity') || !panel.includes('harmonicXplore.detailMode')) fail('Reaudition dependencies do not include detail controls.');
else pass('Reaudition dependencies include detail controls.');

if (!pkg.includes('xensonar:check-harmonic-xplore-detail-density')) fail('Package script for detail-density check missing.');
else pass('Package script for detail-density check exists.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[harmonic-xplore-detail-density] PASS');
