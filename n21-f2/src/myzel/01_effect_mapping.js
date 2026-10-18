/* Myzel G2: JI interval and audio organ are independent coordinates.
   Spatial reset permutes the 11 real organ processors across 12 original nodes.
   A twelfth copy is deliberately chosen anew for every constellation.
   The chosen mapping is attached to the nodes and persisted with the constellation;
   no random choices occur on the audio thread or during a ball gesture. */
const MYZEL_JI_EFFECTS = Object.freeze([
  'resonator', 'formant_filter', 'spectral_tilt', 'wavefolder',
  'sub_harmonic', 'shimmer_delay', 'comb_filter', 'grain_blur',
  'drive', 'chorus', 'bitcrusher'
]);
const MYZEL_JI_EFFECT_LABELS = Object.freeze({
  resonator:'Resonator', formant_filter:'Formant', spectral_tilt:'Tilt',
  wavefolder:'Fold', sub_harmonic:'Sub', shimmer_delay:'Shimmer',
  comb_filter:'Comb', grain_blur:'Korn', drive:'Drive',
  chorus:'Chorus', bitcrusher:'Crush'
});
function myzelRandomEffectAssignments(nodes, random = Math.random) {
  const assignable = nodes.filter(node => !node.isCustomResident).length;
  if (!assignable) return nodes.slice();
  // Use one random draw per selection, including the extra organ and each swap.
  const randomIndex = n => {
    const value = random();
    return Math.max(0, Math.min(n - 1, Math.floor((Number.isFinite(value) ? value : 0) * n)));
  };
  // Every 12-node layout contains the complete eleven-colour palette and
  // one independently drawn duplicate. Shuffle before assigning to JI labels.
  const order = MYZEL_JI_EFFECTS.slice();
  while (order.length < assignable)
    order.push(MYZEL_JI_EFFECTS[randomIndex(MYZEL_JI_EFFECTS.length)]);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomIndex(i+1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  let i = 0;
  return nodes.map(node => node.isCustomResident ? node : {
    ...node, myzelEffectModuleType: order[i++]
  });
}
function myzelAssignEffectToNode(nodes, nodeId, effectType) {
  if (!MYZEL_JI_EFFECTS.includes(effectType)) return false;
  const node = nodes.find(n => String(n.residentId ?? n.id ?? n.label) === String(nodeId));
  if (!node || node.isCustomResident) return false;
  node.myzelEffectModuleType = effectType;
  delete node.myzelEffectPresetId; // An explicit type takes precedence over a preset.
  return true;
}
