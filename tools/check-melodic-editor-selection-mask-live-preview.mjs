#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assertIncludes(file, needle, label) {
  if (!file.includes(needle)) {
    console.error(`[melodic-editor-selection-mask-live-preview] missing: ${label}`);
    process.exit(1);
  }
}
function assertOrder(file, before, after, label) {
  const left = file.indexOf(before);
  const right = file.indexOf(after);
  if (left < 0 || right < 0 || left >= right) {
    console.error(`[melodic-editor-selection-mask-live-preview] order failed: ${label}`);
    process.exit(1);
  }
}
function assertNotIncludes(file, needle, label) {
  if (file.includes(needle)) {
    console.error(`[melodic-editor-selection-mask-live-preview] forbidden: ${label}`);
    process.exit(1);
  }
}

const strip = read('src/features/l3lab/canonicalForge/SelectedSampleEffectStrip.tsx');
const transport = read('src/features/l3lab/canonicalForge/melodicLoopPreviewActions.ts');
const lifecycle = read('src/features/l3lab/canonicalForge/useCanonicalForgePreviewLifecycleEffects.ts');
const edgeSurface = read('src/features/xensonar/ui/edgeDragMaskSurface.tsx');

assertIncludes(strip, 'activePreviewUntilRef', 'sample-mask preview carries an active-preview lifetime instead of assuming React state is enough');
assertIncludes(strip, 'livePreviewRefreshFrameRef', 'drag refresh is coalesced before restarting preview');
assertIncludes(strip, 'hardForgetSampleMaskPreviewSnapshot', 'active mask preview can synchronously delete the old audio snapshot');
assertIncludes(strip, 'onStopPreview(statusMessage)', 'dragging calls the stop-preview contract before a new preview snapshot can start');
assertIncludes(strip, 'onHandleDragStart={() => {', 'edge-handle drag start synchronously forgets the old preview snapshot');
assertIncludes(strip, 'refreshActiveMaskPreview(nextRange)', 'handle dragging invalidates/restarts the active preview snapshot');
assertOrder(strip, 'liveRangeRef.current = nextRange;', 'refreshActiveMaskPreview(nextRange)', 'next mask range is committed before active preview refresh');
assertIncludes(strip, 'buildLiveNoteOverride(undefined, rangeOverride)', 'active drag refresh rebuilds preview from the new mask range, not the press-play snapshot');
assertIncludes(strip, 'data-xensonar-sample-mask-preview-restarts-from-live-range="true"', 'Vorhören button marks the live-range restart contract');
assertIncludes(strip, 'onMiddlePointerDown={(ratio) => previewLiveSelection(ratio)}', 'middle-zone scrub still previews without stealing edge-handle dragging');
assertIncludes(strip, 'data-xensonar-sample-mask-middle-preview="click-scrub"', 'middle-zone preview marker stays testable');
assertNotIncludes(strip, 'void onPreviewSelectedNote({ noteOverride: buildLiveNoteOverride(scrubRatio) });', 'old one-shot preview call must not return without active-preview invalidation');

assertIncludes(lifecycle, 'canonical-selection-loop-preview-live-mask-restart', 'source selection loop preview restarts on mask edits instead of keeping a press-play snapshot');
assertIncludes(lifecycle, 'void startSelectionLoopPreview().catch', 'selection mask edits restart the loop preview while it is running');
assertNotIncludes(lifecycle, 'Loop-Vorhörer gestoppt, weil sich die Auswahl geändert hat.', 'selection mask edits must not merely stop the loop preview');
assertIncludes(edgeSurface, 'onHandleDragStart', 'shared edge mask exposes drag-start hook for hard snapshot invalidation');
assertIncludes(edgeSurface, 'cursor-ew-resize', 'edge handles expose standard horizontal resize cursor');
assertIncludes(edgeSurface, 'cursor-pointer', 'middle zone exposes click/scrub cursor instead of resize');

assertIncludes(transport, 'noteOverride', 'selected-note transport still accepts the preview override');
assertIncludes(transport, 'notes: args.loopComposer.notes.map', 'preview override is materialized into the preview composer');

console.log('[melodic-editor-selection-mask-live-preview] ok');
