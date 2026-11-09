import type { TrainingFlow } from "../../domain/trainingFlows";

type TrainingFlowsStripProps = {
  flows: readonly TrainingFlow[];
  onFlowClick: (flow: TrainingFlow) => void;
  /** Optional: when provided, shows a "Surprise flow" button that triggers this callback. */
  onSurpriseFlowClick?: () => void;
  className?: string;
};

function sortTrainingFlowsForDisplay(flows: readonly TrainingFlow[]): TrainingFlow[] {
  // Stable, intent-driven ordering: calm/intro/reflection flows first, then reference ladders,
  // then motion / multi-EDO spirals. Falls back to input order when priorities tie.
  const priorityForId = (id: TrainingFlow["id"]): number => {
    if (id === "bp-reflection-journey") return 0;
    if (id === "reference-bp-intro") return 1;
    if (id.startsWith("reference-")) return 2;
    if (id === "bp-motion-training") return 3;
    return 4;
  };

  return [...flows].sort((a, b) => {
    const pa = priorityForId(a.id);
    const pb = priorityForId(b.id);
    if (pa !== pb) return pa - pb;
    // Secondary: stable-ish alphabetical by label for readability.
    return a.label.localeCompare(b.label);
  });
}

export function TrainingFlowsStrip({ flows, onFlowClick, onSurpriseFlowClick, className }: TrainingFlowsStripProps) {
  if (flows.length === 0) return null;

  const sorted = sortTrainingFlowsForDisplay(flows);

  return (
    <div className={className ?? "hidden md:flex items-center gap-1"}>
      <span className="text-[10px] uppercase tracking-widest text-neutral-600 mr-1">Training flows</span>
      {sorted.map((flow) => (
        <button
          key={flow.id}
          type="button"
          onClick={() => onFlowClick(flow)}
          className="rounded border border-sky-700 px-2 py-1 text-[10px] text-sky-200 hover:border-sky-500 hover:bg-sky-500/10 transition-colors"
          title={flow.description}
        >
          {flow.label}
        </button>
      ))}
      {onSurpriseFlowClick && (
        <button
          type="button"
          onClick={onSurpriseFlowClick}
          className="rounded border border-sky-700 px-2 py-1 text-[10px] text-sky-100 bg-sky-500/5 hover:border-sky-400 hover:bg-sky-500/15 transition-colors"
          title="Surprise me with a training flow"
        >
          Surprise flow
        </button>
      )}
    </div>
  );
}

