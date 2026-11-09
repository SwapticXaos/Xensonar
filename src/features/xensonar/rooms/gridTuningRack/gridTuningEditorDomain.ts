import {
  getRasterDefinition,
  getRasterPeriodCents,
  getRasterStepCents,
  JI_NODES,
  type CustomGridTuningId,
  type GridTuning,
  type RasterDivisionKind,
  type RasterFamily,
  type RasterPeriodFamily,
} from "../../domain/instrumentData";

export const WORKBENCH_HEIGHT = 420;
export const PERIOD_TOP = 16;
export const PERIOD_BOTTOM = 16;
export const PERIOD_CANONICAL_CENTS: Record<RasterPeriodFamily, number> = {
  octave: 1200,
  tritave: 1200 * Math.log2(3),
};

export type GridTuningEditorState = {
  periodFamily: RasterPeriodFamily;
  steps: number;
  periodCents: number;
  stepCents: number[];
  name: string;
  nameTouched: boolean;
  editingCustomId: CustomGridTuningId | null;
  jiTrackedCents: Record<string, number>;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundTenth(value: number) {
  return Math.round(value * 10) / 10;
}

export function createEqualStepCents(steps: number, periodCents: number) {
  return Array.from({ length: Math.max(1, steps) }, (_, index) =>
    roundTenth((index / Math.max(1, steps)) * periodCents),
  );
}

export const JI_WORKBENCH_INTERVALS = JI_NODES.filter(
  (node) => node.label !== "Root",
);
export const JI_EXACT_EPSILON = 0.15;
export const JI_TRACKED_MATCH_EPSILON = 0.25;

export function inferJiTrackedCents(stepCents: number[]) {
  const tracked: Record<string, number> = {};
  for (const node of JI_WORKBENCH_INTERVALS) {
    const exact = stepCents.find(
      (entry) => Math.abs(entry - node.cents) <= JI_EXACT_EPSILON,
    );
    if (typeof exact === "number") tracked[node.label] = roundTenth(exact);
  }
  return tracked;
}

export function countTrackedJiIntervals(
  jiTrackedCents: Record<string, number>,
) {
  return Object.keys(jiTrackedCents).length;
}

export function createSuggestedDraftName(
  periodFamily: RasterPeriodFamily,
  periodCents: number,
  stepCents: number[],
  jiTrackedCents: Record<string, number>,
) {
  const base = classifyDraft(periodFamily, periodCents, stepCents).label;
  const jiCount = countTrackedJiIntervals(jiTrackedCents);
  return jiCount > 0 && (base.includes("CDO") || base.includes("CDT"))
    ? `${base} +${jiCount}`
    : base;
}

export function findTrackedJiLabelForMarker(
  stepCents: number[],
  jiTrackedCents: Record<string, number>,
  markerIndex: number,
) {
  const markerCents = stepCents[markerIndex];
  if (markerIndex <= 0 || typeof markerCents !== "number") return null;
  for (const [label, trackedCents] of Object.entries(jiTrackedCents)) {
    if (Math.abs(trackedCents - markerCents) <= JI_TRACKED_MATCH_EPSILON)
      return label;
  }
  return null;
}

export function isCustomGridTuningId(
  value: GridTuning,
): value is CustomGridTuningId {
  return value.startsWith("custom:");
}

export function classifyDraft(
  periodFamily: RasterPeriodFamily,
  periodCents: number,
  stepCents: number[],
): { family: RasterFamily; divisionKind: RasterDivisionKind; label: string } {
  const canonical = PERIOD_CANONICAL_CENTS[periodFamily];
  const equalTarget = createEqualStepCents(stepCents.length, periodCents);
  const equalEnough =
    stepCents.length === equalTarget.length &&
    stepCents.every(
      (entry, index) => Math.abs(entry - equalTarget[index]) <= 0.1,
    );
  const canonicalEnough = Math.abs(periodCents - canonical) <= 0.1;
  if (equalEnough && canonicalEnough) {
    return {
      family: periodFamily === "tritave" ? "edt" : "edo",
      divisionKind: "equal",
      label: `${stepCents.length} ${periodFamily === "tritave" ? "EDT" : "EDO"}`,
    };
  }
  return {
    family: periodFamily === "tritave" ? "cdt" : "cdo",
    divisionKind: "custom",
    label: `${stepCents.length} ${periodFamily === "tritave" ? "CDT" : "CDO"}`,
  };
}

export function createDraftName(
  periodFamily: RasterPeriodFamily,
  periodCents: number,
  stepCents: number[],
  jiTrackedCents: Record<string, number> = {},
) {
  return createSuggestedDraftName(
    periodFamily,
    periodCents,
    stepCents,
    jiTrackedCents,
  );
}

export function seedEditorFromTuning(
  tuning: GridTuning,
): GridTuningEditorState {
  const definition = getRasterDefinition(tuning);
  const periodFamily =
    definition?.periodFamily === "tritave" ? "tritave" : "octave";
  const steps = Math.max(
    1,
    definition?.steps ?? getRasterStepCents(tuning).length ?? 12,
  );
  const periodCents = roundTenth(getRasterPeriodCents(tuning));
  const sourceSteps = getRasterStepCents(tuning).slice(0, steps);
  const normalizedSteps =
    sourceSteps.length > 0
      ? sourceSteps.map(roundTenth)
      : createEqualStepCents(steps, periodCents);
  const jiTrackedCents = inferJiTrackedCents(normalizedSteps);
  return {
    periodFamily,
    steps,
    periodCents,
    stepCents: normalizedSteps,
    name:
      definition?.label ??
      createDraftName(
        periodFamily,
        periodCents,
        normalizedSteps,
        jiTrackedCents,
      ),
    nameTouched: false,
    editingCustomId: isCustomGridTuningId(tuning) ? tuning : null,
    jiTrackedCents,
  };
}

export function formatStepLabel(cents: number) {
  return `${roundTenth(cents).toFixed(1)}c`;
}

export function createCustomGridId() {
  return `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` as CustomGridTuningId;
}
