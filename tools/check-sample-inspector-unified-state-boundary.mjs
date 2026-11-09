import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function fail(message) {
  console.error(`[xensonar:sample-inspector-unified-state-boundary] ${message}`);
  process.exit(1);
}

const loopPanel = read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx');
const libraryPanel = read('src/features/l3lab/canonicalForge/MelodicSampleLibraryPanel.tsx');
const card = read('src/features/l3lab/canonicalForge/MelodicSampleCard.tsx');
const menu = read('src/features/l3lab/canonicalForge/SampleInspectorMenu.tsx');
const hook = read('src/features/l3lab/canonicalForge/useMelodicSampleInspectorState.ts');
const display = read('src/features/l3lab/canonicalForge/sampleDisplayText.ts');
const actions = read('src/features/l3lab/canonicalForge/sampleInspectorMenuActions.ts');

if (!loopPanel.includes('useMelodicSampleInspectorState(melodicSampleEntries)')) {
  fail('melodicLoopPanel.tsx muss useMelodicSampleInspectorState nutzen.');
}
if (loopPanel.includes('const [sampleContextMenu, setSampleContextMenu]') || loopPanel.includes('sampleContextMenuRef = React.useRef')) {
  fail('Sample-Inspector-Menüzustand darf nicht mehr lokal im MelodicLoopPanel liegen.');
}
if (loopPanel.includes('setSampleDurationDraft(Math.max(0.02') || loopPanel.includes('setSampleTempoModeDraft(selectedContextSample')) {
  fail('Sample-Draft-Hydration muss im Sample-Inspector-State-Hook liegen.');
}
if (!loopPanel.includes('onOpenSampleDetails={sampleInspector.openSampleContextMenuAtDefaultPosition}')) {
  fail('Sidebar-Sample-Details müssen denselben Inspector-Öffnungspfad nutzen.');
}

for (const needle of ['SampleContextMenuState', 'SampleTempoModeDraft']) {
  if (!libraryPanel.includes(needle)) fail(`MelodicSampleLibraryPanel muss ${needle} aus dem gemeinsamen Vertrag nutzen.`);
}
if (!card.includes('formatMelodicSampleCardSummary(sample)')) {
  fail('MelodicSampleCard muss die gemeinsame Sample-Display-Helferlogik nutzen.');
}
if (!menu.includes("from './sampleDisplayText'")) {
  fail('SampleInspectorMenu muss Sample-Tempo-Text aus sampleDisplayText beziehen.');
}
if (actions.includes('formatSampleTempoSummary')) {
  fail('sampleInspectorMenuActions darf keine Sample-Display-Textlogik mehr besitzen.');
}

for (const needle of [
  'export type SampleContextMenuState',
  'sampleContextMenuRef',
  'openSampleContextMenuAtDefaultPosition',
  'formatSampleDurationDraft(selectedContextSample)',
]) {
  if (!hook.includes(needle)) fail(`useMelodicSampleInspectorState.ts fehlt ${needle}.`);
}
for (const needle of ['resolveSamplePlaybackDurationSec', 'formatSampleTempoSummary', 'formatMelodicSampleCardSummary', 'formatSampleDurationDraft']) {
  if (!display.includes(needle)) fail(`sampleDisplayText.ts fehlt ${needle}.`);
}

console.log('[xensonar:sample-inspector-unified-state-boundary] OK');
