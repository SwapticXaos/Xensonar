import fs from 'node:fs';

const rendererPath = 'src/features/l3lab/canonicalForge/loopPreview.ts';
const sessionPath = 'src/features/l3lab/canonicalForge/loopPreviewSession.ts';
const renderer = fs.readFileSync(rendererPath, 'utf8');
const session = fs.readFileSync(sessionPath, 'utf8');
const rendererLines = renderer.split(/\r?\n/).length;
const sessionLines = session.split(/\r?\n/).length;
const failures = [];

if (rendererLines > 850) failures.push(`loopPreview renderer too large: ${rendererLines} > 850`);
if (sessionLines > 180) failures.push(`loopPreview session too large: ${sessionLines} > 180`);
if (!renderer.includes("from './loopPreviewSession'")) failures.push('renderer does not consume loopPreviewSession owner');
for (const marker of ['let previewCtx', 'let currentNodes', 'let playheadFrame', 'let currentToken', 'let activeLoopPreviewState']) {
  if (renderer.includes(marker)) failures.push(`renderer still owns session marker: ${marker}`);
}
for (const marker of ['let previewCtx', 'let currentNodes', 'let playheadFrame', 'let currentToken', 'let activeLoopPreviewState', 'seekLoopComposerPreviewToStep', 'stopLoopComposerPreview']) {
  if (!session.includes(marker)) failures.push(`session owner missing marker: ${marker}`);
}

if (failures.length) {
  console.error('[canonical-loop-preview-session-boundary] FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[canonical-loop-preview-session-boundary] PASS (renderer ${rendererLines}, session ${sessionLines})`);
