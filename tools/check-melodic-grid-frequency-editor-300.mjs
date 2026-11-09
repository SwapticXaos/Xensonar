#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { console.error(`[melodic-grid-frequency-editor-300] FAIL: ${message}`); process.exit(1); };
const must = (text, needle, message) => { if (!text.includes(needle)) fail(message); };

const panel = read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx');
const interaction = read('src/features/l3lab/canonicalForge/loopComposerInteraction.ts');
const rendering = read('src/features/l3lab/canonicalForge/loopComposerRendering.ts');

must(rendering, "const pointX = gutterW - 8", 'blue triangle must remain rendered in the left gutter');
must(rendering, "ctx.fillText(loopLineDisplayLabel(line), 12, y - 6)", 'Hz label must remain rendered in the same gutter row');
must(interaction, 'const inGutter = x < geometry.gutterW && y >= geometry.headerH', 'gutter hit zone must cover line label and triangle');
must(panel, 'if (hit?.inGutter)', 'right-click gutter hit must open the precision editor');
must(panel, 'data-xensonar-grid-frequency-editor="true"', 'precision editor must have a stable UI marker');
must(panel, 'Rasterstufe · Hz exakt', 'precision editor must identify its purpose');
must(panel, 'inputMode="decimal"', 'precision editor must accept decimal input');
must(panel, "Math.round(parsed * 10) / 10", 'entered frequency must normalize to one decimal place');
must(panel, "pitchFrequencyEditor.draft.trim().replace(',', '.')", 'German decimal comma must be accepted');
must(panel, '1200 * Math.log2(targetHz / sourceLine.hz)', 'manual Hz entry must map to the same offsetCents model as triangle dragging');
must(panel, 'line.offsetCents = targetOffsetCents', 'manual Hz entry must update the live pitch line offset');
must(panel, 'step.offsetCents = targetOffsetCents', 'manual Hz entry must mirror the pitch step offset');
must(panel, 'onContextMenu={handleComposerContextMenu}', 'canvas must use the editor-aware context-menu handler');
must(panel, 'onCanvasContextMenu(event);', 'non-gutter context-menu behavior must still delegate to the existing handler');
must(panel, "Enter übernimmt · Esc verwirft", 'editor must expose keyboard commit/cancel semantics');

console.log('[melodic-grid-frequency-editor-300] PASS: right-click on left-grid Hz labels or blue line triangles opens a one-decimal precision editor backed by the existing offsetCents tuning model; other context-menu behavior is preserved.');
