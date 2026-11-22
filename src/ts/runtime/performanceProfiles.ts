/* TS-MOD-06: Room architecture role profiles, Mycelium post-FX group routing descriptors,
   and Resident sound timbre/collision lookups — brought back from
   src/runtime/instrument/04_performance_and_output_profiles.js into strict TypeScript.
   Built by tools/ts_module.cjs into __XenTs_performanceProfiles.
   Zone: COLD (UI documentation/routing copy & resident timbre lookup). No audio-thread work. */

export type RoomArchitectureId =
  | 'xensonarPerformance'
  | 'forgeLegacy'
  | 'forgeCanonical'
  | 'myzelMastering'
  | 'forgeWorkshop'
  | 'externalSlot';

export interface RoomArchitectureProfile {
  readonly id: RoomArchitectureId;
  readonly stageLabel: string;
  readonly title: string;
  readonly shortLabel: string;
  readonly summary: string;
  readonly exportsTo: string;
  readonly owns: readonly string[];
  readonly avoids: readonly string[];
}

export type MyzelPostGroupId = 'master' | 'particles' | 'drone' | 'waves' | 'forge';

export interface MyzelPostGroupProfile {
  readonly id: MyzelPostGroupId;
  readonly label: string;
  readonly summary: string;
  readonly receivesFrom: string;
  readonly keepsStableBy: string;
}

export type MaterialRoleKind = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture' | string;
export type WorkspaceOriginKind = 'microtonal-logic' | 'wave-material' | 'legacy-forge' | string;
export type EngineOwnershipKind = 'legacy' | 'canonical' | 'external';

export interface MaterialRoutingInput {
  readonly role: MaterialRoleKind;
  readonly workspaceOrigin: WorkspaceOriginKind;
}

export interface MaterialRoutingPlan {
  readonly preferredMyzelGroup: MyzelPostGroupId;
  readonly workspaceOrigin: WorkspaceOriginKind;
  readonly transitionGuard: 'guarded-handoff' | 'stabilize-contracts';
  readonly balanceCarrier: string;
  readonly routeSummary: string;
  readonly stabilizeBy: string;
}

export interface ResidentCollisionSpec {
  readonly preset: string;
  readonly ampMul: number;
  readonly freqMul: number;
}

export interface ResidentTimbreOption {
  readonly value: string;
  readonly label: string;
  readonly collision: ResidentCollisionSpec;
}

export const ROOM_ARCHITECTURE_PROFILES: Record<RoomArchitectureId, RoomArchitectureProfile> = {
  xensonarPerformance: {
    id: 'xensonarPerformance',
    stageLabel: 'V Xensonar · Performance Room',
    title: 'Performance and Routing Core',
    shortLabel: 'Performance',
    summary: 'Direct musical interaction, Material Track playback, and performance logic remain here.',
    exportsTo: 'Audio buses, routing, visible performance states',
    owns: ['Particles', 'Wave Starter', 'Material Track playback', 'direct real-time interaction'],
    avoids: ['deep segment editing', 'global mastering decisions'],
  },
  forgeLegacy: {
    id: 'forgeLegacy',
    stageLabel: 'III.2a SpectralForge · Legacy Archive',
    title: 'Archived SpectralForge Workbench',
    shortLabel: 'SpectralForge Archive',
    summary:
      'The archived SpectralForge predecessor remains as a stability reference for direct painting and transformation logic; the visible product surface is called SpectralForge.',
    exportsTo: 'Xensonar Material Package v1',
    owns: ['Legacy Stamps', 'direct spectral flow', 'established export routes'],
    avoids: ['new overall ownership for groove/bass', 'global post-FX role'],
  },
  forgeCanonical: {
    id: 'forgeCanonical',
    stageLabel: 'III.2b SyntheticForge',
    title: 'SyntheticForge · Drum Machine / Melodic Loop',
    shortLabel: 'SyntheticForge',
    summary:
      'SyntheticForge combines Drum Machine, Melodic Loop, and the related synth/loop work. Historical wave/material parts remain only as technical references.',
    exportsTo: 'Xensonar Material Package v1 + segment interpretation',
    owns: ['raw source + loop selection', 'sound-oriented editing', 'microtonal pitch-time logic', 'Groove/Bass-Vorarbeit'],
    avoids: ['global mastering decisions', 'versteckte Speziallogik im Monolithen'],
  },
  myzelMastering: {
    id: 'myzelMastering',
    stageLabel: 'III. Nodal Center · Mastering Engine Room',
    title: 'Downstream FX and Mastering Room',
    shortLabel: 'Post / FX / Mastering',
    summary: 'Mycelium is gradually becoming the room for global or group-based shaping after Forge and before limiting/finalization.',
    exportsTo: 'bus coloration, group FX, global glue/air/body decisions',
    owns: ['Live-Mastering', 'global parallel FX stages', 'group-specific sends'],
    avoids: ['primary loop generation', 'Drum/Bass-Segmentbau'],
  },
  forgeWorkshop: {
    id: 'forgeWorkshop',
    stageLabel: 'III.2c Experimental Workshop',
    title: 'Experimental Body Room',
    shortLabel: 'Werkstatt',
    summary:
      'Separate experimental room for new mediation logic, without requiring every exploration to be promoted immediately into a visible product area.',
    exportsTo: 'for now only notes, hypotheses, and isolated prototypes',
    owns: ['Leitplanken', 'Experiment-Notizen', 'isolated body hypotheses'],
    avoids: ['stillschweigende Room-V-Lieferpflicht', 'regression of productive Forge paths'],
  },
  externalSlot: {
    id: 'externalSlot',
    stageLabel: 'III.2c External Device Slot',
    title: 'Neutral Docking Point',
    shortLabel: 'Adapter Dock',
    summary: 'External devices may be built differently internally as long as they speak the same material language externally.',
    exportsTo: 'Xensonar Material Package v1',
    owns: ['neutral adapter validation', 'external-device experimentation'],
    avoids: ['specialized knowledge in the Room V core'],
  },
};

