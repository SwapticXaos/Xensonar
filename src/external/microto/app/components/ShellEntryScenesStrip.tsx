import type { ResonanceScene, ResonanceSceneId } from "../../features/resonance/config/scenes";
import type { Room } from "../roomRegistry";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { SHELL_ENTRY_SCENES_LABEL } from "../copy";

export type ShellEntryScenesStripProps = {
  /** Spine-backed calm/intro scenes recommended for new players. */
  scenes: ResonanceScene[];
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onSelectRoom: (room: Room) => void;
  /** Optional: enable audio before loading a scene (zero-friction entry). */
  onEnableAudio?: EnsureAudio;
  /**
   * Optional: current catalog scene id, used to drive the "Next intro scene"
   * button so players can step through the calm entry lane as a lightweight journey.
   */
  currentSceneId?: ResonanceSceneId | null;
};

export function ShellEntryScenesStrip({
  scenes,
  onSelectResonanceScene,
  onSelectRoom,
  onEnableAudio,
  currentSceneId,
}: ShellEntryScenesStripProps) {
  if (scenes.length === 0 || !onSelectResonanceScene) {
    return null;
  }

  const runScene = (sceneId: ResonanceSceneId) => {
    const go = () => {
      onSelectResonanceScene(sceneId);
      onSelectRoom("RESONANCE");
    };

    if (onEnableAudio) {
      void onEnableAudio().then(go);
    } else {
      go();
    }
  };

  const handleSelect = (sceneId: ResonanceSceneId) => {
    runScene(sceneId);
  };

  const handleNextIntroScene = () => {
    if (scenes.length === 0) return;
    const firstScene = scenes[0];
    if (!firstScene) return;
    if (!currentSceneId) {
      runScene(firstScene.id);
      return;
    }
    const index = scenes.findIndex((scene) => scene.id === currentSceneId);
    const nextIndex = index >= 0 ? (index + 1) % scenes.length : 0;
    const nextScene = scenes[nextIndex] ?? firstScene;
    runScene(nextScene.id);
  };

  return (
    <div className="mt-1 flex flex-wrap gap-1 items-center">
      <span className="text-[9px] text-neutral-500 uppercase tracking-widest">{SHELL_ENTRY_SCENES_LABEL}</span>
      <button
        type="button"
        onClick={handleNextIntroScene}
        className="px-2 py-0.5 border border-emerald-700 text-[10px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-900/40"
        title="Step through the calm intro scenes as a gentle journey"
      >
        Next intro scene
      </button>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          type="button"
          onClick={() => handleSelect(scene.id)}
          className="px-2 py-0.5 border border-neutral-700 text-[10px] text-neutral-200 hover:border-emerald-500 hover:bg-emerald-900/40"
          title={scene.description ?? scene.label}
        >
          {scene.label}
        </button>
      ))}
    </div>
  );
}

