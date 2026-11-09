import { listenXensonarEvent } from '../runtime/xensonarEventChannels';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ExperimentalForgeWorkshopRoom } from './ExperimentalForgeWorkshopRoom';
import { getForgeModeHint } from '../architecture/machineRooms';
import { LEVEL3LAB_MODE_KEY, LEVEL3LAB_SESSION_MODE_KEY, readLevel3LabMode, writeLevel3LabMode } from './xenpolarShortcut';
import type { SyntheticForgeLogicView } from '../../l3lab/canonicalForge/sessionTypes';
import { Level3LabSyntheticForgeMount } from './level3lab/Level3LabCanonicalMount';
import { Level3LabWorkspaceSelector } from './level3lab/Level3LabWorkspaceSelector';
import type { ForgeMode } from '../../l3lab/contracts/level3LabContracts';
import { isMaterialIntakeGatewayIntent, type SpectralForgeEntryScrollIntent, type SpectralForgeExternalAudioOrigin } from '../../l3lab/contracts/spectralForgeEntryIntent';
import { OPEN_CARRIER_INTEGRAL_EDITOR_EVENT } from '../../l3lab/contracts/carrierIntegralEditorIntent';
import { XENSONAR_EXTRAS_ENABLED } from './coreBuildProfile';

type Level3LabRoomProps = {
  onBack: () => void;
  packageStationKeepAlive?: boolean;
  externalAudioUploadFile?: File | null;
  externalAudioUploadOrigin?: SpectralForgeExternalAudioOrigin | null;
  entryScrollIntent?: SpectralForgeEntryScrollIntent | null;
  onExternalAudioUploadConsumed?: () => void;
  onEntryScrollIntentConsumed?: (token: string) => void;
};

const LEVEL3LAB_SYNTHETIC_FORGE_VIEW_KEY = 'xensonar-level3lab-canonical-view';
const LEVEL3LAB_SYNTHETIC_FORGE_VIEW_SESSION_KEY = 'xensonar-level3lab-canonical-view-session';

const ExternalDeviceSlotLazy = XENSONAR_EXTRAS_ENABLED
  ? lazy(() => import('./ExternalDeviceSlot').then((module) => ({ default: module.ExternalDeviceSlot })))
  : null;

function readInitialSyntheticForgeLogicView(): SyntheticForgeLogicView {
  if (typeof window === 'undefined') return 'drums';
  const sessionRaw = window.sessionStorage.getItem(LEVEL3LAB_SYNTHETIC_FORGE_VIEW_SESSION_KEY);
  if (sessionRaw === 'drums' || sessionRaw === 'melodic') return sessionRaw;
  const raw = window.localStorage.getItem(LEVEL3LAB_SYNTHETIC_FORGE_VIEW_KEY);
  return raw === 'melodic' ? 'melodic' : 'drums';
}

function readInitialMode(): ForgeMode {
  const raw = readLevel3LabMode();
  if (raw === 'canonical') return 'canonical';
  if (raw === 'experimental') return 'experimental';
  if (raw === 'external') return XENSONAR_EXTRAS_ENABLED ? 'external' : null;
  return null;
}

export function Level3LabRoom({ onBack, packageStationKeepAlive = false, externalAudioUploadFile = null, externalAudioUploadOrigin = null, entryScrollIntent = null, onExternalAudioUploadConsumed, onEntryScrollIntentConsumed }: Level3LabRoomProps) {
  const [mode, setMode] = useState<ForgeMode>(() => readInitialMode());
  const [syntheticForgeLogicView, setSyntheticForgeLogicView] = useState<SyntheticForgeLogicView>(() => readInitialSyntheticForgeLogicView());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (mode) {
        writeLevel3LabMode(mode);
      } else {
        window.localStorage.setItem(LEVEL3LAB_MODE_KEY, 'legacy');
        window.sessionStorage.setItem(LEVEL3LAB_SESSION_MODE_KEY, 'legacy');
      }
    }
  }, [mode]);

  useEffect(() => {
    if (!externalAudioUploadFile && !isMaterialIntakeGatewayIntent(entryScrollIntent)) return;
    setMode((current) => (current === 'experimental' ? current : 'experimental'));
  }, [entryScrollIntent, externalAudioUploadFile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LEVEL3LAB_SYNTHETIC_FORGE_VIEW_KEY, syntheticForgeLogicView);
    window.sessionStorage.setItem(LEVEL3LAB_SYNTHETIC_FORGE_VIEW_SESSION_KEY, syntheticForgeLogicView);
  }, [syntheticForgeLogicView]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOpenMelodicLoop = () => {
      setMode('canonical');
      setSyntheticForgeLogicView('melodic');
    };
    const handleOpenCarrierIntegralEditor = () => {
      setMode('experimental');
    };
    const unsubscribeMelodicLoop = listenXensonarEvent('openSyntheticForgeMelodicLoop', handleOpenMelodicLoop);
    window.addEventListener(OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, handleOpenCarrierIntegralEditor as EventListener);
    return () => {
      unsubscribeMelodicLoop();
      window.removeEventListener(OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, handleOpenCarrierIntegralEditor as EventListener);
    };
  }, []);

  const modeHint = useMemo(() => (mode ? getForgeModeHint(mode) ?? 'Werkbank gewählt.' : 'Wähle hier zuerst die Werkbank.'), [mode]);

  return (
    <div className="space-y-3">
      <Level3LabWorkspaceSelector
        mode={mode}
        syntheticForgeLogicView={syntheticForgeLogicView}
        modeHint={modeHint}
        onModeChange={setMode}
        onSyntheticForgeLogicViewChange={setSyntheticForgeLogicView}
      />

      {(mode === 'canonical' || packageStationKeepAlive) ? (
        <div
          className={mode === 'canonical' ? undefined : 'sr-only pointer-events-none'}
          aria-hidden={mode === 'canonical' ? undefined : true}
          data-package-station-keepalive={mode === 'canonical' ? undefined : 'true'}
        >
          <Level3LabSyntheticForgeMount
            onBack={onBack}
            onRequestModeChange={setMode}
            syntheticForgeLogicView={syntheticForgeLogicView}
            onSyntheticForgeLogicViewChange={setSyntheticForgeLogicView}
          />
        </div>
      ) : null}

      {mode === null || mode === 'canonical' ? null : mode === 'experimental' ? (
        <ExperimentalForgeWorkshopRoom onBack={onBack} externalAudioUploadFile={externalAudioUploadFile} externalAudioUploadOrigin={externalAudioUploadOrigin} entryScrollIntent={entryScrollIntent} onExternalAudioUploadConsumed={onExternalAudioUploadConsumed} onEntryScrollIntentConsumed={onEntryScrollIntentConsumed} />
      ) : ExternalDeviceSlotLazy ? (
        <Suspense fallback={<div className="rounded border border-neutral-800 bg-neutral-950/70 p-3 text-xs text-neutral-500">Werkbank wird geladen …</div>}>
          <ExternalDeviceSlotLazy
            onOpenCanonicalMelodicLoop={() => setMode('canonical')}
            onOpenLegacyForge={() => setMode('experimental')}
            onOpenCanonicalForge={() => setMode('canonical')}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
