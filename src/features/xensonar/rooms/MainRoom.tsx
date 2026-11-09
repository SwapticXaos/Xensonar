import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { loadEmbeddedStandaloneHtml, type EmbeddedStandaloneAppKey } from '../family/assets/embeddedStandaloneApps';
import {
  XENSONAR_VARIANTE_ACTIVE_LABEL,
  XENSONAR_VARIANTE_NATIVE_ROOM_COPY,
  XENSONAR_VARIANTE_SHARED_CANVAS_COPY,
} from '../family/refactor/refucktorPresentation';
import type { SharedFieldController } from '../family/refactor/sharedFieldController';
import { FAMILY_CARDS } from './familyRoomManifest';
import type { FamilyApp } from './familyRoomManifestTypes';
import { injectStandaloneIframeAudioCaptureBridge, useStandaloneIframeAudioCapture } from '../family/capture/standaloneIframeAudioCaptureBridge';

export type MainRoomProps = {
  onEnterResonance: () => void;
  requestedActive?: FamilyApp | null;
  sharedFieldController?: SharedFieldController | null;
  onBackToLauncher?: () => void;
};



const XensonarRefactorRoomLazy = lazy(() =>
  import('../family/refactor/XensonarRefactorRoom').then((module) => ({ default: module.default })),
);