export const MYZEL_POST_GROUPS: readonly MyzelPostGroupProfile[] = [
  {
    id: 'master',
    label: 'Master',
    summary: 'global glue-, air-, body- and limiter-adjacent decisions across the full mix.',
    receivesFrom: 'the entire Xensonar mix after Forge and performance processing.',
    keepsStableBy: 'smooth only the final ratio; do not pull segment-level work back into the monolith.',
  },
  {
    id: 'particles',
    label: 'Particles',
    summary: 'post-FX for particle clusters, shimmer, exciter traces and agentic fragments.',
    receivesFrom: 'particle events from the Performance Room.',
    keepsStableBy: 'Formung nachgelagert halten; Partikelmaterial selbst bleibt Forge-/Performance-Sache.',
  },
  {
    id: 'drone',
    label: 'Drone',
    summary: 'body, drive, textural densification and long-arc processing for drone layers.',
    receivesFrom: 'drone and resonance bodies from Room V.',
    keepsStableBy: 'do not duplicate drone generation; consolidate downstream shaping instead.',
  },
  {
    id: 'waves',
    label: 'Wave Starter',
    summary: 'group-specific FX for Wave Starter, event and transient-adjacent signals.',
    receivesFrom: 'Wellenstarter / wave outputs from the Performance Room.',
    keepsStableBy: 'preserve the attack character without inheriting Forge looping or core trigger logic.',
  },
  {
    id: 'forge',
    label: 'Forge Material',
    summary: 'downstream shaping specifically for Material Tracks and segment packages coming from Forge.',
    receivesFrom: 'exported loops, groove, and bass materials from Spectral Forge and Synthetic Forge.',
    keepsStableBy: 'Forge remains the creation workshop; Mycelium applies group-specific coloration afterward.',
  },
];

export function getRoomArchitectureProfile(id: RoomArchitectureId): RoomArchitectureProfile {
  return ROOM_ARCHITECTURE_PROFILES[id];
}

export function getMyzelPostGroup(id: string): MyzelPostGroupProfile {
  return MYZEL_POST_GROUPS.find((item) => item.id === id) ?? MYZEL_POST_GROUPS[0];
}

export function resolvePreferredMyzelGroup(
  role: MaterialRoleKind,
  workspaceOrigin: WorkspaceOriginKind,
): MyzelPostGroupId {
  if (role === 'particleExciter') return 'particles';
  if (role === 'droneTexture') return 'drone';
  if (role === 'waveMaterial') return workspaceOrigin === 'microtonal-logic' ? 'forge' : 'waves';
  return 'forge';
}

