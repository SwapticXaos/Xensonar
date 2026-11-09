/**
 * Shell-level harmonic world HUD: global root, world metadata, export/import,
 * gallery, favorites, journey strip, notes, scene selector, continue-in room buttons.
 * Extracted from AppShell for LOC discipline and single responsibility (STRUCTURE).
 */

import type { GlobalHarmonicContext } from "../../features/resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { WorldExportImportRow, type CopyWorldRef } from "./WorldExportImportRow";
import { ShellHarmonicContextRow } from "./ShellHarmonicContextRow";
import type { ResonanceSceneId } from "../../features/resonance/config/scenes";
import { WorldJourneyStrip } from "./WorldJourneyStrip";
import { WorldNotesPanel } from "./WorldNotesPanel";
import { ScenePracticeSummary } from "./ScenePracticeSummary";
import { harmonicWorldSpineApi } from "../../features/harmonicWorldSpineApi";
import { useShellHarmonicWorldHudDerived } from "../useShellHarmonicWorldHudDerived";
import type { WorldSetlist } from "../../domain/worldSetlist";
import type { WorldJourney } from "../../domain/worldGallery";
import { type Room } from "../roomRegistry";
import { clearWorldHistory } from "../../domain/worldHistory";
import { useShellWorldFavoritesAndHistory } from "../useShellWorldFavoritesAndHistory";
import { WorldSetlistRow } from "./WorldSetlistRow";
import { WorldDiscoveryStrip } from "./WorldDiscoveryStrip";
import { ShellSceneAndContinueRow } from "./ShellSceneAndContinueRow";
import { ShellWorldMetadataRow } from "./ShellWorldMetadataRow";
import { ShellPracticeJourneyRow } from "./ShellPracticeJourneyRow";
import { ShellSuggestedNextRow } from "./ShellSuggestedNextRow";
import { ShellSimilarScenesStrip } from "./ShellSimilarScenesStrip";
import { ShellWorldQuickLinksRow } from "./ShellWorldQuickLinksRow";
import { StartByMoodStrip } from "./StartByMoodStrip";
import { StartByDifficultyStrip } from "./StartByDifficultyStrip";
import { ExploreByTagStrip } from "./ExploreByTagStrip";
import { StartPracticeGoalStrip } from "./StartPracticeGoalStrip";
import { ShellSignatureIntervalsStrip } from "./ShellSignatureIntervalsStrip";
import { ShellFeaturedIntervalStrip } from "./ShellFeaturedIntervalStrip";
import { ShellDifficultyLadderStrip } from "./ShellDifficultyLadderStrip";
import { SHELL_SUGGESTED_NEXT_LABEL, SHELL_SURPRISE_SIMILAR_LABEL, SHELL_TRY_SIMILAR_LABEL } from "../copy";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { ShellEntryScenesStrip } from "./ShellEntryScenesStrip";

export type { CopyWorldRef } from "./WorldExportImportRow";

export type AppShellHarmonicWorldHudProps = {
  globalHarmonicContext: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld | null;
  room: Room;
  onSelectRoom: (room: Room) => void;
  /** Optional: set global root (base) frequency from shell (vision §3 harmonic first-class). */
  onSetBaseFreq?: (hz: number) => void;
  /** Optional: play a short audio preview of the current harmonic world (base frequency, tuning-aware). */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  currentSceneId?: ResonanceSceneId;
  /** Scene position in catalog (e.g. "12/69") for next/prev discoverability (vision §5). */
  scenePosition?: string;
  /** When provided, parent can trigger copy world from global shortcut (vision §5). */
  copyWorldRef?: React.MutableRefObject<CopyWorldRef>;
  /** When provided, parent can trigger Surprise me from Ctrl+Shift+S (vision §5). */
  surpriseWorldRef?: React.MutableRefObject<(() => void) | null>;
  /** Optional: Surprise scene ��� load random scene and open Synth (vision §3 §5; Ctrl+Shift+R). */
  onSurpriseScene?: () => void;
  onSurpriseSimilarScene?: () => void;
  /** Optional: enable audio before Surprise me / shortcut (vision §5 zero-friction). */
  onEnableAudio?: EnsureAudio;
  /** Performance setlist: ordered worlds for next/prev (vision §2 §3). */
  setlist?: WorldSetlist;
  onSetlistNext?: () => void;
  onSetlistPrev?: () => void;
  onAddCurrentToSetlist?: (world: HarmonicWorld) => void;
  onRemoveFromSetlist?: (index: number) => void;
  onSetlistSlotSelect?: (index: number) => void;
  /** Live cursor interval label when in Resonance with grid on (vision §5 harmonic feedback). */
  liveCursorInterval?: string;
  /** Current groove preset label (vision §5; reflects Ctrl+Q cycle). */
  currentQuantizePresetLabel?: string | null;
  /** Optional: show a short-lived toast (e.g. "Link copied") for copy/link feedback (vision §5). */
  onShowToast?: (message: string, kind?: "success" | "error") => void;
  onRequestSignatureGo?: (index: number) => void;
  /** Optional: jump to a random discovery ratio (vision ?3 exploratory harmonic navigation). */
  onSurpriseInterval?: () => void;
  /** Optional: featured interval Go ? open Synth and jump to today's ratio (vision ?3 ?5 discoverability). */
  onRequestFeaturedGo?: (ratio: number) => void;
  /** Optional: preview signature interval ? play short tone at baseFreq * ratio (vision ?3 harmonic first-class). */
  onPreviewInterval?: (baseFreq: number, ratio: number) => void;
};

