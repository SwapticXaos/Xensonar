import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const sidebar = readFileSync('src/features/l3lab/spectralForge/components/SpectralForgeWorkbenchSidebar.tsx', 'utf8');
const inline = readFileSync('src/features/l3lab/spectralForge/components/InlineSynthLabPanel.tsx', 'utf8');
const editor = readFileSync('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralMachineEditorSection.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`compact-sidebar-synthlab-layout check failed: ${message}`);
    process.exit(1);
  }
}

const asideStart = sidebar.indexOf('data-xensonar-spectralforge-sidebar-compact-workbench="true"');
assert(asideStart >= 0, 'compact sidebar marker missing');
const asideEnd = sidebar.indexOf('</aside>', asideStart);
assert(asideEnd > asideStart, 'compact sidebar block not found');
const aside = sidebar.slice(asideStart, asideEnd);
assert(room.includes('<SpectralForgeWorkbenchSidebar'), 'SpectralForgeRoom does not mount the extracted compact sidebar');

assert(!aside.includes('>Werkbank</div>'), 'standalone Werkbank header block is still present in the sidebar');
const projectIdx = aside.indexOf('<ProjectLibraryPanel />');
const projectsButtonIdx = aside.indexOf('<CarrierIntegralPanel');
const stampIdx = aside.indexOf('<CustomStampLibraryPanel');
const inlineIdx = aside.indexOf('<InlineSynthLabPanel />');
assert(projectIdx >= 0 && projectsButtonIdx > projectIdx, 'Gestalt-Projekte button must sit directly after project save area');
assert(stampIdx > projectsButtonIdx, 'custom stamp library must sit after Gestalt-Projekte button');
assert(inlineIdx > stampIdx, 'inline synth lab must sit after stamp library');

for (const forbidden of [
  'Hörweise und Klangkörper direkt ändern.',
  'Aktive Hörweise',
  'Auswahl links · Parameter und Klangkörper hier.',
  'prismDisplayName(selectedMachine)',
]) {
  assert(!inline.includes(forbidden), `redundant inline synthlab context remains: ${forbidden}`);
}
assert(inline.includes('compactLayout={true}'), 'inline synth lab does not request compact editor layout');
assert(editor.includes('compactLayout?: boolean'), 'machine editor compactLayout prop missing');
assert(editor.includes('{!compactLayout ? (') && editor.includes('Klangkörper') && editor.includes('Gestalt-Interpretation'), 'compact layout does not guard duplicate inner section headings');
assert(editor.includes('!compactLayout ? (') && editor.includes('setShowSynthLab'), 'synth-lab collapse button is not guarded away from compact layout');
assert(editor.includes('showSynthLab || compactLayout'), 'compact layout must keep synth controls visible without a second open step');
assert(editor.includes('"px-2 py-2 text-[10px] tracking-[0.12em]"'), 'compact tabs are not visibly shallower');

console.log('compact-sidebar-synthlab-layout check passed');
