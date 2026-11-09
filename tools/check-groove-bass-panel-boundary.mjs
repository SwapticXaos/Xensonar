#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const panelPath = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const boundaryDir = 'src/features/xensonar/rooms/grooveBassPanel';
const files = {
  panel: panelPath,
  drumDialog: `${boundaryDir}/DrumPatternManagerDialog.tsx`,
  bassDialog: `${boundaryDir}/BassPatternManagerDialog.tsx`,
  bassPreview: `${boundaryDir}/BassPatternBodyPreview.tsx`,
  drumControls: `${boundaryDir}/DrumManagerControls.tsx`,
  volumeControl: `${boundaryDir}/GrooveHeaderVolumeControl.tsx`,
  workspaceIntent: `${boundaryDir}/grooveBassPanelWorkspaceIntent.ts`,
  libraryWorkspace: `${boundaryDir}/useGrooveBassLibraryWorkspace.ts`,
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const panel = read(files.panel);
const drumDialog = read(files.drumDialog);
const bassDialog = read(files.bassDialog);
const bassPreview = read(files.bassPreview);
const drumControls = read(files.drumControls);
const volumeControl = read(files.volumeControl);
const workspaceIntent = read(files.workspaceIntent);
const libraryWorkspace = read(files.libraryWorkspace);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('ResonanceGrooveBassPanel imports drum manager boundary', panel, './grooveBassPanel/DrumPatternManagerDialog');
requireText('ResonanceGrooveBassPanel imports bass manager boundary', panel, './grooveBassPanel/BassPatternManagerDialog');
requireText('ResonanceGrooveBassPanel imports drum controls boundary', panel, './grooveBassPanel/DrumManagerControls');
requireText('ResonanceGrooveBassPanel imports volume control boundary', panel, './grooveBassPanel/GrooveHeaderVolumeControl');
requireText('ResonanceGrooveBassPanel imports workspace intent boundary', panel, './grooveBassPanel/grooveBassPanelWorkspaceIntent');
requireText('ResonanceGrooveBassPanel imports library workspace owner', panel, './grooveBassPanel/useGrooveBassLibraryWorkspace');

forbidText('ResonanceGrooveBassPanel', panel, 'function DrumPatternManagerDialog(');
forbidText('ResonanceGrooveBassPanel', panel, 'function BassPatternManagerDialog(');
forbidText('ResonanceGrooveBassPanel', panel, 'function BassPatternBodyPreview(');
forbidText('ResonanceGrooveBassPanel', panel, 'function GrooveHeaderVolumeControl(');
forbidText('ResonanceGrooveBassPanel', panel, 'DRUM_LANE_LABELS');
forbidText('ResonanceGrooveBassPanel', panel, 'usePhaseShiftedPlaylistDragSession');
forbidText('ResonanceGrooveBassPanel', panel, '<PlaylistDragActionHud');
forbidText('ResonanceGrooveBassPanel', panel, 'buildBassPatternPreviewClip');
forbidText('ResonanceGrooveBassPanel', panel, 'randomizeBassClipEvents');
forbidText('ResonanceGrooveBassPanel', panel, 'patchBassClipRootBinding');
forbidText('ResonanceGrooveBassPanel', panel, 'LEVEL3LAB_CANONICAL_VIEW_KEY');

requireText('DrumPatternManagerDialog boundary', drumDialog, 'data-hotkey-scope="drum-pattern-manager"');
requireText('DrumPatternManagerDialog boundary', drumDialog, 'DRUM_PLAYLIST_HOTKEY_HELP');
requireText('DrumPatternManagerDialog boundary', drumDialog, 'usePhaseShiftedPlaylistDragSession');
requireText('DrumPatternManagerDialog boundary', drumDialog, 'resolvePlaylistDropPreview');
requireText('DrumPatternManagerDialog boundary', drumDialog, 'export function DrumPatternManagerDialog');

requireText('BassPatternManagerDialog boundary', bassDialog, 'data-hotkey-scope="bass-pattern-manager"');
requireText('BassPatternManagerDialog boundary', bassDialog, 'buildBassPatternPreviewClip');
requireText('BassPatternManagerDialog boundary', bassDialog, 'randomizeBassClipEvents');
requireText('BassPatternManagerDialog boundary', bassDialog, 'patchBassClipRootBinding');
requireText('BassPatternManagerDialog boundary', bassDialog, 'BassPatternBodyPreview');
requireText('BassPatternManagerDialog boundary', bassDialog, 'export function BassPatternManagerDialog');

requireText('BassPatternBodyPreview boundary', bassPreview, 'data-bass-event-block');
requireText('BassPatternBodyPreview boundary', bassPreview, 'applyBassPitchSnap');
requireText('BassPatternBodyPreview boundary', bassPreview, 'resolveBassEventFrequencyHz');
requireText('BassPatternBodyPreview boundary', bassPreview, 'segmentMarkers');
requireText('BassPatternBodyPreview boundary', bassPreview, 'export function BassPatternBodyPreview');

requireText('DrumManagerControls boundary', drumControls, 'DRUM_LANE_LABELS');
requireText('DrumManagerControls boundary', drumControls, 'Drum Grundkit');
requireText('DrumManagerControls boundary', drumControls, 'Groove Swing');
requireText('DrumManagerControls boundary', drumControls, 'export function DrumManagerControls');
requireText('GrooveHeaderVolumeControl boundary', volumeControl, 'export function GrooveHeaderVolumeControl');
requireText('Workspace intent boundary', workspaceIntent, 'OPEN_DRUM_PATTERN_MANAGER_EVENT');
requireText('Workspace intent boundary', workspaceIntent, 'OPEN_BASS_PATTERN_MANAGER_EVENT');
requireText('Workspace intent boundary', workspaceIntent, 'primeDrumMachineWorkspaceIntent');
requireText('Workspace intent boundary', workspaceIntent, "window.localStorage.setItem(LEVEL3LAB_CANONICAL_VIEW_KEY, 'drums')");
requireText('Library workspace owner', libraryWorkspace, 'export function useGrooveBassLibraryWorkspace');
requireText('Library workspace owner', libraryWorkspace, 'listenDrumPatternPlaylistUpdated');
requireText('Library workspace owner', libraryWorkspace, 'moveDrumPlaylistEntryFromVisibleOrder');
requireText('Library workspace owner', libraryWorkspace, 'moveBassClip');

const panelLines = panel.split(/\r?\n/).length;
if (panelLines > 140) failures.push(`ResonanceGrooveBassPanel should stay below 140 lines after workspace ownership split; saw ${panelLines}`);

if (failures.length) {
  console.error('[groove-bass-panel-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  panelLines,
  extractedBoundaries: Object.values(files).filter((file) => file !== panelPath),
}, null, 2));