export function AppShellHarmonicWorldHud({
  globalHarmonicContext,
  harmonicWorld,
  room,
  onSelectRoom,
  onSetBaseFreq,
  onPreviewWorldTone,
  onImportWorld,
  onSelectResonanceScene,
  currentSceneId,
  scenePosition,
  copyWorldRef,
  surpriseWorldRef,
  onSurpriseScene,
  onSurpriseSimilarScene,
  onEnableAudio,
  setlist,
  onSetlistNext,
  onSetlistPrev,
  onAddCurrentToSetlist,
  onRemoveFromSetlist,
  onSetlistSlotSelect,
  liveCursorInterval,
  currentQuantizePresetLabel,
  onShowToast,
  onRequestSignatureGo,
  onSurpriseInterval,
  onRequestFeaturedGo,
  onPreviewInterval,
}: AppShellHarmonicWorldHudProps) {
  const gallery = harmonicWorldSpineApi.getAllGalleryWorldExports();
  const favoritesAndHistory = useShellWorldFavoritesAndHistory({
    surpriseWorldRef,
    gallery,
    onImportWorld,
    onEnableAudio,
    onShowToast,
    harmonicWorldId: harmonicWorld?.id ?? null,
    harmonicWorldGridTuning: harmonicWorld?.gridTuning ?? null,
    harmonicWorldBaseFreq: harmonicWorld?.baseFreq ?? null,
  });
  const {
    favorites,
    recentWorlds,
    setRecentWorlds,
    handleFavoriteWorld,
    handleRemoveFavorite,
    handleJumpToFavorite,
    handlePinRecentToFavorites,
    handleSurpriseWorld,
    isFavoriteWorld: isFavoriteWorldFromHook,
  } = favoritesAndHistory;

  const fallbackSceneId = harmonicWorld && harmonicWorldSpineApi.hasSceneId(harmonicWorld.id) ? harmonicWorld.id : null;
  const activeSceneId = currentSceneId ?? fallbackSceneId;

  const derived = useShellHarmonicWorldHudDerived(harmonicWorld, room, currentSceneId);
  const {
    worldSource,
    activeJourney,
    activeJourneyProgress,
    journeys,
    trainingJourneys,
    primaryTrainingJourney,
    scenes,
    entryScenesForNewPlayer,
    recommendedRooms,
    recommendedWorldsForActiveRoom,
    trainingFlowsForWorld,
    practiceGoalsForScene,
    primaryPracticeGoal,
    nextInGoal,
    similarScene,
    suggestedNextScenes,
    similarScenes,
  } = derived;

  const handleSelectJourney = (journey: WorldJourney) => {
    if (!onImportWorld) return;
    const entry = harmonicWorldSpineApi.getEntryWorldForJourney(journey);
    if (entry) onImportWorld(entry);
  };

  return (
    <div className="px-4 py-2 border-b border-neutral-900 bg-black/80 text-[10px] text-neutral-400 flex flex-col gap-1">
      <div className="flex justify-between gap-2 flex-wrap items-baseline">
        <ShellHarmonicContextRow
          globalHarmonicContext={globalHarmonicContext}
          room={room}
          liveCursorInterval={liveCursorInterval}
          currentQuantizePresetLabel={currentQuantizePresetLabel}
          onSetBaseFreq={onSetBaseFreq}
        />
        {harmonicWorld && (
          <ShellWorldMetadataRow
            harmonicWorld={harmonicWorld}
            worldSource={worldSource}
            isFavorite={harmonicWorld ? isFavoriteWorldFromHook(harmonicWorld) : false}
          />
        )}
        <ScenePracticeSummary sceneId={currentSceneId} scenePosition={scenePosition} />
      </div>
      {onRequestSignatureGo && (
        <ShellSignatureIntervalsStrip
          onRequestSignatureGo={onRequestSignatureGo}
          onSurpriseInterval={onSurpriseInterval}
          baseFreq={harmonicWorld?.baseFreq ?? globalHarmonicContext?.baseFreq ?? 261.63}
          onPreviewInterval={onPreviewInterval}
        />
      )}
      <ShellFeaturedIntervalStrip
        baseFreq={harmonicWorld?.baseFreq ?? globalHarmonicContext?.baseFreq ?? 261.63}
        onPreviewInterval={onPreviewInterval}
        onGoToInterval={onRequestFeaturedGo}
      />
      <ShellPracticeJourneyRow
        activeJourney={activeJourney}
        activeJourneyProgress={activeJourneyProgress}
        trainingFlowsForWorld={trainingFlowsForWorld}
        practiceGoalsForScene={practiceGoalsForScene}
        nextInGoal={nextInGoal}
        primaryPracticeGoal={primaryPracticeGoal}
        similarScene={similarScene}
        trySimilarLabel={SHELL_TRY_SIMILAR_LABEL}
        onSurpriseSimilar={onSurpriseSimilarScene}
        surpriseSimilarLabel={SHELL_SURPRISE_SIMILAR_LABEL}
        onImportWorld={onImportWorld}
        onSelectResonanceScene={onSelectResonanceScene}
        onSelectRoom={onSelectRoom}
        currentWorldId={harmonicWorld?.id ?? null}
        onEnableAudio={onEnableAudio}
      />
      <ShellDifficultyLadderStrip
        harmonicWorld={harmonicWorld ?? null}
        trainingFlowsForWorld={trainingFlowsForWorld}
        onImportWorld={onImportWorld}
        onSelectRoom={onSelectRoom}
        onEnableAudio={onEnableAudio}
      />
      <ShellSuggestedNextRow
        suggested={suggestedNextScenes}
        onSelectResonanceScene={onSelectResonanceScene}
        onSelectRoom={onSelectRoom}
        label={SHELL_SUGGESTED_NEXT_LABEL}
        onEnableAudio={onEnableAudio}
      />
      <ShellSimilarScenesStrip
        scenes={similarScenes}
        onSelectResonanceScene={onSelectResonanceScene}
        onSelectRoom={onSelectRoom}
        onEnableAudio={onEnableAudio}
      />
      {harmonicWorld?.description && (
        <div className="text-[10px] text-neutral-500 line-clamp-2">{harmonicWorld.description}</div>
      )}
      {harmonicWorld && (harmonicWorld.tags.length > 0 || harmonicWorld.profile) && (
        <div className="flex justify-between items-baseline gap-2 flex-wrap">
          {harmonicWorld.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {harmonicWorld.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 border border-neutral-700 text-[9px] rounded-sm bg-neutral-900/60 text-neutral-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {harmonicWorld.profile && (
            <div className="text-[9px] text-neutral-500 uppercase tracking-widest">
              Intensity: <span className="text-neutral-200">{harmonicWorld.profile.intensity}</span>
            </div>
          )}
        </div>
      )}
      <ShellWorldQuickLinksRow
        recommendedRooms={recommendedRooms}
        recentWorlds={recentWorlds}
        setRecentWorlds={setRecentWorlds}
        recommendedWorldsForActiveRoom={recommendedWorldsForActiveRoom}
        onSelectRoom={onSelectRoom}
        onImportWorld={onImportWorld}
        onClearHistory={clearWorldHistory}
        favorites={favorites}
        onPinRecentToFavorites={handlePinRecentToFavorites}
      />
      {harmonicWorld && (
        <div className="flex gap-2 flex-wrap items-center">
          <WorldExportImportRow
            harmonicWorld={harmonicWorld}
            onImportWorld={onImportWorld}
            copyWorldRef={copyWorldRef}
            onShowToast={onShowToast}
          />
          <button
            type="button"
            onClick={() => harmonicWorld && handleFavoriteWorld(harmonicWorld)}
            className="px-2 py-0.5 border border-emerald-700 text-[10px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-900/40"
            title="Save current world as a favorite for quick access"
          >
            Favorite
          </button>
          <button
            type="button"
            onClick={() => onSelectRoom("WORLDLAB")}
            className="px-2 py-0.5 border border-indigo-600 text-[10px] text-indigo-200 hover:border-indigo-400 hover:bg-indigo-900/40"
            title="Open World Lab to inspect and copy this world in detail"
          >
            Open in World Lab
          </button>
        </div>
      )}
      <WorldDiscoveryStrip
        gallery={gallery}
        journeys={journeys}
        trainingJourneys={trainingJourneys}
        primaryTrainingJourney={primaryTrainingJourney}
        favorites={favorites}
        harmonicWorld={harmonicWorld ?? null}
        onImportWorld={onImportWorld}
        onRemoveFavorite={handleRemoveFavorite}
        onJumpToFavorite={handleJumpToFavorite}
        onSurpriseWorld={handleSurpriseWorld}
        onSurpriseScene={onSurpriseScene}
        onSelectJourney={handleSelectJourney}
        onSelectTrainingJourney={handleSelectJourney}
      />
      {harmonicWorld && onPreviewWorldTone && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="text-[9px] text-neutral-500 uppercase tracking-widest mr-1">
            Sound check
          </span>
          <button
            type="button"
            onClick={() => onPreviewWorldTone(harmonicWorld)}
            className="px-2 py-0.5 border border-emerald-700 text-[10px] text-emerald-200 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors"
            title="Play a short preview tone at the world base frequency"
          >
            Preview world tone
          </button>
        </div>
      )}
      <WorldSetlistRow
        harmonicWorld={harmonicWorld ?? null}
        setlist={setlist}
        onSetlistPrev={onSetlistPrev}
        onSetlistNext={onSetlistNext}
        onSetlistSlotSelect={onSetlistSlotSelect}
        onRemoveFromSetlist={onRemoveFromSetlist}
        onAddCurrentToSetlist={onAddCurrentToSetlist}
      />
      <ShellEntryScenesStrip
        scenes={entryScenesForNewPlayer}
        onSelectResonanceScene={onSelectResonanceScene}
        onSelectRoom={onSelectRoom}
        onEnableAudio={onEnableAudio}
        currentSceneId={currentSceneId}
      />
      {harmonicWorld && (
        <>
          <WorldJourneyStrip world={harmonicWorld} activeRoom={room} onSelectRoom={onSelectRoom} />
          <WorldNotesPanel world={harmonicWorld} />
        </>
      )}
      <StartByMoodStrip
        onSelectResonanceScene={onSelectResonanceScene}
        onEnableAudio={onEnableAudio}
        currentSceneMood={
          activeSceneId ? harmonicWorldSpineApi.getSceneById(activeSceneId)?.mood ?? null : null
        }
      />
      <StartByDifficultyStrip
        onSelectResonanceScene={onSelectResonanceScene}
        onEnableAudio={onEnableAudio}
        currentSceneId={activeSceneId}
      />
      <ExploreByTagStrip
        onSelectResonanceScene={onSelectResonanceScene}
        onEnableAudio={onEnableAudio}
        currentSceneTag={
          activeSceneId ? harmonicWorldSpineApi.getSceneById(activeSceneId)?.tags?.[0] ?? null : null
        }
        maxTags={6}
      />
      <StartPracticeGoalStrip
        onSelectResonanceScene={onSelectResonanceScene}
        onSelectRoom={onSelectRoom}
        onImportWorld={onImportWorld}
        onEnableAudio={onEnableAudio}
      />
      <ShellSceneAndContinueRow
        scenes={scenes}
        currentSceneId={currentSceneId}
        onSelectResonanceScene={onSelectResonanceScene}
        onEnableAudio={onEnableAudio}
        recommendedRoomIds={recommendedRooms}
        onSelectRoom={onSelectRoom}
        hasWorld={!!harmonicWorld}
      />
    </div>
  );
}
