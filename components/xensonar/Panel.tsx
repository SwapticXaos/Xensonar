import type { PropsWithChildren, ReactNode } from "react";

type PanelProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}>;

export function Panel({ eyebrow, title, action, className = "", children }: PanelProps) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/90">{eyebrow}</div>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
