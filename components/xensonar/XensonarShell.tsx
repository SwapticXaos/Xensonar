import { RecoveryWorkbench } from "./RecoveryWorkbench";
import { StatusBadge } from "./StatusBadge";

export function XensonarShell() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(168,85,247,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-xl lg:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-cyan-200">
                Xensonar • Recovery Prep
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Xensonar is being rebuilt to work end-to-end, not just to compile once.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Deine beiden Hälften enthalten schon die wesentliche Logik. Damit am Ende wirklich alles sauber
                  funktioniert, ist das Projekt jetzt als kontrollierte Wiederaufbau-Umgebung vorbereitet: modular,
                  build-sicher und Schritt für Schritt erweiterbar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[30rem]">
              {[
                ["State", "Stable"],
                ["Strategy", "Modular"],
                ["Build", "Protected"],
                ["Next", "Subsystem restore"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge tone="emerald">Project runnable</StatusBadge>
            <StatusBadge tone="cyan">Architecture prep in place</StatusBadge>
            <StatusBadge tone="amber">Full Xensonar merge deferred intentionally</StatusBadge>
          </div>
        </header>

        <main className="mt-8 flex-1">
          <RecoveryWorkbench />
        </main>
      </div>
    </div>
  );
}
