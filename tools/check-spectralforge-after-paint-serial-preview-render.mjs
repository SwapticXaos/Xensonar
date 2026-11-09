#!/usr/bin/env node
import fs from 'node:fs';
const fail = (msg) => { console.error(`[xensonar][spectralforge-auto-render-debounce] FAIL: ${msg}`); process.exit(1); };
const has = (source, needle, label = needle) => { if (!source.includes(needle)) fail(`missing ${label}`); };
const notHas = (source, needle, label = needle) => { if (source.includes(needle)) fail(`unexpected ${label}`); };
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const activity = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useTransportPreviewActivityGate.ts', 'utf8');
has(activity, "? { coldIdleMs: 520, firstDelayMs: 160, retryDelayMs: 140 }", 'basis-hearing debounce timing');
has(activity, ": { coldIdleMs: 2000, firstDelayMs: 80, retryDelayMs: 80 };", '2s spectral paint debounce timing');
has(transport, 'Vorschau vorgemerkt · Rendert nach zwei Sekunden Werkzeug-Ruhe', 'status names 2s paint quiet window');
has(transport, 'if (quietWindow.blocked) {', 'pointer/quiet gate remains active');
has(transport, 'runSerialAfterPaintPreviewRender', 'serial after-paint runner remains active');
has(transport, 'Math.max(quietWindow.retryDelayMs, quietWindow.remainingQuietMs)', 'retry preserves remaining quiet window');
notHas(transport, 'runSerialAfterPaintPreviewRender();\n      }, 90);', 'old immediate 90ms render start');
console.log('[xensonar][spectralforge-auto-render-debounce] OK: quiet-window ownership is separated without changing timings.');
