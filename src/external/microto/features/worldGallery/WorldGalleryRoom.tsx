import { useMemo, useState } from "react";
import type { Room } from "../../app/roomRegistry";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import { RESONANCE_SCENES, type ResonanceSceneId, type ResonanceScene } from "../resonance/config/scenes";
import { getMoodsWithSceneCount } from "../resonance/config/sceneCatalog";
import type { HarmonicWorld } from "../../domain/harmonicWorld";
import { worldFromSlices, describeHarmonicWorld, exportMatchesWorld } from "../../domain/harmonicWorld";
import { getWorldNote, setWorldNote } from "../../domain/worldNotes";
import { loadWorldFavorites, WORLD_FAVORITES_STORAGE_KEY, type WorldFavorite } from "../../domain/worldFavorites";
import { useStorageKeyListener } from "../../shared/browser/useStorageKeyListener";
import {
  getAllGalleryWorldExports,
  getAllWorldJourneys,
  getTrainingWorldJourneys,
} from "../harmonicWorldSpine";
import { getTrainingFlows, type TrainingFlow } from "../../domain/trainingFlows";
import { getPracticeGoals, type PracticeGoal } from "../../domain/practiceGoals";
import type { LaunchContext } from "../runtime/launch";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import {
  launchPracticeGoal,
  launchScene,
  launchTrainingFlow,
  launchRandomTrainingFlow,
} from "../runtime/launch";
import { harmonicWorldSpineApi } from "../harmonicWorldSpineApi";
import { getLastPracticeSceneId } from "../../app/practiceSessionMemory";
import { WorldJourneyStrip } from "../../app/components/WorldJourneyStrip";
import { PracticeLadderHeader } from "../../app/components/PracticeLadderHeader";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { WorldGalleryFilterBar } from "./WorldGalleryFilterBar";
import { WorldGalleryGrid } from "./WorldGalleryGrid";
import { useWorldGalleryFilters } from "./useWorldGalleryFilters";
import { useWorldGalleryRoomActions } from "./useWorldGalleryRoomActions";
import { PracticeGoalsStrip } from "../../app/components/PracticeGoalsStrip";
import { TrainingFlowsStrip } from "../../app/components/TrainingFlowsStrip";

/** Moods in display order (same as Shell/Welcome; stable filter pills). */
const GALLERY_MOODS = getMoodsWithSceneCount().map((m) => m.mood);

type WorldGalleryRoomProps = {
  room: Room;
  onBack: () => void;
  globalHarmonicContext?: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onImportWorld?: (data: import("../../domain/harmonicWorld").HarmonicWorldExport) => void;
  /** Optional: play a short audio preview of a gallery world (base frequency ping). */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  onSelectRoom: (room: Room) => void;
  initAudio: EnsureAudio;
};

export type GalleryWorld = {
  scene: ResonanceScene;
  world: HarmonicWorld;
  summary: string;
  note: string;
};

function buildGalleryWorlds(global: GlobalHarmonicContext | undefined): GalleryWorld[] {
  if (!global) return [];
  return RESONANCE_SCENES.map((scene) => {
    const world = worldFromSlices({ global, scene });
    return {
      scene,
      world,
      summary: describeHarmonicWorld(world),
      note: getWorldNote(world),
    };
  });
}

type TrainingCourseOverviewProps = {
  flows: readonly TrainingFlow[];
  launchContext: LaunchContext;
  currentSceneId: ResonanceSceneId | null;
};

