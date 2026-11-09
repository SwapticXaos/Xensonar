import type {
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  ParticleAmbientMotionSelection,
  ParticleCrisisModeSelection,
  ParticleLoadReductionSelection,
  PerformanceCrisisPreset,
  PerformanceCrisisPresetId,
} from "../performanceCrisisTypes";
import {
  PARTICLE_AMBIENT_MOTION_OPTIONS,
  PARTICLE_CRISIS_MODE_OPTIONS,
  PARTICLE_LOAD_REDUCTION_OPTIONS,
  formatNumber,
  formatWaveStarterPresetOptionLabel,
} from "../performanceCrisisPanelModel";
import {
  ParticleCanonicalQuantizationControls,
  PolicyLineGrid,
  type PolicyLineItem,
  PresetSelect,
  TruthLine,
} from "./PerformanceCrisisPanelControls";

type WaveStarterTrafficReadout = {
  queueLength?: number;
  playedTotal?: number;
  timerActive?: boolean;
} | null;

type RecentWaveStarterTrafficReadout = {
  admitted?: number;
} | null;

export type PerformanceCrisisParticleTabProps = {
  particlePresetId: PerformanceCrisisPresetId;
  presetIds: readonly PerformanceCrisisPresetId[];
  selectedParticlePreset: PerformanceCrisisPreset;
  particleCrisisMode: ParticleCrisisModeSelection;
  particleAmbientMotionMode: ParticleAmbientMotionSelection;
  particleLoadReductionMode: ParticleLoadReductionSelection;
  particleQuantizationMode: CrisisQuantizationModeSelection;
  particleQuantizationGrid: CrisisQuantizationGridSelection;
  onParticlePresetChange: (presetId: PerformanceCrisisPresetId) => void;
  onParticleCrisisModeChange: (mode: ParticleCrisisModeSelection) => void;
  onParticleAmbientMotionModeChange: (
    mode: ParticleAmbientMotionSelection,
  ) => void;
  onParticleLoadReductionModeChange: (
    mode: ParticleLoadReductionSelection,
  ) => void;
  onParticleQuantizationModeChange: (
    mode: CrisisQuantizationModeSelection,
  ) => void;
};