function FamilyIframe({ title, html, captureKey }: { title: string; html: string; captureKey: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useStandaloneIframeAudioCapture(captureKey, title, iframeRef);
  const bridgedHtml = useMemo(() => injectStandaloneIframeAudioCaptureBridge(html, captureKey, title), [html, captureKey, title]);
  return (
    <div className="relative rounded-2xl border border-neutral-800 bg-black/70 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-black/60 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-neutral-300 backdrop-blur">
        {title}
      </div>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={bridgedHtml}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock"
        allow="autoplay; fullscreen; pointer-lock"
        className="h-[90vh] min-h-[980px] w-full rounded-xl border border-neutral-900 bg-black"
      />
    </div>
  );
}

function ZoneFullscreenFrame({
  title,
  html,
  onBack,
  onEnterResonance,
  captureKey,
}: {
  title: string;
  html: string;
  onBack: () => void;
  onEnterResonance: () => void;
  captureKey: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useStandaloneIframeAudioCapture(captureKey, title, iframeRef);
  const bridgedHtml = useMemo(() => injectStandaloneIframeAudioCaptureBridge(html, captureKey, title), [html, captureKey, title]);

  useEffect(() => {
    const focusIframe = () => iframeRef.current?.contentWindow?.focus?.();
    const timeout = window.setTimeout(focusIframe, 80);
    return () => window.clearTimeout(timeout);
  }, [html]);

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={bridgedHtml}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals allow-pointer-lock"
        allow="autoplay; fullscreen; pointer-lock"
        className="h-full w-full border-0 bg-black"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto max-w-md rounded-2xl border border-neutral-700/70 bg-black/65 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">IV Spiele · Xensonar Familie</div>
          <div className="mt-1 text-sm font-semibold text-neutral-100">{title}</div>
          <div className="mt-1 text-xs leading-relaxed text-neutral-400">Zone läuft hier bildschirmfüllend, damit Mouse-Look, Pointer-Lock und Tarot-Lesbarkeit nicht mit dem Familienrahmen konkurrieren. Escape gibt die Maus frei.</div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-fuchsia-700/60 bg-fuchsia-950/35 px-4 py-2 text-xs uppercase tracking-[0.22em] text-fuchsia-100 hover:bg-fuchsia-900/45"
          >
            ← zurück zu Spiele
          </button>
          <button
            type="button"
            onClick={onEnterResonance}
            className="rounded-full border border-neutral-700 bg-black/55 px-4 py-2 text-xs uppercase tracking-[0.22em] text-neutral-200 hover:bg-neutral-900"
          >
            Zum Hauptraum I
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainRoom({ onEnterResonance, requestedActive = null, sharedFieldController = null, onBackToLauncher }: MainRoomProps) {
  const [active, setActive] = useState<FamilyApp>('launcher');

  useEffect(() => {
    if (requestedActive) setActive(requestedActive);
  }, [requestedActive]);

  const [activeHtml, setActiveHtml] = useState('');
  const [activeHtmlError, setActiveHtmlError] = useState<string | null>(null);
  const activeAssetKey = useMemo<EmbeddedStandaloneAppKey | null>(() => {
    if (active === 'resonanzwerk') return 'resonanzwerk';
    if (active === 'zone') return 'zone';
    if (active === 'strangeAttractors') return 'strangeAttractors';
    return null;
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    if (!activeAssetKey) {
      setActiveHtml('');
      setActiveHtmlError(null);
      return;
    }
    setActiveHtml('');
    setActiveHtmlError(null);
    loadEmbeddedStandaloneHtml(activeAssetKey)
      .then((html) => {
        if (!cancelled) setActiveHtml(html);
      })
      .catch((error) => {
        if (!cancelled) setActiveHtmlError(error instanceof Error ? error.message : 'Standalone-App konnte nicht geladen werden.');
      });
    return () => {
      cancelled = true
    };
  }, [activeAssetKey]);

  const handleBackToLauncher = () => {
    if (onBackToLauncher) {
      onBackToLauncher();
      return;
    }
    setActive('launcher');
  };

  const activeLabel = useMemo(() => {
    if (active === 'resonanzwerk') return 'Resonanzwerk · Xensonar Kind';
    if (active === 'zone') return 'Zone · Xensonar Enkel';
    if (active === 'strangeAttractors') return 'Archiv-Seitenzweig · Xensonar Extras';
    if (active === 'melodieQuest') return XENSONAR_VARIANTE_ACTIVE_LABEL;
    return '';
  }, [active]);

  if (active !== 'launcher') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">IV Spiele · Xensonar Familie</div>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{activeLabel}</div>
            <div className="mt-1 text-xs text-neutral-400">Eigenständiger Familienraum unter dem Xensonar-Dach. Der obere Xensonar-Rahmen bleibt, aber hier unten übernimmt die Tochter-App ihren eigenen Kosmos.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleBackToLauncher}
              className="rounded-full border border-cyan-700/60 bg-cyan-950/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-100 hover:bg-cyan-900/40"
            >
              ← zurück zu Spiele
            </button>
            <button
              type="button"
              onClick={onEnterResonance}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs uppercase tracking-[0.22em] text-neutral-200 hover:bg-neutral-900"
            >
              Zum Hauptraum I
            </button>
          </div>
        </div>
        {active === 'zone' ? (
          activeHtml ? (
            <ZoneFullscreenFrame
              title={activeLabel}
              html={activeHtml}
              onBack={() => setActive('launcher')}
              onEnterResonance={onEnterResonance}
              captureKey="family-zone"
            />
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-8 text-sm text-neutral-400">
              {activeHtmlError ?? 'Zone wird geladen …'}
            </div>
          )
        ) : active === 'melodieQuest' ? (
          <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
            <div className="rounded-2xl border border-amber-700/30 bg-amber-950/10 p-4 text-sm leading-relaxed text-neutral-300">
              {XENSONAR_VARIANTE_NATIVE_ROOM_COPY}
              {' '}
              {XENSONAR_VARIANTE_SHARED_CANVAS_COPY}
            </div>
            <Suspense fallback={<div className="rounded-2xl border border-amber-700/20 bg-black/30 p-4 text-xs text-amber-100/70">Xensonar Variante wird geladen …</div>}>
              <XensonarRefactorRoomLazy embedded title={activeLabel} sharedField={sharedFieldController} />
            </Suspense>
          </div>
        ) : activeHtml ? (
          <FamilyIframe title={activeLabel} html={activeHtml} captureKey={`family-${active}`} />
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-8 text-sm text-neutral-400">
            {activeHtmlError ?? 'Familienraum wird geladen …'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
        <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">IV Spiele · Xensonar Familie</div>
        <div className="mt-2 text-2xl font-semibold text-neutral-100">Xensonar Familie</div>
        <div className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-400">
          Hier wohnen Xensonar-Kinder, Enkel und Seitenzweige als eigene kleine Kosmen. In der Vollfassung stehen sie nun zusammen mit den Arcade-Games unter IV Spiele, ohne sofort in die Hauptontologie eingeschmolzen zu werden.
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {FAMILY_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setActive(card.key)}
            className={`group rounded-2xl border p-5 text-left transition hover:translate-y-[-1px] hover:bg-neutral-900/80 ${card.accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">{card.subtitle}</div>
                <div className="mt-2 text-2xl font-semibold">{card.title}</div>
              </div>
              <div className="rounded-full border border-current/30 px-3 py-1 text-[10px] uppercase tracking-[0.22em] opacity-80">{card.badge}</div>
            </div>
            <div className="mt-4 text-sm leading-relaxed opacity-90">{card.summary}</div>
            <div className="mt-5 inline-flex rounded-full border border-current/30 px-4 py-2 text-xs uppercase tracking-[0.24em] opacity-90 group-hover:bg-black/20">
              öffnen
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 text-xs leading-relaxed text-neutral-500">
        Diese Familienräume laufen zunächst als eigenständige Flügel. Spätere Brücken zu Material, Seeds, Exporten oder Resonanzlogik können folgen, aber zuerst zählt die klare, benutzbare Einhängung und der sichere Rückweg nach Xensonar.
      </div>
    </div>
  );
}
