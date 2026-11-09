import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const files = {
  scheduled: 'src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts',
  particleNoise: 'src/features/xensonar/audio/particleNoiseAccentPlaybackBoundary.ts',
  spectralEngine: 'src/features/l3lab/spectralForge/audio/AudioEngine.ts',
  spectralCache: 'src/features/l3lab/spectralForge/audio/spectralPreviewRenderCache.ts',
  spectralSidebar: 'src/features/l3lab/spectralForge/components/SpectralForgeWorkbenchSidebar.tsx',
  panel: 'src/features/xensonar/rooms/EntrophonUnifiedSoundPanel.tsx',
  palette: 'src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx',
};

const scheduled = read(files.scheduled);
const particleNoise = read(files.particleNoise);
const spectralEngine = read(files.spectralEngine);
const spectralCache = read(files.spectralCache);
const spectralSidebar = read(files.spectralSidebar);
const panel = read(files.panel);
const palette = read(files.palette);

const checks = [
  ['scheduled tone keeps non-wave legacy branch', scheduled.includes('request.options?.source !== "wave"') && scheduled.includes('playLegacyScheduledToneWithLifecycle')],
  ['scheduled tone still uses Entrophon for wave branch', scheduled.includes('resolveXensonarMicrotonalVoice')],
  ['particle noise restored to old softclip logic', particleNoise.includes('createSoftClipCurve') && !particleNoise.includes('resolveXensonarMicrotonalVoice') && !particleNoise.includes('makeXensonarEngineDriveCurve')],
  ['spectral AudioEngine restored to old waveform logic', spectralEngine.includes('mixedWaveform') && !spectralEngine.includes('renderXensonarEngineSample') && !spectralEngine.includes('resolveSpectralForgeMicrotonalFrequency')],
  ['spectral render cache no Entrophon signature', !spectralCache.includes('buildEntrophonSoundConfigSignature')],
  ['SpectralForge sidebar has no Entrophon Carrier panel', !spectralSidebar.includes('SpectralEntrophonCarrierPanel') && !fs.existsSync('src/features/l3lab/spectralForge/components/SpectralEntrophonCarrierPanel.tsx')],
  ['Hauptraum Entrophon panel is wave-only', panel.includes("type HauptraumSurface = 'wave'") && !panel.includes("['wave', 'particle']")],
  ['Sound palette no particle Entrophon prop', !palette.includes('particlePreset={nParamsUI.particlePreset}')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed: failed.map(([name]) => name) }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  entrophonScope: 'wave-starter-only',
  particleRuntime: 'restored-legacy',
  spectralForgeRuntime: 'restored-legacy',
  nonWaveScheduledTones: 'legacy-branch',
}, null, 2));
