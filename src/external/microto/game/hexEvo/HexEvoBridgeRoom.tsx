import { useCallback, useEffect, useMemo, useState } from 'react';
import { StandaloneRoomFrame } from '../../app/components/StandaloneRoomFrame';
import { queueMicrotoMelodicLoopSeedHandoff } from '../../../../features/l3lab/canonicalForge/microtoMelodicLoopHandoff';
import type { MicrotoMelodicLoopSeedExport } from '../../integrations/xensonar/types';
import type { Room } from '../../app/roomRegistry';

export type HexEvoBridgeRoomProps = {
  room: Room;
  onBack?: () => void;
  onSelectRoom?: (room: Room) => void;
};

type HostBridge = {
  convertHexEvoCreatureToMelodicLoop?: (payload: unknown) => Promise<{ seed?: MicrotoMelodicLoopSeedExport; [key: string]: unknown }>;
  getHexEvoStatus?: () => Promise<unknown>;
  getHostInfo?: () => Promise<unknown>;
};

declare global {
  interface Window {
    mprgXensonarWholeHead?: HostBridge;
  }
}

function isHexEvoCreatureMessage(value: unknown): value is { channel: string; type: string; creature: unknown } {
  if (!value || typeof value !== 'object') return false;
  const message = value as { channel?: unknown; type?: unknown; creature?: unknown };
  return message.channel === 'hex-evo:mprg' && message.type === 'creature-to-partitur' && Boolean(message.creature);
}

function localFallbackSeed(creature: any): MicrotoMelodicLoopSeedExport {
  const dna = creature?.dna ?? {};
  const speed = Math.max(0, Math.min(1, Number(dna.speed ?? 0.5)));
  const toxicity = Math.max(0, Math.min(1, Number(dna.toxicity ?? 0.2)));
  const symbiosis = Math.max(0, Math.min(1, Number(dna.symbiosis ?? 0.6)));
  const expansion = Math.max(0, Math.min(1, Number(dna.expansion ?? 0.5)));
  const bars = Math.max(1, Math.min(8, Math.round(creature?.barCount ?? 4)));
  const fallbackPhrase = [
    Math.round(-7 + expansion * 6),
    Math.round(symbiosis * 5 - toxicity * 4),
    Math.round(3 + symbiosis * 6),
    Math.round(7 + expansion * 5 - toxicity * 2),
  ];
  const movementEvents = Array.from({ length: bars * 8 }, (_, ordinal) => {
    const t = (ordinal / Math.max(1, bars * 8 - 1)) * bars * 4;
    const kind = ordinal % 4 === 0 ? 'motion' : ordinal % 4 === 1 ? 'jump' : ordinal % 4 === 2 ? 'npc_orb' : 'phase_gate';
    return {
      kind: kind as any,
      semi: fallbackPhrase[ordinal % fallbackPhrase.length] ?? 0,
      energy: Math.max(0.05, Math.min(1, 0.35 + speed * 0.25 + (kind === 'phase_gate' ? toxicity * 0.2 : symbiosis * 0.12))),
      t,
      lane: Math.max(0, Math.min(7, ordinal % 8)),
      airborne: kind === 'jump' || kind === 'phase_gate',
      ordinal,
      detail: kind === 'phase_gate' ? toxicity : symbiosis,
    };
  });
  return {
    name: `Hex Evo · ${creature?.name ?? 'Pantoffeltier'} · Kreatur zu Partitur`,
    bars,
    rootHz: Math.max(55, Math.min(880, Number(creature?.rootHz ?? 180))),
    movementEvents,
    fallbackPhrase,
    arrangementMode: speed > 0.7 ? 'percussive' : toxicity > 0.65 ? 'glitch' : 'cinematic',
    formMode: toxicity > 0.65 ? 'abca' : 'abab',
    sectionBias: toxicity > 0.65 ? 'C' : symbiosis > 0.65 ? 'B' : 'auto',
    tuningMode: toxicity > 0.75 ? '22edo' : symbiosis > 0.65 ? 'ji' : '19edo',
    evolutionDepth: Math.max(0, Math.min(1, (speed + symbiosis + expansion) / 3)),
    sourceDevice: 'HexEvo',
    sourceVersion: 'hex-evo-local-fallback',
    notes: 'Fallback conversion used because mPRG hosted converter was unavailable. Motion remains score structure, not automatic sound attack.',
    mprgBridge: {
      protocol: 'mprg-xensonar-head-bridge/v1',
      sourceKind: 'trail-loop-body',
      loopBodyKey: `hex-evo-fallback-${bars}-${movementEvents.length}`,
      determinismKey: null,
      internalTuningId: 'hex-evo-morphogenetic-fallback',
      externalRootId: 'xensonar-melodic-loop-root',
      antiWhoopProtected: true,
      nestedTuningProtected: true,
      truthBoundary: {
        headlessTruthAccepted: false,
        audioTruthClaimRejected: true,
        dynamicCandidateOnly: true,
      },
    },
  };
}

