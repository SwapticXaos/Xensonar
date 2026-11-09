import fs from 'node:fs';

const guide = fs.readFileSync('src/features/xensonar/rooms/ResonanceGuidePanel.tsx', 'utf8');

const required = [
  ['clean A-# hotkey label', 'A - #'],
  ['particle mode explanation', 'Im Partikelmodus schalten A - # Partikel-Sounds an und aus'],
  ['loop mode explanation', 'In den Loop-Modi'],
  ['material/root follow icons', '📀 Materialspur'],
  ['root follow loop icon', '🎼 Root Follow Loop'],
  ['A-L playlist jump', 'A - L'],
  ['top nine entries', 'obersten neun Playlist-Einträgen'],
  ['older entry browsing', 'durch ältere Einträge zappen'],
  ['hash loop toggle', 'Loop an/aus bzw. kill/restart'],
  ['material forge wording', 'Materialschmiede-Bereich basteln/komponieren'],
  ['drum header guidance', 'unter 🥁 in der Kopfzeile'],
  ['drum machine material forge spelling', 'Drum Machine im Materialschmiede-Bereich'],
  ['bass menu no hotkey note', 'Für das Bass-Menü 🎸 gibt es aktuell noch keine Hotkey-Zuordnung'],
];

const forbidden = [
  ['stale A ellipsis hash', 'A ... #'],
  ['typo Matrialschmiede', 'Matrialschmiede'],
  ['vague old hotkey text', 'Je nach Resonance-Hotkey-Modus entweder Partikel klassisch muten'],
];

const failed = [];
for (const [name, needle] of required) {
  if (!guide.includes(needle)) failed.push(`${name}: missing ${needle}`);
}
for (const [name, needle] of forbidden) {
  if (guide.includes(needle)) failed.push(`${name}: forbidden ${needle}`);
}

if (failed.length) {
  console.error('[resonance-guide-hotkey-text-contract] FAIL');
  for (const failure of failed) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[resonance-guide-hotkey-text-contract] OK');
