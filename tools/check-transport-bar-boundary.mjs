#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const files = {
  panel: 'src/features/l3lab/spectralForge/components/TransportBar.tsx',
  types: 'src/features/l3lab/spectralForge/components/transportBar/transportBarTypes.ts',
  download: 'src/features/l3lab/spectralForge/components/transportBar/transportBarDownload.ts',
  audioDialog: 'src/features/l3lab/spectralForge/components/transportBar/TransportAudioImportDialog.tsx',
  imageDialog: 'src/features/l3lab/spectralForge/components/transportBar/TransportImageImportDialog.tsx',
  importWorkflow: 'src/features/l3lab/spectralForge/components/transportBar/useTransportImportWorkflow.ts',
  materialActions: 'src/features/l3lab/spectralForge/components/transportBar/useTransportMaterialActions.ts',
  presentation: 'src/features/l3lab/spectralForge/components/transportBar/TransportBarPresentation.tsx',
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const panel = read(files.panel);
const types = read(files.types);
const download = read(files.download);
const audioDialog = read(files.audioDialog);
const imageDialog = read(files.imageDialog);
const importWorkflow = read(files.importWorkflow);
const materialActions = read(files.materialActions);
const presentation = read(files.presentation);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('TransportBar imports import workflow boundary', panel, './transportBar/useTransportImportWorkflow');
requireText('TransportBar imports material actions boundary', panel, './transportBar/useTransportMaterialActions');
requireText('TransportBar imports presentation boundary', panel, './transportBar/TransportBarPresentation');
forbidText('TransportBar', panel, 'function sanitizeName(');
forbidText('TransportBar', panel, 'function triggerSpectralForgeDownloadUrl(');
forbidText('TransportBar', panel, 'interface PendingImageImport');
forbidText('TransportBar', panel, 'interface PendingAudioImport');
forbidText('TransportBar', panel, 'Audio → SpectralForge');
forbidText('TransportBar', panel, 'Bild → SpectralForge');

requireText('transportBarTypes', types, 'export const HARD_IMAGE_CONTRAST');
requireText('transportBarTypes', types, 'export interface PendingImageImport');
requireText('transportBarTypes', types, 'export interface PendingAudioImport');
requireText('transportBarDownload', download, 'registerSpectralForgeDownloadObjectUrl');
requireText('transportBarDownload', download, 'markSpectralForgeDownloadObjectUrlReleased');
requireText('transportBarDownload', download, 'export function sanitizeName');
requireText('transportBarDownload', download, 'export function triggerSpectralForgeDownloadUrl');
requireText('audio import dialog', audioDialog, 'export function TransportAudioImportDialog');
requireText('audio import dialog', audioDialog, 'Audio → SpectralForge');
requireText('audio import dialog', audioDialog, 'Audio-Lesart / Projection');
requireText('audio import dialog', audioDialog, 'Original bleibt erhalten');
requireText('image import dialog', imageDialog, 'export function TransportImageImportDialog');
requireText('image import dialog', imageDialog, 'Bild → SpectralForge');
requireText('image import dialog', imageDialog, 'Harter Kontrast');
requireText('image import dialog', imageDialog, 'HARD_IMAGE_CONTRAST');
requireText('transport import workflow', importWorkflow, './transportBarTypes');
requireText('transport import workflow', importWorkflow, 'renderImageImportPreview');
requireText('transport import workflow', importWorkflow, 'renderAudioImportPreview');
requireText('transport import workflow', importWorkflow, 'handleConfirmAudioImport');
requireText('transport import workflow', importWorkflow, 'handleConfirmImageImport');
requireText('transport material actions', materialActions, './transportBarDownload');
requireText('transport material actions', materialActions, 'buildCurrentPreviewBlob');
requireText('transport material actions', materialActions, 'handleSendCurrentPreviewToXensonar');
requireText('transport material actions', materialActions, 'handleExport');
requireText('transport presentation', presentation, '<TransportAudioImportDialog');
requireText('transport presentation', presentation, '<TransportImageImportDialog');
requireText('transport presentation', presentation, 'TRANSPORT_PREVIEW_MODE_BUTTONS');
requireText('transport presentation imports audio dialog boundary', presentation, './TransportAudioImportDialog');
requireText('transport presentation imports image dialog boundary', presentation, './TransportImageImportDialog');
requireText('transport presentation renders audio dialog boundary', presentation, '<TransportAudioImportDialog');
requireText('transport presentation renders image dialog boundary', presentation, '<TransportImageImportDialog');
forbidText('TransportBar', panel, 'const beginAudioImport');
forbidText('TransportBar', panel, 'const beginImageImport');
forbidText('TransportBar', panel, 'const buildCurrentPreviewBlob');
forbidText('TransportBar', panel, 'const handleExport =');

const panelBytes = Buffer.byteLength(panel, 'utf8');
if (panelBytes > 42_000) failures.push(`TransportBar should stay below 42KB after import/material-action/presentation ownership split; saw ${panelBytes} bytes`);

if (failures.length) {
  console.error('[transport-bar-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, panelBytes, boundaries: Object.values(files).filter((file) => file !== files.panel) }, null, 2));
