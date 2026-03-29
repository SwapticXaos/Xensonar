export type MachineRoomId =
  | "xensonarPerformance"
  | "forgeLegacy"
  | "forgeCanonical"
  | "myzelMastering"
  | "externalSlot";

export type Forge2WorkspaceId = "wave-material" | "microtonal-logic";
export type MyzelPostFxGroupId = "master" | "particles" | "drone" | "waves" | "forge";
export type SupportedMaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';
export type TransitionGuardId = 'stabilize-contracts' | 'guarded-handoff';

export interface MachineRoomHandoffProfile {
  preferredMyzelGroup: MyzelPostFxGroupId;
  workspaceOrigin?: Forge2WorkspaceId | 'legacy-forge' | 'external';
  transitionGuard: TransitionGuardId;
  balanceCarrier: string;
  routeSummary: string;
  stabilizeBy: string;
}

export interface MachineRoomDefinition {
  id: MachineRoomId;
  stageLabel: string;
  title: string;
  shortLabel: string;
  summary: string;
  exportsTo: string;
  owns: string[];
  avoids: string[];
}

export interface Forge2WorkspaceDefinition {
  id: Forge2WorkspaceId;
  label: string;
  summary: string;
  inheritsBalanceFrom: string;
  preparesFor: string;
}

export interface MyzelPostFxGroupDefinition {
  id: MyzelPostFxGroupId;
  label: string;
  summary: string;
  receivesFrom: string;
  keepsStableBy: string;
}

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
    stageLabel: 'III.2a Forge 1 · Legacy',
    title: 'Stabile Produktionswerkbank',
    shortLabel: 'Legacy Werkbank',
    summary: 'Forge 1 bleibt die robuste Schmiede mit direkter Mal- und Transformlogik, während neue Kompetenzen langsam nach Forge 2 wandern.',
    exportsTo: 'Xensonar-Materialpaket v1',
    owns: ['Legacy-Stempel', 'direkter Spektralfluss', 'eingespielte Exportpfade'],
    avoids: ['neue Gesamtzuständigkeit für Groove/Bass', 'globale Post-FX-Rolle'],
  },
  forgeCanonical: {
    id: 'forgeCanonical',
    stageLabel: 'III.2b Forge 2 · Canonical',
    title: 'Segment-Maschinenraum',
    shortLabel: 'Wave / Logic',
    summary: 'Forge 2 übernimmt schrittweise die Zuständigkeit für Wave/Material sowie Microtonal Logic, Groove und Bass.',
    exportsTo: 'Xensonar-Materialpaket v1 + Segmentdeutung',
    owns: ['Rohquelle + Loop-Auswahl', 'soundorientierte Bearbeitung', 'microtonale Pitch-Time-Logik', 'Groove/Bass-Vorarbeit'],
    avoids: ['globale Mastering-Entscheidungen', 'versteckte Speziallogik im Monolithen'],
  },
  myzelMastering: {
    id: 'myzelMastering',
    stageLabel: 'III.1 Myzel · Mastering Engine Room',
    title: 'Nachgelagerter FX- und Masteringraum',
    shortLabel: 'Post / FX / Mastering',
    summary: 'Myzel wird schrittweise der Raum für globale oder gruppenbezogene Formung nach Forge und vor Limiter/Finalisierung.',
    exportsTo: 'Bus-Färbung, Gruppen-FX, globale Glue-/Air-/Body-Entscheidungen',
    owns: ['Live-Mastering', 'globale FX-Parallelstufen', 'gruppenbezogene Sends'],
    avoids: ['primäre Loop-Erzeugung', 'Drum/Bass-Segmentbau'],
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

export const FORGE2_WORKSPACES: readonly Forge2WorkspaceDefinition[] = [
  {
    id: 'wave-material',
    label: 'Wave / Material',
    summary: 'Quelle, Auswahl, Analyse, Verformen, Stamp, Bild- und Audioübersetzung.',
    inheritsBalanceFrom: 'Legacy Forge nimmt die direkte Materialbalance mit; Forge 2 löst sie schrittweise aus dem Monolithen.',
    preparesFor: 'segmentiertes Material, das später in Room V nur noch aufgeführt und nicht mehr tief erzeugt wird.',
  },
  {
    id: 'microtonal-logic',
    label: 'Microtonal Logic',
    summary: 'Xensonar-Raster in Zeitrichtung: Groove, Bass, mehrere Instrumente und mikrotonale Komposition.',
    inheritsBalanceFrom: 'Die spielbare Rasterlogik von Xensonar bleibt erhalten, wird hier aber als editierbare Zeitfläche ausgedehnt.',
    preparesFor: 'Groove/Bass- und Begleitstrukturen, die der Aufführungsraum konsumiert statt intern neu zu erfinden.',
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
    receivesFrom: 'exportierten Loops, Groove- und Bass-Materialien aus Forge 1/2.',
    keepsStableBy: 'Forge bleibt Ursprungswerkstatt; Myzel färbt das Material erst danach gruppenbezogen ein.',
  },
] as const;

export function getMachineRoomDefinition(id: MachineRoomId) {
  return MACHINE_ROOMS[id];
}

export function getForge2WorkspaceDefinition(id: Forge2WorkspaceId) {
  return FORGE2_WORKSPACES.find((entry) => entry.id === id) ?? FORGE2_WORKSPACES[0];
}

export function getMyzelPostFxGroupDefinition(id: MyzelPostFxGroupId) {
  return MYZEL_POST_FX_GROUPS.find((entry) => entry.id === id) ?? MYZEL_POST_FX_GROUPS[0];
}


export function derivePreferredMyzelGroup(role: SupportedMaterialRole, workspaceOrigin?: Forge2WorkspaceId | 'legacy-forge' | 'external'): MyzelPostFxGroupId {
  if (role === 'particleExciter') return 'particles';
  if (role === 'droneTexture') return 'drone';
  if (role === 'waveMaterial') return workspaceOrigin === 'microtonal-logic' ? 'forge' : 'waves';
  if (workspaceOrigin === 'microtonal-logic') return 'forge';
  return 'forge';
}

export function buildMachineRoomHandoffProfile(args: {
  role: SupportedMaterialRole;
  workspaceOrigin?: Forge2WorkspaceId | 'legacy-forge' | 'external';
}): MachineRoomHandoffProfile {
  const preferredMyzelGroup = derivePreferredMyzelGroup(args.role, args.workspaceOrigin);
  const transitionGuard: TransitionGuardId = args.workspaceOrigin === 'microtonal-logic' ? 'guarded-handoff' : 'stabilize-contracts';
  const balanceCarrier = args.workspaceOrigin === 'microtonal-logic'
    ? 'Die spielbare Rasterbalance aus Xensonar bleibt Träger, auch wenn Groove/Bass jetzt in Forge 2 editierbar werden.'
    : args.workspaceOrigin === 'wave-material'
      ? 'Die direkte Materialbalance aus Forge 1 und Room V bleibt spürbar, obwohl Wave/Material jetzt explizit in Forge 2 wohnt.'
      : args.workspaceOrigin === 'legacy-forge'
        ? 'Legacy Forge bleibt Stabilitätsanker, bis die neuen Maschinenräume dieselbe Direktheit zuverlässig tragen.'
        : 'Der Adaptervertrag hält den Aufführungsraum frei von Spezialwissen, auch wenn das Innenleben anders gebaut ist.';
  const routeSummary = preferredMyzelGroup === 'waves'
    ? 'Wellenstarter-nahes Material geht nach dem Handoff bevorzugt in die Wellenstarter-Post-FX-Schicht.'
    : preferredMyzelGroup === 'particles'
      ? 'Partikel-Exciter bleiben segmentnah erzeugt, werden aber danach bevorzugt als Partikelgruppe in Myzel eingefärbt.'
      : preferredMyzelGroup === 'drone'
        ? 'Drone-Texturen verlassen Forge als Material und werden erst danach in Myzel als Langbogen-/Körpergruppe gefärbt.'
        : 'Loop-, Groove- und Bass-Material bleibt Forge-Ursprung und landet danach bevorzugt in der Forge-Material-Post-FX-Schicht.';
  const stabilizeBy = transitionGuard === 'guarded-handoff'
    ? 'Neue Kompetenzen werden nur nachgelagert angedockt; Room V behält Aufführung, Forge behält Segmentbau, Myzel formt erst danach.'
    : 'Bestehende Direktheit bleibt Referenz; der neue Maschinenraum übernimmt nur, wenn die Außensprache und Balance erhalten bleiben.';
  return { preferredMyzelGroup, workspaceOrigin: args.workspaceOrigin, transitionGuard, balanceCarrier, routeSummary, stabilizeBy };
}

export function summarizeHandoffProfile(profile: MachineRoomHandoffProfile) {
  return `${getMyzelPostFxGroupDefinition(profile.preferredMyzelGroup).label}: ${profile.routeSummary} ${profile.stabilizeBy}`;
}

export function summarizeForge2WorkspaceShift(id: Forge2WorkspaceId) {
  const workspace = getForge2WorkspaceDefinition(id);
  return `${workspace.label}: ${workspace.inheritsBalanceFrom} Sie bereitet ${workspace.preparesFor} vor.`;
}

export function describeScopedMyzelRoute(id: MyzelPostFxGroupId) {
  const group = getMyzelPostFxGroupDefinition(id);
  return `${group.label}: ${group.summary} Empfängt Signal aus ${group.receivesFrom} und bleibt stabil, indem ${group.keepsStableBy}`;
}

export function getForgeModeHint(mode: 'legacy' | 'canonical' | 'external') {
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
