#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const panelPath = 'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx';
const boundaryDir = 'src/features/l3lab/materialIntake/materialIntakePanel';
const files = {
  panel: panelPath,
  feedback: `${boundaryDir}/FeedbackButton.tsx`,
  canvas: `${boundaryDir}/materialIntakeCanvas.ts`,
  drag: `${boundaryDir}/materialIntakeDrag.ts`,
  canvasRuntime: `${boundaryDir}/useMaterialIntakeCanvasRuntime.ts`,
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
}

const panel = read(files.panel);
const feedback = read(files.feedback);
const canvas = read(files.canvas);
const drag = read(files.drag);
const canvasRuntime = read(files.canvasRuntime);

function requireText(label, content, needle) {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
}
function forbidText(label, content, needle) {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
}

requireText('MaterialIntakePanel imports FeedbackButton boundary', panel, './materialIntakePanel/FeedbackButton');
requireText('MaterialIntakePanel imports canvas runtime boundary', panel, './materialIntakePanel/useMaterialIntakeCanvasRuntime');
requireText('canvas runtime imports canvas helpers', canvasRuntime, './materialIntakeCanvas');
requireText('canvas runtime imports drag helpers', canvasRuntime, './materialIntakeDrag');
requireText('canvas runtime owns playhead RAF', canvasRuntime, 'window.requestAnimationFrame(tick)');
requireText('canvas runtime owns pointer drag lifecycle', canvasRuntime, "window.addEventListener('pointermove', handleMove)");

forbidText('MaterialIntakePanel', panel, 'function drawWaveform(');
forbidText('MaterialIntakePanel', panel, 'function buildRegionPreview(');
forbidText('MaterialIntakePanel', panel, 'function drawPlaystrip(');
forbidText('MaterialIntakePanel', panel, 'function detectDragMode(');
forbidText('MaterialIntakePanel', panel, 'function updateDraggedRange(');
forbidText('MaterialIntakePanel', panel, 'interface FeedbackButtonProps');
forbidText('MaterialIntakePanel', panel, 'function FeedbackButton(');
forbidText('MaterialIntakePanel', panel, "type DragMode = 'new'");
forbidText('MaterialIntakePanel', panel, 'window.requestAnimationFrame(tick)');
forbidText('MaterialIntakePanel', panel, "window.addEventListener('pointermove'");

requireText('FeedbackButton boundary', feedback, 'export function FeedbackButton');
requireText('FeedbackButton boundary', feedback, 'pending ?');
requireText('FeedbackButton boundary', feedback, 'success ?');
requireText('FeedbackButton boundary', feedback, "tone?: 'neutral' | 'cyan' | 'violet' | 'emerald' | 'amber'");
requireText('Canvas boundary', canvas, 'export function clamp01');
requireText('Canvas boundary', canvas, 'export function timeToX');
requireText('Canvas boundary', canvas, 'export function drawWaveform');
requireText('Canvas boundary', canvas, 'export function buildRegionPreview');
requireText('Canvas boundary', canvas, 'export function drawPlaystrip');
requireText('Canvas boundary', canvas, 'Taktometer · Start = 1');
requireText('Canvas boundary', canvas, 'guideMarkers');
requireText('Canvas boundary', canvas, 'playheadTimeSec');
requireText('Drag boundary', drag, "export type DragMode = 'new' | 'move' | 'resize-start' | 'resize-end'");
requireText('Drag boundary', drag, 'export type DragState');
requireText('Drag boundary', drag, 'export function detectDragMode');
requireText('Drag boundary', drag, 'export function updateDraggedRange');
requireText('Drag boundary', drag, 'Math.max(secondsPerPixel * 8');

for (const marker of [
  'loadButtonLabel',
  'Als Loop roh an die Materialspur',
  'Als Root-Follow-Loop verwenden',
  'Als Sample speichern',
  'Timbre extrahieren',
  'Timbre anwenden',
  'Material-Metadaten',
  'Alternative Taktdeutungen',
]) requireText('MaterialIntakePanel retained action marker', panel, marker);

const panelLines = panel.split(/\r?\n/).length;
if (panelLines > 650) failures.push(`MaterialIntakePanel should stay below 650 lines after canvas-runtime ownership split; saw ${panelLines}`);

if (failures.length) {
  console.error('[material-intake-panel-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  panelLines,
  extractedBoundaries: Object.values(files).filter((file) => file !== panelPath),
}, null, 2));
