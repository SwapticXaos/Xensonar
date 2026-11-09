import fs from 'node:fs';

const contract = fs.readFileSync('src/features/xensonar/audio/liveMasterBusContract.ts', 'utf8');
const boundary = fs.readFileSync('src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts', 'utf8');
const liveMastering = fs.readFileSync('src/features/resonance/liveMastering.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

const required = [
  ['shared LiveMasterBusRole contract exists', contract.includes('export type LiveMasterBusRole') && contract.includes('LIVE_MASTER_BUS_ROLES')],
  ['role filter configs live in shared contract', contract.includes('LIVE_MASTER_ROLE_FILTER_CONFIGS') && liveMastering.includes('LIVE_MASTER_ROLE_FILTER_CONFIGS[role]')],
  ['no-drum role predicate shared', contract.includes('isNoDrumRecordingRole') && liveMastering.includes('isNoDrumRecordingRole(role)')],
  ['runtime boundary no longer redeclares bus role union', !boundary.includes("export type LiveMasterBusRole = 'main' | 'drone' | 'rhythm' | 'space'")],
  ['effect output role map exists', contract.includes('LIVE_MASTER_EFFECT_OUTPUT_ROLES') && contract.includes('resolveLiveMasterEffectOutputRole')],
  ['runtime exposes effect bus resolver', boundary.includes('getLiveMasterEffectBusRuntime') && boundary.includes('resolveLiveMasterEffectOutputRole(effect)')],
  ['App uses effect routing helper', app.includes('getLiveMasterEffectBus(ctx, "psychedelicSpiral")') && app.includes('getLiveMasterEffectBus(ctx, "transientDrive")') && app.includes('getLiveMasterEffectBus(ctx, "schwarmdeuter")') && app.includes('getLiveMasterEffectBus(ctx, "myzelPostFx")')],
  ['no-drum tap still does not feed live premaster in parallel', !liveMastering.includes('musicPremaster.connect(premaster);')],
];

const failed = required.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('[live-master-effect-routing-contract] failed:');
  for (const name of failed) console.error(` - ${name}`);
  process.exit(1);
}
console.log('[live-master-effect-routing-contract] ok');
