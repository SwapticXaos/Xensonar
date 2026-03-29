export type DeliveryGuardrailSection = {
  title: string;
  items: string[];
};

export const DELIVERY_GUARDRAILS: DeliveryGuardrailSection[] = [
  {
    title: "Hard stop criteria",
    items: [
      "Stop the current pass as soon as the requested slice is implemented, the project builds successfully, and there is no blocking type error.",
      "Stop immediately if completing the request would require merging more than one unfinished major subsystem in the same pass.",
      "Stop and report the blocker if the build still fails after two focused repair attempts on the same issue.",
      "Never continue generating after a successful build just to add speculative extras that were not required for the current slice.",
    ],
  },
  {
    title: "Scope limits per pass",
    items: [
      "Restore only one primary live subsystem per pass whenever possible: for example Resonance, Topology, Arena, live stem recording, or neurofeedback adapters.",
      "If a feature needs new foundations first, stop after extracting those shared foundations and hand off the next implementation phase explicitly.",
      "Do not reintroduce a monolithic mega-file merge when the same work can be split into modules.",
    ],
  },
  {
    title: "Verification rules",
    items: [
      "Every pass must end with a build check.",
      "If runtime behavior cannot yet be safely verified, stop at an architecture-ready state and label the next concrete integration step instead of pretending the feature is finished.",
      "Prefer a stable, working intermediate version over an oversized partially merged implementation.",
    ],
  },
  {
    title: "Loop prevention policy",
    items: [
      "No endless self-extension after the build is green: hand back the app state, what changed, and the next recommended step.",
      "No hidden side quests: if a new idea appears during implementation, park it as a future phase unless it is required to make the current slice correct.",
      "If a new cross-cutting requirement appears, first prepare the architecture, then stop once the system is safe for the next pass.",
    ],
  },
];
