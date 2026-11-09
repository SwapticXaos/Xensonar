#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assertIncludes(file, needle, label) {
  if (!file.includes(needle)) {
    console.error(`[melodic-editor-selection-mask-contract] missing: ${label}`);
    process.exit(1);
  }
}
function assertNotIncludes(file, needle, label) {
  if (file.includes(needle)) {
    console.error(`[melodic-editor-selection-mask-contract] forbidden: ${label}`);
    process.exit(1);
  }
}

const strip = read('src/features/l3lab/canonicalForge/SelectedSampleEffectStrip.tsx');
const surface = read('src/features/xensonar/ui/edgeDragMaskSurface.tsx');
const legacyWrapper = read('src/features/l3lab/canonicalForge/selectionMaskRangeControl.tsx');
const waveform = read('src/features/l3lab/canonicalForge/selectedSampleWaveformPreview.ts');

assertIncludes(strip, "EdgeDragMaskSurface", 'Melodic block editor uses the shared horizontal edge-drag mask surface');
assertIncludes(strip, '<EdgeDragMaskSurface', 'Selected sample editor renders draggable mask edges on the waveform');
assertIncludes(strip, 'statusLabel="Wirkbereich"', 'Melodic editor keeps domain wording local to this context');
assertIncludes(strip, 'onChange={updateRange}', 'Range mutation remains routed through the local-field range updater');
assertNotIncludes(strip, 'SelectionMaskRangeControl', 'Melodic sample editor must not fall back to the old range/toggle-like control');
assertNotIncludes(strip, 'Maske Start', 'old split label must not return');
assertNotIncludes(strip, 'Maske Ende', 'old split label must not return');
assertNotIncludes(strip, 'Startkante', 'separate start label must not return in the melodic editor');
assertNotIncludes(strip, 'Endkante', 'separate end label must not return in the melodic editor');
assertNotIncludes(strip, 'Editor-Zone', 'developer-facing editor-zone prose must not return');
assertNotIncludes(strip, 'Dieser Block benutzt', 'developer-facing sample explanation must not return');
assertNotIncludes(strip, 'Die lila Maske bestimmt den Wirkbereich des Editors', 'developer-facing mask explanation must not return');
assertNotIncludes(strip, 'Segment-Ausschnitt', 'verbose segment prose must not return');
assertNotIncludes(strip, 'darunter bearbeitest du', 'instructional editor prose must not return');

assertIncludes(surface, 'export function EdgeDragMaskSurface', 'shared edge-drag mask surface exported');
assertIncludes(surface, 'data-xensonar-edge-drag-mask-surface="horizontal"', 'shared surface has a testable contract marker');
assertIncludes(surface, 'data-xensonar-edge-drag-mask-handle="start"', 'shared start-edge handle marker');
assertIncludes(surface, 'data-xensonar-edge-drag-mask-handle="end"', 'shared end-edge handle marker');
assertIncludes(surface, 'applyEdgeDragMaskHandle', 'shared clamp/min-span handle contract exists');
assertIncludes(surface, 'resolveEdgeDragMaskRatio', 'shared pointer-to-ratio contract exists');
assertNotIncludes(surface, 'Maske Start', 'shared mask surface must not encode old melodic labels');
assertNotIncludes(surface, 'Maske Ende', 'shared mask surface must not encode old melodic labels');
assertNotIncludes(surface, 'Startkante', 'shared mask surface must not hard-code a domain label for the left edge');
assertNotIncludes(surface, 'Endkante', 'shared mask surface must not hard-code a domain label for the right edge');

assertIncludes(legacyWrapper, 'EdgeDragMaskSurface', 'compatibility wrapper delegates to the shared edge-drag surface');
assertNotIncludes(legacyWrapper, '<input', 'compatibility wrapper must not reintroduce slider/toggle controls');
assertNotIncludes(legacyWrapper, 'Startkante', 'compatibility wrapper must not reintroduce start-edge label');
assertNotIncludes(legacyWrapper, 'Endkante', 'compatibility wrapper must not reintroduce end-edge label');

assertIncludes(waveform, 'Wirkbereich', 'waveform overlay uses concise musical context wording');
assertNotIncludes(waveform, 'nicht zum Schneiden', 'canvas label must not carry defensive developer prose');
assertNotIncludes(waveform, 'Maske für Effekte', 'canvas label must not expose old mask prose');

console.log('[melodic-editor-selection-mask-contract] ok');
