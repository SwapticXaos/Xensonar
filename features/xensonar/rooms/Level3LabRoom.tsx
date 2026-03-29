import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SpectralForgeRoom } from '../../l3lab/spectralForge/SpectralForgeRoom';
import { FORGE2_WORKSPACES, getForgeModeHint, getMachineRoomDefinition, getTransitionGuidingSentence } from '../architecture/machineRooms';

const LazyCanonicalForgeRoom = lazy(async () => {
  const mod = await import('../../l3lab/canonicalForge/CanonicalForgeRoom');
  return { default: mod.CanonicalForgeRoom };
});

type Level3LabRoomProps = {
  onBack: () => void;
};

type ForgeMode = 'legacy' | 'canonical' | 'external';

const LEVEL3LAB_MODE_KEY = 'xensonar-level3lab-mode';

function readInitialMode(): ForgeMode {
  if (typeof window === 'undefined') return 'legacy';
  const raw = window.localStorage.getItem(LEVEL3LAB_MODE_KEY);
  return raw === 'canonical' || raw === 'external' ? raw : 'legacy';
}

class CanonicalErrorBoundary extends Component<
  { onReset: () => void; children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { onReset: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unbekannter Forge-2-Fehler',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[xensonar][forge2][boundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3 border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-100">
          <div className="text-xs uppercase tracking-[0.25em] text-red-300">Forge 2 abgefangen</div>
          <div className="font-medium">Forge 2 ist in einen Fehler gelaufen und wurde isoliert.</div>
          <div className="text-red-200/80">{this.state.message || 'Die Canonical-Variante ist noch nicht stabil genug für den direkten Einstieg.'}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                this.props.onReset();
              }}
              className="border border-red-700 px-3 py-1.5 text-red-100 hover:bg-red-900/40"
            >
              Zurück zu Forge 1
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ExternalDeviceSlot() {
  return (
    <div className="space-y-3 border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-300">
      <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">III.2c Fremdgerät-Slot</div>
      <div className="text-lg font-semibold text-neutral-100">Eigenes Gerät einhängen</div>
      <p className="max-w-3xl text-sm leading-relaxed text-neutral-400">
        Dieser Slot ist bewusst noch kein festes Gerät, sondern die Andockstelle für alternative Schmieden. Entscheidend ist,
        dass außen nur das offizielle Materialpaket gesprochen wird, während innen jede App ihren eigenen Bauplan behalten darf.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
          <div className="mb-2 font-medium text-neutral-200">1. Quelle</div>
          Eigenes Tool darf Audio, Bild, Daten oder generatives Material intern frei behandeln.
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
          <div className="mb-2 font-medium text-neutral-200">2. Adapter</div>
          Nur die Adapter-Schicht muss auf <span className="text-cyan-300">XensonarMaterialPackageV1</span> mappen.
        </div>
        <div className="rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-400">
          <div className="mb-2 font-medium text-neutral-200">3. Anschluss</div>
          Room V bekommt davon nur Material, nicht Spezialwissen über die fremde App.
        </div>
      </div>
      <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-3 text-xs text-emerald-100/90">
        Der Slot ist absichtlich noch leer, damit Forge 1 und Forge 2 als Referenzgeräte dienen können. Sobald dein Kumpel ein erstes
        Exportobjekt oder Mock-Paket hat, kann genau hier derselbe Brückenvertrag geprüft werden.
      </div>
    </div>
  );
}

export function Level3LabRoom({ onBack }: Level3LabRoomProps) {
  const [mode, setMode] = useState<ForgeMode>(() => readInitialMode());

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LEVEL3LAB_MODE_KEY, mode);
  }, [mode]);
  const modeHint = useMemo(() => getForgeModeHint(mode), [mode]);
  const forgeLegacy = getMachineRoomDefinition('forgeLegacy');
  const forgeCanonical = getMachineRoomDefinition('forgeCanonical');
  const externalSlot = getMachineRoomDefinition('externalSlot');

  return (
    <div className="space-y-3">
      <div className="rounded border border-violet-900/40 bg-violet-950/15 p-3 text-xs text-neutral-300">
        <div className="mb-1 uppercase tracking-[0.25em] text-violet-300">Kompetenzverschiebung · III.2</div>
        <div className="leading-relaxed text-neutral-400">{getTransitionGuidingSentence()}</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">{forgeLegacy.stageLabel}</div>
            <div className="mt-1 text-neutral-200">{forgeLegacy.title}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">{forgeLegacy.summary}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300">{forgeCanonical.stageLabel}</div>
            <div className="mt-1 text-neutral-200">{forgeCanonical.title}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">{forgeCanonical.summary}</div>
            <div className="mt-2 text-[10px] text-neutral-500">{FORGE2_WORKSPACES.map((entry) => entry.label).join(' · ')}</div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">{externalSlot.stageLabel}</div>
            <div className="mt-1 text-neutral-200">{externalSlot.title}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-neutral-500">{externalSlot.summary}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
        <span className="uppercase tracking-[0.2em] text-neutral-500">III.2 Häuser</span>
        <button
          type="button"
          onClick={() => setMode('legacy')}
          className={`border px-3 py-1.5 ${mode === 'legacy' ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
        >
          Forge 1 · Legacy
        </button>
        <button
          type="button"
          onClick={() => setMode('canonical')}
          className={`border px-3 py-1.5 ${mode === 'canonical' ? 'border-violet-500 bg-violet-950/40 text-violet-200' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
        >
          Forge 2 · Canonical
        </button>
        <button
          type="button"
          onClick={() => setMode('external')}
          className={`border px-3 py-1.5 ${mode === 'external' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-900'}`}
        >
          Gerät einhängen
        </button>
        <span className="text-neutral-500">{modeHint}</span>
      </div>

      {mode === 'legacy' ? (
        <SpectralForgeRoom onBack={onBack} />
      ) : mode === 'canonical' ? (
        <CanonicalErrorBoundary onReset={() => setMode('legacy')}>
          <Suspense
            fallback={
              <div className="border border-violet-900/60 bg-violet-950/20 p-4 text-sm text-violet-100">
                Forge 2 wird geladen …
              </div>
            }
          >
            <LazyCanonicalForgeRoom onBack={onBack} />
          </Suspense>
        </CanonicalErrorBoundary>
      ) : (
        <ExternalDeviceSlot />
      )}
    </div>
  );
}
