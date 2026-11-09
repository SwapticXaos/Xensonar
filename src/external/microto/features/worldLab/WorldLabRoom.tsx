import { useEffect, useMemo, useState } from "react";
import type { Room } from "../../app/roomRegistry";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import {
  type HarmonicWorld,
  exportHarmonicWorld,
  serializeHarmonicWorldExport,
  describeHarmonicWorld,
} from "../../domain/harmonicWorld";
import { WORLD_GALLERY, type WorldJourney } from "../../domain/worldGallery";
import { getJourneysForWorldId, getTrainingFlowsForWorld } from "../harmonicWorldSpine";
import type { TrainingFlow } from "../../domain/trainingFlows";
import {
  addFavoriteWorld,
  isFavoriteWorld,
  loadWorldFavorites,
  removeFavoriteWorld,
  saveWorldFavorites,
  WORLD_FAVORITES_STORAGE_KEY,
  type WorldFavorite,
} from "../../domain/worldFavorites";
import { useStorageKeyListener } from "../../shared/browser/useStorageKeyListener";

type WorldLabRoomProps = {
  room: Room;
  onBack: () => void;
  globalHarmonicContext?: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld;
};

export function WorldLabRoom({
  room,
  onBack,
  globalHarmonicContext,
  harmonicWorld,
}: WorldLabRoomProps) {
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState<WorldFavorite[]>([]);

  useEffect(() => {
    setFavorites(loadWorldFavorites());
  }, []);

  useStorageKeyListener(WORLD_FAVORITES_STORAGE_KEY, () => setFavorites(loadWorldFavorites()));

  const exportJson = useMemo(() => {
    if (!harmonicWorld) return "";
    const data = exportHarmonicWorld(harmonicWorld);
    return serializeHarmonicWorldExport(data, pretty);
  }, [harmonicWorld, pretty]);

  const journeysForWorld: WorldJourney[] = useMemo(
    () => getJourneysForWorldId(harmonicWorld?.id ?? null),
    [harmonicWorld],
  );

  const trainingFlowsForWorld: TrainingFlow[] = useMemo(
    () => (harmonicWorld ? (getTrainingFlowsForWorld(harmonicWorld.id ?? null) as TrainingFlow[]) : []),
    [harmonicWorld],
  );

  const handleCopy = async () => {
    if (!exportJson) return;
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const activeSummary =
    harmonicWorld && globalHarmonicContext ? describeHarmonicWorld(harmonicWorld) : null;

  const isFavorite = harmonicWorld ? isFavoriteWorld(favorites, harmonicWorld) : false;
  const isGalleryWorld =
    !!harmonicWorld && WORLD_GALLERY.some((entry) => entry.id && entry.id === (harmonicWorld.id ?? null));

  const toggleFavorite = () => {
    if (!harmonicWorld) return;
    setFavorites((current) => {
      const exists = isFavoriteWorld(current, harmonicWorld);
      if (exists) {
        const target = current.find((fav) => fav.id === (harmonicWorld.id ?? null));
        if (!target) return current;
        const next = removeFavoriteWorld(current, target);
        saveWorldFavorites(next);
        return next;
      }
      const next = addFavoriteWorld(current, harmonicWorld);
      saveWorldFavorites(next);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-black text-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">
            Harmonic World Lab
          </div>
          <div className="text-neutral-100 text-sm">
            Inspect and export the active harmonic world
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-200 hover:border-neutral-500"
        >
          ← Back to Synth
        </button>
      </div>

      <div className="border-b border-neutral-900 px-4 py-2 text-[11px] bg-neutral-950/60">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Active world
            </div>
            {harmonicWorld ? (
              <>
                <div className="font-semibold text-neutral-100 mb-0.5">
                  {harmonicWorld.label ?? "Unnamed world"}
                </div>
                {activeSummary && (
                  <div className="text-neutral-400 mb-0.5">{activeSummary}</div>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  {isGalleryWorld && (
                    <span className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300">
                      Gallery world
                    </span>
                  )}
                  {isFavorite && (
                    <span className="rounded border border-amber-500 bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-100">
                      ★ Favorite
                    </span>
                  )}
                </div>
                {journeysForWorld.length > 0 && (
                  <div className="mt-1 text-[10px] text-neutral-400">
                    <div className="mb-0.5 uppercase tracking-widest text-[9px] text-neutral-500">
                      Journeys using this world
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {journeysForWorld.map((journey) => (
                        <span
                          key={journey.id}
                          className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5"
                          title={journey.description}
                        >
                          {journey.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {trainingFlowsForWorld.length > 0 && (
                  <div className="mt-1 text-[10px] text-neutral-400">
                    <div className="mb-0.5 uppercase tracking-widest text-[9px] text-neutral-500">
                      Training flows using this world
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trainingFlowsForWorld.map((flow) => (
                        <span
                          key={flow.id}
                          className="rounded border border-sky-700 bg-sky-900/40 px-1.5 py-0.5 text-sky-100"
                          title={flow.description}
                        >
                          {flow.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-neutral-500">
                No active harmonic world yet. Set a root in the synth or load a scene first.
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">
              Room
            </div>
            <div className="text-neutral-200 text-xs">{room}</div>
          </div>
        </div>
        {harmonicWorld && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 text-[10px] text-neutral-300">
              {harmonicWorld.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              className="ml-auto rounded border border-amber-500 px-2 py-0.5 text-[10px] text-amber-100 hover:border-amber-300 hover:bg-amber-500/20"
              title={
                isFavorite ? "Remove this world from your favorites" : "Add this world to your favorites"
              }
            >
              {isFavorite ? "★ Unfavorite" : "☆ Favorite"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 text-xs">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
            World export JSON
          </span>
          <button
            type="button"
            onClick={() => setPretty((v) => !v)}
            className="rounded border border-neutral-700 px-2 py-1 text-[10px] text-neutral-300 hover:border-neutral-500"
          >
            Format: {pretty ? "Pretty" : "Compact"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!exportJson}
            className={`rounded border px-2 py-1 text-[10px] transition-colors ${
              exportJson
                ? "border-emerald-500/80 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/10"
                : "cursor-not-allowed border-neutral-800 text-neutral-600 bg-neutral-900/60"
            }`}
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <textarea
          readOnly
          value={
            exportJson ||
            "// No active harmonic world. Open the synth, set a root or load a scene, then return here."
          }
          rows={18}
          className="w-full min-h-[240px] resize-y rounded border border-neutral-800 bg-black/70 px-2 py-2 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-neutral-500"
        />
      </div>
    </div>
  );
}

