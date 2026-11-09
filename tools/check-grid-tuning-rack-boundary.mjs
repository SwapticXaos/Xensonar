#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const files = {
  dialog: 'src/features/xensonar/rooms/GridTuningRackDialog.tsx',
  editorDomain: 'src/features/xensonar/rooms/gridTuningRack/gridTuningEditorDomain.ts',
  editorSession: 'src/features/xensonar/rooms/gridTuningRack/useGridTuningEditorSession.ts',
  rackLibraryWorkspace: 'src/features/xensonar/rooms/gridTuningRack/useGridTuningRackLibraryWorkspace.ts',
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const dialog = read(files.dialog);
const editorDomain = read(files.editorDomain);
const editorSession = read(files.editorSession);
const rackLibraryWorkspace = read(files.rackLibraryWorkspace);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('GridTuningRackDialog imports editor domain', dialog, './gridTuningRack/gridTuningEditorDomain');
requireText('GridTuningRackDialog imports editor session', dialog, './gridTuningRack/useGridTuningEditorSession');
requireText('GridTuningRackDialog imports rack/library workspace', dialog, './gridTuningRack/useGridTuningRackLibraryWorkspace');
requireText('GridTuningRackDialog still exposes package row', dialog, 'PackageActionRow');
requireText('rack/library workspace owns grid archive import', rackLibraryWorkspace, 'importGridLibraryArchiveAction');
requireText('rack/library workspace owns grid archive export', rackLibraryWorkspace, 'exportGridLibraryArchiveAction');
requireText('rack/library workspace owns phase shifted drag session', rackLibraryWorkspace, 'usePhaseShiftedPlaylistDragSession');
requireText('editor session owns marker pointer lifecycle', editorSession, "window.addEventListener('pointermove', handlePointerMove)");
requireText('GridTuningRackDialog still has custom-raster label', dialog, 'Custom-Raster');
requireText('GridTuningRackDialog still has Cent total control', dialog, 'Cent total');
requireText('GridTuningRackDialog still has JI menu', dialog, 'JI');
forbidText('GridTuningRackDialog', dialog, 'const WORKBENCH_HEIGHT = 420');
forbidText('GridTuningRackDialog', dialog, 'function seedEditorFromTuning(');
forbidText('GridTuningRackDialog', dialog, 'function classifyDraft(');
forbidText('GridTuningRackDialog', dialog, 'function createCustomGridId(');
forbidText('GridTuningRackDialog', dialog, 'function createEqualStepCents(');
forbidText('GridTuningRackDialog', dialog, 'importGridLibraryArchiveAction');
forbidText('GridTuningRackDialog', dialog, 'usePhaseShiftedPlaylistDragSession');
forbidText('GridTuningRackDialog', dialog, "window.addEventListener('pointermove'");

for (const marker of [
  'export const WORKBENCH_HEIGHT',
  'export const PERIOD_CANONICAL_CENTS',
  'export type GridTuningEditorState',
  'export function createEqualStepCents',
  'export const JI_WORKBENCH_INTERVALS',
  'export function classifyDraft',
  'export function seedEditorFromTuning',
  'export function createCustomGridId',
  'export function formatStepLabel',
]) requireText('grid tuning editor domain', editorDomain, marker);

const dialogBytes = Buffer.byteLength(dialog, 'utf8');
if (dialogBytes > 34_000) failures.push(`GridTuningRackDialog should stay below 34KB after editor/workspace ownership split; saw ${dialogBytes} bytes`);

if (failures.length) {
  console.error('[grid-tuning-rack-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  dialogBytes,
  owners: {
    editorSession: files.editorSession,
    rackLibraryWorkspace: files.rackLibraryWorkspace,
  },
}, null, 2));
