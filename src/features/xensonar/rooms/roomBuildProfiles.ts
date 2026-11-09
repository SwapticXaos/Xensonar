export const XENSONAR_ROOM_BUILD_PROFILE_VERSION = '3.2.91.4.114.49-core-room-boundary-prep-1' as const;

export type XensonarRoomProfileGroup = 'core' | 'extras';
export type XensonarRoomProfileId =
  | 'RESONANCE'
  | 'L3LAB'
  | 'TOPOLOGY'
  | 'MAIN'
  | 'XENPOLAR'
  | 'GAME'
  | 'COMMONS'
  | 'NEXUS';

export type XensonarRoomProfileDefinition = {
  id: XensonarRoomProfileId;
  group: XensonarRoomProfileGroup;
  canonicalIndex: string;
  label: string;
  buildRole: 'core-runtime' | 'core-support' | 'extras-runtime' | 'legacy-support';
  notes: string;
};

export const XENSONAR_ROOM_PROFILE_DEFINITIONS: readonly XensonarRoomProfileDefinition[] = [
  {
    id: 'RESONANCE',
    group: 'core',
    canonicalIndex: 'I',
    label: 'Xensonar Hauptraum',
    buildRole: 'core-runtime',
    notes: 'Primary live instrument surface. Must stay in every routine test build.',
  },
  {
    id: 'L3LAB',
    group: 'core',
    canonicalIndex: 'II',
    label: 'Materialschmiede',
    buildRole: 'core-runtime',
    notes: 'Material workbench. Contains SpectralForge, SyntheticForge and the external handoff host mode.',
  },
  {
    id: 'TOPOLOGY',
    group: 'core',
    canonicalIndex: 'III',
    label: 'Nodal Installation',
    buildRole: 'core-runtime',
    notes: 'Myzel/topological receiving and interpretation surface. It must remain available with the Hauptraum.',
  },
  {
    id: 'COMMONS',
    group: 'core',
    canonicalIndex: 'III.2-support',
    label: 'Resonance Commons',
    buildRole: 'core-support',
    notes: 'Auxiliary support room. It is not a heavy extras app.',
  },
  {
    id: 'MAIN',
    group: 'extras',
    canonicalIndex: 'IV Spiele',
    label: 'Spiele · Xensonar Familie',
    buildRole: 'extras-runtime',
    notes: 'Contains embedded family apps and the native Xensonar Refactor receiver. Full build must preserve it; core build must not erase the bridge contract accidentally.',
  },
  {
    id: 'XENPOLAR',
    group: 'extras',
    canonicalIndex: 'IV Spiele',
    label: 'Spiele · Arcade Games',
    buildRole: 'extras-runtime',
    notes: 'Contains Jump-Run-Jam style senders. Full build must preserve exports to Xensonar, SpectralForge and SyntheticForge.',
  },
  {
    id: 'GAME',
    group: 'extras',
    canonicalIndex: 'IV Spiele',
    label: 'Spiele · Irrlicht Arena',
    buildRole: 'extras-runtime',
    notes: 'Arena branch can produce musical seed material. It should move with Extras, not be silently stubbed in core.',
  },
  {
    id: 'NEXUS',
    group: 'extras',
    canonicalIndex: 'legacy-support',
    label: 'Legacy Nexus placeholder',
    buildRole: 'legacy-support',
    notes: 'Retained only as compatibility room id while room order is being clarified.',
  },
] as const;

export const XENSONAR_CORE_ROOM_IDS = XENSONAR_ROOM_PROFILE_DEFINITIONS
  .filter((definition) => definition.group === 'core')
  .map((definition) => definition.id);

export const XENSONAR_EXTRAS_ROOM_IDS = XENSONAR_ROOM_PROFILE_DEFINITIONS
  .filter((definition) => definition.group === 'extras')
  .map((definition) => definition.id);

export const XENSONAR_EXTRAS_HANDOFF_CONTRACTS = [
  {
    id: 'jump-run-jam-to-materialschmiede',
    sender: 'Xenpolar / Resonanzwanderer / Irrlicht Arena',
    receiver: 'L3LAB Materialschmiede via external-loop, SpectralForge audio handoff or SyntheticForge seed queue',
    requiredModules: [
      'src/features/xenpolar/rooms/xenpolarExportActions.ts',
      'src/features/l3lab/external/externalLoopHost.ts',
      'src/features/l3lab/forgeAudioHandoff.ts',
      'src/features/l3lab/canonicalForge/microtoMelodicLoopHandoff.ts',
      'src/features/xensonar/rooms/xenpolarShortcut.ts',
    ],
  },
  {
    id: 'xensonar-refactor-receiver',
    sender: 'Hauptraum shared-field / future extras sender',
    receiver: 'Xensonar Refactor room inside Extras',
    requiredModules: [
      'src/features/xensonar/rooms/MainRoom.tsx',
      'src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx',
      'src/features/xensonar/family/refactor/sharedFieldController.ts',
    ],
  },
] as const;
