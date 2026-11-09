#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = 'src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasViewportModel.ts';
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const module = { exports: {} };
const context = vm.createContext({ module, exports: module.exports });
new vm.Script(transpiled.outputText, { filename: sourcePath }).runInContext(context);
const { resolveSpectralCanvasHorizontalAutoFit, resolveSpectralNavigatorViewportPatch } = module.exports;

if (typeof resolveSpectralNavigatorViewportPatch !== 'function' || typeof resolveSpectralCanvasHorizontalAutoFit !== 'function') {
  throw new Error('viewport model export missing');
}

const close = (actual, expected, epsilon = 1e-9) => {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > epsilon) {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
};
const base = {
  containerWidth: 250,
  spectralWidth: 1000,
  mainCanvasWidth: 500,
  offsetX: 100,
  zoomX: 2,
};

let patch = resolveSpectralNavigatorViewportPatch({ ...base, pointerX: 125 });
close(patch.offsetX, 375);
if ('zoomX' in patch) throw new Error('move must not mutate zoomX');

patch = resolveSpectralNavigatorViewportPatch({ ...base, pointerX: 0 });
close(patch.offsetX, 0);
patch = resolveSpectralNavigatorViewportPatch({ ...base, pointerX: 250 });
close(patch.offsetX, 750);

patch = resolveSpectralNavigatorViewportPatch({ ...base, mode: 'resize-left', pointerX: 50 });
close(patch.offsetX, 200);
close(patch.zoomX, 500 / 150);

patch = resolveSpectralNavigatorViewportPatch({ ...base, mode: 'resize-left', pointerX: 250 });
close(patch.offsetX, 334);
close(patch.zoomX, 20);

patch = resolveSpectralNavigatorViewportPatch({ ...base, mode: 'resize-right', pointerX: 125 });
if ('offsetX' in patch) throw new Error('resize-right must preserve offsetX by omission');
close(patch.zoomX, 1.25);

patch = resolveSpectralNavigatorViewportPatch({ ...base, mode: 'resize-right', pointerX: 0 });
close(patch.zoomX, 20);

let autoFit = resolveSpectralCanvasHorizontalAutoFit({ canvasWidth: 500, spectralWidth: 1000, offsetX: 0, zoomX: 1, lastAutoFitZoomX: null });
if (!autoFit.shouldFit) throw new Error('default viewport must auto-fit');
close(autoFit.fitZoomX, 0.5);

autoFit = resolveSpectralCanvasHorizontalAutoFit({ canvasWidth: 600, spectralWidth: 1000, offsetX: 0, zoomX: 0.5, lastAutoFitZoomX: 0.5 });
if (!autoFit.shouldFit) throw new Error('previous auto-fit viewport must continue auto-fit');
close(autoFit.fitZoomX, 0.6);

autoFit = resolveSpectralCanvasHorizontalAutoFit({ canvasWidth: 600, spectralWidth: 1000, offsetX: 0, zoomX: 0.75, lastAutoFitZoomX: 0.5 });
if (autoFit.shouldFit) throw new Error('user zoom must disable auto-fit');

autoFit = resolveSpectralCanvasHorizontalAutoFit({ canvasWidth: 600, spectralWidth: 1000, offsetX: 10, zoomX: 0.5, lastAutoFitZoomX: 0.5 });
if (autoFit.shouldFit) throw new Error('user pan must disable auto-fit');

console.log(JSON.stringify({
  ok: true,
  check: 'spectralforge-canvas-navigator-viewport-math-151',
  cases: 11,
  semantics: 'extracted navigator move/resize and horizontal auto-fit math matches prior inline formulas',
}, null, 2));
