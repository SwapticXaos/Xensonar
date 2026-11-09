export const XENSONAR_BUILD_BODY_PROFILE_VERSION = '3.2.91.5.45-build-body-profiles-v3-xenpolar-extras-bridge' as const;

export type XensonarBuildBodyId =
  | 'hot-realtime-core'
  | 'materialschmiede-workbench'
  | 'topology-myzel'
  | 'extras-family-xenpolar'
  | 'spectralforge-workbench'
  | 'syntheticforge-workbench'
  | 'large-data-assets'
  | 'shared-infrastructure';

export type XensonarBuildBodyRuntimeRole =
  | 'routine-core-html'
  | 'workbench-chunk'
  | 'extras-chunk'
  | 'externalize-candidate'
  | 'shared-contract';

export type XensonarBuildBodyDefinition = {
  id: XensonarBuildBodyId;
  label: string;
  runtimeRole: XensonarBuildBodyRuntimeRole;
  sourceGlobs: readonly string[];
  hardBoundary: string;
  nextExtractionMove: string;
};

export const XENSONAR_BUILD_BODY_DEFINITIONS: readonly XensonarBuildBodyDefinition[] = [
  {
    id: 'hot-realtime-core',
    label: 'Hauptraum Echtzeitkern',
    runtimeRole: 'routine-core-html',
    sourceGlobs: [
      'src/App.tsx',
      'src/features/xensonar/audio/**',
      'src/features/xensonar/audioTraffic/**',
      'src/features/xensonar/domain/**',
      'src/features/xensonar/groove/**',
      'src/features/xensonar/material/**',
      'src/features/xensonar/recording/**',
      'src/features/xensonar/rootFollow/**',
      'src/features/xensonar/runtime/**',
      'src/features/xensonar/rooms/Resonance*.tsx',
      'src/features/resonance/**',
      'src/features/soundLibrary/**',
    ],
    hardBoundary: 'Never move live scheduling, audio graph ownership or Root-Follow timing through Extras-only room imports.',
    nextExtractionMove: 'Split App.tsx orchestration into named runtime boundaries while preserving audible behavior.',
  },
  {
    id: 'materialschmiede-workbench',
    label: 'Materialschmiede Werkbankkörper',
    runtimeRole: 'routine-core-html',
    sourceGlobs: [
      'src/components/Level3LabRoom.tsx',
      'src/features/l3lab/materialIntake/**',
      'src/features/l3lab/contracts/**',
      'src/features/l3lab/adapters/**',
      'src/features/l3lab/external/**',
      'src/features/l3lab/forgeAudioHandoff.ts',
    ],
    hardBoundary: 'Workbench handoffs may depend on shared contracts, not on Hauptraum internals.',
    nextExtractionMove: 'Keep intake/handoff adapters thin and move heavy editor bodies behind local workbench entrypoints.',
  },
  {
    id: 'spectralforge-workbench',
    label: 'SpectralForge Werkbankkörper',
    runtimeRole: 'workbench-chunk',
    sourceGlobs: [
      'src/features/l3lab/spectralForge/**',
      'src/features/l3lab/forge3/**',
    ],
    hardBoundary: 'Carrier/Donor analysis can produce profiles and handoffs; it must not become a global Root-Follow playback engine.',
    nextExtractionMove: 'Keep audio material interpretation profiles shared, but keep SpectralForge UI and audio engines in their own body.',
  },
  {
    id: 'syntheticforge-workbench',
    label: 'SyntheticForge Werkbankkörper',
    runtimeRole: 'workbench-chunk',
    sourceGlobs: [
      'src/features/l3lab/canonicalForge/**',
      'src/features/l3lab/melodicSamples/**',
      'src/features/loopEngine/**',
    ],
    hardBoundary: 'Melodic/Synthetic events must keep per-event source contracts; do not flatten hybrid loops prematurely.',
    nextExtractionMove: 'Separate loop domain, preview renderer and room UI into independent check/build units.',
  },
  {
    id: 'topology-myzel',
    label: 'Topologie / Myzel Körper',
    runtimeRole: 'routine-core-html',
    sourceGlobs: [
      'src/features/topology/**',
      'src/components/ResonanceCommonsRoom.tsx',
      'src/features/xensonar/rooms/AppRoomViewport.tsx',
    ],
    hardBoundary: 'Topology may interpret or receive runtime state, but should not own global audio buses.',
    nextExtractionMove: 'Keep Myzel panel rendering separate from Hauptraum scheduling and bus ownership.',
  },
  {
    id: 'extras-family-xenpolar',
    label: 'Extras: Spiele / Familie / Arcade / Irrlicht',
    runtimeRole: 'extras-chunk',
    sourceGlobs: [
      'src/features/xensonar/family/**',
      'src/features/xenpolar/**',
      'src/external/microto/**',
    ],
    hardBoundary: 'Extras may send handoffs to Materialschmiede/Hauptraum through contracts; routine core builds must not eagerly pull them in.',
    nextExtractionMove: 'Keep App.tsx on the xenpolarExtrasBridge seam; move further Extras-only runtime into the full bridge only when sender semantics are covered.',
  },
  {
    id: 'large-data-assets',
    label: 'Große Daten / HTML-Assets',
    runtimeRole: 'externalize-candidate',
    sourceGlobs: [
      'src/features/xensonar/family/assets/**',
      'src/data/**',
    ],
    hardBoundary: 'Large embedded app/html/data payloads should not live inside the hot TypeScript transform path long-term.',
    nextExtractionMove: 'Keep standalone HTML payloads outside the hot TypeScript transform path; only inline them again in an explicit Extras/full-singlefile artifact step.',
  },
  {
    id: 'shared-infrastructure',
    label: 'Gemeinsame Verträge / Infrastruktur',
    runtimeRole: 'shared-contract',
    sourceGlobs: [
      'src/core/**',
      'src/utils/**',
      'src/components/systemMemory/**',
      'src/features/xensonar/architecture/**',
      'src/features/xensonar/audioMaterial/**',
    ],
    hardBoundary: 'Shared infrastructure may define contracts and pure helpers, not room-specific UI monoliths.',
    nextExtractionMove: 'Keep shared modules small, pure and used by at least two bodies or clearly documented as future shared seam.',
  },
] as const;

export const XENSONAR_ROUTINE_CORE_BUILD_BODIES = XENSONAR_BUILD_BODY_DEFINITIONS
  .filter((body) => body.runtimeRole === 'routine-core-html' || body.runtimeRole === 'shared-contract')
  .map((body) => body.id);

export const XENSONAR_OPTIONAL_BUILD_BODIES = XENSONAR_BUILD_BODY_DEFINITIONS
  .filter((body) => body.runtimeRole === 'workbench-chunk' || body.runtimeRole === 'extras-chunk' || body.runtimeRole === 'externalize-candidate')
  .map((body) => body.id);
