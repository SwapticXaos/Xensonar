import fs from 'node:fs';

const fail = (msg) => {
  console.error(`[xensonar][preview-render-scheduler-boundary] FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`[xensonar][preview-render-scheduler-boundary] OK: ${msg}`);
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

const mustContain = (needle, label) => {
  if (!transport.includes(needle)) fail(`${label}: missing ${needle}`);
};
const mustNotContain = (needle, label) => {
  if (transport.includes(needle)) fail(`${label}: forbidden ${needle}`);
};

mustContain('const previewRenderCanAutoAfterPaint = previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing";', 'after-paint eligibility includes basis hearing again');
mustContain("Hörweise wird fertig vorgerechnet", 'basis-hearing status names after-paint render path');
mustContain('prewarmSpectralForgeBasisHearingPreview', 'basis-hearing after-paint prewarm route is wired');
mustContain('setPreparedPreviewToken(currentPreviewPreparedToken);', 'successful play marks current preview prepared even when it had just rendered');
mustContain("Vorschau gerendert", 'foreground non-cache render reports successful prepared state');
mustContain('previewRenderRouteKind === "basis-hearing"', 'button title distinguishes basis hearing from general preview cache');

if (!pkg.includes('3.2.91-7.5.175')) fail('package version was not bumped to 7.5.175');
if (!pkg.includes('xensonar:check-spectralforge-preview-render-scheduler-boundary')) fail('package script missing');

ok('after-paint rendering starts for basis-hearing and spectral routes; play/cache truth remains intact.');