export function PerformanceCrisisParticleTab({
  particlePresetId,
  presetIds,
  selectedParticlePreset,
  particleCrisisMode,
  particleAmbientMotionMode,
  particleLoadReductionMode,
  particleQuantizationMode,
  particleQuantizationGrid,
  onParticlePresetChange,
  onParticleCrisisModeChange,
  onParticleAmbientMotionModeChange,
  onParticleLoadReductionModeChange,
  onParticleQuantizationModeChange,
}: PerformanceCrisisParticleTabProps) {
  const particlePolicyLines: PolicyLineItem[] = [
    { label: "Audio-Intent", value: selectedParticlePreset.particles.intentMode },
    { label: "Zeitbasis", value: selectedParticlePreset.particles.timeBasis },
    { label: "Catch-up", value: selectedParticlePreset.particles.catchUpStrategy },
    { label: "Preset-Krisenmodus", value: selectedParticlePreset.particles.crisisMode },
    { label: "Micro-Fenster", value: `${selectedParticlePreset.particles.maxMicroDelayMs} ms` },
    { label: "Pyramide", value: `${selectedParticlePreset.particles.pyramidMaxSubdivision}x` },
    {
      label: "Befreiungsfenster",
      value: selectedParticlePreset.particles.liberationMaxEventsPerWindow,
    },
    { label: "Max Intents/Frame", value: selectedParticlePreset.particles.maxAudioIntentsPerFrame },
    { label: "Dichte-Senkung", value: selectedParticlePreset.particles.loadReduction.mode },
    {
      label: "Dichte-Floor",
      value: `${formatNumber(selectedParticlePreset.particles.loadReduction.pressureFloor * 100)} %`,
    },
    {
      label: "min. Audio-Dichte",
      value: `${formatNumber(selectedParticlePreset.particles.loadReduction.minAudioIntentScale * 100)} %`,
    },
    { label: "starke Impulse erhalten", value: selectedParticlePreset.particles.preserveStrongImpacts },
    { label: "Diverse Impulse bevorzugen", value: selectedParticlePreset.particles.preferDiverseImpacts },
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
          Partikel-Stilquelle
        </div>
        <PresetSelect
          value={particlePresetId}
          presetIds={presetIds}
          label="Partikel-Stilquelle wählen"
          onChange={onParticlePresetChange}
        />
      </div>
      <div
        className="mb-3 grid gap-3 md:grid-cols-3"
        data-particle-crisis-agency-controls="liquid-optional"
      >
        <label className="block rounded-lg border border-neutral-800 bg-black/20 p-2 text-[11px] text-neutral-400">
          <span className="mb-1 block uppercase tracking-[0.18em] text-neutral-500">
            Partikel-Krisenmodus
          </span>
          <select
            value={particleCrisisMode}
            onChange={(event) =>
              onParticleCrisisModeChange(
                event.target.value as ParticleCrisisModeSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {PARTICLE_CRISIS_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block rounded-lg border border-neutral-800 bg-black/20 p-2 text-[11px] text-neutral-400">
          <span className="mb-1 block uppercase tracking-[0.18em] text-neutral-500">
            Partikel-Bewegung unter Druck
          </span>
          <select
            value={particleAmbientMotionMode}
            onChange={(event) =>
              onParticleAmbientMotionModeChange(
                event.target.value as ParticleAmbientMotionSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {PARTICLE_AMBIENT_MOTION_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label
          className="block rounded-lg border border-neutral-800 bg-black/20 p-2 text-[11px] text-neutral-400"
          data-particle-load-reduction-agency="optional-total-load-taper"
        >
          <span className="mb-1 block uppercase tracking-[0.18em] text-neutral-500">
            Partikel-Dichte unter Druck
          </span>
          <select
            value={particleLoadReductionMode}
            onChange={(event) =>
              onParticleLoadReductionModeChange(
                event.target.value as ParticleLoadReductionSelection,
              )
            }
            className="w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-neutral-200"
          >
            {PARTICLE_LOAD_REDUCTION_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-3">
        <ParticleCanonicalQuantizationControls
          mode={particleQuantizationMode}
          canonicalGrid={particleQuantizationGrid}
          onModeChange={onParticleQuantizationModeChange}
        />
      </div>
      <div
        className="mb-3 grid gap-2 md:grid-cols-3"
        data-crisis-truth-audit="particles"
      >
        <TruthLine status="wirksam" title="Audio-Zulassung">
          Krisenmodus und Dichtekurve sind an Audio-Intent-Shaper und
          Quantized-Collision-Flush angebunden; sie entscheiden real, wie viele
          Partikel-Audioereignisse durchkommen.
        </TruthLine>
        <TruthLine status="wirksam" title="Zeit / Quantisierung">
          Aus, Fallback und Strikt steuern real die Queue-Zeitpunkte. Das
          Raster selbst kommt für Partikel aus Zeit &amp; Echo; dadurch gibt es
          keine zweite 16tel/64stel-Wahrheit.
        </TruthLine>
        <TruthLine status="wirksam" title="Bewegung">
          Die Bewegungsdämpfung wirkt auf freien Schwarmdrift; Ringwellen und
          frischer Stoß/Schub bleiben durch getrennte Pfade erhalten.
        </TruthLine>
      </div>
      <PolicyLineGrid
        className="grid gap-3 md:grid-cols-3"
        lines={particlePolicyLines}
      />
      <div
        className="mt-3 text-[11px] leading-relaxed text-neutral-500"
        data-particle-crisis-agency-note="smooth-before-thin-liquid"
      >
        Aktiv gebunden: `lastHit` bleibt visuell/physikalisch, `lastAudioIntent`
        ist die musikalisch zugelassene Partikel-Audio-Wahrheit. Die
        Partikel-Stilquelle kann von der allgemeinen Stilvorlage abweichen. Die
        neuen Krisenmodi sind flüssig und optional: Lockerung verteilt
        Attack-Bündel in Micro-Fenstern, Pyramide verteilt Stau in feinere
        Binnenraster, Befreiung erlaubt kurz freie Partikel statt
        Catch-up-Schwall, Stabilität behält die strengere Schutzform. Die
        Bewegungsdämpfung bremst nur den freien Schwarm organisch; Ringwellen
        und Stoß/Schub bei Treffern bleiben ausdrücklich erhalten. Die neue
        Dichte-Senkung ist eine zweite, optionale Stufe nach der Glättung: erst
        verteilen, dann bei wirklichem Druck weich weniger Partikel-Audio
        zulassen. Aus/Roh und Studio-Dichte lassen diese Kurve weit offen,
        Stabil/Diagnose senken früher.
      </div>
    </div>
  );
}

export type PerformanceCrisisWaveStarterTabProps = {
  waveStarterPresetId: PerformanceCrisisPresetId;
  presetIds: readonly PerformanceCrisisPresetId[];
  selectedWaveStarterPreset: PerformanceCrisisPreset;
  waveTraffic: WaveStarterTrafficReadout;
  recentWaveTraffic: RecentWaveStarterTrafficReadout;
  onWaveStarterPresetChange: (presetId: PerformanceCrisisPresetId) => void;
};

export function PerformanceCrisisWaveStarterTab({
  waveStarterPresetId,
  presetIds,
  selectedWaveStarterPreset,
  waveTraffic,
  recentWaveTraffic,
  onWaveStarterPresetChange,
}: PerformanceCrisisWaveStarterTabProps) {
  const waveStarterPolicyLines: PolicyLineItem[] = [
    { label: "wirksam: Admission", value: selectedWaveStarterPreset.waveStarter.admissionMode },
    { label: "wirksam: max. Verzögerung", value: `${selectedWaveStarterPreset.waveStarter.maxDeferralMs} ms` },
    { label: "wirksam: Stale-Drop", value: `${selectedWaveStarterPreset.waveStarter.staleDropMs} ms` },
    {
      label: "wirksam: starke Attacks halten",
      value: selectedWaveStarterPreset.waveStarter.preserveStrongAttacks,
    },
    {
      label: "Spezial: Hold-Bridge",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.holdGestureLoopWorkletBridge,
    },
    {
      label: "Spezial: Legacy-Fallback",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.holdGestureLegacyFallback,
    },
    {
      label: "Spezial: Defer-Slot",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.deferredSlot,
    },
    {
      label: "Spezial: Failover",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.staleFailoverCandidates,
    },
    {
      label: "Spezial: Shadow",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.workletShadowMirroring,
    },
    {
      label: "Spezial: Live-Reports",
      value: selectedWaveStarterPreset.waveStarter.specialPathIsolation.liveReports,
    },
    { label: "Queue", value: waveTraffic?.queueLength ?? 0 },
    { label: "gespielt gesamt", value: waveTraffic?.playedTotal ?? 0 },
    { label: "letzte Sek. admitted", value: recentWaveTraffic?.admitted ?? 0 },
    { label: "Timer", value: Boolean(waveTraffic?.timerActive) },
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
          Wellenstarter-Stilquelle
        </div>
        <PresetSelect
          value={waveStarterPresetId}
          presetIds={presetIds}
          label="Wellenstarter-Stilquelle wählen"
          onChange={onWaveStarterPresetChange}
          formatOptionLabel={formatWaveStarterPresetOptionLabel}
        />
      </div>
      <div
        className="mb-3 grid gap-2 md:grid-cols-3"
        data-crisis-truth-audit="wave-starter"
      >
        <TruthLine status="wirksam" title="Admission-Policy">
          Die Wellenstarter-Stilquelle wird real an die Lane-Admission
          weitergegeben: open, defer oder pressure-gated verändern
          Mindestabstand, Defer-Slot und Drop-Schwellen.
        </TruthLine>
        <TruthLine status="wirksam" title="Offen heißt jetzt offen">
          Der Offen-Stil nutzt für Wellenstarter jetzt admission=open; vorher
          war diese Anzeige irreführend, weil sie intern noch Defer-Slot sagte.
        </TruthLine>
        <TruthLine status="wirksam" title="Spezialpfade sind isoliert">
          Die Wellenstarter-Stilquelle trägt jetzt echte Spezialpfad-Schalter:
          wenn Hold-Bridge, Defer, Failover, Shadow oder Reports aus sind,
          dürfen diese Pfade keine Marker, Fallbacks oder Nachfeuerungen in den
          normalen Direct-Hit-Strom einspeisen.
        </TruthLine>
      </div>
      <PolicyLineGrid
        className="grid gap-3 md:grid-cols-4"
        lines={waveStarterPolicyLines}
      />
      <div
        className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/10 p-3 text-[11px] leading-relaxed text-amber-100/80"
        data-wave-starter-restriction-forensics="root-follow-comparison"
      >
        Forensik-Hinweis: Die Wellenstarter-Lane feuert keinen
        Root-Follow-artigen Dauerstrom. Normale Direct-Hits bleiben beim
        90.61-Türsteher. Spezialpfade sind jetzt isoliert: ein ausgeschalteter
        Hold-/Defer-/Failover-/Shadow-Pfad darf weder Legacy-Fallback
        nachfeuern noch Reports/Marker als Seiteneffekt in den normalen
        Direct-Hit-Strom tragen. Eingeschaltete Pfade bleiben experimentelle
        Optionen im Krisenmanager.
      </div>
    </div>
  );
}
