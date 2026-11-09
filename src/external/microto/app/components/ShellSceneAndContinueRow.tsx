/**
 * Shell HUD: scene selector pills + "Continue world in" row (vision §5 discoverability).
 * Extracted from AppShellHarmonicWorldHud for LOC discipline and single responsibility (vision §8).
 */
import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import { getRoomRegistryEntry, type Room } from "../roomRegistry";
import type { EnsureAudio } from "../../shared/audio/audioInit";

export type ShellSceneAndContinueRowProps = {
  /** Scene selector: list of { id, label, description }; when omitted, scene row is hidden. */
  scenes?: readonly { id: ResonanceSceneId; label: string; description: string }[];
  currentSceneId?: ResonanceSceneId;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional: enable audio before loading scene (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
  /** Recommended room IDs to show when harmonicWorld is set; always show Gallery + World Lab. */
  recommendedRoomIds: Room[];
  onSelectRoom: (room: Room) => void;
  /** When true, show recommended rooms before Gallery/World Lab. */
  hasWorld: boolean;
};

export function ShellSceneAndContinueRow({
  scenes = [],
  currentSceneId,
  onSelectResonanceScene,
  onEnableAudio,
  recommendedRoomIds,
  onSelectRoom,
  hasWorld,
}: ShellSceneAndContinueRowProps) {
  const handleSceneClick = (sceneId: ResonanceSceneId) => {
    if (onEnableAudio) {
      void onEnableAudio().then(() => onSelectResonanceScene?.(sceneId));
    } else {
      onSelectResonanceScene?.(sceneId);
    }
  };

  return (
    <>
      {onSelectResonanceScene && scenes.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-end">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleSceneClick(scene.id)}
              className={`px-2 py-0.5 border text-[10px] tracking-wide ${
                scene.id === currentSceneId
                  ? "border-emerald-400 text-emerald-200 bg-emerald-500/10"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
              }`}
              title={scene.description}
            >
              {scene.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex gap-1 flex-wrap justify-end">
        <span className="mr-1 text-neutral-500 uppercase tracking-widest">Continue world in</span>
        {hasWorld && recommendedRoomIds.length > 0 &&
          recommendedRoomIds.map((roomId) => {
            const entry = getRoomRegistryEntry(roomId);
            return (
              <button
                key={roomId}
                type="button"
                onClick={() => onSelectRoom(roomId)}
                className="px-2 py-0.5 border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
                title={entry.intentLabel}
              >
                {entry.label}
              </button>
            );
          })}
        <button
          type="button"
          onClick={() => onSelectRoom("WORLDGALLERY")}
          className="px-2 py-0.5 border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
        >
          Gallery
        </button>
        <button
          type="button"
          onClick={() => onSelectRoom("WORLDLAB")}
          className="px-2 py-0.5 border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-900"
        >
          World Lab
        </button>
      </div>
    </>
  );
}
