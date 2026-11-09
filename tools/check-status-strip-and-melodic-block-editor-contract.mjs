#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assertIncludes(file, needle, label) {
  if (!file.includes(needle)) {
    console.error(`[status-melodic-contract] missing: ${label}`);
    process.exit(1);
  }
}
function assertNotIncludes(file, needle, label) {
  if (file.includes(needle)) {
    console.error(`[status-melodic-contract] forbidden: ${label}`);
    process.exit(1);
  }
}

const status = read('src/features/xensonar/rooms/ResonanceStatusStrip.tsx');
assertIncludes(status, 'compactStatusTitleLabels', 'combined title shortening helper');
assertIncludes(status, 'STATUS_TITLE_TOTAL_CHAR_LIMIT', 'combined status title budget');
assertIncludes(status, 'overflow-hidden whitespace-nowrap', 'status strip blocks horizontal scrollbar');
assertIncludes(status, '📀', 'Materialspur glyph');
assertIncludes(status, '🎼', 'Root Follow glyph');
assertIncludes(status, '🥁', 'Drum glyph');
assertIncludes(status, '🎸', 'Bass glyph');
assertIncludes(status, '{compactTitles.material}', 'shortened Materialspur label rendered');
assertIncludes(status, '{compactTitles.rootFollow}', 'shortened Root Follow label rendered');
assertIncludes(status, '{compactTitles.drum}', 'shortened Drum label rendered');
assertIncludes(status, '{compactTitles.bass}', 'shortened Bass label rendered');
assertNotIncludes(status, 'overflow-x-auto whitespace-nowrap', 'horizontal scrollbar contract must not return');

const preview = read('src/features/l3lab/canonicalForge/loopPreview.ts');
assertIncludes(preview, 'const noteLoopStartSec = request.noteId', 'selected note preview is rebased to audible start');
assertIncludes(preview, 'startTime - selectedNoteStartOffsetSec', 'selected note start offset compensation');
assertIncludes(preview, 'if (!request.noteId) {\n    scheduleDrumPattern', 'selected note preview avoids unrelated drum scheduling');

const field = read('src/features/l3lab/canonicalForge/localField.ts');
assertIncludes(field, 'verticalSoftRadius', 'warp brush separates visible footprint from curve vertical distance');
assertIncludes(field, 'horizontalRatio * 0.82', 'warp brush uses horizontal footprint as main expectation');
assertIncludes(field, 'verticalRatio) * 0.18', 'warp brush keeps soft vertical shaping without shrinking to a point');
assertNotIncludes(field, 'const distance = Math.hypot(pointX - focusX, pointY - focusY);', 'old Euclidean hard cutoff removed');

console.log('[status-melodic-contract] ok');
