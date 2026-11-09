#!/usr/bin/env node
import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) { if (!condition) { console.error(`[audio-cut-upload-entry-request] FAIL: ${message}`); process.exitCode = 1; } }
const contract = read('src/features/xensonar/domain/audioCutUploadEntryRequest.ts');
const props = read('src/features/xensonar/material/useResonanceMaterialLoopPanelProps.ts');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const app = read('src/App.tsx');
expect(contract.includes("AUDIO_CUT_UPLOAD_EVENT = 'xensonar:spectral-forge-audio-cut-upload'"), 'event name should live in the request contract');
expect(contract.includes("MATERIAL_TRACK_MANAGER: 'material-track-manager'"), 'material source should be explicit');
expect(contract.includes("ROOT_FOLLOW_MANAGER: 'root-follow-manager'"), 'root-follow source should be explicit');
expect(contract.includes('createAudioCutUploadEntryRequest'), 'request factory should exist');
expect(contract.includes('dispatchAudioCutUploadEntryRequest'), 'dispatch helper should exist');
expect(props.includes('createAudioCutUploadEntryRequest(file, source)'), 'material/root-follow prop builder should use request factory');
expect(props.includes('dispatchAudioCutUploadEntryRequest(request)'), 'prop builder should dispatch the structured request');
expect(panel.includes('AudioCutUploadSource'), 'panel callback should carry source type');
expect(panel.includes('AUDIO_CUT_UPLOAD_SOURCES.ROOT_FOLLOW_MANAGER'), 'root-follow cut upload should identify its source');
expect(panel.includes('AUDIO_CUT_UPLOAD_SOURCES.MATERIAL_TRACK_MANAGER'), 'material cut upload should identify its source');
expect(app.includes('source?: string'), 'App event bridge should tolerate structured source metadata');
if (process.exitCode) process.exit(process.exitCode);
console.log('[audio-cut-upload-entry-request] ok');