function TrainingCourseOverview({ flows, launchContext, currentSceneId }: TrainingCourseOverviewProps) {
  if (flows.length === 0) return null;

  const sceneIndex = new Map<ResonanceSceneId, ResonanceScene>();
  for (const scene of RESONANCE_SCENES) {
    sceneIndex.set(scene.id, scene);
  }

  const currentId = currentSceneId ?? null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-sky-400">Training courses overview</div>
        <div className="text-[10px] text-neutral-500">
          Each course is a short ladder of scenes. Click any step to jump into that part of the flow; your current step
          is highlighted when it matches your last practice scene.
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {flows.map((flow) => {
          const steps = flow.sceneIds
            .map((id) => sceneIndex.get(id))
            .filter((scene): scene is ResonanceScene => Boolean(scene));

          if (steps.length === 0) return null;

          return (
            <div
              key={flow.id}
              className="rounded border border-sky-800/80 bg-sky-950/40 px-3 py-2 text-[11px] text-neutral-100"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="font-semibold text-sky-100">{flow.label}</div>
                <div className="text-[10px] text-sky-300">
                  {steps.length} step{steps.length === 1 ? "" : "s"}
                </div>
              </div>
              {flow.description && (
                <div className="mb-1 text-[10px] text-neutral-400">{flow.description}</div>
              )}
              <div className="flex flex-wrap gap-1">
                {steps.map((scene, index) => {
                  const isCurrent = currentId != null && scene.id === currentId;
                  const baseClasses =
                    "rounded border px-2 py-0.5 text-[10px] transition-colors whitespace-nowrap";
                  const variantClasses = isCurrent
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-50"
                    : "border-sky-700 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20";

                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        void launchScene(scene.id, launchContext);
                      }}
                      className={`${baseClasses} ${variantClasses}`}
                      title={scene.description}
                    >
                      {index + 1}. {scene.label}
                      {isCurrent ? " · You are here" : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorldGalleryRoom({
  room,
  onBack,
  globalHarmonicContext,
  harmonicWorld,
  onSelectResonanceScene,
  onImportWorld,
  onPreviewWorldTone,
  onSelectRoom,
  initAudio,
}: WorldGalleryRoomProps) {
  const [notesVersion, setNotesVersion] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  /** Local cache of world favorites, backed by localStorage (vision: worlds as first-class, portable objects). */
  const [favorites, setFavorites] = useState<WorldFavorite[]>(() => loadWorldFavorites());
  const [showCourseOverview, setShowCourseOverview] = useState(false);

  useStorageKeyListener(WORLD_FAVORITES_STORAGE_KEY, () => setFavorites(loadWorldFavorites()));

  const allWorlds = useMemo(
    () => buildGalleryWorlds(globalHarmonicContext),
    [globalHarmonicContext, notesVersion],
  );

  const filters = useWorldGalleryFilters(allWorlds, favorites);
  const {
    worlds,
    moodFilter,
    setMoodFilter,
    tagFilter,
    setTagFilter,
    intensityFilter,
    setIntensityFilter,
    difficultyFilter,
    setDifficultyFilter,
    journeyFilter,
    setJourneyFilter,
    practiceGoalFilter,
    setPracticeGoalFilter,
    roomFilterRooms,
    setRoomFilterRooms,
    favoritesOnly,
    setFavoritesOnly,
    trainingOnly,
    setTrainingOnly,
    galleryTags,
    roomFilterOptions,
    hasActiveFilters,
    onClearFilters,
  } = filters;

  const actions = useWorldGalleryRoomActions({
    onSelectResonanceScene,
    onImportWorld,
    onSelectRoom,
    allWorlds,
    worlds,
    setFavorites,
  });

  const journeys = getAllWorldJourneys();
  const trainingJourneys = useMemo(() => getTrainingWorldJourneys(), []);
  const trainingFlows = getTrainingFlows();
  const curatedExports = getAllGalleryWorldExports();
  const { firstRunHint, showFirstRunHint, dismissHint } = useRoomFirstRunHint("WORLDGALLERY");
  const practiceGoals = getPracticeGoals();

  const lastPracticeSceneId = getLastPracticeSceneId();
  const lastPracticeScene =
    lastPracticeSceneId != null
      ? RESONANCE_SCENES.find((s) => s.id === lastPracticeSceneId) ?? null
      : null;
  const nextPracticeEntry =
    lastPracticeSceneId != null
      ? harmonicWorldSpineApi.getNextSceneInAnyGoal(lastPracticeSceneId)
      : null;

  const launchContext: LaunchContext = {
    initAudio,
    setRoom: onSelectRoom,
    onSelectResonanceScene,
    onImportWorld,
  };

  return (
    <div className="flex h-full flex-col bg-black text-neutral-100">
      {showFirstRunHint && firstRunHint && (
        <div className="flex items-center justify-between gap-2 border-b border-neutral-700 bg-neutral-900/80 px-4 py-2 text-xs text-neutral-300">
          <span>{firstRunHint}</span>
          <button
            type="button"
            onClick={dismissHint}
            className="shrink-0 rounded border border-neutral-600 px-2 py-1 text-[11px] hover:border-neutral-500 hover:bg-neutral-800"
          >
            Got it
          </button>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500">Harmonic World Gallery</div>
          <div className="text-neutral-100 text-sm">Browse worlds · Load into rooms</div>
          <PracticeLadderHeader
            lastPracticeScene={lastPracticeScene}
            nextPracticeEntry={nextPracticeEntry}
            launchContext={launchContext}
          />
        </div>
        <div className="flex items-center gap-2">
          {practiceGoals.length > 0 && (onSelectResonanceScene || onImportWorld) && (
            <PracticeGoalsStrip
              goals={practiceGoals}
              onGoalClick={(goal: PracticeGoal) => {
                void launchPracticeGoal(goal.id, launchContext);
              }}
            />
          )}
          {trainingFlows.length > 0 && (onSelectResonanceScene || onImportWorld) && (
            <TrainingFlowsStrip
              flows={trainingFlows}
              onFlowClick={(flow: TrainingFlow) => {
                void launchTrainingFlow(flow.id, launchContext);
              }}
              onSurpriseFlowClick={() => {
                void launchRandomTrainingFlow(launchContext);
              }}
            />
          )}
          {trainingFlows.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCourseOverview((value) => !value)}
              className="rounded border border-sky-700 bg-sky-500/5 px-2 py-1 text-[10px] text-sky-100 hover:border-sky-400 hover:bg-sky-500/15 transition-colors"
              title="View an overview of authored training courses and jump to any step."
            >
              {showCourseOverview ? "Hide courses" : "View courses"}
            </button>
          )}
          {journeys.length > 0 && onImportWorld && (
            <div className="hidden md:flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-widest text-neutral-600 mr-1">Journeys</span>
              {journeys.slice(0, 2).map((journey) => (
                <button
                  key={journey.id}
                  type="button"
                  onClick={() => actions.handleStartJourney(journey)}
                  className="rounded border border-emerald-700 px-2 py-1 text-[10px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  title={journey.description}
                >
                  Start: {journey.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={actions.handleSurpriseWorld}
            disabled={!onSelectResonanceScene || allWorlds.length === 0}
            className={`rounded border px-2 py-1 text-[11px] transition-colors ${
              !onSelectResonanceScene || allWorlds.length === 0
                ? "cursor-not-allowed border-neutral-800 text-neutral-600 bg-neutral-900/60"
                : "border-neutral-700 text-neutral-200 hover:border-amber-400 hover:bg-amber-500/10"
            }`}
          >
            Surprise world
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded border border-neutral-700 px-2 py-1 text-[11px] text-neutral-200 hover:border-neutral-500"
          >
            ← Back to Synth
          </button>
        </div>
      </div>

      {harmonicWorld && (
        <div className="border-b border-neutral-900 px-4 py-2 text-[11px] bg-neutral-950/60">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-neutral-500">Active world</div>
          <div className="font-semibold text-neutral-100 mb-0.5">
            {harmonicWorld.label ?? "Unnamed world"}
          </div>
          <div className="text-neutral-400 mb-0.5">
            {describeHarmonicWorld(harmonicWorld)}
          </div>
          <WorldJourneyStrip world={harmonicWorld} activeRoom={room} onSelectRoom={onSelectRoom} />
        </div>
      )}

      {curatedExports.length > 0 && onImportWorld && (
        <div className="border-b border-neutral-900 px-4 py-2 text-[11px] bg-neutral-950/40">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-neutral-500">Curated worlds</div>
            {journeys.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {journeys.map((journey) => (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => actions.handleStartJourney(journey)}
                    className="rounded border border-neutral-700 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-300 hover:border-emerald-400 hover:text-emerald-100 transition-colors"
                    title={journey.description}
                  >
                    {journey.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {trainingJourneys.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="text-neutral-400">
                Training journeys are short, authored paths like{" "}
                <span className="text-emerald-200">
                  {trainingJourneys[0]?.label}
                  {trainingJourneys[1] ? " or " : null}
                  {trainingJourneys[1]?.label}
                </span>{" "}
                that walk from reference orbits into motion-ready worlds.
              </span>
              <div className="flex flex-wrap gap-1">
                {trainingJourneys.slice(0, 3).map((journey) => (
                  <button
                    key={journey.id}
                    type="button"
                    onClick={() => actions.handleStartJourney(journey)}
                    className="rounded border border-emerald-600/80 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    title={journey.description}
                  >
                    Start training: {journey.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {curatedExports.map((w) => {
              const isActive = Boolean(harmonicWorld && exportMatchesWorld(w, harmonicWorld));
              return (
                <button
                  key={w.id ?? w.label ?? w.exportedAt}
                  type="button"
                  onClick={() => {
                    onImportWorld(w);
                    onSelectRoom("RESONANCE");
                  }}
                  className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                    isActive
                      ? "border-amber-400/80 bg-amber-500/10 text-amber-200"
                      : "border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900"
                  }`}
                  title={[w.description, w.mood ? `Mood: ${w.mood}` : null].filter(Boolean).join(" · ") || undefined}
                >
                  {w.label ?? w.id ?? "World"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCourseOverview && trainingFlows.length > 0 && (
        <div className="border-b border-neutral-900 px-4 py-2 text-[11px] bg-neutral-950/60">
          <TrainingCourseOverview
            flows={trainingFlows}
            launchContext={launchContext}
            currentSceneId={lastPracticeSceneId ?? null}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto px-4 py-3 text-xs">
        {(allWorlds.length > 0 && GALLERY_MOODS.length > 0) || galleryTags.length > 0 ? (
          <WorldGalleryFilterBar
            moods={GALLERY_MOODS}
            galleryTags={galleryTags}
            roomFilterOptions={roomFilterOptions}
            journeys={journeys}
            trainingJourneys={trainingJourneys}
            favoritesCount={favorites.length}
            moodFilter={moodFilter}
            setMoodFilter={setMoodFilter}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            intensityFilter={intensityFilter}
            setIntensityFilter={setIntensityFilter}
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={setDifficultyFilter}
            journeyFilter={journeyFilter}
            setJourneyFilter={setJourneyFilter}
            practiceGoalFilter={practiceGoalFilter}
            setPracticeGoalFilter={setPracticeGoalFilter}
            roomFilterRooms={roomFilterRooms}
            setRoomFilterRooms={setRoomFilterRooms}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            trainingOnly={trainingOnly}
            setTrainingOnly={setTrainingOnly}
            onSurpriseFromFilters={actions.handleSurpriseFromFilters}
            surpriseDisabled={!onSelectResonanceScene || worlds.length === 0}
            onClearFilters={onClearFilters}
            hasActiveFilters={hasActiveFilters}
            journeyLabelForId={(id) => journeys.find((j) => j.id === id)?.label}
          />
        ) : null}
        {worlds.length === 0 ? (
          <div className="text-neutral-500 text-[11px]">
            {allWorlds.length === 0 ? (
              "No curated worlds are available yet. Configure a scene in the synth first to seed the gallery."
            ) : (
              <>
                <span>No worlds match the current filters.</span>{" "}
                <span className="text-neutral-600">
                  {moodFilter && `Mood: "${moodFilter}". `}
                  {tagFilter && `Tag: "${tagFilter}". `}
                  Try clearing one of the filters.
                </span>
              </>
            )}
          </div>
        ) : (
          <WorldGalleryGrid
            worlds={worlds}
            harmonicWorld={harmonicWorld}
            favorites={favorites}
            editingNoteId={editingNoteId}
            onSelectResonanceScene={onSelectResonanceScene}
            onSelectRoom={onSelectRoom}
            onPreviewWorldTone={onPreviewWorldTone}
            onToggleFavorite={actions.toggleFavorite}
            setMoodFilter={setMoodFilter}
            setTagFilter={setTagFilter}
            setPracticeGoalFilter={setPracticeGoalFilter}
            setEditingNoteId={setEditingNoteId}
            setWorldNoteAndBumpVersion={(world, text) => {
              setWorldNote(world, text);
              setNotesVersion((v) => v + 1);
            }}
          />
        )}
      </div>
    </div>
  );
}

