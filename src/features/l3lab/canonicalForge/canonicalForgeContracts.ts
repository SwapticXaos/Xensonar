import type { CanonicalSourceView } from './analysis';
import type {
  CanonicalForgeWorkspace,
  CanonicalLogicView,
  CanonicalSourcePreviewMode,
  CanonicalTool,
} from './sessionTypes';

export type CanonicalSourceViewOption = {
  id: CanonicalSourceView;
  label: string;
  hint: string;
};

export type CanonicalToolOption = {
  id: CanonicalTool;
  icon: string;
  label: string;
  hint: string;
};

export const DEFAULT_CANONICAL_ROOM_STATUS = 'SyntheticForge: Drum Machine und Melodic Loop als sichtbare Vorderseite; ältere Wave-Editor-Pfade bleiben archiviert.';
export const DEFAULT_CANONICAL_TOOL: CanonicalTool = 'sourceTrace';
export const DEFAULT_CANONICAL_SOURCE_PREVIEW_MODE: CanonicalSourcePreviewMode = 'sourceWindow';
export const DEFAULT_CANONICAL_WORKSPACE: CanonicalForgeWorkspace = 'microtonal-logic';
export const DEFAULT_CANONICAL_LOGIC_VIEW: CanonicalLogicView = 'drums';

export const CANONICAL_SOURCE_VIEW_OPTIONS: CanonicalSourceViewOption[] = [
  { id: 'synesthetic', label: 'Synästhetisch', hint: 'Breite Mischansicht aus Spektrum, Kontur, Harmonik, Pulse, Breite' },
  { id: 'energy', label: 'Energie', hint: 'Volles Spektrum als Grundmasse' },
  { id: 'harmonic', label: 'Harmonik', hint: 'Stabilere tonale Linien und Partialzüge' },
  { id: 'transient', label: 'Transient', hint: 'Anschläge, Rillen, Kanten, Impulse' },
  { id: 'lowBand', label: 'Low Band', hint: 'Tiefe Tragmasse und Körperzonen' },
  { id: 'air', label: 'Air', hint: 'Obere Luft, Schimmer, Ausfransungen' },
  { id: 'stereo', label: 'Stereo', hint: 'Breitenenergie und Seitenanteile der Quelle' },
  { id: 'pulse', label: 'Pulse', hint: 'Wellenkörper, Puls und Impulsdichte' },
  { id: 'noise', label: 'Rauschen', hint: 'Körnige, zerfasende, residuale Anteile' },
  { id: 'contour', label: 'Kontur', hint: 'Zeichenhafte Kanten und Formlinien' },
];

export const CANONICAL_TOOL_OPTIONS: CanonicalToolOption[] = [
  { id: 'brush', icon: '🖌️', label: 'Brush', hint: 'Direktes Malen in die kanonische Fläche' },
  { id: 'smudge', icon: '🫟', label: 'Wischfinger', hint: 'Material in Zugrichtung verwischen' },
  { id: 'morph', icon: '🌀', label: 'Verformen', hint: 'Push, Bloat, Pinch und Twirl mit den bewährten Spektralwerkzeugen' },
  { id: 'sourceTrace', icon: '🧬', label: 'Source Trace', hint: 'Aus gewählter Analyseansicht direkt hineinziehen' },
  { id: 'harmonicLift', icon: '🎼', label: 'Harmonic Lift', hint: 'Harmonische Linien lokal nach vorne holen' },
  { id: 'transientLift', icon: '⚡', label: 'Transient Lift', hint: 'Impulsreiche Zonen nachzeichnen' },
  { id: 'noiseGate', icon: '🚪', label: 'Noise Gate', hint: 'Leise Reste lokal kappen oder freilegen' },
  { id: 'dodgeBurn', icon: '☀️', label: 'Dodge/Burn', hint: 'Nachbelichten oder lokal abdunkeln wie im Bildlabor' },
  { id: 'blurSharpen', icon: '🪞', label: 'Blur/Sharpen', hint: 'Weichzeichnen oder Details lokal zuspitzen' },
  { id: 'delaySmear', icon: '⟿', label: 'Delay Smear', hint: 'Echoartige Wiederholungen in Zeitrichtung ziehen' },
  { id: 'threshold', icon: '⛶', label: 'Threshold', hint: 'Unteres Material ausdünnen oder leise Zonen anheben' },
  { id: 'stamp', icon: '📋', label: 'Stamp', hint: 'Stempel mit Scale/Rotation/Flip aus der Spektralwerkbank weiterverwenden' },
];

const SOURCE_VIEW_OPTION_IDS = new Set<CanonicalSourceView>(CANONICAL_SOURCE_VIEW_OPTIONS.map((entry) => entry.id));
const TOOL_OPTION_IDS = new Set<CanonicalTool>(CANONICAL_TOOL_OPTIONS.map((entry) => entry.id));
const CANONICAL_WORKSPACES: readonly CanonicalForgeWorkspace[] = ['wave-material', 'microtonal-logic'];
const CANONICAL_LOGIC_VIEWS: readonly CanonicalLogicView[] = ['drums', 'melodic'];
const CANONICAL_SOURCE_PREVIEW_MODES: readonly CanonicalSourcePreviewMode[] = ['forge', 'sourceWindow', 'sourceFull'];

export function isCanonicalSourceView(value: unknown): value is CanonicalSourceView {
  return typeof value === 'string' && SOURCE_VIEW_OPTION_IDS.has(value as CanonicalSourceView);
}

export function isCanonicalTool(value: unknown): value is CanonicalTool {
  return typeof value === 'string' && TOOL_OPTION_IDS.has(value as CanonicalTool);
}

export function isCanonicalForgeWorkspace(value: unknown): value is CanonicalForgeWorkspace {
  return typeof value === 'string' && (CANONICAL_WORKSPACES as readonly string[]).includes(value);
}

export function isCanonicalLogicView(value: unknown): value is CanonicalLogicView {
  return typeof value === 'string' && (CANONICAL_LOGIC_VIEWS as readonly string[]).includes(value);
}

export function isCanonicalSourcePreviewMode(value: unknown): value is CanonicalSourcePreviewMode {
  return typeof value === 'string' && (CANONICAL_SOURCE_PREVIEW_MODES as readonly string[]).includes(value);
}
