import type {
  MachineRoomId,
  SyntheticForgeWorkspaceId,
  MyzelPostFxGroupId,
  SupportedMaterialRole,
  TransitionGuardId,
  MachineRoomHandoffProfile,
  MachineRoomDefinition,
  SyntheticForgeWorkspaceDefinition,
  MyzelPostFxGroupDefinition,
} from './machineRoomTypes';

export type * from './machineRoomTypes';

export const MACHINE_ROOMS: Record<MachineRoomId, MachineRoomDefinition> = {
  xensonarPerformance: {
    id: 'xensonarPerformance',
    stageLabel: 'V Xensonar · Aufführungsraum',
    title: 'Performance- und Routingkern',
    shortLabel: 'Aufführung',
    summary: 'Direkte musikalische Interaktion, Materialspur-Wiedergabe und Performance-Logik bleiben hier zuhause.',
    exportsTo: 'Audio-Busse, Routing, sichtbare Spielzustände',
    owns: ['Partikel', 'Wellenstarter', 'Materialspur-Wiedergabe', 'direkte Echtzeit-Interaktion'],
    avoids: ['tiefe Segmentbearbeitung', 'globale Mastering-Entscheidungen'],
  },
  forgeLegacy: {
    id: 'forgeLegacy',
    stageLabel: 'III.2a SpectralForge · Legacy-Archiv',
    title: 'Archivierte SpectralForge-Werkbank',
    shortLabel: 'SpectralForge Archiv',
    summary: 'Der archivierte SpectralForge-Vorläufer bleibt als Stabilitätsreferenz für direkte Mal- und Transformlogik erhalten; die sichtbare Produktoberfläche heißt SpectralForge.',
    exportsTo: 'Xensonar-Materialpaket v1',
    owns: ['Legacy-Stempel', 'direkter Spektralfluss', 'eingespielte Exportpfade'],
    avoids: ['neue Gesamtzuständigkeit für Groove/Bass', 'globale Post-FX-Rolle'],
  },
  forgeCanonical: {
    id: 'forgeCanonical',
    stageLabel: 'III.2b SyntheticForge',
    title: 'SyntheticForge · Drum Machine / Melodic Loop',
    shortLabel: 'SyntheticForge',
    summary: 'SyntheticForge bündelt Drum Machine, Melodic Loop und die zugehörige Synth-/Loop-Arbeit. Historische Wave-/Material-Teile bleiben nur als technische Referenz erhalten.',
    exportsTo: 'Xensonar-Materialpaket v1 + Segmentdeutung',
    owns: ['Rohquelle + Loop-Auswahl', 'soundorientierte Bearbeitung', 'microtonale Pitch-Time-Logik', 'Groove/Bass-Vorarbeit'],
    avoids: ['globale Mastering-Entscheidungen', 'versteckte Speziallogik im Monolithen'],
  },
  myzelMastering: {
    id: 'myzelMastering',
    stageLabel: 'III. Nodal Installation · Mastering Engine Room',
    title: 'Nachgelagerter FX- und Masteringraum',
    shortLabel: 'Post / FX / Mastering',
    summary: 'Myzel wird schrittweise der Raum für globale oder gruppenbezogene Formung nach Forge und vor Limiter/Finalisierung.',
    exportsTo: 'Bus-Färbung, Gruppen-FX, globale Glue-/Air-/Body-Entscheidungen',
    owns: ['Live-Mastering', 'globale FX-Parallelstufen', 'gruppenbezogene Sends'],
    avoids: ['primäre Loop-Erzeugung', 'Drum/Bass-Segmentbau'],
  },

  forgeWorkshop: {
    id: 'forgeWorkshop',
    stageLabel: 'III.2c Experimentelle Werkstatt',
    title: 'Experimenteller Körperraum',
    shortLabel: 'Werkstatt',
    summary: 'Getrennter Versuchssaal für neue Vermittlungslogik, ohne dass jede Erkundung sofort in einen sichtbaren Produktbereich übernommen werden muss.',
    exportsTo: 'vorerst nur Notizen, Hypothesen und isolierte Prototypen',
    owns: ['Leitplanken', 'Experiment-Notizen', 'isolierte Körper-Hypothesen'],
    avoids: ['stillschweigende Room-V-Lieferpflicht', 'Regression der produktiven Forge-Pfade'],
  },
  externalSlot: {
    id: 'externalSlot',
    stageLabel: 'III.2c Fremdgerät-Slot',
    title: 'Neutraler Dockingpunkt',
    shortLabel: 'Adapter Dock',
    summary: 'Fremdgeräte dürfen innen anders gebaut sein, solange außen dieselbe Materialsprache gesprochen wird.',
    exportsTo: 'Xensonar-Materialpaket v1',
    owns: ['neutrale Adapterprüfung', 'Fremdgeräte-Erprobung'],
    avoids: ['Spezialwissen im Room-V-Kern'],
  },
};

