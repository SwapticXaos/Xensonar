import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[bass-pattern-event-contract] ${message}`);
    process.exit(1);
  }
};
const transpile = (file) => {
  const result = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert(errors.length === 0, `${file} has transpile diagnostics: ${errors.map((e) => e.messageText).join(' | ')}`);
};

const contractFile = 'src/features/xensonar/groove/bassPatternEvents.ts';
const panelFile = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const contract = read(contractFile);
const panel = read(panelFile);

[
  'export interface BassEvent',
  'export interface BassClip',
  'classicBassPatternToClip',
  'psyBassPatternToClip',
  'rhythmForgeBassPatternToClip',
  'buildBassPatternPreviewClip',
  'resolveBassEventFrequencyHz',
].forEach((needle) => assert(contract.includes(needle), `missing contract export: ${needle}`));

[
  'offbeat',
  'walking',
  'stotter',
  'arpeggio',
  'psy_classic',
  'psy_rolling',
  'psy_gallop',
  'psy_triplet',
  'psy_dark',
  'forge_rooted',
  'forge_braided',
  'forge_fractured',
].forEach((needle) => assert(contract.includes(needle), `contract does not cover ${needle}`));

[
  'BassPatternBodyPreview',
  'buildBassPatternPreviewClip',
  'Bass-Körper',
  'resolveBassEventFrequencyHz',
].forEach((needle) => assert(panel.includes(needle), `bass panel missing preview integration: ${needle}`));

assert(!panel.includes('GeneratorMeta'), 'developer-facing GeneratorMeta leaked into UI');
assert(!panel.includes('BassEventContract'), 'developer-facing BassEventContract leaked into UI');

transpile(contractFile);
transpile(panelFile);
console.log('[bass-pattern-event-contract] ok');
process.exit(0);
