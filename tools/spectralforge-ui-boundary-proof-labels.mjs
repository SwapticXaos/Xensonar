export const SPECTRALFORGE_UI_BOUNDARY_PROOF_TAXONOMY = Object.freeze({
  proofClasses: Object.freeze({
    'source-shape': 'Reads source files and checks import/callsite/string structure. Useful for boundary drift detection; not runtime behaviour.',
    'static-boundary': 'Confirms a declared separation contract such as UI model versus store/runtime action ownership.',
    'build-artifact': 'Inspects built artifacts such as the generated single-file HTML; useful for packaging/build regressions.',
    'browser-dom': 'Runs against browser-rendered DOM or equivalent UI surface; can support click/visibility smoke claims.',
    behavioural: 'Exercises runtime behaviour with inputs/outputs and can support stronger interaction or persistence claims.',
    'audio-export': 'Exercises audible/rendered/exported audio material and can support Klang/export claims only within its fixture limits.',
  }),
  proofStrengthOrder: Object.freeze([
    'source-shape',
    'static-boundary',
    'build-artifact',
    'browser-dom',
    'behavioural',
    'audio-export',
  ]),
});

export const SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL = Object.freeze({
  suiteId: 'spectralforge-ui-boundary',
  primaryProofClass: 'source-shape',
  secondaryProofClass: 'static-boundary',
  proofKind: 'source-shape/static boundary sanity',
  proofStrength: 'low-runtime-high-boundary',
  canClaim: Object.freeze([
    'Covered SpectralForge UI-model modules keep React hooks, stores, browser globals, audio engine objects, and mutating runtime actions outside pure view-model files.',
    'Covered product components still own their store writes, callbacks, browser object construction, and runtime handoff boundaries.',
    'The suite is suitable as a cheap regression trichter for UI-boundary drift during refactor work.',
  ]),
  cannotClaim: Object.freeze([
    'browser DOM clickability, layout, focus, pointer, wheel, drag, or keyboard behaviour',
    'subjective Klang, preview timing, audio render identity, or export correctness',
    'IndexedDB persistence, package import/export roundtrip, or Melodic Loop handoff behaviour',
    'semantic correctness of labels beyond the exact static strings checked by each local guard',
  ]),
  requiredResultFields: Object.freeze([
    'proofProfile.primaryProofClass',
    'proofProfile.secondaryProofClass',
    'proofProfile.canClaim',
    'proofProfile.cannotClaim',
  ]),
});

const sharedUiBoundaryProofProfile = Object.freeze({
  primaryProofClass: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.primaryProofClass,
  secondaryProofClass: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.secondaryProofClass,
  proofKind: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.proofKind,
  canClaim: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.canClaim,
  cannotClaim: SPECTRALFORGE_UI_BOUNDARY_SUITE_PROOF_LABEL.cannotClaim,
});

export const SPECTRALFORGE_UI_BOUNDARY_CHECKS = Object.freeze([
  {
    label: 'TransportBar UI model boundary',
    tool: 'tools/check-spectralforge-transportbar-ui-boundary-refactor-7768.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'SpectralCanvas viewport model boundary',
    tool: 'tools/check-spectralforge-canvas-viewport-boundary-refactor-7771.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'ToolSettings UI model boundary',
    tool: 'tools/check-spectralforge-toolsettings-ui-model-boundary-refactor-7776.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'Toolbar UI model boundary',
    tool: 'tools/check-spectralforge-toolbar-ui-model-boundary-refactor-7777.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'MaterialLibrary UI model boundary',
    tool: 'tools/check-spectralforge-materiallibrary-ui-model-boundary-refactor-7778.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'CustomStampLibrary UI model boundary',
    tool: 'tools/check-spectralforge-customstamp-ui-model-boundary-refactor-7779.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
  {
    label: 'SpectralForge UI boundary registry consolidation',
    tool: 'tools/check-spectralforge-ui-boundary-registry-consolidation-7780.mjs',
    category: 'spectralforge-ui-boundary',
    proofProfile: sharedUiBoundaryProofProfile,
  },
]);
