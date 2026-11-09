import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const hotkeys = read('src/features/xensonar/drumPatternPlaylistHotkeys.ts');
const auxiliaryRouter = read('src/features/xensonar/input/resonanceAuxiliaryHotkeyRoutingBoundary.ts');
const guide = read('src/features/xensonar/rooms/ResonanceGuidePanel.tsx');
const drumManager = read('src/features/xensonar/rooms/grooveBassPanel/DrumPatternManagerDialog.tsx');

const required = [
  ['hotkey helper resolves CapsLock forward', hotkeys.includes('event.code === "CapsLock") return 1')],
  ['hotkey helper resolves left shift reverse', hotkeys.includes('event.code === "ShiftLeft") return -1')],
  ['Auxiliary router delegates drum hotkeys to helper', auxiliaryRouter.includes('resolveDrumPlaylistHotkeyDirection(event)')],
  ['Auxiliary router no longer encodes Shift+CapsLock inline', !auxiliaryRouter.includes('event.shiftKey ? -1 : 1')],
  ['Guide imports shared help text', guide.includes('DRUM_PLAYLIST_HOTKEY_HELP')],
  ['Drum manager imports shared help text', drumManager.includes('DRUM_PLAYLIST_HOTKEY_HELP')],
  ['Guide mentions drum ordering in header', guide.includes('unter 🥁 in der Kopfzeile')],
  ['Guide spells Materialschmiede correctly', guide.includes('Materialschmiede-Bereich') && !guide.includes('Matrialschmiede')],
];

const failed = required.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('[drum-playlist-key-contract] failed:');
  for (const name of failed) console.error(` - ${name}`);
  process.exit(1);
}
console.log('[drum-playlist-key-contract] ok');
