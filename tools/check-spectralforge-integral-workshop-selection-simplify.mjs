#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panelPath = path.join(root, 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx');
const libraryWorkspacePath = path.join(root, 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/useCarrierIntegralLibraryWorkspace.ts');
const libraryIntentPath = path.join(root, 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryIntent.ts');
const libraryActionFlowPath = path.join(root, 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryActionFlow.ts');
const panel = fs.readFileSync(panelPath, 'utf8');
const libraryWorkspace = fs.readFileSync(libraryWorkspacePath, 'utf8');
const libraryIntent = fs.readFileSync(libraryIntentPath, 'utf8');
const libraryActionFlow = fs.readFileSync(libraryActionFlowPath, 'utf8');

const failures = [];

for (const forbidden of [
  'Werte aus Eintrag',
  'resolveCarrierIntegralApplyStoredValuesSuccessFlow',
  'applyStoredDeviceValues(selectedProject)',
  'gespeicherte Gestalt-/Klangwerte einsetzen',
]) {
  if (panel.includes(forbidden) || libraryWorkspace.includes(forbidden) || libraryActionFlow.includes(forbidden)) {
    failures.push(`manual stored-values affordance still present: ${forbidden}`);
  }
}

for (const required of [
  'applyStoredDeviceValuesFromSnapshot',
  'storedHarmonicXplore: snapshot.carrierIntegralHarmonicXplore',
  'setCarrierIntegralHarmonicXplore(deviceValuesFlow.harmonicXplorePatch)',
  'setAuditionValueSource("stored-entry")',
  'if (loaded) {',
  'args.onClose();',
]) {
  if (!libraryWorkspace.includes(required)) failures.push(`useCarrierIntegralLibraryWorkspace missing ${required}`);
}
for (const required of [
  'In SpectralForge öffnen',
  'title="Projekt in SpectralForge öffnen"',
]) {
  if (!panel.includes(required)) failures.push(`CarrierIntegralVerwaltenPanel missing ${required}`);
}

for (const required of [
  'carrierIntegralHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;',
  'harmonicXplorePatch: Partial<CarrierIntegralHarmonicXploreSelection> | null;',
  'storedHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;',
  'harmonicXplorePatch: args.storedHarmonicXplore',
]) {
  if (!libraryIntent.includes(required)) failures.push(`carrierIntegralLibraryIntent missing ${required}`);
}

if (!panel.includes('rounded-xl border border-cyan-600/80 bg-cyan-950/35 px-5 py-3')) {
  failures.push('open-project action is not visually promoted beyond the old small utility button');
}

if (!libraryWorkspace.includes('const selectLibraryEntry = (entry: ForgeProjectMeta) =>') || !libraryWorkspace.includes('void runLibraryAction(async () =>')) {
  failures.push('library entry selection is not routed through the stored-values action flow');
}

if (failures.length > 0) {
  console.error('[spectralforge-integral-workshop-selection-simplify] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[spectralforge-integral-workshop-selection-simplify] PASS');
console.log('- Manual "Werte aus Eintrag" affordance removed.');
console.log('- Selecting a library entry applies stored device values, including HarmonicXplore settings.');
console.log('- Project opening is promoted and returns to the SpectralForge work surface after load.');
