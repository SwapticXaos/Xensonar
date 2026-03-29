import { useMemo, useState } from "react";
import {
  implementationPhases,
  recoveredFeatures,
  recoveryPrinciples,
  recoveryTracks,
} from "../../data/xensonarRecovery";
import { Panel } from "./Panel";
import { RecoveryTrackCard } from "./RecoveryTrackCard";
import { StatusBadge } from "./StatusBadge";

export function RecoveryWorkbench() {
  const [activeId, setActiveId] = useState(recoveryTracks[0].id);

  const activeTrack = useMemo(
    () => recoveryTracks.find((track) => track.id === activeId) ?? recoveryTracks[0],
    [activeId]
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-8">
        <Panel
          eyebrow="Prepared merge state"
          title="Xensonar recovery workbench"
          action={<StatusBadge tone="cyan">Build-safe shell</StatusBadge>}
        >
          <div className="space-y-5">
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Statt den gesamten Quelltext erneut als Monolith zusammenzukleben, ist die App jetzt auf einen
              sicheren Zwischenzustand vorbereitet. So können wir die nächste Runde gezielt und subsystemweise
              aufbauen: Daten, Räume, Audio, Interaktion und danach Feinschliff.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Approach", "Modular recovery"],
                ["Goal", "Runnable after every pass"],
                ["Current mode", "Preparation before remerge"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Recovery tracks" title="Subsystem map before the next implementation pass">
          <div className="grid gap-3">
            {recoveryTracks.map((track) => (
              <RecoveryTrackCard
                key={track.id}
                track={track}
                active={track.id === activeTrack.id}
                onSelect={setActiveId}
              />
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Execution roadmap" title="Safe rebuild phases" action={<StatusBadge tone="violet">step-by-step</StatusBadge>}>
          <div className="grid gap-4">
            {implementationPhases.map((phase, index) => (
              <div key={phase.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Phase {index + 1}</div>
                    <h3 className="mt-1 text-base font-semibold text-white">{phase.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{phase.description}</p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-2 text-sm text-slate-300">
                  {phase.outputs.map((output) => (
                    <li key={output} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                      {output}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Selected track" title={activeTrack.name} action={<StatusBadge tone="amber">review first</StatusBadge>}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Risks to avoid</div>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                {activeTrack.risks.map((risk) => (
                  <li key={risk} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Prepared next actions</div>
              <ol className="mt-3 space-y-3 text-sm text-slate-300">
                {activeTrack.nextActions.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-8">
        <Panel eyebrow="What is already known" title="Recovered feature inventory">
          <ul className="space-y-3 text-sm text-slate-300">
            {recoveredFeatures.map((feature) => (
              <li key={feature} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-300" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Guardrails" title="Rules for the next merge pass">
          <ul className="space-y-3 text-sm text-slate-300">
            {recoveryPrinciples.map((principle) => (
              <li key={principle} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                {principle}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Ready state" title="How we continue from here" action={<StatusBadge tone="emerald">prepared</StatusBadge>}>
          <div className="space-y-4 text-sm leading-7 text-slate-300">
            <p>
              Der nächste Schritt sollte nicht direkt ein Vollmerge sein. Stattdessen bauen wir zuerst die echte
              Xensonar-Struktur: Option-Kataloge, Room-Komponenten, Runtime-Refs und Audio-Helfer. Dann setzen wir
              die gepastete Logik nacheinander wieder ein.
            </p>
            <p>
              Ergebnis: weniger Risiko, klarere Fehlersuche und eine Basis, auf der wir die große Datei später wieder
              funktionsfähig zusammensetzen können.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
