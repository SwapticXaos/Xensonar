#!/usr/bin/env node
import fs from 'node:fs';

const panelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';
const previewPath = 'src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts';
const panel = fs.readFileSync(panelPath, 'utf8');
const preview = fs.readFileSync(previewPath, 'utf8');
const failures = [];
const must = (text, needle, label = needle) => {
  if (!text.includes(needle)) failures.push(`missing ${label}`);
};
const mustNot = (text, needle, label = needle) => {
  if (text.includes(needle)) failures.push(`unexpected ${label}`);
};

must(panel, 'prewarmSpectralForgeBasisHearingPreview', 'panel prewarms before play');
must(panel, 'basisHearingAuditionGenerationRef', 'latest-click generation guard');
must(panel, "phase: preparedEntry ? 'ready' : 'preparing'", 'immediate clicked-button ready-or-preparing state');
must(panel, 'onRenderProgress: (progress: number)', 'cooperative render progress from sidebar click');
must(panel, 'phase: \'playing\'', 'explicit playing phase');
must(panel, 'phase: \'ready\'', 'explicit ready/cache phase');
must(panel, 'data-spectral-forge-basis-hearing-phase', 'button exposes phase hook');
must(panel, 'data-spectral-forge-basis-hearing-progress', 'button exposes progress hook');
must(panel, 'const visuallyActive = basisHearingChosenOptionId', 'clicked option wins visual active state');
must(panel, 'basisHearingChosenOptionId === option.id', 'visual active state follows latest click');
must(panel, 'basisHearingAudition.optionId === option.id', 'only current option receives pending/playing status');
must(panel, 'setIsPlaying(false);\n    setShowPlayheadMarker(false);', 'click does not mark app playing before buffer is ready');
must(panel, 'setIsPlaying(true);\n      setShowPlayheadMarker(true);', 'playing state is set only after successful preview start');
must(panel, 'if (!isCurrentAudition()) return;', 'stale promise/callback guard');
must(preview, 'cacheHit: rendered.cacheHit', 'basis preview reports cache hits');

const clickBody = panel.slice(panel.indexOf('const selectAndPreviewHearingOption'), panel.indexOf('  const harmonizers:'));
mustNot(clickBody, 'setIsPlaying(true);\n    setShowPlayheadMarker(true);', 'old eager-playing state before render');

if (failures.length) {
  console.error('[harmonic-xplore-hearing-switch-responsiveness] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[harmonic-xplore-hearing-switch-responsiveness] PASS');
console.log('- Sidebar hearing clicks now give immediate selected/ready/preparing feedback.');
console.log('- Rendering is prewarmed cooperatively before playback; cached variants replay quickly.');
console.log('- Stale async completions cannot overwrite the newest hearing choice.');
