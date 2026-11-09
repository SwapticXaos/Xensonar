import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadEmbeddedStandaloneHtml } from "../family/assets/embeddedStandaloneApps";
import { FAMILY_CARDS } from "./familyRoomManifest";
import type { FamilyApp } from "./familyRoomManifestTypes";
import type { SharedFieldController } from "../family/refactor/sharedFieldController";
import { ExternalDeviceSlot } from "./ExternalDeviceSlot";
import { injectStandaloneIframeAudioCaptureBridge, useStandaloneIframeAudioCapture } from '../family/capture/standaloneIframeAudioCaptureBridge';

export type XenpolarLauncherTarget =
  | "melodicQuest"
  | "resonanzwanderer"
  | "xenpolar3"
  | "arena";
export type XenpolarView = "launcher" | XenpolarLauncherTarget;

type XenpolarEntry = {
  key: XenpolarLauncherTarget;
  eyebrow: string;
  title: string;
  summary: string;
  accent: string;
};


const MainRoomLazy = lazy(() => import("./MainRoom").then((module) => ({ default: module.MainRoom })));

const XENPOLAR_ENTRIES: XenpolarEntry[] = [
  {
    key: "melodicQuest",
    eyebrow: "1 · Ursprung",
    title: "Melodic Quest",
    summary:
      "Der erste Jump’n’Run-Prototyp der Linie: Tier-NPCs, sammelbare Melodie und frühe mikrotonale Spiellogik.",
    accent: "border-fuchsia-700/60 bg-fuchsia-950/25 text-fuchsia-100",
  },
  {
    key: "resonanzwanderer",
    eyebrow: "2 · Weiterentwicklung",
    title: "Resonanzwanderer",
    summary:
      "Die zweite Stufe der Ahnlinie: Spielfigur, Frequenzraum und autonome Klangwesen im selben Erfahrungsraum.",
    accent: "border-cyan-700/60 bg-cyan-950/25 text-cyan-100",
  },
  {
    key: "xenpolar3",
    eyebrow: "3 · Exportpfad",
    title: "Xenpolar 3",
    summary:
      "Der aktuelle Jump’n’Run-Ableger mit direkter Brücke zu Xensonar und Materialspur.",
    accent: "border-emerald-700/60 bg-emerald-950/25 text-emerald-100",
  },
  {
    key: "arena",
    eyebrow: "Arena",
    title: "Irrlicht Arena",
    summary:
      "Experimental-musikalisches Arena-Spiel. Bleibt als echter Spielraum erhalten und kann in dieselbe Interpretationsrichtung wachsen.",
    accent: "border-amber-700/60 bg-amber-950/25 text-amber-100",
  },
];

function forceStandaloneView(
  html: string,
  view: "melodie" | "resonanzwanderer",
) {
  const forced = html.replace('useState("lobby")', `useState("${view}")`);
  return view === "resonanzwanderer"
    ? injectResonanzwandererTelemetry(forced)
    : forced;
}

