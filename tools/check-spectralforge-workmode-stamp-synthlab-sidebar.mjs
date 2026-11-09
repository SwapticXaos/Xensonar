import { readFileSync } from 'node:fs';

const room = readFileSync('src/features/l3lab/spectralForge/SpectralForgeRoom.tsx', 'utf8');
const stamp = readFileSync('src/features/l3lab/spectralForge/components/CustomStampLibraryPanel.tsx', 'utf8');
const inline = readFileSync('src/features/l3lab/spectralForge/components/InlineSynthLabPanel.tsx', 'utf8');

const failures = [];
const forbid = [
  'Arbeitsmodus',
  'Werkbank + Verkörperungsraum',
  'Oben wird Gestalt komponiert',
  'unten lebt die Verkörperung',
  'Hier lebt die Bastel-Ebene',
];
for (const needle of forbid) {
  if (room.includes(needle) || stamp.includes(needle)) failures.push(`forbidden copy still present: ${needle}`);
}
if (!room.includes('Male eine Melodie / Klangskulptur')) failures.push('new workmode guidance missing');
if (!room.includes('Materialspur / Root Follow Loop')) failures.push('Loop Station route wording missing');
if (!room.includes('Pinke Spur in den Melodic Loop')) failures.push('pink melodic-loop route wording missing');
if (!room.includes('<InlineSynthLabPanel />')) failures.push('inline synth lab not mounted in SpectralForge sidebar');
if (!stamp.includes('useState(false)') || !stamp.includes('aria-expanded={expanded}')) failures.push('custom stamp library is not default-collapsible');
if (!stamp.includes('data-xensonar-custom-stamp-library-expanded={expanded ? "true" : "false"}')) failures.push('custom stamp expanded-state contract missing');
if (!inline.includes('data-xensonar-spectralforge-inline-synth-lab="true"')) failures.push('inline synth lab data hook missing');
if (inline.includes('data-xensonar-spectralforge-inline-hearing-modes="true"')) failures.push('inline synth lab must not duplicate the hearing-mode chooser');
if (inline.includes('data-xensonar-spectralforge-inline-selected-hearing-context="true"')) failures.push('inline selected-hearing context should be removed in compact sidebar');
if (!inline.includes('compactLayout={true}')) failures.push('inline synth lab compact layout flag missing');
if (!inline.includes('const [showSynthLab, setShowSynthLab] = useState(true);')) failures.push('inline synth controls must be open by default');
if (!inline.includes('CarrierIntegralMachineEditorSection')) failures.push('inline synth lab does not reuse machine editor controls');

if (failures.length) {
  console.error('[spectralforge-workmode-stamp-synthlab-sidebar] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spectralforge-workmode-stamp-synthlab-sidebar] OK');
