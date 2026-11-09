import { readFileSync } from 'node:fs';

const inline = readFileSync('src/features/l3lab/spectralForge/components/InlineSynthLabPanel.tsx', 'utf8');
const editor = readFileSync('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralMachineEditorSection.tsx', 'utf8');
const harmonizer = readFileSync('src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx', 'utf8');

const failures = [];

if (!harmonizer.includes('data-spectral-forge-basis-hearing-modes="carrier-integral"')) {
  failures.push('left Play-/Hörweisen chooser is not present in HarmonizerPanel');
}
if (inline.includes('data-xensonar-spectralforge-inline-hearing-modes="true"')) {
  failures.push('inline Synth-Labor still declares a second hearing-mode chooser');
}
if (inline.includes('model.machineItems.map')) {
  failures.push('inline Synth-Labor still maps over all machineItems as a duplicate list');
}
if (inline.includes('data-xensonar-spectralforge-inline-selected-hearing-context="true"')) {
  failures.push('inline Synth-Labor still contains the redundant selected-hearing context block');
}
if (!inline.includes('compactLayout={true}')) {
  failures.push('inline Synth-Labor does not request the compact editor layout');
}
if (!inline.includes('const [showSynthLab, setShowSynthLab] = useState(true);')) {
  failures.push('Synth-Labor manual controls are not open by default');
}
if (!inline.includes('activeDeviceLayer, setActiveDeviceLayer] = useState<"gestalt" | "synth">("synth")')) {
  failures.push('inline Synth-Labor does not open on the synth layer by default');
}
if (!editor.includes('data-xensonar-carrier-integral-synth-lab-advanced="true"')) {
  failures.push('advanced Synth-Labor sliders hook is missing');
}
if (!editor.includes('data-xensonar-carrier-integral-layer-switcher="true"')) {
  failures.push('Gestalt/Synth layer switcher missing, hearing modification access may be hidden');
}
if (!editor.includes('showSynthLab || compactLayout')) {
  failures.push('compact inline mode must keep synth sliders visible without a second open step');
}
if (!editor.includes('!compactLayout ? (') || !editor.includes('Klangkörper')) {
  failures.push('compact inline mode must hide redundant inner context headings');
}

if (failures.length) {
  console.error('[spectralforge-inline-synthlab-no-duplicate-open-controls] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[spectralforge-inline-synthlab-no-duplicate-open-controls] OK');
