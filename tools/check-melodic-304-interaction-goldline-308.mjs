import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (path) => fs.readFileSync(path, 'utf8');
const sha = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const checks = [];
const check = (label, condition, detail = '') => {
  checks.push({ label, condition: !!condition });
  if (!condition) throw new Error(`FAIL: ${label}${detail ? ` :: ${detail}` : ''}`);
};

const goldline = new Map([
  ['src/features/l3lab/canonicalForge/loopComposerInteraction.ts', '80de3098be5cc015be9a7942fad3919c86b7151d78881b0f1fe0916660b49985'],
  ['src/features/l3lab/canonicalForge/loopComposerViewportInteraction.ts', 'e08a571f5138a274cd383f6c3856c8ce59edd46095196f570c3e1de7101c75d8'],
  ['src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions.ts', '29ec36535fe9d1494c8487f92bd23fb47b0c4d90085770670a7d2f5bd074d81a'],
  ['src/features/l3lab/canonicalForge/useCanonicalLoopComposerViewportInteractions.ts', '95c1db34c0c1fe7f724f53b9015050d8095e936b3d8797c68613bf350c5a922a'],
  ['src/features/l3lab/canonicalForge/viewportMath.ts', 'a02680c760aa4a6fd3028aa2e65c3b426cce1e10adb6885ddd1af64ab211a316'],
  ['src/features/l3lab/canonicalForge/miniMapPanels.tsx', '8f8c073ff9e415fd0e2024e33cb530accf784c51740204abd8d30d72df2a75ee'],
  ['src/features/l3lab/canonicalForge/microtonalMelodicActionSurface.ts', 'd6e330e694e0d545546162ccfa47f5cf78dfd8755bc866d0c14ede8c5e2b0823'],
]);
for (const [path, expected] of goldline) {
  check(`304 interaction goldline unchanged: ${path}`, sha(path) === expected, `${sha(path)} != ${expected}`);
}

const loopDomain = read('src/features/l3lab/canonicalForge/loopDrumDomain.ts');
check('loop geometry remains available through compatibility facade', loopDomain.includes("from './loopPitchDomain'") && loopDomain.includes('getLoopNoteScreenRect') && loopDomain.includes('getLoopNoteLineRect'));

const renderEffects = read('src/features/l3lab/canonicalForge/useCanonicalForgeRenderEffects.ts');
check('pending-anchor animation has disposal guard', renderEffects.includes('if (disposed) return;') && renderEffects.includes('if (!disposed && hasPendingPitchAnchor) raf = window.requestAnimationFrame(animatePendingAnchor)'));
check('amplitude decode cannot start a second pending-anchor RAF chain', renderEffects.includes('if (disposed || hasPendingPitchAnchor) return;') && renderEffects.includes('drawCurrentFrame();') && !renderEffects.includes('if (!disposed) render();'));

const rendering = read('src/features/l3lab/canonicalForge/loopComposerRendering.ts');
check('strong amplitude thumbnail geometry', rendering.includes('args.height * 0.43') && rendering.includes('Math.pow(Math.max(0, Math.min(1, args.preview.peaks[peakIndex] ?? 0)), 0.62)'));
check('strong amplitude thumbnail contrast', rendering.includes("rgba(255,255,255,0.38)") && rendering.includes("rgba(255,255,255,0.72)"));
check('rounded note blocks remain enabled', rendering.includes('roundedRectPath') && rendering.includes('blockRadius'));
check('raw anchor contact remains green and local', rendering.includes("rgba(52,211,153,0.96)") && rendering.includes("loopImportBodyFamily(note) === 'material'"));
check('yellow elastic saturation is absent from canvas', !rendering.includes('materialInfo?.saturated') && !rendering.includes('251, 191, 36'));

const loopPreview = read('src/features/l3lab/canonicalForge/loopPreview.ts');
const elastic = read('src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts');
check('melodic material pitch uses open-musical policy', loopPreview.includes("'open-musical' as const") && loopPreview.includes('ratePolicy: materialRatePolicy'));
check('protected consumers remain bounded by default', elastic.includes("args.ratePolicy ?? 'bounded'"));

console.log(`PASS: 304 interaction goldline + 308 visual/pitch integration (${checks.length}/${checks.length})`);
