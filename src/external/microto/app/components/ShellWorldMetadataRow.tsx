/**
 * Shell row: current world label, favorite indicator, mood, source.
 * Presentational only; single responsibility for world metadata display (STRUCTURE, vision §5).
 * Description, tags, and profile remain in HUD for layout order.
 */
import type { HarmonicWorld } from "../../domain/harmonicWorld";

export type WorldSource = "scene" | "gallery" | "custom" | null;

export type ShellWorldMetadataRowProps = {
  harmonicWorld: HarmonicWorld | null | undefined;
  worldSource: WorldSource;
  isFavorite?: boolean;
};

export function ShellWorldMetadataRow({
  harmonicWorld,
  worldSource,
  isFavorite = false,
}: ShellWorldMetadataRowProps) {
  if (!harmonicWorld?.label) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="uppercase tracking-widest text-neutral-500">World</span>
      <span className="text-neutral-200 flex items-center gap-1">
        {harmonicWorld.label}
        {isFavorite && (
          <span
            className="inline-flex items-center justify-center rounded-sm border border-amber-400 bg-amber-500/20 px-1 py-0.5 text-[9px] text-amber-100"
            title="This world is in your favorites"
          >
            ★
          </span>
        )}
      </span>
      {harmonicWorld.mood && (
        <span className="rounded border border-neutral-600 bg-neutral-800/90 px-1.5 py-0.5 text-[9px] text-neutral-300">
          {harmonicWorld.mood}
        </span>
      )}
      {worldSource && (
        <span className="rounded border border-neutral-700 bg-neutral-900/80 px-1.5 py-0.5 text-[9px] text-neutral-300">
          Source:{" "}
          {worldSource === "scene"
            ? "Scene"
            : worldSource === "gallery"
              ? "Gallery"
              : "Custom"}
        </span>
      )}
    </div>
  );
}
