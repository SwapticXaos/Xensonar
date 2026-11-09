import { PLATFORMER_ROUTE_GROUP_IDS, type RouteSelection } from "./platformerState";

export type PlatformerRouteChoice = "low" | "high" | "unset";
export type PlatformerRouteMode = "balanced" | "floor" | "ceiling" | "climb" | "drop";

export type PlatformerRouteProfile = {
  first: PlatformerRouteChoice;
  second: PlatformerRouteChoice;
  lowCount: number;
  highCount: number;
  branchBias: number;
  splitMotion: number;
  signature: string;
  mode: PlatformerRouteMode;
};

export const routeChoiceFromValue = (value: number): PlatformerRouteChoice => {
  if (value < 0) return "low";
  if (value > 0) return "high";
  return "unset";
};

export const routeChoiceToValue = (choice: PlatformerRouteChoice): RouteSelection => {
  if (choice === "low") return -1;
  if (choice === "high") return 1;
  return 0;
};

// Legacy saved fork events may omit detail; treat those as "high" to preserve
// the previously implicit branch reconstruction behavior.
export const resolveForkRouteSelection = (detail?: number): RouteSelection => {
  if (typeof detail !== "number" || !Number.isFinite(detail)) return 1;
  if (detail < 0) return -1;
  if (detail > 0) return 1;
  return 0;
};

const routeChoiceCode = (choice: PlatformerRouteChoice) => {
  if (choice === "low") return "L";
  if (choice === "high") return "H";
  return "-";
};

const buildRouteProfile = (choices: PlatformerRouteChoice[]): PlatformerRouteProfile => {
  const first = choices[0] ?? "unset";
  const second = choices[1] ?? "unset";
  const lowCount = choices.filter((choice) => choice === "low").length;
  const highCount = choices.filter((choice) => choice === "high").length;
  const branchBias = Math.max(-1, Math.min(1, highCount - lowCount));
  const splitMotion = routeChoiceToValue(second) - routeChoiceToValue(first);

  let mode: PlatformerRouteMode = "balanced";
  if (first === "high" && second === "high") {
    mode = "ceiling";
  } else if (first === "low" && second === "low") {
    mode = "floor";
  } else if (first === "low" && second === "high") {
    mode = "climb";
  } else if (first === "high" && second === "low") {
    mode = "drop";
  } else if (highCount > lowCount) {
    mode = "ceiling";
  } else if (lowCount > highCount) {
    mode = "floor";
  }

  return {
    first,
    second,
    lowCount,
    highCount,
    branchBias,
    splitMotion,
    signature: `${routeChoiceCode(first)}${routeChoiceCode(second)}`,
    mode,
  };
};

export const buildPlatformerRouteProfileFromSelections = (
  selections: Record<string, RouteSelection>,
  order: readonly string[] = PLATFORMER_ROUTE_GROUP_IDS,
): PlatformerRouteProfile => buildRouteProfile(order.map((groupId) => routeChoiceFromValue(selections[groupId] ?? 0)));

export const buildEmptyPlatformerRouteSelections = (
  order: readonly string[] = PLATFORMER_ROUTE_GROUP_IDS,
): Record<string, RouteSelection> => Object.fromEntries(
  order.map((groupId) => [groupId, 0 as RouteSelection]),
) as Record<string, RouteSelection>;

export const buildPlatformerRouteSelectionsFromEvents = <T extends { kind: string; detail?: number }>(
  events: T[],
  order: readonly string[] = PLATFORMER_ROUTE_GROUP_IDS,
): Record<string, RouteSelection> => {
  const selections = buildEmptyPlatformerRouteSelections(order);
  const forkEvents = events.filter((event) => event.kind === "chord_fork");
  order.forEach((groupId, index) => {
    const event = forkEvents[index];
    if (!event) return;
    selections[groupId] = resolveForkRouteSelection(event.detail);
  });
  return selections;
};

export const buildPlatformerRouteProfileFromEvents = <T extends { kind: string; detail?: number }>(
  events: T[],
): PlatformerRouteProfile => {
  return buildPlatformerRouteProfileFromSelections(buildPlatformerRouteSelectionsFromEvents(events));
};

export const formatPlatformerRouteChoice = (choice: PlatformerRouteChoice): string => {
  if (choice === "low") return "LOW";
  if (choice === "high") return "HIGH";
  return "--";
};

export const formatPlatformerRouteMode = (mode: PlatformerRouteMode): string => {
  if (mode === "floor") return "FLOOR";
  if (mode === "ceiling") return "CEILING";
  if (mode === "climb") return "CLIMB";
  if (mode === "drop") return "DROP";
  return "BALANCED";
};
