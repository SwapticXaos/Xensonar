#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function expect(condition, message) {
  if (!condition) {
    console.error(`[recording-export-matrix-contract] FAIL: ${message}`);
    process.exitCode = 1;
  }
}

const panel = read('src/features/xensonar/rooms/RecordingTakePanel.tsx');
const runtime = read('src/features/xensonar/recording/useRecordingRuntimeBoundary.ts');
const types = read('src/features/xensonar/domain/runtimeTypes.ts');
const materialSend = read('src/features/xensonar/recording/recordingMaterialForgeSend.ts');

expect(types.includes('export type RecordingExportScope = "full" | "crop"'), 'shared full/crop export scope should exist.');
expect(panel.includes('useState<RecordingExportScope>("full")'), 'recording rack should default to explicit Full export scope.');
expect(panel.includes('Export:') && panel.includes('Full') && panel.includes('Crop'), 'recording rack should expose Export: Full/Crop selector.');
expect(panel.includes('⤓ Download') && panel.includes('➔ Materialschmiede'), 'recording rack should expose Download and Materialschmiede as target actions.');
expect(panel.includes('downloadSelectedExport') && panel.includes('sendSelectedExportToMaterialForge'), 'selected export scope should be routed through two target actions.');
expect(panel.includes('sendRecordingToMaterialForge(exportScope)'), 'Materialschmiede target should receive the same explicit export scope as Download.');
expect(runtime.includes("const sendRecordingToMaterialForge = (scope: RecordingExportScope = 'full')"), 'runtime Materialschmiede action should accept explicit scope and default to Full.');
expect(runtime.includes("const range = scope === 'crop' ? recordingCrop : null"), 'runtime should translate crop scope into the current crop range only once.');
expect(materialSend.includes('createAudioCutUploadEntryRequest(result.file, AUDIO_CUT_UPLOAD_SOURCES.MASTER_RECORDING_RACK)'), 'Materialschmiede send should keep using the shared cut-upload intake receiver.');
expect(!panel.includes('download full') && !panel.includes('download crop') && !panel.includes('>\n              zur Materialschmiede senden\n            </button>'), 'old parallel button labels should not remain in the recording rack UI.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[recording-export-matrix-contract] ok');
