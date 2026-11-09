import * as React from 'react';
import type { ReactNode } from "react";
import { TOP_NAV_ROOMS, type Room } from "./roomRegistry";
import type { CopyWorldRef } from "./components/AppShellHarmonicWorldHud";
import { KeyboardLegend } from "./components/KeyboardLegend";
import { CLICK_TO_ENABLE_AUDIO } from "./copy";
import type { EnsureAudio } from "../shared/audio/audioInit";
import type { GlobalHarmonicContext } from "../features/resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import type { WorldSetlist } from "../domain/worldSetlist";
import type { ResonanceSceneId } from "../features/resonance/config/scenes";
import { AppShellHarmonicWorldHud } from "./components/AppShellHarmonicWorldHud";
import { AppToast } from "./components/AppToast";

type AppShellProps = {
  room: Room;
  onSelectRoom: (room: Room) => void;
  children: ReactNode;
  /** When provided, a non-modal "enable audio" bar is shown when audio is not running (vision: zero-friction playability). */
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
  /** When set, AudioContext init failed (vision §7: platform resilience). */
  audioError?: string | null;
  /** Optional shared harmonic context snapshot for shell-level HUD (root + tuning). */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional: set global root (base) frequency from shell (vision §3 harmonic first-class). */
  onSetBaseFreq?: (hz: number) => void;
  /** Optional current Resonance scene/world identifier and label for HUD. */
  currentSceneId?: ResonanceSceneId;
  currentSceneLabel?: string;
  /** Optional scene position in catalog (e.g. "12/69") for discoverability with next/prev shortcuts (vision §5). */
  scenePosition?: string;
  /** Optional precomputed harmonic world view-model for shell HUD and future adapters. */
  harmonicWorld?: HarmonicWorld;
  /** Optional handler to play a short audio preview of the current harmonic world. */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  /** Optional handler to jump into a specific Resonance scene/world from the shell. */
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional handler to apply a pasted/loaded world export (tuning + groove + optional scene). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Ref so App can trigger copy world from global shortcut (vision §5). */
  copyWorldRef?: React.MutableRefObject<CopyWorldRef>;
  /** Ref so App can trigger Surprise me from global shortcut Ctrl+Shift+S (vision §5). */
  surpriseWorldRef?: React.MutableRefObject<(() => void) | null>;
  /** Optional: Surprise scene — load random curated scene and open Synth (vision §3 §5; Ctrl+Shift+R). */
  onSurpriseScene?: () => void;
  /** Optional: Surprise similar — random scene in same mood/tuning (vision §3 §5; Ctrl+Shift+T). */
  onSurpriseSimilarScene?: () => void;
  /** Performance setlist: ordered worlds for next/prev (vision §2 §3). */
  setlist?: WorldSetlist;
  onSetlistNext?: () => void;
  onSetlistPrev?: () => void;
  onAddCurrentToSetlist?: (world: HarmonicWorld) => void;
  onRemoveFromSetlist?: (index: number) => void;
  onSetlistSlotSelect?: (index: number) => void;
  /** Live cursor interval label when in Resonance with grid on (vision §5 harmonic feedback). */
  liveCursorInterval?: string;
  /** Current groove preset label when in Resonance (vision §5; reflects Ctrl+Q cycle). */
  currentQuantizePresetLabel?: string | null;
  /** Optional non-modal toast message (small UX feedback; keeps flows understandable). */
  toast?: { message: string; kind?: "info" | "success" | "error" } | null;
  onDismissToast?: () => void;
  /** Optional: show a short-lived toast (e.g. copy link / add to setlist feedback). */
  onShowToast?: (message: string, kind?: "success" | "error") => void;
  /** Optional: ref for legend "?" toggle so global handler can call it (vision §8 single keydown). */
  legendToggleRef?: React.MutableRefObject<(() => void) | null>;
  /** Optional: shell "Go to signature interval" — opens Synth and jumps to interval (vision §3 §5 discoverability). */
  onRequestSignatureGo?: (index: number) => void;
  /** Optional: shell "Surprise interval" — jump to a random discovery ratio (vision §3 exploratory). */
  onSurpriseInterval?: () => void;
  /** Optional: shell "Featured interval" Go — open Synth and jump to given ratio (vision §3 §5 discoverability). */
  onRequestFeaturedGo?: (ratio: number) => void;
  /** Optional: preview signature interval — play short tone at baseFreq * ratio (vision §3 harmonic first-class). */
  onPreviewInterval?: (baseFreq: number, ratio: number) => void;
};

