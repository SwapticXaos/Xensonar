import fs from 'node:fs';

const panelPath = 'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx';
const htmlPath = process.argv[2] ?? 'dist/index.html';
const panel = fs.readFileSync(panelPath, 'utf8');
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

function assert(condition, message) {
  if (!condition) {
    console.error(`[bass-workbench-full-build-drag-contract] FAIL: ${message}`);
    process.exit(1);
  }
}

assert(/import\s*\{[^}]*useRef[^}]*\}\s*from\s*['"]react['"]/.test(panel), 'ResonanceGrooveBassPanel must import useRef for the Bass body pointer surface.');
assert(panel.includes('data-bass-event-block="true"'), 'Bass event blocks must keep their data-bass-event-block marker.');
assert(panel.includes('onPointerMove={(event) => {'), 'Bass body graph must have a pointer-move handler.');
assert(panel.includes('patchFromPointer(dragEventId, event.clientX, event.clientY, dragMode)'), 'Pointer move must patch dragged Bass events.');
assert(panel.includes('setDragEventId(bassEvent.id)'), 'Pointer down must enter Bass event drag mode.');
assert(panel.includes('setPointerCapture(event.pointerId)'), 'Bass event drag must capture the active pointer.');
assert(panel.includes('cursor-grab active:cursor-grabbing'), 'Editable Bass blocks must expose draggable cursor affordance.');
assert(panel.includes('Step') && panel.includes('Länge') && panel.includes('Ratio') && panel.includes('Accent') && panel.includes('Velocity') && panel.includes('Oktave'), 'Detailed Bass event controls must remain present in the real panel.');
assert(panel.includes('Bass Tone') && panel.includes('Bass Grit'), 'Bass sound controls must remain present in the real panel.');
assert(panel.includes('Zeiteinheiten/Takt') && panel.includes('Taktsegmente'), '5.46 segment contract controls must remain present.');

if (html) {
  for (const token of ['data-bass-event-block', 'Step', 'Länge', 'Ratio', 'Accent', 'Velocity', 'Oktave', 'Bass Tone', 'Bass Grit', 'Zeiteinheiten/Takt', 'Taktsegmente']) {
    assert(html.includes(token), `Full Vite HTML must contain ${token}.`);
  }
}

console.log('[bass-workbench-full-build-drag-contract] OK', JSON.stringify({ panelPath, htmlPath, htmlBytes: html.length }, null, 2));
