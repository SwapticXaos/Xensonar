#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const panelPath = 'src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx';
const boundaryDir = 'src/features/xensonar/rooms/materialLoopPanel';
const files = {
  panel: panelPath,
  types: `${boundaryDir}/materialLoopPanelTypes.ts`,
  controls: `${boundaryDir}/materialLoopPanelControls.tsx`,
  granular: `${boundaryDir}/RootFollowGranularManagerDialog.tsx`,
  anchor: `${boundaryDir}/RootFollowAnchorControl.tsx`,
  upload: `${boundaryDir}/QuickLoopUploadControls.tsx`,
  loopBank: `${boundaryDir}/LoopBankManagerDialog.tsx`,
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const panel = read(files.panel);
const types = read(files.types);
const controls = read(files.controls);
const granular = read(files.granular);
const anchor = read(files.anchor);
const upload = read(files.upload);
const loopBank = read(files.loopBank);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('ResonanceMaterialLoopPanel imports granular manager boundary', panel, './materialLoopPanel/RootFollowGranularManagerDialog');
requireText('ResonanceMaterialLoopPanel imports anchor boundary', panel, './materialLoopPanel/RootFollowAnchorControl');
requireText('ResonanceMaterialLoopPanel imports loop bank boundary', panel, './materialLoopPanel/LoopBankManagerDialog');
requireText('ResonanceMaterialLoopPanel imports upload boundary', panel, './materialLoopPanel/QuickLoopUploadControls');
requireText('ResonanceMaterialLoopPanel imports controls boundary', panel, './materialLoopPanel/materialLoopPanelControls');
if (!panel.includes('./materialLoopPanel/materialLoopPanelTypes') && !panel.includes('./materialLoopPanel/materialLoopPanelProps')) failures.push('ResonanceMaterialLoopPanel must import shared material loop types or prop boundary');

forbidText('ResonanceMaterialLoopPanel', panel, 'function RootFollowGranularManagerDialog(');
forbidText('ResonanceMaterialLoopPanel', panel, 'function RootFollowAnchorControl(');
forbidText('ResonanceMaterialLoopPanel', panel, 'function LoopBankManagerDialog(');
forbidText('ResonanceMaterialLoopPanel', panel, 'function EmptyLoopBankManagerDialog(');
forbidText('ResonanceMaterialLoopPanel', panel, 'function QuickLoopUploadControls(');
forbidText('ResonanceMaterialLoopPanel', panel, 'const ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY');
forbidText('ResonanceMaterialLoopPanel', panel, 'usePhaseShiftedPlaylistDragSession');
forbidText('ResonanceMaterialLoopPanel', panel, 'PlaylistDragActionHud');

requireText('Shared material loop types', types, "export type MaterialLoopTimeMode");
requireText('Shared material loop types', types, "export type RootFollowGranulationMode");
requireText('Shared material loop types', types, "export type ResonanceHotkeyMode");
requireText('Panel controls boundary', controls, 'export function HeaderVolumeControl');
requireText('Panel controls boundary', controls, 'export function TimeModeSelect');
requireText('Panel controls boundary', controls, 'export function HotkeyModeControls');
requireText('Granular manager boundary', granular, 'ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY');
requireText('Granular manager boundary', granular, 'analyzeRootFollowGranularAudioProfile');
requireText('Granular manager boundary', granular, 'Carrier-Profil einmischen');
requireText('Granular manager boundary', granular, 'Raw Audio fitten');
requireText('Granular manager boundary', granular, 'export function RootFollowGranularManagerDialog');
requireText('Root Follow anchor boundary', anchor, 'ROOT_FOLLOW_FLEXIBLE_ANCHOR_TOOLTIP');
requireText('Root Follow anchor boundary', anchor, 'aktuellen Raster-Anker als Hz setzen');
requireText('Root Follow anchor boundary', anchor, 'export function RootFollowAnchorControl');
requireText('Quick upload boundary', upload, 'AUDIO_CUT_UPLOAD_SOURCES.ROOT_FOLLOW_MANAGER');
requireText('Quick upload boundary', upload, 'AUDIO_CUT_UPLOAD_SOURCES.MATERIAL_TRACK_MANAGER');
requireText('Quick upload boundary', upload, 'Audio Upload und Schneiden');
requireText('Loop bank manager boundary', loopBank, 'usePhaseShiftedPlaylistDragSession');
requireText('Loop bank manager boundary', loopBank, 'PlaylistDragActionHud');
requireText('Loop bank manager boundary', loopBank, 'resolvePlaylistDropPreview');
requireText('Loop bank manager boundary', loopBank, 'export function LoopBankManagerDialog');
requireText('Loop bank manager boundary', loopBank, 'export function EmptyLoopBankManagerDialog');

const panelLines = panel.split(/\r?\n/).length;
if (panelLines > 620) failures.push(`ResonanceMaterialLoopPanel should stay below 620 lines after manager boundary split; saw ${panelLines}`);

if (failures.length) {
  console.error('[material-loop-panel-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  panelLines,
  extractedBoundaries: Object.values(files).filter((file) => file !== panelPath),
}, null, 2));
