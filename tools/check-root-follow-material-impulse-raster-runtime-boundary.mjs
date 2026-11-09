import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[root-follow-material-impulse-raster-runtime-boundary] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[root-follow-material-impulse-raster-runtime-boundary] OK: ${message}`);

const renderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const runtime = read('src/features/xensonar/rootFollow/rootFollowMaterialImpulseRasterRuntime.ts');
const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const presentation = read('src/features/xensonar/layout/appResonanceChromePresentationSources.ts');
const app = read('src/App.tsx');
const pkg = read('package.json');

if (!runtime.includes('scope: "all-root-follow-material-bodies"')) fail('Runtime contract is not explicitly general for all Root-Follow material bodies.');
else pass('Runtime contract is general, not HarmonicXplorE-specific.');

if (!runtime.includes('materialBodyAgnostic: true') || !runtime.includes('importsCarrierOrMachineInternals: false')) fail('Runtime contract does not protect material-body agnosticism.');
else pass('Runtime contract protects material-body agnosticism.');

if (!renderer.includes('resolveRootFollowMaterialImpulseRasterRuntime')) fail('Root-Follow material renderer does not use the centralized impulse-raster runtime resolver.');
else pass('Material renderer uses centralized impulse-raster runtime resolver.');

if (renderer.includes('clockMode === "mute-pattern"') || renderer.includes('clockMode === "fragment-compress"')) fail('Material renderer still branches directly on impulse clockMode instead of using the resolver boundary.');
else pass('Material renderer no longer duplicates impulse-raster clock branches.');

for (const token of ['fragment-compressed-into-active-segment', 'whole-root-follow-window-muted-by-segments', 'normal-material-cycle']) {
  if (!runtime.includes(token)) fail(`Impulse runtime resolver is missing ${token}.`);
}
if (!process.exitCode) pass('Impulse runtime resolver preserves normal, fragment-compress and mute-pattern semantics.');

for (const token of ['rootFollowWindowStartSec', 'rootFollowWindowDurationSec', 'slotStartSec', 'slotEndSec']) {
  if (!runtime.includes(token)) fail(`Impulse runtime resolver is not anchored to ${token}.`);
}
if (!process.exitCode) pass('Impulse runtime resolver is anchored to Root-Follow window and slot boundaries.');

if (renderer.includes('carrierIntegralHarmonicXplore') || renderer.includes('HarmonicXplore') || renderer.includes('harmonicXplore')) fail('Root-Follow material renderer imports or references HarmonicXplorE internals; material macro-time must stay machine-agnostic.');
else pass('Root-Follow material renderer stays independent of HarmonicXplorE internals.');

if (app.includes('openHauptraumFromGlobalChrome') || app.includes('openHauptraumPanelFromGlobalChrome')) fail('Global chrome manager buttons still route back to Hauptraum; manager windows must be room-independent.');
else pass('Global chrome manager buttons no longer route through Hauptraum.');

if (!presentation.includes('onOpenDrumPatternManager') || !presentation.includes('onOpenBassPatternManager')) fail('Chrome presentation source does not preserve drum/bass opener slots for optional callbacks.');
else pass('Chrome presentation source preserves optional opener slots while allowing event-driven global manager host.');

if (!status.includes('dispatchManagerOpenEvent') || !status.includes('window.setTimeout')) fail('Status strip does not dispatch deferred manager events for global host handoff.');
else pass('Status strip dispatches deferred manager events for global host handoff without room switching.');

if (!pkg.includes('xensonar:check-root-follow-material-impulse-raster-runtime-boundary')) fail('Package script for general Root-Follow impulse runtime check is missing.');
else pass('Package script for general Root-Follow impulse runtime check exists.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[root-follow-material-impulse-raster-runtime-boundary] PASS');
