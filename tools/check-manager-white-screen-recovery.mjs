import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assertIncludes(label, haystack, needle) { if (!haystack.includes(needle)) throw new Error(`${label} missing expected marker: ${needle}`); }
function assertNotIncludes(label, haystack, needle) { if (haystack.includes(needle)) throw new Error(`${label} contains forbidden marker: ${needle}`); }
const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
const loops = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const groove = read('src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx');
const intents = read('src/features/xensonar/rooms/resonanceWorkspaceIntentEvents.ts');
assertNotIncludes('ResonanceStatusStrip', status, "from './resonanceWindowEvents'");
assertNotIncludes('ResonanceMaterialLoopPanel', loops, "from './resonanceWindowEvents'");
assertNotIncludes('ResonanceGrooveBassPanel', groove, "from './resonanceWindowEvents'");
assertNotIncludes('ResonanceMaterialLoopPanel', loops, "from './HeaderVolumeControl'");
assertNotIncludes('ResonanceGrooveBassPanel', groove, "from './HeaderVolumeControl'");
for (const eventName of ['xensonar:open-material-loop-manager','xensonar:open-root-follow-loop-manager','xensonar:open-drum-pattern-manager','xensonar:open-bass-pattern-manager','xensonar:open-grid-tuning-rack']) assertIncludes('resonanceWorkspaceIntentEvents', intents, eventName);
for (const marker of ['OPEN_MATERIAL_LOOP_MANAGER_EVENT','OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT','OPEN_DRUM_PATTERN_MANAGER_EVENT','OPEN_BASS_PATTERN_MANAGER_EVENT','OPEN_GRID_TUNING_RACK_EVENT']) assertIncludes('ResonanceStatusStrip', status, marker);
for (const marker of ['OPEN_MATERIAL_LOOP_MANAGER_EVENT','OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT']) assertIncludes('ResonanceMaterialLoopPanel', loops, marker);
for (const marker of ['OPEN_DRUM_PATTERN_MANAGER_EVENT','OPEN_BASS_PATTERN_MANAGER_EVENT']) assertIncludes('ResonanceGrooveBassPanel', groove, marker);
for (const marker of ['Materialspur Lautstärke','Root Follow Lautstärke','Granular Manager']) assertIncludes('ResonanceMaterialLoopPanel', loops, marker);
for (const marker of ['Drum Lautstärke','Bass Lautstärke','Drum Pattern verwalten','Bass Pattern']) assertIncludes('ResonanceGrooveBassPanel', groove, marker);
console.log(JSON.stringify({ status: 'ok', check: 'manager-white-screen-recovery' }, null, 2));
