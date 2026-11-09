import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[bass-workbench-clip-library] ${message}`);
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

const eventFile = 'src/features/xensonar/groove/bassPatternEvents.ts';
const libraryFile = 'src/features/xensonar/groove/bassClipLibrary.ts';
const panelFile = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const appFile = 'src/App.tsx';
const events = read(eventFile);
const library = read(libraryFile);
const panel = read(panelFile);
const app = read(appFile);

[
  'cloneBassClipAsWorkcopy',
  'patchBassClipEvent',
  'scheduleBassClipStep',
  'normalizeBassClip',
].forEach((needle) => assert(events.includes(needle), `missing bass event workbench export: ${needle}`));

[
  'BASS_CLIP_LIBRARY_STORAGE_KEY',
  'readBassClipLibraryState',
  'saveBassClipWorkcopy',
  'updateBassClip',
  'removeBassClip',
  'moveBassClip',
].forEach((needle) => assert(library.includes(needle), `missing library contract: ${needle}`));

[
  'Als Arbeitskopie fixieren',
  'Arbeitskopien',
  'editable={editable}',
  'patchBassClipEvent',
  'BassClip[]',
  'PlaylistDragActionHud',
].forEach((needle) => assert(panel.includes(needle), `bass manager missing workbench UI: ${needle}`));

[
  'bassPatternMode: "preset"',
  'bassClipId: ""',
  'readBassClipById',
  'scheduleBassClipStep',
  'activeBassClipStatus',
].forEach((needle) => assert(app.includes(needle), `app missing bass clip playback bridge: ${needle}`));

assert(!panel.includes('GeneratorMeta'), 'developer-facing GeneratorMeta leaked into UI');
assert(!panel.includes('BassEventContract'), 'developer-facing BassEventContract leaked into UI');

[eventFile, libraryFile, panelFile].forEach(transpile);
console.log('[bass-workbench-clip-library] ok');
process.exit(0);
