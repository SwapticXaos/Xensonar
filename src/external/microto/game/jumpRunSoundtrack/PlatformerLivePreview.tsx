/**
 * Live arrangement preview: composer telemetry and section timeline cards.
 * Extracted from JumpRunSoundtrackRoom to reduce room LOC.
 */

import type { PlatformerComposerPreview } from "./platformerComposerPreview";
import { formatPlatformerSectionBias } from "./platformerSectionBias";

export type PlatformerLivePreviewProps = {
  composerPreview: PlatformerComposerPreview;
  onAuditionForm: () => Promise<void>;
  onAuditionSection: (section: "A" | "B" | "C") => Promise<void>;
};

export function PlatformerLivePreview({
  composerPreview,
  onAuditionForm,
  onAuditionSection,
}: PlatformerLivePreviewProps) {
  return (
    <div className="mt-3 border border-neutral-800 bg-black/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Live Arrangement Preview</div>
          <div className="text-xs text-neutral-400">
            Reads the current run plus obstacle hits through the same arranger that drives FINISH playback.
          </div>
        </div>
        <div className="text-[11px] text-neutral-500">
          {composerPreview.ready
            ? `${composerPreview.formLabel} · ${composerPreview.targetBpm} BPM · ${composerPreview.routeSignature} ${composerPreview.routeMode.toUpperCase()} · ${composerPreview.routeColor} · ${formatPlatformerSectionBias(composerPreview.sectionBias)}`
            : "Move through the level to sketch the suite"}
        </div>
      </div>
      {composerPreview.ready ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">
              Section Bias: <span className="text-lime-300">{formatPlatformerSectionBias(composerPreview.sectionBias)}</span>
            </div>
            <button
              type="button"
              onClick={() => void onAuditionForm()}
              className="px-2 py-2 border border-cyan-800 bg-cyan-950/20 text-cyan-100 hover:bg-cyan-950/40"
            >
              Audition Form
            </button>
            <button
              type="button"
              onClick={() => void onAuditionSection("A")}
              className="px-2 py-2 border border-sky-800 bg-sky-950/20 text-sky-100 hover:bg-sky-950/40"
            >
              Audition A
            </button>
            <button
              type="button"
              onClick={() => void onAuditionSection("B")}
              className="px-2 py-2 border border-emerald-800 bg-emerald-950/20 text-emerald-100 hover:bg-emerald-950/40"
            >
              Audition B
            </button>
            <button
              type="button"
              onClick={() => void onAuditionSection("C")}
              className="px-2 py-2 border border-fuchsia-800 bg-fuchsia-950/20 text-fuchsia-100 hover:bg-fuchsia-950/40"
            >
              Audition C
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-3 text-[11px]">
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Form: <span className="text-lime-300">{composerPreview.formLabel}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Target BPM: <span className="text-teal-300">{composerPreview.targetBpm}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Section Bias: <span className="text-lime-300">{formatPlatformerSectionBias(composerPreview.sectionBias)}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Phase Focus: <span className="text-emerald-300">{composerPreview.phaseFocus}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Rest Density: <span className="text-cyan-300">{(composerPreview.restDensity * 100).toFixed(0)}%</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Route Shape: <span className="text-lime-300">{composerPreview.routeSignature} {composerPreview.routeMode.toUpperCase()}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Route Lean: <span className="text-emerald-300">{composerPreview.routeBias >= 0 ? "+" : ""}{composerPreview.routeBias.toFixed(2)}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Route Shift: <span className="text-cyan-300">{composerPreview.routeTravel >= 0 ? "+" : ""}{composerPreview.routeTravel.toFixed(2)}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Route Color: <span className="text-fuchsia-300">{composerPreview.routeColor}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Route Groove: <span className="text-rose-300">{composerPreview.routeGroove}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Lead Voice: <span className="text-violet-300">{composerPreview.routeLeadVoice}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Ground Motif: <span className="text-sky-300">{composerPreview.motifLengths.ground}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Air Motif: <span className="text-violet-300">{composerPreview.motifLengths.air}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Accent Motif: <span className="text-amber-300">{composerPreview.motifLengths.accent}</span></div>
            <div className="border border-neutral-800 bg-neutral-950/70 px-2 py-2">Cadence Roots: <span className="text-rose-300">{composerPreview.motifLengths.cadence}/{composerPreview.motifLengths.roots}</span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {composerPreview.timeline.map((slot) => {
              const labelTone = slot.label === "A"
                ? "text-cyan-200 border-cyan-900/60 bg-cyan-950/10"
                : slot.label === "B"
                  ? "text-emerald-200 border-emerald-900/60 bg-emerald-950/10"
                  : "text-pink-200 border-pink-900/60 bg-pink-950/10";
              return (
                <div
                  key={`${slot.slotIndex}-${slot.label}`}
                  className={`border p-3 ${labelTone}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Slot {slot.slotIndex + 1}: {slot.label}</span>
                    <span className="text-neutral-400">root {slot.root >= 0 ? "+" : ""}{slot.root}</span>
                  </div>
                  <div className="mt-3 space-y-2 text-[11px] text-neutral-300">
                    <div>
                      <div className="flex justify-between mb-1"><span>Density</span><span>{slot.density.toFixed(2)}</span></div>
                      <div className="h-2 bg-neutral-900"><div className="h-full bg-emerald-400/80" style={{ width: `${Math.max(8, Math.min(slot.density / 1.35, 1) * 100)}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span>Air Ratio</span><span>{slot.airRatio.toFixed(2)}</span></div>
                      <div className="h-2 bg-neutral-900"><div className="h-full bg-cyan-400/80" style={{ width: `${Math.max(6, slot.airRatio * 100)}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span>Tension Peak</span><span>{slot.tensionPeak.toFixed(2)}</span></div>
                      <div className="h-2 bg-neutral-900"><div className="h-full bg-fuchsia-400/80" style={{ width: `${Math.max(6, slot.tensionPeak * 100)}%` }} /></div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] text-neutral-400">
                    <span>Lead {slot.leadSteps}</span>
                    <span>Rest {slot.restSteps}</span>
                    <span>Accent {slot.accentPeak.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-3 text-[11px] text-neutral-500">
          The preview stays empty until the room has actual captured movement DNA. Footsteps, jumps, forks, vines, crystals, and silence fields all rewrite this timeline live.
        </div>
      )}
    </div>
  );
}