function injectResonanzwandererTelemetry(html: string) {
  const bridgeScript = `<script>
(() => {
  const CHANNEL = '__xensonar_xenpolar_telemetry__';
  const state = {
    melodyCount: 0,
    hz: 220,
    zoneName: 'Root',
    zoneDescription: '',
    active: false,
    lastLuma: null,
  };
  const post = (payload) => {
    try {
      window.parent?.postMessage({ channel: CHANNEL, game: 'resonanzwanderer', ...payload }, '*');
    } catch {}
  };
  const parseHudText = (text) => {
    if (!text) return;
    if (text.startsWith('⬡ ')) {
      state.zoneName = text.replace(/^⬡\s*/, '').trim() || 'Root';
      return;
    }
    if (text.startsWith('♪ ')) {
      const match = text.match(/♪\s*(\d+)/);
      if (match) state.melodyCount = Number(match[1]) || 0;
      return;
    }
    const hzMatch = text.match(/(-?\d+(?:\.\d+)?)\s*Hz/i);
    if (hzMatch) {
      state.hz = Number(hzMatch[1]) || state.hz;
      return;
    }
    if (text.includes('Dissonanz') || text.includes('Resonanz') || text.length > 12) {
      state.zoneDescription = text;
    }
  };
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function patchedFillText(text, x, y, maxWidth) {
    try { if (typeof text === 'string') parseHudText(text); } catch {}
    return originalFillText.call(this, text, x, y, maxWidth);
  };
  window.addEventListener('keydown', (event) => {
    const key = (event.key || '').toLowerCase();
    state.active = true;
    post({ type: 'key', phase: 'down', key, t: performance.now() / 1000 });
  }, true);
  window.addEventListener('keyup', (event) => {
    const key = (event.key || '').toLowerCase();
    post({ type: 'key', phase: 'up', key, t: performance.now() / 1000 });
  }, true);
  window.addEventListener('pointerdown', () => {
    state.active = true;
    post({ type: 'lifecycle', phase: 'enter', t: performance.now() / 1000 });
  }, true);
  const watchButtons = () => {
    for (const button of Array.from(document.querySelectorAll('button'))) {
      if ((button.textContent || '').toLowerCase().includes('betreten')) {
        button.addEventListener('click', () => {
          state.active = true;
          post({ type: 'lifecycle', phase: 'enter', t: performance.now() / 1000 });
        }, { once: false });
      }
    }
  };
  watchButtons();
  const sample = () => {
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const data = ctx.getImageData(0, 0, Math.min(64, canvas.width), Math.min(36, canvas.height)).data;
          let luma = 0;
          for (let i = 0; i < data.length; i += 4) {
            luma += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
          }
          luma /= Math.max(1, data.length / 4) * 255;
          const flux = state.lastLuma == null ? 0 : Math.min(1, Math.abs(luma - state.lastLuma) * 6.4);
          state.lastLuma = luma;
          post({
            type: 'sample',
            t: performance.now() / 1000,
            zoneName: state.zoneName,
            zoneDescription: state.zoneDescription,
            hz: state.hz,
            melodyCount: state.melodyCount,
            brightness: luma,
            flux,
            active: state.active,
          });
        }
      }
    } catch {}
    window.requestAnimationFrame(sample);
  };
  window.requestAnimationFrame(sample);
})();
</script>`;
  return html.replace("</body>", `${bridgeScript}</body>`);
}

