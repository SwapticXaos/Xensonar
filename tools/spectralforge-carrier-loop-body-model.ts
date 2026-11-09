import {
  CARRIER_LOOP_BODY_MODEL_VERSION,
  assertCarrierLoopBodyModels,
  listCarrierLoopBodyModels,
  resolveCarrierLoopBodyModel,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyModel';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

assertCarrierLoopBodyModels();
check('Model version is 9.158 boundary', CARRIER_LOOP_BODY_MODEL_VERSION.includes('3.2.91.6.9.158'));

const models = listCarrierLoopBodyModels();
check('All registered machines expose models', models.length >= 8, models.map((model) => model.machineId));
check('Model identities are unique', new Set(models.map((model) => model.stableIdentity)).size === models.length, models.map((model) => model.stableIdentity));

const pure = resolveCarrierLoopBodyModel('raw-darkpsy-oscillator');
check('Pure Dieter body kind is raw material', pure.bodyKind === 'raw-material-body', pure);
check('Pure Dieter root-follow send remains allowed', pure.allowsRootFollowSend === true, pure.targets['root-follow']);
check('Pure Dieter material track send remains allowed', pure.allowsMaterialTrackSend === true, pure.targets['material-track']);
check('Pure Dieter melodic direct send is raw material allowed', pure.allowsMelodicDirectSend === true, pure.targets['melodic-direct']);
check('Pure Dieter melodic handoff exposes raw material target', pure.targets['melodic-direct'].handoff === 'melodic-raw-material', pure.targets['melodic-direct']);
check('Pure Dieter preferred preview uses raw spectral buffer', pure.preferredPreviewBody === 'raw-spectral-buffer', pure.preferredPreviewBody);

const dieter = resolveCarrierLoopBodyModel('material-render-body');
check('Dieter V2 body kind is rendered material', dieter.bodyKind === 'rendered-material-body', dieter);
check('Dieter V2 requires material body', dieter.requiresMaterialBody === true, dieter);
check('Dieter V2 does not require formant plan', dieter.requiresFormantPlan === false, dieter);
check('Dieter V2 uses rendered audio strategy', dieter.renderStrategy === 'rendered-audio-material', dieter.renderStrategy);
check('Dieter V2 root-follow handoff stays material-flowing', dieter.targets['root-follow'].handoff === 'root-follow-material-flowing', dieter.targets['root-follow']);

const donatello = resolveCarrierLoopBodyModel('donatello-formant-window-body');
check('Donatello body kind is formant window', donatello.bodyKind === 'formant-window-body', donatello);
check('Donatello requires formant plan', donatello.requiresFormantPlan === true, donatello);
check('Donatello preferred preview uses formant plan buffer', donatello.preferredPreviewBody === 'donatello-formant-plan-buffer', donatello.preferredPreviewBody);
check('Donatello root-follow stays material-flowing', donatello.targets['root-follow'].handoff === 'root-follow-material-flowing', donatello.targets['root-follow']);
check('Donatello does not alias synthetic strategy', donatello.renderStrategy !== 'synthetic-root-follow-config', donatello.renderStrategy);

for (const machineId of ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
  const model = resolveCarrierLoopBodyModel(machineId);
  check(`${machineId} is synthetic config body`, model.bodyKind === 'synthetic-root-follow-config-body', model);
  check(`${machineId} root-follow handoff is artifact config`, model.targets['root-follow'].handoff === 'root-follow-artifact-config', model.targets['root-follow']);
  check(`${machineId} does not require material body`, model.requiresMaterialBody === false, model);
  check(`${machineId} does not require formant plan`, model.requiresFormantPlan === false, model);
}

const donor = resolveCarrierLoopBodyModel('donor-timbre-embodiment');
check('Donor-Timbre embodiment is contract-only', donor.contractOnly === true, donor);
check('Donor-Timbre embodiment is not render-ready', donor.renderReady === false, donor);
check('Donor-Timbre embodiment requires donor atlas before renderer claim', donor.requiresDonorAtlas === true, donor);

for (const model of models) {
  check(`${model.machineId} target identities distinguish target kind`,
    Object.values(model.targets).every((target) => target.stableIdentity.includes(target.targetKind)),
    model.targets,
  );
  check(`${model.machineId} machine identity distinguishes body kind`, model.stableIdentity.includes(model.bodyKind), model.stableIdentity);
}

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: checked.length,
  machines: models.map((model) => ({
    machineId: model.machineId,
    bodyKind: model.bodyKind,
    renderStrategy: model.renderStrategy,
    allowsRootFollowSend: model.allowsRootFollowSend,
    allowsMaterialTrackSend: model.allowsMaterialTrackSend,
    allowsMelodicDirectSend: model.allowsMelodicDirectSend,
  })),
}, null, 2));
