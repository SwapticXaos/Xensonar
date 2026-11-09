#!/usr/bin/env node
import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) {
  if (!condition) {
    console.error('[check-granular-manager-smooth-resolution-contract] ' + message);
    process.exit(1);
  }
}
const granular = read('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const panel = read('src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx');
expect(granular.includes("powerMode: 'edge'") && granular.includes("windowMs: 96") && granular.includes("stepMs: 24") && granular.includes('realtimeCeilingPerSecond'), 'smooth preset lacks guarded high-resolution geometry');
expect(granular.includes("return 'Feinauflösung'") && !granular.includes('Schmerzgrenze'), 'hardware-limit language was not removed from density profiles');
expect(granular.includes('blendRootFollowGranularSettings') && granular.includes('formatRootFollowGranularProfileLine'), 'profile blending/diagnostic helpers missing');
expect(granular.includes('grainWindowScale') && granular.includes('windowNorm') && granular.includes('smoothBias'), 'render tuning does not reflect window-based smoothness');
expect(panel.includes('Carrier-Profil einmischen') && panel.includes('Profil direkt setzen') && panel.includes('storedBridgeLine'), 'Granular Manager UI does not expose blend/direct profile workflows');
expect(panel.includes('Feinauflösung ist eine dichtere, aber begrenzte Überlappungs-/Auflösungsregion'), 'UI still lacks neutral guarded high-density wording');
console.log('[check-granular-manager-smooth-resolution-contract] ok');