export const SYNTHETIC_FORGE_WORKSPACES: readonly SyntheticForgeWorkspaceDefinition[] = [
  {
    id: 'wave-material',
    label: 'Archivierter Wave-/Material-Bereich',
    summary: 'Historischer SyntheticForge-Unterbau für Rohquelle, Auswahl und Wave-/Material-Arbeit; in der aktuellen UI nicht als eigener Produktbereich sichtbar.',
    inheritsBalanceFrom: 'Die direkte Materialbalance der älteren Spektral-/Wave-Werkzeuge bleibt als technische Referenz erhalten.',
    preparesFor: 'Kompatibilität mit älteren Materialpfaden, ohne einen zusätzlichen Nutzerbereich einzuführen.',
  },
  {
    id: 'microtonal-logic',
    label: 'Drum Machine / Melodic Loop',
    summary: 'Der sichtbare SyntheticForge-Arbeitsbereich für Drum Machine, Melodic Loop, Groove, Bass und mikrotonale Komposition.',
    inheritsBalanceFrom: 'Die spielbare Rasterlogik von Xensonar bleibt erhalten und wird in SyntheticForge als editierbare Zeitfläche ausgedehnt.',
    preparesFor: 'Drum-, Melodic-Loop-, Groove- und Bassmaterial, das der Aufführungsraum konsumiert statt intern neu zu erfinden.',
  },
] as const;

export const MYZEL_POST_FX_GROUPS: readonly MyzelPostFxGroupDefinition[] = [
  {
    id: 'master',
    label: 'Master',
    summary: 'globale Glue-, Air-, Body- und Limiter-nahe Entscheidungen auf dem Gesamtbild.',
    receivesFrom: 'dem gesamten Xensonar-Mix nach Forge- und Performance-Arbeit.',
    keepsStableBy: 'nur das finale Verhältnis glätten, nicht Segmentarbeit zurück in den Monolithen ziehen.',
  },
  {
    id: 'particles',
    label: 'Partikel',
    summary: 'post-FX für Partikel-Cluster, Schimmer, Exciter-Spuren und agentische Splitter.',
    receivesFrom: 'Partikelereignissen aus dem Aufführungsraum.',
    keepsStableBy: 'Formung nachgelagert halten; Partikelmaterial selbst bleibt Forge-/Performance-Sache.',
  },
  {
    id: 'drone',
    label: 'Drone',
    summary: 'Körper, Drive, texturale Verdichtung und Langbogenbearbeitung für Drone-Schichten.',
    receivesFrom: 'Drone- und Resonanzkörpern aus Room V.',
    keepsStableBy: 'nicht die eigentliche Drone-Erzeugung duplizieren, sondern deren Nachformung bündeln.',
  },
  {
    id: 'waves',
    label: 'Wellenstarter',
    summary: 'gruppenbezogene FX für Wellenstarter-, Event- und transientnahe Signale.',
    receivesFrom: 'Wellenstarter-/Wave-Outputs aus dem Aufführungsraum.',
    keepsStableBy: 'den Attack-Charakter mitnehmen, ohne Forge-Looping oder Kern-Triggerlogik zu übernehmen.',
  },
  {
    id: 'forge',
    label: 'Forge Material',
    summary: 'nachgelagerte Formung speziell für aus Forge kommende Materialspuren und Segmentpakete.',
    receivesFrom: 'exportierten Loops, Groove- und Bass-Materialien aus SpectralForge und SyntheticForge.',
    keepsStableBy: 'Forge bleibt Ursprungswerkstatt; Myzel färbt das Material erst danach gruppenbezogen ein.',
  },
] as const;

