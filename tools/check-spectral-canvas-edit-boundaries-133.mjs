#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const failures = [];
const transpile = (file, fakeRequire) => {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, fakeRequire);
  return module.exports;
};

// Edit commit: preserve invalidation -> dirty metadata -> consume -> render ordering.
{
  const calls = [];
  const dirtyApi = {
    markSpectralForgePreviewDirtyCircle: (args) => calls.push(['circle', args]),
    markSpectralForgePreviewDirtyRegion: (args) => calls.push(['region', args]),
    consumeSpectralForgePreviewDirtyRegions: () => calls.push(['consume']),
  };
  const { commitSpectralCanvasAudioEdit } = transpile(
    'src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasEditCommit.ts',
    (id) => id.includes('spectralPreviewDirtyRegion') ? dirtyApi : {},
  );
  const spectralData = { width: 64, height: 32 };
  commitSpectralCanvasAudioEdit({
    spectralData,
    activeTool: 'brush',
    defaultBrushSize: 7,
    dirty: { x: 4, y: 5, reason: 'probe-circle' },
    ports: {
      invalidateAudioBuffer: () => calls.push(['invalidate']),
      setAudioBufferDirty: (value) => calls.push(['dirty', value]),
      triggerRender: () => calls.push(['render']),
    },
  });
  const order = calls.map((entry) => entry[0]).join('>');
  if (order !== 'invalidate>dirty>circle>consume>render') failures.push(`edit commit ordering drift: ${order}`);
  const circle = calls.find((entry) => entry[0] === 'circle')?.[1];
  if (circle?.radius !== 7 || circle?.reason !== 'probe-circle' || circle?.spectralData !== spectralData) failures.push('edit commit circle payload drift');

  calls.length = 0;
  commitSpectralCanvasAudioEdit({
    spectralData,
    activeTool: 'stamp',
    defaultBrushSize: 3,
    dirty: { x0: 1, x1: 8, y0: 2, y1: 9 },
    ports: {
      invalidateAudioBuffer: () => calls.push(['invalidate']),
      setAudioBufferDirty: (value) => calls.push(['dirty', value]),
      triggerRender: () => calls.push(['render']),
    },
  });
  if (calls.map((entry) => entry[0]).join('>') !== 'invalidate>dirty>region>consume>render') failures.push('edit commit region ordering drift');
  const region = calls.find((entry) => entry[0] === 'region')?.[1];
  if (region?.reason !== 'spectral-forge-stamp-edit') failures.push('edit commit default reason drift');
}

// Paint dispatch: exercise ordinary, linked-body, and source-trace paths without React.
{
  const { applySpectralCanvasPaintStroke } = transpile(
    'src/features/l3lab/spectralForge/components/spectralCanvas/spectralCanvasPaintStroke.ts',
    (id) => id.includes('toolDomains') ? { TOOL_EFFECT_DOMAIN: new Proxy({}, { get: () => 'workbench_only' }) } : {},
  );
  const baseSettings = {
    brushSize: 6,
    intensity: 0.7,
    hardness: 0.4,
    numHarmonics: 5,
    harmonicDecay: 0.6,
    formantVowel: 'a',
    sprayDensity: 0.5,
    eraseMode: false,
    grainSize: 0.3,
    morphMode: 'push',
  };
  const calls = [];
  const spectralData = {
    height: 128,
    applyBrush: (...args) => calls.push(['brush', ...args]),
    applyHarmonicBrush: (...args) => calls.push(['harmonic', ...args]),
    applyNoiseBrush: (...args) => calls.push(['noise', ...args]),
    applySpray: (...args) => calls.push(['spray', ...args]),
    applySmudge: (...args) => calls.push(['smudge', ...args]),
    applyDodgeBurn: (...args) => calls.push(['dodgeBurn', ...args]),
    applyBlurSharpen: (...args) => calls.push(['blurSharpen', ...args]),
    applyDelaySmear: (...args) => calls.push(['delaySmear', ...args]),
    applyThresholdBrush: (...args) => calls.push(['threshold', ...args]),
    applySourceTrace: (...args) => calls.push(['sourceTrace', ...args]),
    applyFormantStamp: (...args) => calls.push(['formant', ...args]),
  };
  const forge3Field = {
    applySteinmetz: (...args) => calls.push(['steinmetz', ...args]),
    applySourceTraceMetadata: (...args) => calls.push(['sourceMeta', ...args]),
  };
  const sync = (...args) => calls.push(['sync', ...args]);

  applySpectralCanvasPaintStroke({ activeTool: 'brush', spectralData, settings: baseSettings, forge3Mode: false, bodyLinkedMode: false, sourceAsset: null, forge3Field, syncForge3Region: sync, x: 11, y: 13 });
  if (calls[0]?.[0] !== 'brush' || calls[1]?.[0] !== 'sync') failures.push('ordinary brush dispatch drift');

  calls.length = 0;
  applySpectralCanvasPaintStroke({ activeTool: 'hardBrush', spectralData, settings: baseSettings, forge3Mode: true, bodyLinkedMode: true, sourceAsset: null, forge3Field, syncForge3Region: sync, x: 2, y: 3 });
  if (calls[0]?.[0] !== 'steinmetz' || calls.some((entry) => entry[0] === 'brush')) failures.push('linked hardBrush must retain Steinmetz dispatch');

  calls.length = 0;
  const sourceAsset = { analysisCache: { data: new Float32Array([1]), width: 1, height: 1, transientEnvelope: new Float32Array([1]) } };
  applySpectralCanvasPaintStroke({ activeTool: 'sourceTrace', spectralData, settings: baseSettings, forge3Mode: true, bodyLinkedMode: true, sourceAsset, forge3Field, syncForge3Region: sync, x: 7, y: 8 });
  const sourceOrder = calls.map((entry) => entry[0]).join('>');
  if (sourceOrder !== 'sourceTrace>sourceMeta>sync') failures.push(`sourceTrace dispatch drift: ${sourceOrder}`);
  if (calls.at(-1)?.[4] !== 'preserve') failures.push('sourceTrace linked-body sync must preserve metadata');
}

if (failures.length) {
  console.error('[spectral-canvas-edit-boundaries-133] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spectral-canvas-edit-boundaries-133] PASS');
