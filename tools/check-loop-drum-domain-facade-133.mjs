#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const domainPath = 'src/features/l3lab/canonicalForge/loopDrumDomain.ts';
const typesPath = 'src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts';
const domain = fs.readFileSync(domainPath, 'utf8');
const types = fs.readFileSync(typesPath, 'utf8');
const failures = [];

const exportedTypes = [
  'GrooveMachineConfig', 'DrumVoiceId', 'DrumComputerState', 'DrumViewportState',
  'LoopAutocorrectSuggestion', 'StampPhase', 'LoopPitchStep', 'LoopTrackPatternPreset',
  'LoopCompositionPreset', 'LoopTrack', 'LoopPitchLine', 'LoopTimeGuideMarker',
  'LoopNoteRenderSourceKind', 'LoopMaterialPitchMode', 'CarrierIntegralPinkVariant',
  'CarrierIntegralFieldVoiceEvent', 'CarrierIntegralFieldClip', 'LoopNoteEvent',
  'LoopGhostNote', 'LoopNoteSelectionBox', 'ChordVoicing', 'PendingImageImport',
  'LoopComposerState', 'LoopComposerHydrationState', 'DrumComputerHydrationState',
];

if (!domain.includes("from './loopDrumDomainTypes'")) failures.push('facade does not import/re-export loopDrumDomainTypes');
for (const name of exportedTypes) {
  const directTypeExport = types.includes(`export type ${name}`);
  const namedTypeReexport = new RegExp(`export\\s+type\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`, 's').test(types);
  if (!directTypeExport && !namedTypeReexport) failures.push(`types owner missing export ${name}`);
  if (!domain.includes(name)) failures.push(`facade missing compatibility re-export/import ${name}`);
}
for (const forbidden of [
  'export type GrooveMachineConfig =',
  'export type LoopComposerState =',
  'export type LoopNoteEvent =',
  'export type DrumComputerState =',
]) {
  if (domain.includes(forbidden)) failures.push(`implementation still owns extracted declaration: ${forbidden}`);
}
if (!domain.includes("from './loopPitchDomain'")) failures.push('facade missing loopPitchDomain owner');
if (!domain.includes("from './loopDrumComputerDomain'")) failures.push('facade missing loopDrumComputerDomain owner');
const domainLines = domain.split(/\r?\n/).length;
if (domainLines > 1200) failures.push(`loopDrumDomain implementation should remain <=1200 lines after type-facade split; saw ${domainLines}`);

for (const [label, source] of [['domain', domain], ['types', types]]) {
  const out = ts.transpileModule(source, {
    fileName: label === 'domain' ? domainPath : typesPath,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  const diagnostics = out.diagnostics ?? [];
  if (diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error)) {
    failures.push(`${label} has TypeScript syntax/transpile diagnostics`);
  }
}

if (failures.length) {
  console.error('[loop-drum-domain-facade-133] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, domainLines, extractedTypeCount: exportedTypes.length, publicImportPathPreserved: true }, null, 2));
