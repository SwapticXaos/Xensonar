import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[global-manager-window-host] FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`[global-manager-window-host] OK: ${message}`);
const count = (haystack, needle) => (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;

const main = read('src/features/xensonar/layout/AppMainContent.tsx');
const app = read('src/App.tsx');
const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const material = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const groove = read('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx');
const loopDialog = read('src/features/xensonar/rooms/materialLoopPanel/LoopBankManagerDialog.tsx');
const presentation = read('src/features/xensonar/layout/appResonanceChromePresentationSources.ts');
const pkg = read('package.json');
const intents = read('src/features/xensonar/rooms/resonanceWorkspaceIntentEvents.ts');

if (!main.includes('data-xensonar-global-manager-window-host="true"')) fail('AppMainContent does not expose a global manager window host marker.');
else pass('AppMainContent exposes a global manager window host marker.');

if (count(main, '<ResonanceGrooveBassPanel') !== 1) fail('ResonanceGrooveBassPanel must be mounted exactly once as the global manager host.');
else pass('ResonanceGrooveBassPanel is mounted once, avoiding duplicate manager listeners.');

const hostIndex = main.indexOf('data-xensonar-global-manager-window-host="true"');
const resonancePanelIndex = main.indexOf('shouldRenderResonancePanels(props.room)');
if (hostIndex < 0 || resonancePanelIndex < 0 || hostIndex > resonancePanelIndex) fail('Global manager host must mount outside and before room-local resonance panels.');
else pass('Global manager host is room-independent and mounts before room-local panels.');

for (const forbidden of ['openHauptraumFromGlobalChrome', 'openHauptraumPanelFromGlobalChrome']) {
  if (app.includes(forbidden)) fail(`App still contains Hauptraum-routing manager callback: ${forbidden}`);
}
if (!process.exitCode) pass('Global chrome manager callbacks no longer route through Hauptraum helpers.');

for (const token of [
  'onOpenMaterialLoopManager: undefined',
  'onOpenRootFollowLoopManager: undefined',
  'onOpenDrumPatternManager: undefined',
  'onOpenBassPatternManager: undefined',
]) {
  if (!app.includes(token)) fail(`Chrome status source is not event-driven for manager opener: ${token}`);
}
if (!process.exitCode) pass('Chrome manager buttons are event-driven, not room-routing callbacks.');

for (const eventName of [
  'xensonar:open-material-loop-manager',
  'xensonar:open-root-follow-loop-manager',
  'xensonar:open-drum-pattern-manager',
  'xensonar:open-bass-pattern-manager',
]) {
  if (!intents.includes(eventName)) fail(`Workspace intent contract does not own ${eventName}.`);
}
for (const marker of ['OPEN_MATERIAL_LOOP_MANAGER_EVENT','OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT','OPEN_DRUM_PATTERN_MANAGER_EVENT','OPEN_BASS_PATTERN_MANAGER_EVENT']) {
  if (!status.includes(marker)) fail(`Status strip does not dispatch through ${marker}.`);
}
if (!process.exitCode) pass('Status strip still dispatches global manager open events through the shared intent contract.');

for (const marker of ['OPEN_MATERIAL_LOOP_MANAGER_EVENT', 'OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT']) {
  if (!material.includes(marker)) fail(`Global material/root-follow host does not listen through ${marker}.`);
}
for (const token of ['OPEN_DRUM_PATTERN_MANAGER_EVENT', 'OPEN_BASS_PATTERN_MANAGER_EVENT']) {
  if (!groove.includes(token)) fail(`Global groove/bass host does not listen through ${token}.`);
}
if (!process.exitCode) pass('Global manager host listeners cover material, root-follow, drum and bass managers.');

if (!loopDialog.includes('data-xensonar-loop-manager-clicks-do-not-trigger-wavestarter="true"')) fail('Loop manager dialogs lack pointer-leak protection marker.');
else pass('Loop manager dialogs keep pointer events out of underlying rooms.');

if (!presentation.includes('readonly onOpenMaterialLoopManager?:') || !presentation.includes('readonly onOpenRootFollowLoopManager?:')) fail('Chrome presentation source still treats material/root opener callbacks as mandatory.');
else pass('Chrome presentation source treats manager opener callbacks as optional event fallbacks.');

if (!pkg.includes('xensonar:check-global-manager-window-host')) fail('Package script for global manager window host check is missing.');
else pass('Package script for global manager window host check exists.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[global-manager-window-host] PASS');
