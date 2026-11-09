import fs from 'node:fs';

const modes = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts', 'utf8');
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');

const requireText = (haystack, needle, message) => {
  if (!haystack.includes(needle)) throw new Error(message + ` Missing: ${needle}`);
};
const rejectText = (haystack, needle, message) => {
  if (haystack.includes(needle)) throw new Error(message + ` Found: ${needle}`);
};
const count = (haystack, needle) => haystack.split(needle).length - 1;

if (count(modes, "machineId: 'harmonic-xplore-direct-carrier'") !== 1) {
  throw new Error('Basis hearing options must expose exactly one HarmonicXplorE right-list entry.');
}
rejectText(modes, 'harmonic-xplore-resonator', 'HX Resonator must not be duplicated in the right hearing list.');
rejectText(modes, 'harmonic-xplore-scatter', 'HX Scatter must not be duplicated in the right hearing list.');
rejectText(modes, 'harmonic-xplore-metallic', 'HX Metallisch must not be duplicated in the right hearing list.');
rejectText(modes, "harmonicXploreProfileId: 'harmonic-xplore-prime-spine'", 'Right-list HarmonicXplorE must respect the rack-selected profile instead of forcing Prim.');
requireText(modes, 'Aktuelles HarmonicXplorE-Profil aus dem Strukturrack', 'Right-list HX entry must document its rack-selected profile contract.');

rejectText(transport, 'Loop vorhören mit', 'Transport must not claim every preview is a loop.');
requireText(transport, '<span className="whitespace-nowrap">Tempo</span>', 'Transport must label BPM as preview tempo.');
requireText(transport, 'previewLoopEnabled', 'Transport must carry explicit loop-toggle state.');
requireText(transport, 'loopPreview: previewLoopEnabled', 'Main preview playback must use the loop checkbox.');
requireText(transport, '<span>Loop</span>', 'Transport must expose a visible Loop checkbox label.');
if (!transport.includes('previewLoopAppliesToCurrentRoute = previewRenderRouteKind === \"spectral\" || previewRenderRouteKind === \"basis-hearing\"') && !transport.includes('previewLoopAppliesToCurrentRoute = previewRouteSupportsLoopPlayback(previewRenderRouteKind)')) throw new Error('Loop toggle must apply to basis-hearing after loop playback is implemented.');
requireText(transport, 'previewLoopToggleDisabled = !previewLoopAppliesToCurrentRoute', 'Loop toggle disables only for routes that still have a separate source-preview path.');

console.log('[xensonar] basis hearing duplicate HX + loop toggle contract ok');
