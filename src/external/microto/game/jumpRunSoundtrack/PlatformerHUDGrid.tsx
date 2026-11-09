/**
 * HUD grid: score, lives, composition metrics, route telemetry.
 * Extracted from JumpRunSoundtrackRoom to reduce room LOC.
 * Uses PlatformerHudState from platformerHudHelpers (single source).
 */

import type { PlatformerHudState } from "./platformerHudHelpers";

export type PlatformerHUDGridProps = {
  hud: PlatformerHudState;
};

export function PlatformerHUDGrid({ hud }: PlatformerHUDGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3 text-xs">
      <div className="border border-neutral-800 p-2 bg-black/40">Score: <span className="text-cyan-200">{hud.score}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Lives: <span className="text-rose-200">{hud.lives}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Coins: <span className="text-amber-200">{hud.collected}/{hud.totalCoins}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Phrase Size: <span className="text-emerald-200">{hud.combo}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Form: <span className="text-lime-200">{hud.form}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Events: <span className="text-sky-200">{hud.events}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Sync Hits: <span className="text-emerald-300">{hud.syncHits}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Phase Hits: <span className="text-green-300">{hud.phaseHits}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Tuning Hits: <span className="text-teal-300">{hud.tuningHits}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Fork Hits: <span className="text-lime-300">{hud.forkHits}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Rest Fields: <span className="text-emerald-200">{hud.restHits}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Preview Slots: <span className="text-sky-200">{hud.previewSlots}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Puzzle: <span className="text-fuchsia-200">{hud.puzzleSteps}/{hud.puzzleTotal}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Gates Open: <span className="text-cyan-200">{hud.gatesOpen}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Action Drive: <span className="text-rose-200">{(hud.actionDrive * 100).toFixed(0)}%</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Rest Density: <span className="text-cyan-200">{(hud.restDensity * 100).toFixed(0)}%</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route I: <span className="text-lime-200">{hud.routeOne}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route II: <span className="text-lime-200">{hud.routeTwo}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route Mode: <span className="text-emerald-200">{hud.routeMode}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route Lean: <span className="text-lime-200">{hud.routeBias >= 0 ? "+" : ""}{hud.routeBias.toFixed(2)}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route Shift: <span className="text-cyan-200">{hud.routeTravel >= 0 ? "+" : ""}{hud.routeTravel.toFixed(2)}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route Color: <span className="text-fuchsia-200">{hud.routeColor}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Route Groove: <span className="text-rose-200">{hud.routeGroove}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Lead Voice: <span className="text-violet-200">{hud.routeLeadVoice}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Section Bias: <span className="text-lime-200">{hud.sectionBias}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Comp BPM: <span className="text-teal-200">{hud.targetTempo}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Complexity: <span className="text-fuchsia-200">{hud.complexity.toFixed(2)}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Cycle: <span className="text-indigo-200">{hud.cycle}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Phase Focus: <span className="text-lime-300">{hud.phaseFocus}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Tuning Tilt: <span className="text-cyan-300">{hud.tuningTilt >= 0 ? "+" : ""}{hud.tuningTilt.toFixed(2)}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Fork Bias: <span className="text-lime-200">{hud.forkBias >= 0 ? "+" : ""}{hud.forkBias.toFixed(2)}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Tuning: <span className="text-cyan-300">{hud.tuning}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Mode: <span className="text-teal-300">{hud.arrangement}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Form Engine: <span className="text-lime-300">{hud.formMode.toUpperCase()}</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Evolution: <span className="text-sky-300">{(hud.evolution * 100).toFixed(0)}%</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">Tempo Follow: <span className="text-teal-300">{(hud.tempoFollow * 100).toFixed(0)}%</span></div>
      <div className="border border-neutral-800 p-2 bg-black/40">State: <span className="text-violet-200">{hud.status}</span></div>
    </div>
  );
}
