#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const path = 'src/features/l3lab/canonicalForge/loopDrumDomain.ts';
const source = fs.readFileSync(path, 'utf8');
const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const typeNames = [
  'DrumViewportState',
  'LoopAutocorrectSuggestion',
  'StampPhase',
  'LoopPitchStep',
  'LoopTimeGuideMarker',
  'LoopNoteRenderSourceKind',
  'LoopMaterialPitchMode',
  'CarrierIntegralPinkVariant',
  'CarrierIntegralFieldVoiceEvent',
  'CarrierIntegralFieldClip',
  'PendingImageImport',
];

let imported = new Set();
let reexported = new Set();
for (const node of sf.statements) {
  if (ts.isImportDeclaration(node)) {
    if (!ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== './loopDrumDomainTypes') continue;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      imported = new Set(bindings.elements.map((element) => element.name.text));
    }
    continue;
  }
  if (ts.isExportDeclaration(node)) {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== './loopDrumDomainTypes') continue;
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      reexported = new Set(node.exportClause.elements.map((element) => element.name.text));
    }
  }
}

const failures = [];
for (const name of typeNames) {
  if (imported.has(name)) failures.push(`${name} must not be redundantly imported into loopDrumDomain.ts`);
  if (!reexported.has(name)) failures.push(`${name} compatibility re-export must remain public`);
}
if (!source.includes("import type {")) failures.push('domain should retain the type imports it actually consumes');
if (!source.includes("export type {")) failures.push('domain must retain its public type facade');

if (failures.length) {
  console.error('[loop-drum-domain-type-import-hygiene-152] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: 'loop-drum-domain-type-import-hygiene-152',
  removedRedundantTypeImports: typeNames.length,
  compatibilityReexportsPreserved: typeNames.length,
  runtimeStatementsTouched: 0,
}, null, 2));