export function getMachineRoomDefinition(id: MachineRoomId) {
  return MACHINE_ROOMS[id];
}

export function getSyntheticForgeWorkspaceDefinition(id: SyntheticForgeWorkspaceId) {
  return SYNTHETIC_FORGE_WORKSPACES.find((entry) => entry.id === id) ?? SYNTHETIC_FORGE_WORKSPACES[0];
}

/** @deprecated Legacy implementation alias. Use getSyntheticForgeWorkspaceDefinition. */
export const getForge2WorkspaceDefinition = getSyntheticForgeWorkspaceDefinition;

/** @deprecated Legacy implementation alias. Use SYNTHETIC_FORGE_WORKSPACES. */
export const FORGE2_WORKSPACES = SYNTHETIC_FORGE_WORKSPACES;

export function getMyzelPostFxGroupDefinition(id: MyzelPostFxGroupId) {
  return MYZEL_POST_FX_GROUPS.find((entry) => entry.id === id) ?? MYZEL_POST_FX_GROUPS[0];
}


export function derivePreferredMyzelGroup(role: SupportedMaterialRole, workspaceOrigin?: SyntheticForgeWorkspaceId | 'legacy-forge' | 'external' | 'forge-workshop'): MyzelPostFxGroupId {
  if (role === 'particleExciter') return 'particles';
  if (role === 'droneTexture') return 'drone';
  if (role === 'waveMaterial') return workspaceOrigin === 'microtonal-logic' ? 'forge' : 'waves';
  if (workspaceOrigin === 'microtonal-logic') return 'forge';
  return 'forge';
}

export function buildMachineRoomHandoffProfile(args: {
  role: SupportedMaterialRole;
  workspaceOrigin?: SyntheticForgeWorkspaceId | 'legacy-forge' | 'external' | 'forge-workshop';
}): MachineRoomHandoffProfile {
  const preferredMyzelGroup = derivePreferredMyzelGroup(args.role, args.workspaceOrigin);
  const transitionGuard: TransitionGuardId = args.workspaceOrigin === 'microtonal-logic' ? 'guarded-handoff' : 'stabilize-contracts';
  const balanceCarrier = args.workspaceOrigin === 'microtonal-logic'
    ? 'Die spielbare Rasterbalance aus Xensonar bleibt Träger, auch wenn Groove/Bass jetzt in SyntheticForge editierbar werden.'
    : args.workspaceOrigin === 'wave-material'
      ? 'Die direkte Materialbalance der älteren Wave-/Spektralpfade bleibt spürbar, obwohl dieser Bereich heute nur noch technischer SyntheticForge-Unterbau ist.'
      : args.workspaceOrigin === 'legacy-forge'
        ? 'Der archivierte SpectralForge-Pfad bleibt Stabilitätsanker, bis die aktuellen Produktpfade dieselbe Direktheit zuverlässig tragen.'
        : 'Der Adaptervertrag hält den Aufführungsraum frei von Spezialwissen, auch wenn das Innenleben anders gebaut ist.';
  const routeSummary = preferredMyzelGroup === 'waves'
    ? 'Wellenstarter-nahes Material geht nach dem Handoff bevorzugt in die Wellenstarter-Post-FX-Schicht.'
    : preferredMyzelGroup === 'particles'
      ? 'Partikel-Exciter bleiben segmentnah erzeugt, werden aber danach bevorzugt als Partikelgruppe in Myzel eingefärbt.'
      : preferredMyzelGroup === 'drone'
        ? 'Drone-Texturen verlassen Forge als Material und werden erst danach in Myzel als Langbogen-/Körpergruppe gefärbt.'
        : 'Loop-, Groove- und Bass-Material bleibt SyntheticForge-Ursprung und landet danach bevorzugt in der entsprechenden Material-Post-FX-Schicht.';
  const stabilizeBy = transitionGuard === 'guarded-handoff'
    ? 'Neue Kompetenzen werden nur nachgelagert angedockt; Room V behält Aufführung, SyntheticForge behält Segmentbau, Myzel formt erst danach.'
    : 'Bestehende Direktheit bleibt Referenz; der neue Maschinenraum übernimmt nur, wenn die Außensprache und Balance erhalten bleiben.';
  return { preferredMyzelGroup, workspaceOrigin: args.workspaceOrigin, transitionGuard, balanceCarrier, routeSummary, stabilizeBy };
}

