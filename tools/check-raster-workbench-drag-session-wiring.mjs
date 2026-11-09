#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) {
  console.error(`[raster-workbench-drag-session-wiring] ${message}`);
  process.exit(1);
}

const file = 'src/features/xensonar/rooms/GridTuningRackDialog.tsx';
const source = fs.readFileSync(file, 'utf8');

if (source.includes('rackRowRefs')) {
  fail('GridTuningRackDialog still references rackRowRefs; slot rows must be registered through rackDragSession.registerRow.');
}

if (source.includes('option.tuning')) {
  fail('GridTuningRackDialog still references option.tuning; library options expose option.value.');
}

const hookIndex = source.indexOf('const rackDragSession = usePhaseShiftedPlaylistDragSession<DragPayload>();');
const openReturnIndex = source.indexOf('if (!open) return null;');
if (hookIndex < 0) fail('missing rackDragSession hook');
if (openReturnIndex < 0) fail('missing open guard');
if (hookIndex > openReturnIndex) fail('rackDragSession hook must stay before if (!open) return null to preserve React hook order.');

if (!source.includes('rackDragSession.registerRow(String(index), element);')) {
  fail('active rack slot rows are not registered with rackDragSession.registerRow.');
}

if (!source.includes('draggedId: `library:${option.value}`')) {
  fail('library drag identity must be based on option.value, not missing/label-derived fields.');
}

console.log('[raster-workbench-drag-session-wiring] OK');
