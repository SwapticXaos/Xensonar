import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const files = {
  elastic: 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts',
  material: 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  synth: 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts',
  tuning: 'src/features/xensonar/rootFollow/rootFollowGranularSettings.ts',
  session: 'src/features/xensonar/rootFollow/rootFollowSession.ts',
  playback: 'src/features/xensonar/material/useRootFollowLoopPlayback.ts',
  safety: 'src/features/xensonar/rootFollow/rootFollowMicroCutSafety.ts',
};

const checks = [
  [files.elastic, 'snapMaterialElasticSourceStartToMicroCut'],
  [files.elastic, 'samplePreciseMicroCutScore'],
  [files.elastic, 'guardedMaterialElasticWhen'],
  [files.elastic, 'sourceStartGuardMs'],
  [files.tuning, 'sourceStartGuardMs'],
  [files.synth, 'guardedRootFollowSampleWhen'],
  [files.playback, 'linearRampToValueAtTime(targetVolume, ctx.currentTime + 0.075)'],
  [files.elastic, 'WeakMap<AudioBuffer, MaterialMicroCutMap>'],
  [files.elastic, 'phase <= 0 || phase >= 1 ? 0'],
  [files.tuning, 'microCutSafety: true'],
  [files.tuning, 'microCutSearchRadiusMs'],
  [files.safety, 'firstRootFollowSliceOnGridAtOrAfter'],
  [files.safety, 'smoothRootFollowMaterialTargetHz'],
  [files.material, 'firstRootFollowSliceOnGridAtOrAfter'],
  [files.material, 'smoothRootFollowMaterialTargetHz'],
  [files.material, 'materialSmoothedRootHz'],
  [files.synth, 'snapMaterialElasticSourceStartToMicroCut'],
  [files.session, 'materialSmoothedRootHz'],
  [files.playback, 'materialStepSec'],
];

const failures = [];
for (const [file, needle] of checks) {
  const content = read(file);
  if (!content.includes(needle)) failures.push(`${file} missing ${needle}`);
}

if (failures.length) {
  console.error('[root-follow-micro-cut-safety] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[root-follow-micro-cut-safety] ok');
