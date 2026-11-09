export type MyzelRoom3BoundaryConcern =
  | 'types'
  | 'mix-chemistry'
  | 'node-config'
  | 'ball-field-reading'
  | 'aura-overlap-geometry'
  | 'constellation-gestalt'
  | 'legacy-signature-bridge'
  | 'topological-relations'
  | 'canvas-rendering'
  | 'frame-physics'
  | 'frame-metrics'
  | 'snapshot-assembly'
  | 'frame-orchestration';

export type MyzelRoom3BoundaryRule = {
  readonly file: string;
  readonly concern: MyzelRoom3BoundaryConcern;
  readonly owns: readonly string[];
  readonly mustNotOwn: readonly string[];
  readonly primaryConsumer: string;
};

export const MYZEL_ROOM3_BOUNDARY_MANIFEST_VERSION = '3.2.91.6.9.77';

export const MYZEL_ROOM3_BOUNDARY_RULES: readonly MyzelRoom3BoundaryRule[] = [
  {
    file: 'src/features/topology/myzelSpatialFieldTypes.ts',
    concern: 'types',
    owns: ['shared Myzel spatial-field value contracts', 'type-only module boundaries'],
    mustNotOwn: ['runtime calculation', 'React/UI state', 'Canvas drawing', 'WebAudio devices'],
    primaryConsumer: 'all Myzel spatial-field sibling modules',
  },
  {
    file: 'src/features/topology/myzelSpatialEffectMix.ts',
    concern: 'mix-chemistry',
    owns: ['spatial effect mix defaults', 'module amount normalization', 'relation compatibility chemistry'],
    mustNotOwn: ['node preset inference', 'ball geometry', 'snapshot assembly', 'WebAudio devices'],
    primaryConsumer: 'myzelNodeSpatialConfig.ts and myzelBallSpectralFieldReader.ts',
  },
  {
    file: 'src/features/topology/myzelNodeSpatialConfig.ts',
    concern: 'node-config',
    owns: ['node effect inference', 'aura preset definitions', 'aura module construction'],
    mustNotOwn: ['ball field reading', 'aura overlap pairs', 'frame physics', 'audio graph realization'],
    primaryConsumer: 'myzelSpatialEffectField.ts',
  },
  {
    file: 'src/features/topology/myzelBallSpectralFieldReader.ts',
    concern: 'ball-field-reading',
    owns: ['ball-to-node field reading', 'local roughness/body/formant aggregation', 'active relation field mix'],
    mustNotOwn: ['node preset registry', 'aura overlap list rendering', 'constellation gestalt analysis', 'Canvas drawing'],
    primaryConsumer: 'myzelSpatialEffectField.ts',
  },
  {
    file: 'src/features/topology/myzelAuraOverlapGeometry.ts',
    concern: 'aura-overlap-geometry',
    owns: ['aura pair overlap geometry', 'midpoint field sampling', 'interference/sparkle sorting'],
    mustNotOwn: ['ball spectral reading', 'node preset registry', 'snapshot assembly', 'WebAudio devices'],
    primaryConsumer: 'myzelSpatialEffectField.ts',
  },
  {
    file: 'src/features/topology/myzelConstellationGestalt.ts',
    concern: 'constellation-gestalt',
    owns: ['gestalt density', 'asymmetry/linearity', 'palette weights', 'cluster mass'],
    mustNotOwn: ['spatial effect mix mutation', 'frame physics', 'snapshot object construction', 'Canvas drawing'],
    primaryConsumer: 'myzelSpatialEffectField.ts',
  },
  {
    file: 'src/features/topology/myzelLegacySignatureBridge.ts',
    concern: 'legacy-signature-bridge',
    owns: ['legacy/spatial constellation blend ratios', 'bridge from spatial probe to legacy signature fields'],
    mustNotOwn: ['spatial probe assembly', 'topological relation projection', 'Room III frame sequencing'],
    primaryConsumer: 'myzelRoom3SnapshotAssembly.ts',
  },
  {
    file: 'src/features/topology/myzelTopologicalRelations.ts',
    concern: 'topological-relations',
    owns: ['relation snapshot projection', 'ratio parsing', 'relation sort priority and limit'],
    mustNotOwn: ['Canvas relation line drawing', 'snapshot object construction', 'audio graph realization'],
    primaryConsumer: 'myzelRoom3SnapshotAssembly.ts',
  },
  {
    file: 'src/features/topology/myzelRoom3CanvasRenderer.ts',
    concern: 'canvas-rendering',
    owns: ['Room III canvas background', 'node/aura/relation drawing', 'ball and velocity-tail drawing'],
    mustNotOwn: ['physics mutation', 'snapshot assembly', 'WebAudio devices', 'React state'],
    primaryConsumer: 'Room III runtime entry via myzelRoom3Frame.ts compatibility export',
  },
  {
    file: 'src/features/topology/myzelRoom3FramePhysics.ts',
    concern: 'frame-physics',
    owns: ['cursor drift', 'velocity damping', 'wall bounce', 'node energy excitation/dissipation'],
    mustNotOwn: ['canvas drawing', 'snapshot assembly', 'constellation signature calculation', 'audio graph realization'],
    primaryConsumer: 'myzelRoom3Frame.ts',
  },
  {
    file: 'src/features/topology/myzelRoom3FrameMetrics.ts',
    concern: 'frame-metrics',
    owns: ['status line', 'nodeEnergyByLabel', 'layoutSpread', 'nearest node', 'coherence and tension field'],
    mustNotOwn: ['physics mutation', 'snapshot object construction', 'Canvas drawing', 'WebAudio devices'],
    primaryConsumer: 'myzelRoom3Frame.ts and myzelRoom3SnapshotAssembly.ts',
  },
  {
    file: 'src/features/topology/myzelRoom3SnapshotAssembly.ts',
    concern: 'snapshot-assembly',
    owns: ['legacy flux smoothing', 'legacy/spatial blend handoff', 'MyceliumSnapshot construction'],
    mustNotOwn: ['frame physics', 'canvas rendering', 'spatial probe calculation', 'audio graph realization'],
    primaryConsumer: 'myzelRoom3Frame.ts',
  },
  {
    file: 'src/features/topology/myzelRoom3Frame.ts',
    concern: 'frame-orchestration',
    owns: ['frame sequencing', 'boundary delegation', 'compatibility re-exports'],
    mustNotOwn: ['inline physics formulas', 'inline canvas drawing', 'inline snapshot object literals', 'inline spatial field internals'],
    primaryConsumer: 'Room III runtime entry points',
  },
];

export const MYZEL_ROOM3_FEATURE_EXTENSION_RULES = {
  futureNodeSoundInteraction: [
    'Add new audible node-combination behavior as a feature branch, not as a silent refactor.',
    'Attach new relation/audio data through explicit snapshot or audio-device contracts instead of patching frame orchestration directly.',
    'Do not collapse Sub, Crush, Resonator, Vibe, and related node devices into a generic drone/aura path.',
    'Preserve the current boundary split unless a new file owns a clearly named musical contract.',
  ],
  mergeDiscipline: [
    'Patch behavior into the owning boundary file, not into a barrel/compatibility module.',
    'Use myzelRoom3Frame.ts as sequencer only unless the change is explicitly about sequencing.',
    'Use myzelSpatialEffectField.ts as probe orchestrator only unless the change is explicitly about probe orchestration.',
  ],
} as const;
