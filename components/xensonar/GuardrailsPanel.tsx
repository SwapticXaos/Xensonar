import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { DELIVERY_GUARDRAILS } from "../../features/xensonar/guardrails";

export function GuardrailsPanel() {
  return (
    <Panel
      eyebrow="Delivery safety"
      title="Anti-loop guardrails"
      action={<StatusBadge tone="amber">Stop criteria active</StatusBadge>}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {DELIVERY_GUARDRAILS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="text-sm font-semibold text-white">{section.title}</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 text-cyan-300">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
