#!/usr/bin/env node
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function expect(condition, message) {
  if (!condition) {
    console.error(`[check-spectral-granular-material-profile-contract] ${message}`);
    process.exit(1);
  }
}

const shared = read('src/features/xensonar/audioMaterial/audioMaterialInterpretationProfile.ts');
const granular = read('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const artifacts = read('src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts');
const rootFollow = read('src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts');

expect(shared.includes('AudioMaterialInterpretationProfile') && shared.includes('analyzeAudioMaterialSamplesProfile') && shared.includes('analyzeAudioMaterialBufferProfile'), 'shared AudioMaterialInterpretationProfile module missing');
expect(shared.includes('carrierReading') && shared.includes('roleWeights') && shared.includes('transientPulse'), 'shared material profile does not expose Carrier-reading descriptors');
expect(granular.includes('buildRootFollowGranularAudioProfileFromMaterialProfile') && granular.includes('buildRootFollowGranularSettingsFromMaterialProfile'), 'Granular Manager does not derive playback settings from shared material profile');
expect(!granular.includes('let rmsSum') && !granular.includes('frameSize = 2048'), 'Granular Manager still contains duplicated low-level audio analysis loop');
expect(artifacts.includes('analyzeAudioMaterialSamplesProfile') && artifacts.includes("sourceRole: 'spectralforge-donor'") && artifacts.includes('donorMaterialProfile'), 'SpectralForge does not analyze donor import through the shared material profile');
expect(artifacts.includes('buildRootFollowGranularAudioProfileFromMaterialProfile'), 'SpectralForge does not pass shared donor profile to Root Follow/Granular metadata');
expect(rootFollow.includes('materialInterpretationProfile?: AudioMaterialInterpretationProfile') && rootFollow.includes('materialInterpretationProfile: args.materialInterpretationProfile'), 'Root-Follow synthetic Carrier plan does not receive the shared material profile');
expect(rootFollow.includes('roleWeights') && rootFollow.includes('layerProfileGate') && rootFollow.includes('layerProfileVolumeMultiplier'), 'Carrier reading is not shaping synthetic layer selection/gate/volume');

console.log('[check-spectral-granular-material-profile-contract] ok');
