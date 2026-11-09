import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let ok = true;
const fail = (msg) => { console.error(`[check-granular-manager-drag-hud] ${msg}`); ok = false; };
const expect = (cond, msg) => { if (!cond) fail(msg); };

const pkg = JSON.parse(read('package.json'));
expect(pkg.version.startsWith('3.2.91.5'), `package version should stay in the 3.2.91.5 line, got ${pkg.version}`);
expect(exists('src/features/xensonar/rooms/PlaylistDragActionHud.tsx'), 'PlaylistDragActionHud missing');
expect(exists('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts'), 'rootFollowGranularSettings missing');

const materialPanel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const groovePanel = read('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx');
const rackDialog = read('src/features/xensonar/rooms/GridTuningRackDialog.tsx');
const statusStrip = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const app = read('src/App.tsx');
const renderer = read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts');
const playback = read('src/features/xensonar/material/useRootFollowLoopPlayback.ts');
const settings = read('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');

for (const [name, src] of [['MaterialLoopPanel', materialPanel], ['GrooveBassPanel', groovePanel], ['GridTuningRackDialog', rackDialog]]) {
  expect(src.includes('PlaylistDragActionHud'), `${name} does not use PlaylistDragActionHud`);
  expect(src.includes('setDragHud'), `${name} does not update drag HUD state`);
}
expect(materialPanel.includes('RootFollowGranularManagerDialog'), 'Granular manager dialog missing from material/root-follow panel');
expect(materialPanel.includes('Granular Manager'), 'Granular Manager UI label missing');
expect(materialPanel.includes('ROOT_FOLLOW_GRANULAR_LIMITS'), 'Granular limits not wired into UI');
expect(materialPanel.includes('Dichteprofil') && materialPanel.includes('Mikro-Dichte') && materialPanel.includes('Quellfenster'), 'Granular power/micro controls missing');
expect(materialPanel.includes('Basis-Slice') && materialPanel.includes('Fragment-Slice'), 'Granular quality controls missing');
expect(materialPanel.includes('Loopprofil') && (materialPanel.includes('Aus Loop ableiten') || materialPanel.includes('Raw Audio fitten')) && materialPanel.includes('Custom speichern') && materialPanel.includes('Custom laden'), 'Granular analysis/custom slot controls missing');
expect(settings.includes('windowMs') && settings.includes('stepMs') && settings.includes('leadMs') && settings.includes('startLeadMs'), 'Granular settings fields missing');
expect(settings.includes('microDensity') && settings.includes('sourceSpread') && settings.includes('maxGrainsPerWindow'), 'Granular micro-density/source-spread/grain-limit fields missing');
expect(settings.includes('ROOT_FOLLOW_GRANULAR_POWER_MODES') && settings.includes("'edge'") && settings.includes('Feinauflösung'), 'Granular power modes missing');
expect(settings.includes('buildRootFollowGranularRenderTuning'), 'Granular render tuning builder missing');
expect(settings.includes("preset: 'smooth'") && settings.includes('analyzeRootFollowGranularAudioProfile'), 'Granular smooth preset/audio profile analysis missing');
expect(settings.includes("qualityMode: 'fragment'") && settings.includes("qualityMode: 'base'"), 'Granular preset quality modes missing');
expect(renderer.includes('resolveRootFollowGranularSettings'), 'Root-follow material renderer does not resolve granular settings');
expect(renderer.includes('buildRootFollowGranularRenderTuning') && renderer.includes('tuning: granularTuning'), 'Root-follow material renderer does not pass granular render tuning');
expect(renderer.includes('granularSettings.windowMs') && renderer.includes('granularSettings.stepMs') && renderer.includes('granularSettings.leadMs'), 'Root-follow renderer does not consume granular timing settings');
expect(playback.includes('granularSettingsRef'), 'Root-follow playback does not pass granular settings ref');
expect(app.includes('rootFollowGranularSettings'), 'App does not persist/pass root-follow granular settings');
expect(statusStrip.includes('bassPatternNameLabel') && statusStrip.includes('Bass Pattern verwalten'), 'Status strip does not expose compact bass-pattern manager entry');
expect(!statusStrip.includes('Fenster</span>'), 'Status strip still exposes keyboard-window text block');
expect(groovePanel.includes('BassPatternManagerDialog') && groovePanel.includes('OPEN_BASS_PATTERN_MANAGER_EVENT'), 'Bass pattern manager dialog/event missing');
expect(materialPanel.includes('HeaderVolumeControl') && groovePanel.includes('GrooveHeaderVolumeControl'), 'Manager header volume controls missing');
expect(materialPanel.includes('sideBySideLeft={granularManagerOpen}') && materialPanel.includes('sideBySideRight'), 'Root-follow/granular side-by-side manager behavior missing');
expect(!materialPanel.includes('absolute -top-4') && !groovePanel.includes('absolute -top-4') && !rackDialog.includes('absolute -top-4'), 'Visible wide insert labels still present');

if (!ok) process.exit(1);
console.log('[check-granular-manager-drag-hud] ok');