export function summarizeHandoffProfile(profile: MachineRoomHandoffProfile) {
  return `${getMyzelPostFxGroupDefinition(profile.preferredMyzelGroup).label}: ${profile.routeSummary} ${profile.stabilizeBy}`;
}

export function summarizeSyntheticForgeWorkspaceShift(id: SyntheticForgeWorkspaceId) {
  const workspace = getSyntheticForgeWorkspaceDefinition(id);
  return `${workspace.label}: ${workspace.inheritsBalanceFrom} Sie bereitet ${workspace.preparesFor} vor.`;
}

/** @deprecated Legacy implementation alias. Use summarizeSyntheticForgeWorkspaceShift. */
export const summarizeForge2WorkspaceShift = summarizeSyntheticForgeWorkspaceShift;

export function describeScopedMyzelRoute(id: MyzelPostFxGroupId) {
  const group = getMyzelPostFxGroupDefinition(id);
  return `${group.label}: ${group.summary} Empfängt Signal aus ${group.receivesFrom} und bleibt stabil, indem ${group.keepsStableBy}`;
}

export function getForgeModeHint(mode: 'legacy' | 'canonical' | 'experimental' | 'external') {
  switch (mode) {
    case 'legacy':
      return MACHINE_ROOMS.forgeLegacy.summary;
    case 'canonical':
      return MACHINE_ROOMS.forgeCanonical.summary;
    case 'external':
      return MACHINE_ROOMS.externalSlot.summary;
  }
}

export function describeMaterialRoleHandoff(role: SupportedMaterialRole) {
  switch (role) {
    case 'loop':
      return 'Loop wird als segmentiertes Material an den Aufführungsraum weitergereicht.';
    case 'waveMaterial':
      return 'Wellenstarter-Material bleibt segmentnah erzeugt, wird aber erst in Room V performativ ausgelöst.';
    case 'particleExciter':
      return 'Partikel-Exciter entsteht in der Schmiede und wird später nur noch konsumiert.';
    case 'droneTexture':
      return 'Drone-Textur bleibt Material aus der Schmiede; globale Färbung gehört danach in Myzel/Post-FX.';
  }
}

export function buildProducerRoadmapNotes(family: 'legacy' | 'canonical' | 'external', producerName: string) {
  switch (family) {
    case 'legacy':
      return `${producerName} bleibt die stabile Produktionswerkbank, spricht aber bereits dieselbe Außensprache wie die kommenden Maschinenräume.`;
    case 'canonical':
      return `${producerName} übernimmt schrittweise Wave/Material sowie Microtonal Logic, Groove und Bass als expliziten Segment-Maschinenraum.`;
    case 'external':
      return `${producerName} darf innen frei gebaut sein, solange der Adaptervertrag den Aufführungsraum von Spezialwissen entlastet.`;
  }
}

export function getTransitionGuidingSentence() {
  return 'Zuständigkeiten werden gleitend nach außen verlagert: Xensonar bleibt Aufführungsraum, Forge übernimmt Segmentarbeit, Myzel formt danach global oder gruppenbezogen.';
}