export function buildMaterialRoutingPlan(input: MaterialRoutingInput): MaterialRoutingPlan {
  const preferredMyzelGroup = resolvePreferredMyzelGroup(input.role, input.workspaceOrigin);
  const transitionGuard =
    input.workspaceOrigin === 'microtonal-logic' ? 'guarded-handoff' : 'stabilize-contracts';
  const balanceCarrier =
    input.workspaceOrigin === 'microtonal-logic'
      ? 'XenSonar’s playable grid balance remains the foundation, even when groove and bass become editable in Synthetic Forge.'
      : input.workspaceOrigin === 'wave-material'
        ? 'The direct material balance of older wave and spectral paths remains perceptible, although this area now serves only as technical Synthetic Forge infrastructure.'
        : input.workspaceOrigin === 'legacy-forge'
          ? 'The archived Spectral Forge path remains the stability reference until the current paths reliably match its immediacy.'
          : 'The adapter contract keeps specialist knowledge out of the Performance Room, even when internal implementations differ.';
  const routeSummary =
    preferredMyzelGroup === 'waves'
      ? 'Wellenstarter material is routed preferentially to the Wellenstarter post-FX layer after handoff.'
      : preferredMyzelGroup === 'particles'
        ? 'Particle exciters are generated alongside the segments and subsequently colored as a group in Mycelium.'
        : preferredMyzelGroup === 'drone'
          ? 'Drone textures leave Forge as material and are subsequently colored in Mycelium as a sustained sound-body group.'
          : 'Loop, groove, and bass material originate in Synthetic Forge and are then routed to the respective material post-FX layer.';
  const stabilizeBy =
    transitionGuard === 'guarded-handoff'
      ? 'New capabilities attach downstream only; Room V handles performance, Synthetic Forge handles segment construction, and Mycelium handles subsequent shaping.'
      : 'Existing responsiveness remains the reference; the new engine takes over only when the external contract and balance are preserved.';

  return {
    preferredMyzelGroup,
    workspaceOrigin: input.workspaceOrigin,
    transitionGuard,
    balanceCarrier,
    routeSummary,
    stabilizeBy,
  };
}

export function formatMaterialRoutingSummary(plan: MaterialRoutingPlan): string {
  return `${getMyzelPostGroup(plan.preferredMyzelGroup).label}: ${plan.routeSummary} ${plan.stabilizeBy}`;
}

export function describeMaterialRoleHandoff(role: MaterialRoleKind): string | undefined {
  switch (role) {
    case 'loop':
      return 'Loop is passed to the Performance Room as segmented material.';
    case 'waveMaterial':
      return 'Wellenstarter material is generated alongside its segments, but only triggered during performance in Room V.';
    case 'particleExciter':
      return 'Particle exciter is produced in Forge and consumed later.';
    case 'droneTexture':
      return 'Drone texture remains Forge material; global coloration takes place later in Mycelium / post-FX.';
    default:
      return undefined;
  }
}

export function describeEngineOwnership(kind: EngineOwnershipKind, name: string): string | undefined {
  switch (kind) {
    case 'legacy':
      return `${name} remains the stable production workbench, while already using the same external contract as the upcoming engines.`;
    case 'canonical':
      return `${name} progressively takes ownership of wave/material, microtonal logic, groove, and bass as a dedicated segment engine.`;
    case 'external':
      return `${name} can be freely designed internally, provided its adapter shields the Performance Room from specialist knowledge.`;
    default:
      return undefined;
  }
}

export function describeArchitectureResponsibilityShift(): string {
  return 'Responsibilities move outward gradually: XenSonar remains the Performance Room, Forge produces segments, and Mycelium applies global or group-specific shaping.';
}

export const RESIDENT_TIMBRE_OPTIONS: readonly ResidentTimbreOption[] = [
  { value: 'glass_needle', label: 'Glasnadel', collision: { preset: 'fm_bell', ampMul: 0.84, freqMul: 1.02 } },
  { value: 'wire_bow', label: 'Drahtbogen', collision: { preset: 'reed_tap', ampMul: 0.82, freqMul: 0.99 } },
  { value: 'hollow_wood', label: 'Hohlholz', collision: { preset: 'woodblock', ampMul: 0.9, freqMul: 0.96 } },
  { value: 'star_chime', label: 'Sternenglocke', collision: { preset: 'chime', ampMul: 0.8, freqMul: 1.12 } },
  { value: 'resonance_pipe', label: 'Resonance Tube', collision: { preset: 'gong', ampMul: 0.86, freqMul: 0.92 } },
  { value: 'signal_splitter', label: 'Signalsplitter', collision: { preset: 'blip', ampMul: 0.72, freqMul: 1.18 } },
];

const RESIDENT_TIMBRE_BY_VALUE: Record<string, ResidentTimbreOption> = Object.fromEntries(
  RESIDENT_TIMBRE_OPTIONS.map((item) => [item.value, item]),
);

export function isResidentSampleValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('sample:');
}

export function buildResidentSamplePresetId(sampleId: string, elasticPitch = false): string {
  return elasticPitch ? `resident-elastic-sample:${sampleId}` : `resident-sample:${sampleId}`;
}

export function resolveResidentTimbreOption(
  value: unknown,
  options?: { readonly elasticPitch?: boolean } | null,
): ResidentTimbreOption {
  if (isResidentSampleValue(value)) {
    const sampleId = value.slice(7);
    return {
      value,
      label: 'Resident Sample',
      collision: {
        preset: buildResidentSamplePresetId(sampleId, Boolean(options?.elasticPitch)),
        ampMul: 1,
        freqMul: 1,
      },
    };
  }
  return (typeof value === 'string' && RESIDENT_TIMBRE_BY_VALUE[value]) || RESIDENT_TIMBRE_OPTIONS[0];
}
