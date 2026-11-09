import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function expect(condition, message) {
  if (!condition) {
    console.error('[granular-spectral-bridge] ' + message);
    process.exit(1);
  }
}

const granular = read('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
const artifacts = read('src/features/l3lab/spectralForge/embodiment/buildSpectralEmbodimentArtifacts.ts');
const meta = read('src/features/l3lab/materialLibrary.ts');
const schema = read('src/features/l3lab/materialSchema.ts');
const adapter = read('src/features/l3lab/materialAdapter.ts');

expect(granular.includes("'spectralforge-carrier-donor'") && granular.includes('analyzeRootFollowGranularAudioBufferProfile'), 'shared SpectralForge/Granular buffer profile bridge missing');
expect(granular.includes('serializeRootFollowGranularAudioProfile') && granular.includes('parseRootFollowGranularAudioProfile'), 'granular bridge profile persistence helpers missing');
expect(artifacts.includes('analyzeRootFollowGranularAudioBufferProfile') && artifacts.includes("route: 'spectralforge-carrier-donor'") && artifacts.includes('rootFollowGranularProfile'), 'SpectralForge embodiment artifacts do not create bridge profile');
expect(meta.includes('rootFollowGranularProfile?: string') && schema.includes('rootFollowGranularProfile?: string'), 'material metadata does not persist granular bridge profile');
expect(adapter.includes('rootFollowGranularProfile: meta.rootFollowGranularProfile') && adapter.includes('rootFollowGranularProfile: pkg.renderInfo?.rootFollowGranularProfile'), 'material adapter does not round-trip granular bridge profile');
expect(panel.includes('parseRootFollowGranularAudioProfile') && panel.includes('Carrier-Profil einmischen') && panel.includes('Raw Audio fitten'), 'Granular Manager UI does not expose both bridge-profile and direct raw-audio fit paths');

console.log('[granular-spectral-bridge] ok');
