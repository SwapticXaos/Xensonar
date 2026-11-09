import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { exportMatchesWorld } from "../../domain/harmonicWorld";
import type { Room } from "../roomRegistry";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { harmonicWorldSpineApi } from "../../features/harmonicWorldSpineApi";

type ShellDifficultyLadderStripProps = {
  harmonicWorld: HarmonicWorld | null;
  /** Training flows that include the current world (from spine API). */
  trainingFlowsForWorld: ReturnType<typeof harmonicWorldSpineApi.getTrainingFlowsForWorld>;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onSelectRoom: (room: Room) => void;
  onEnableAudio?: EnsureAudio;
};

export function ShellDifficultyLadderStrip({
  harmonicWorld,
  trainingFlowsForWorld,
  onImportWorld,
  onSelectRoom,
  onEnableAudio,
}: ShellDifficultyLadderStripProps) {
  if (!harmonicWorld || !onImportWorld || trainingFlowsForWorld.length === 0) {
    return null;
  }

  const primaryFlow = trainingFlowsForWorld[0];
  const ladder = harmonicWorldSpineApi.getWorldsForTrainingFlow(primaryFlow.id);

  if (!ladder.length) {
    return null;
  }

  const currentIndex = ladder.findIndex((entry) => exportMatchesWorld(entry, harmonicWorld));
  if (currentIndex === -1) {
    return null;
  }

  const prev = ladder[currentIndex - 1] ?? null;
  const next = ladder[currentIndex + 1] ?? null;

  const handleJump = (target: HarmonicWorldExport | null) => {
    if (!target) return;
    if (onEnableAudio) {
      void onEnableAudio().then(() => {
        onImportWorld(target);
        onSelectRoom("RESONANCE");
      });
    } else {
      onImportWorld(target);
      onSelectRoom("RESONANCE");
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-neutral-400">
      <span className="uppercase tracking-widest text-neutral-500 mr-1">
        Difficulty ladder
      </span>
      {prev && (
        <button
          type="button"
          onClick={() => handleJump(prev)}
          className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-200 hover:border-emerald-500 hover:bg-emerald-900/40"
          title="Step to an earlier world in this training ladder"
        >
          ◀ Earlier
        </button>
      )}
      <span className="px-2 py-0.5 border border-neutral-800 bg-neutral-900/60 text-[10px] text-neutral-300 rounded-sm">
        {primaryFlow.label}
      </span>
      {next && (
        <button
          type="button"
          onClick={() => handleJump(next)}
          className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-200 hover:border-emerald-500 hover:bg-emerald-900/40"
          title="Step to the next world in this training ladder"
        >
          Later ▶
        </button>
      )}
    </div>
  );
}