export function HexEvoBridgeRoom({ onBack, onSelectRoom }: HexEvoBridgeRoomProps) {
  const [status, setStatus] = useState('Hex Evo wartet auf ein Pantoffeltier.');
  const [lastSeedName, setLastSeedName] = useState<string | null>(null);
  const [lastProjectionSummary, setLastProjectionSummary] = useState<string | null>(null);
  const iframeSrc = useMemo(() => '/hex-evo/', []);

  const handleCreature = useCallback(async (creature: unknown) => {
    setStatus('mPRG rechnet Pantoffeltier → Melodic-Loop-Partitur …');
    let seed: MicrotoMelodicLoopSeedExport | null = null;
    try {
      const result = await window.mprgXensonarWholeHead?.convertHexEvoCreatureToMelodicLoop?.({ creature });
      seed = result?.seed ?? null;
      const projection = (result as any)?.projectionSummary;
      if (projection) {
        const slots = Array.isArray(projection.slotSummary)
          ? projection.slotSummary.map((slot: any) => `${slot.slotIndex}:${slot.role}:${slot.eventCount}`).join(' · ')
          : 'slots unknown';
        setLastProjectionSummary(`Tuning ${projection.tuningMode ?? seed?.tuningMode ?? 'unknown'} · ${projection.rhythm?.gaitPattern ?? 'gait'} · ${slots}`);
      }
    } catch (error) {
      console.warn('[xensonar][hex-evo] mPRG creature converter unavailable; using local fallback.', error);
    }
    if (!seed) {
      seed = localFallbackSeed(creature as any);
      setLastProjectionSummary('Fallback-Projektion · 4 Slots · keine mPRG-Analysemetadaten');
    }
    queueMicrotoMelodicLoopSeedHandoff(seed);
    setLastSeedName(seed.name);
    setStatus(`${seed.name} liegt als Melodic-Loop-Handoff bereit. Wechsle zur Materialschmiede …`);
    onSelectRoom?.('L3LAB');
  }, [onSelectRoom]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isHexEvoCreatureMessage(event.data)) return;
      void handleCreature(event.data.creature);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleCreature]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <StandaloneRoomFrame
        title="IV Xenpolar · Hex Evo"
        description="Hex Evo läuft als mPRG-gehosteter Spielkörper im Xensonar-Head. Wenn aus dem Hexfeld ein steuerbares Pantoffeltier entsteht, sendet der Button im Spiel dessen DNA, Bewegung, Stance und Action-Ecology an mPRG. mPRG projiziert daraus eine vierstimmige Melodic-Loop-Partitur."
        onBack={onBack ?? (() => onSelectRoom?.('RESONANCE'))}
        backLabel="Zurueck zu Resonance"
        sectionClassName="border border-neutral-800 bg-black p-5"
        backButtonClassName="px-3 py-1 text-sm border border-neutral-700 text-neutral-200 hover:bg-neutral-900"
        titleClassName="text-2xl text-fuchsia-100"
        descriptionClassName="text-xs text-neutral-400 mt-1"
      >
        <div className="mb-3 rounded-2xl border border-fuchsia-700/50 bg-fuchsia-950/20 p-3 text-sm text-fuchsia-50">
          <div className="font-semibold">Pantoffeltier → Melodic Loop</div>
          <div className="mt-1 text-xs text-fuchsia-100/70">
            Status: {status}{lastSeedName ? ` · zuletzt: ${lastSeedName}` : ''}
          </div>
          {lastProjectionSummary && (
            <div className="mt-2 rounded-xl border border-fuchsia-400/20 bg-black/30 px-3 py-2 text-[11px] text-fuchsia-100/65">
              mPRG-Projektion: {lastProjectionSummary}
            </div>
          )}
        </div>
        <iframe
          title="Hex Evo Action Ecology"
          src={iframeSrc}
          className="h-[760px] w-full rounded-2xl border border-fuchsia-800 bg-black"
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
        />
      </StandaloneRoomFrame>
    </div>
  );
}