export function AppShell({
  room,
  onSelectRoom,
  children,
  audioCtx,
  onEnableAudio,
  audioError,
  globalHarmonicContext,
  onSetBaseFreq,
  currentSceneId,
  scenePosition,
  harmonicWorld,
  onPreviewWorldTone,
  onSelectResonanceScene,
  onImportWorld,
  copyWorldRef,
  surpriseWorldRef,
  onSurpriseScene,
  onSurpriseSimilarScene,
  setlist,
  onSetlistNext,
  onSetlistPrev,
  onAddCurrentToSetlist,
  onRemoveFromSetlist,
  onSetlistSlotSelect,
  liveCursorInterval,
  currentQuantizePresetLabel,
  toast,
  onDismissToast,
  onShowToast,
  legendToggleRef,
  onRequestSignatureGo,
  onSurpriseInterval,
  onRequestFeaturedGo,
  onPreviewInterval,
}: AppShellProps) {
  const showEnableAudio =
    onEnableAudio && (audioCtx == null || audioCtx.state !== "running");
  const activeRoom = TOP_NAV_ROOMS.find((entry) => entry.id === room);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col">
      {audioError && (
        <div className="w-full py-2 px-4 bg-red-500/20 border-b border-red-400/40 text-red-200 text-sm">
          {audioError}
          {showEnableAudio && (
            <button
              type="button"
              onClick={() => void onEnableAudio()}
              className="ml-3 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {showEnableAudio && !audioError && (
        <button
          type="button"
          onClick={() => void onEnableAudio()}
          className="w-full py-2 px-4 bg-amber-500/20 border-b border-amber-400/40 text-amber-200 text-sm font-medium hover:bg-amber-500/30 transition-colors"
        >
          {CLICK_TO_ENABLE_AUDIO}
        </button>
      )}
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
        <div className="flex items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-pink-500"
          >
            <path d="M2 12h4l3-9 5 18 3-9h5" />
          </svg>
          <div>
            <h1
              className="text-2xl font-bold tracking-widest bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent italic"
              style={{ fontFamily: "'Trebuchet MS', serif" }}
            >
              XENSONAR
            </h1>
            <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">
              Microtonal Synthesizer
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2 justify-end">
            {TOP_NAV_ROOMS.map((entry) => (
              <button
                key={entry.id}
                className={`px-4 py-1 text-sm ${room === entry.id ? entry.activeClass : "border border-neutral-700"}`}
                onClick={() => onSelectRoom(entry.id)}
                title={entry.intentLabel}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {activeRoom?.intentLabel && (
            <div className="text-[10px] text-neutral-400">
              <span className="uppercase tracking-widest text-neutral-500 mr-1">Room:</span>
              <span className="text-neutral-200">{activeRoom.label}</span>
              <span className="mx-1 text-neutral-600">·</span>
              <span>{activeRoom.intentLabel}</span>
            </div>
          )}
        </div>
      </header>
      {globalHarmonicContext && (
        <AppShellHarmonicWorldHud
          globalHarmonicContext={globalHarmonicContext}
          harmonicWorld={harmonicWorld ?? null}
          room={room}
          onSelectRoom={onSelectRoom}
          onSetBaseFreq={onSetBaseFreq}
          onPreviewWorldTone={onPreviewWorldTone}
          onImportWorld={onImportWorld}
          onSelectResonanceScene={onSelectResonanceScene}
          currentSceneId={currentSceneId}
          scenePosition={scenePosition}
          copyWorldRef={copyWorldRef}
          surpriseWorldRef={surpriseWorldRef}
          onSurpriseScene={onSurpriseScene}
          onSurpriseSimilarScene={onSurpriseSimilarScene}
          onEnableAudio={onEnableAudio}
          setlist={setlist}
          onSetlistNext={onSetlistNext}
          onSetlistPrev={onSetlistPrev}
          onAddCurrentToSetlist={onAddCurrentToSetlist}
          onRemoveFromSetlist={onRemoveFromSetlist}
          onSetlistSlotSelect={onSetlistSlotSelect}
          liveCursorInterval={liveCursorInterval}
          currentQuantizePresetLabel={currentQuantizePresetLabel}
          onShowToast={onShowToast}
          onRequestSignatureGo={onRequestSignatureGo}
          onSurpriseInterval={onSurpriseInterval}
          onRequestFeaturedGo={onRequestFeaturedGo}
          onPreviewInterval={onPreviewInterval}
        />
      )}
      <KeyboardLegend room={room} legendToggleRef={legendToggleRef} />
      <main className="flex-1 p-6 relative">
        {children}
        {toast && onDismissToast && (
          <AppToast
            message={toast.message}
            kind={toast.kind}
            onDismiss={onDismissToast}
          />
        )}
      </main>
    </div>
  );
}
