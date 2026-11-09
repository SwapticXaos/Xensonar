import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[harmonic-xplore-semantic-cleanup] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[harmonic-xplore-semantic-cleanup] OK: ${message}`);

const config = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreRenderConfig.ts');
const direct = read('src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts');
const panel = read('src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const detailCheck = read('tools/check-harmonic-xplore-detail-density.mjs');
const pkg = read('package.json');

if (!config.includes("CarrierIntegralHarmonicXploreDetailMode = 'balanced' | 'dense'")) fail('DetailMode is not reduced to balanced/dense.');
else pass('DetailMode is balanced/dense.');

if (!config.includes("if (value === `stamp${'-'}dense`) return 'dense'")) fail('Legacy 5.70 detail-mode migration to dense is missing.');
else pass('Legacy detail-mode alias migrates to dense.');

if (panel.includes('Stempel-dicht') || panel.includes('Mirror Waltz') || panel.includes('Ziczac pentatonic') || panel.includes('Stempelstaub') || panel.includes('feine Stempelspuren')) fail('Panel still exposes stamp/example-specific detail prose.');
else pass('Panel uses neutral detail-density language.');

if (!panel.includes('"dense", "dicht"') || !panel.includes('höhere Carrier-Auflösung')) fail('Panel does not expose neutral dense mode with scale-aware wording.');
else pass('Panel exposes neutral dense mode.');

if (direct.includes('stamp-dense') || direct.includes('fineLineCandidate') || direct.includes('wallCandidate')) fail('Direct engine still carries stamp/wall/fine-line categorical names.');
else pass('Direct engine uses neutral candidate names.');

if (!direct.includes('contourCandidate') || !direct.includes('filledBandCandidate')) fail('Direct engine lacks neutral detail candidate names.');
else pass('Direct engine carries neutral contour/filled-band candidates.');

if (!detailCheck.includes('no stamp/example-specific detail-density claims')) fail('Detail-density check does not guard UI semantic leakage.');
else pass('Detail-density check guards semantic leakage.');

if (!pkg.includes('xensonar:check-harmonic-xplore-semantic-cleanup')) fail('Package script for semantic cleanup check missing.');
else pass('Package script for semantic cleanup exists.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[harmonic-xplore-semantic-cleanup] PASS');