function StandaloneArcadeFrame({
  title,
  html,
  captureKey,
}: {
  title: string;
  html: string;
  captureKey: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useStandaloneIframeAudioCapture(captureKey, title, iframeRef);
  const bridgedHtml = useMemo(() => injectStandaloneIframeAudioCaptureBridge(html, captureKey, title), [html, captureKey, title]);
  return (
    <div className="relative rounded-3xl border border-neutral-800 bg-black/70 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-black/60 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-neutral-300 backdrop-blur">
        {title}
      </div>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={bridgedHtml}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock"
        allow="autoplay; fullscreen; pointer-lock"
        className="h-[90vh] min-h-[980px] w-full rounded-[1.35rem] border border-neutral-900 bg-black"
      />
    </div>
  );
}

export type XenpolarRoomProps = {
  view: XenpolarView;
  onOpen: (view: XenpolarLauncherTarget) => void;
  onBackToLauncher: () => void;
  xenpolar3Content?: ReactNode;
  arenaContent?: ReactNode;
  resonanzwandererStatus?: string;
  resonanzwandererBusy?: boolean;
  resonanzwandererCanExport?: boolean;
  onResonanzwandererExportToXensonar?: () => void;
  onResonanzwandererExportToSpectralForge?: () => void;
  onResonanzwandererExportToSyntheticForge?: () => void;
  requestedFamilyActive?: Exclude<FamilyApp, "launcher"> | null;
  sharedFieldController?: SharedFieldController | null;
  onFamilyRequestConsumed?: () => void;
  onEnterResonance?: () => void;
  onOpenMaterialschmiede?: () => void;
};

export function XenpolarRoom({
  view,
  onOpen,
  onBackToLauncher,
  xenpolar3Content,
  arenaContent,
  resonanzwandererStatus,
  resonanzwandererBusy = false,
  resonanzwandererCanExport = false,
  onResonanzwandererExportToXensonar,
  onResonanzwandererExportToSpectralForge,
  onResonanzwandererExportToSyntheticForge,
  requestedFamilyActive = null,
  sharedFieldController = null,
  onFamilyRequestConsumed,
  onEnterResonance,
  onOpenMaterialschmiede,
}: XenpolarRoomProps) {
  const activeTitle = useMemo(() => {
    if (view === "melodicQuest") return "Melodic Quest";
    if (view === "resonanzwanderer") return "Resonanzwanderer";
    if (view === "xenpolar3") return "Xenpolar 3";
    if (view === "arena") return "Irrlicht Arena";
    return "Spiele";
  }, [view]);

  const [familyActive, setFamilyActive] = useState<FamilyApp>("launcher");
  const [activeHtml, setActiveHtml] = useState("");
  const [activeHtmlError, setActiveHtmlError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedFamilyActive) return;
    setFamilyActive(requestedFamilyActive);
    onBackToLauncher();
    onFamilyRequestConsumed?.();
  }, [requestedFamilyActive, onBackToLauncher, onFamilyRequestConsumed]);

  const openFamilyEntry = (entry: Exclude<FamilyApp, "launcher">) => {
    onBackToLauncher();
    setFamilyActive(entry);
  };

  const openArcadeEntry = (entry: XenpolarLauncherTarget) => {
    setFamilyActive("launcher");
    onOpen(entry);
  };

  const returnToGamesLauncher = () => {
    setFamilyActive("launcher");
    onBackToLauncher();
  };

  useEffect(() => {
    let cancelled = false;
    if (view !== "melodicQuest" && view !== "resonanzwanderer") {
      setActiveHtml("");
      setActiveHtmlError(null);
      return;
    }
    setActiveHtml("");
    setActiveHtmlError(null);
    loadEmbeddedStandaloneHtml("melodieQuest")
      .then((html) => {
        if (cancelled) return;
        setActiveHtml(
          forceStandaloneView(
            html,
            view === "melodicQuest" ? "melodie" : "resonanzwanderer",
          ),
        );
      })
      .catch((error) => {
        if (!cancelled)
          setActiveHtmlError(
            error instanceof Error
              ? error.message
              : "Xenpolar-Standalone konnte nicht geladen werden.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [view]);


  if (familyActive !== "launcher") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Xensonar Familie wird geladen …</div>}>
        <MainRoomLazy
          onEnterResonance={onEnterResonance ?? onBackToLauncher}
          requestedActive={familyActive}
          sharedFieldController={sharedFieldController}
          onBackToLauncher={() => setFamilyActive("launcher")}
        />
      </Suspense>
    );
  }

  if (view === "launcher") {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.34em] text-neutral-500">
            IV Spiele
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-neutral-100">
            Xensonar Familie & Arcade Games
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
            Familienräume und Xenpolar-Spielzweige liegen hier als zwei Rubriken
            in einem gemeinsamen Spiele-Raum. Materialschmiede bleibt Raum II,
            Nodal Installation bleibt Raum III.
          </p>
        </div>

        <section className="space-y-3 rounded-3xl border border-neutral-800 bg-neutral-950/45 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">
              Rubrik A
            </div>
            <h3 className="mt-1 text-xl font-semibold text-neutral-100">
              Xensonar Familie
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FAMILY_CARDS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => openFamilyEntry(entry.key)}
                className={`group rounded-[2rem] border p-6 text-left transition hover:translate-y-[-1px] hover:bg-neutral-900/80 ${entry.accent}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.32em] text-neutral-400">
                      {entry.subtitle}
                    </div>
                    <div className="mt-3 text-2xl font-semibold">
                      {entry.title}
                    </div>
                  </div>
                  <div className="rounded-full border border-current/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] opacity-80">
                    {entry.badge}
                  </div>
                </div>
                <div className="mt-3 text-sm leading-relaxed opacity-90">
                  {entry.summary}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-neutral-800 bg-neutral-950/45 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
              Rubrik B
            </div>
            <h3 className="mt-1 text-xl font-semibold text-neutral-100">
              Arcade Games
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {XENPOLAR_ENTRIES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => openArcadeEntry(entry.key)}
                className={`group rounded-[2rem] border p-6 text-left transition hover:translate-y-[-1px] hover:bg-neutral-900/80 ${entry.accent}`}
              >
                <div className="text-[10px] uppercase tracking-[0.32em] text-neutral-400">
                  {entry.eyebrow}
                </div>
                <div className="mt-3 text-2xl font-semibold">{entry.title}</div>
                <div className="mt-3 text-sm leading-relaxed opacity-90">
                  {entry.summary}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-800 bg-neutral-950/80 p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">
            IV Spiele · Arcade Games
          </div>
          <div className="mt-1 text-lg font-semibold text-neutral-100">
            {activeTitle}
          </div>
        </div>
        <button
          type="button"
          onClick={returnToGamesLauncher}
          className="rounded-full border border-cyan-700/60 bg-cyan-950/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-900/40"
        >
          ← zurück zu Spiele
        </button>
      </div>

      {view === "melodicQuest" ? (
        activeHtml ? (
          <StandaloneArcadeFrame title={activeTitle} html={activeHtml} captureKey={`xenpolar-${view}`} />
        ) : (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-8 text-sm text-neutral-400">
            {activeHtmlError ?? "Xenpolar wird geladen …"}
          </div>
        )
      ) : view === "resonanzwanderer" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/15 p-4 text-sm leading-relaxed text-neutral-200">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">
                  Interpretationsbrücke
                </div>
                <div className="text-cyan-100">
                  {resonanzwandererStatus ??
                    "Resonanzwanderer sammelt noch keine lesbare DNA."}
                </div>
                <div className="text-xs text-neutral-400">
                  Die Welt bleibt spielbar wie zuvor. Parallel dazu liest ein
                  Sidecar Bewegungs-, Zonen- und Resonanzgesten aus und kann
                  daraus denselben 8-Bar-Körper für Xensonar, SpectralForge oder
                  SyntheticForge bauen.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onResonanzwandererExportToXensonar}
                  disabled={!resonanzwandererCanExport || resonanzwandererBusy}
                  className="rounded-full border border-cyan-700/60 bg-cyan-950/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Direkt an Xensonar
                </button>
                <button
                  type="button"
                  onClick={onResonanzwandererExportToSpectralForge}
                  disabled={!resonanzwandererCanExport || resonanzwandererBusy}
                  className="rounded-full border border-emerald-700/60 bg-emerald-950/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-100 hover:bg-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Zu SpectralForge
                </button>
                <button
                  type="button"
                  onClick={onResonanzwandererExportToSyntheticForge}
                  disabled={!resonanzwandererCanExport || resonanzwandererBusy}
                  className="rounded-full border border-violet-700/60 bg-violet-950/25 px-4 py-2 text-xs uppercase tracking-[0.22em] text-violet-100 hover:bg-violet-900/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Zu SyntheticForge
                </button>
              </div>
            </div>
          </div>
          {activeHtml ? (
            <StandaloneArcadeFrame title={activeTitle} html={activeHtml} captureKey={`xenpolar-${view}`} />
          ) : (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950/60 p-8 text-sm text-neutral-400">
              {activeHtmlError ?? "Xenpolar wird geladen …"}
            </div>
          )}
        </div>
      ) : view === "xenpolar3" ? (
        (xenpolar3Content ?? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-800/60 bg-emerald-950/15 p-4 text-sm leading-relaxed text-emerald-100/90">
              Xenpolar 3 läuft hier als eingebetteter Jump-Run-Andockkorridor.
              Die Exportpfade bleiben dieselben wie im bisherigen
              Fremdgerät-Slot.
            </div>
            <ExternalDeviceSlot
              onOpenCanonicalMelodicLoop={
                onOpenMaterialschmiede ?? (() => undefined)
              }
              onOpenLegacyForge={onOpenMaterialschmiede ?? (() => undefined)}
              onOpenCanonicalForge={onOpenMaterialschmiede ?? (() => undefined)}
            />
          </div>
        ))
      ) : (
        (arenaContent ?? null)
      )}
    </div>
  );
}
