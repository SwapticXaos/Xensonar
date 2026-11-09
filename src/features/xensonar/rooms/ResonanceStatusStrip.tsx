import { useEffect, useState } from "react";
import { formatHzCompact } from "../domain/instrumentData";
import { RESONANCE_CURSOR_HUD_HZ_EVENT, type ResonanceCursorHudHzEvent } from "./resonanceCursorHudLiveChannel";
import { RootFollowIconBadge } from "./RootFollowIconBadge";
import { OPEN_BASS_PATTERN_MANAGER_EVENT, OPEN_DRUM_PATTERN_MANAGER_EVENT, OPEN_GRID_TUNING_RACK_EVENT, OPEN_MATERIAL_LOOP_MANAGER_EVENT, OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT } from "./resonanceWorkspaceIntentEvents";

type StatusGlyphKind = "octave" | "sustain" | "swell" | "echo" | "drive";

const StatusGlyph = ({ kind, active, title }: { kind: StatusGlyphKind; active: boolean; title: string }) => {
  const tones: Record<StatusGlyphKind, string> = {
    octave: "text-sky-100 border-sky-400/70 bg-sky-950/35",
    sustain: "text-amber-100 border-amber-400/70 bg-amber-950/35",
    swell: "text-fuchsia-100 border-fuchsia-400/70 bg-fuchsia-950/35",
    echo: "text-emerald-100 border-emerald-400/70 bg-emerald-950/35",
    drive: "text-rose-100 border-rose-400/70 bg-rose-950/35",
  };

  const glyph = (() => {
    switch (kind) {
      case "octave":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M8.2 8.8 12 5l3.8 3.8" />
            <path d="M6.5 19h11" />
            <path d="M8.8 14.8h6.4" />
          </svg>
        );
      case "sustain":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 12h15" />
            <path d="M7 8.5v7" />
            <path d="M17 8.5v7" />
            <path d="M10 9.3h4" />
            <path d="M10 14.7h4" />
          </svg>
        );
      case "swell":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="6" />
            <path d="M12 3.2v2.4" />
            <path d="M12 18.4v2.4" />
            <path d="M3.2 12h2.4" />
            <path d="M18.4 12h2.4" />
          </svg>
        );
      case "echo":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.7 14.6c1.2-2.3 3-3.5 5.3-3.5s4 1.1 5.2 3.5" />
            <path d="M8.8 18c1-.9 2.1-1.3 3.2-1.3 1.1 0 2.2.4 3.2 1.3" />
            <path d="M4.1 10.4c1.7-3.2 4.2-4.9 6.9-4.9 3 0 5.6 1.8 7.4 5.4" />
          </svg>
        );
      case "drive":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.8 13.9c2.2 0 2.6-5.4 5.2-5.4s1.9 7.4 4.5 7.4 2.3-7.4 4.7-7.4 2.4 3.3 3.2 3.3" />
            <path d="M4.5 6.6h15" />
            <path d="M4.5 17.4h15" />
          </svg>
        );
    }
  })();

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-all ${active ? `${tones[kind]} shadow-[0_0_14px_rgba(255,255,255,0.08)] opacity-100` : "border-neutral-800 bg-neutral-950/60 text-neutral-600 opacity-60"}`}
      title={title}
      aria-label={title}
    >
      {glyph}
    </div>
  );
};

type ResonanceStatusStripProps = {
  particleSystemLabel: string;
  particleDisplayModeLabel: string;
  cursorHudHzLabel: string;
  gridTuningLabel: string;
  gridModeLabel: string;
  gridBaseHzLabel: string;
  keyboardWindowRangeLabel: string;
  keyboardWindowFirstHzLabel: string;
  keyboardWindowLastHzLabel: string;
  hotkeyModeLabel: string;
  materialLoopNameLabel: string;
  rootFollowLoopNameLabel: string;
  drumPatternNameLabel: string;
  bassPatternNameLabel: string;
  onOpenMaterialLoopManager?: () => void;
  onOpenRootFollowLoopManager?: () => void;
  onOpenDrumPatternManager?: () => void;
  onOpenBassPatternManager?: () => void;
  onOpenGridTuningRack?: () => void;
  materialLoopActive: boolean;
  rootFollowLoopActive: boolean;
  materialLoopHotkeysActive: boolean;
  rootFollowLoopHotkeysActive: boolean;
  octaveActive: boolean;
  sustainActive: boolean;
  swellActive: boolean;
  echoActive: boolean;
  driveActive: boolean;
};


type ShortenedStatusTitles = {
  material: string;
  rootFollow: string;
  drum: string;
  bass: string;
};

const STATUS_TITLE_TOTAL_CHAR_LIMIT = 58;
const STATUS_TITLE_MIN_CHARS = 7;

function shortenMiddle(label: string, maxChars: number) {
  const normalized = label.trim();
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= 1) return '…';
  if (maxChars <= 4) return `${normalized.slice(0, Math.max(1, maxChars - 1))}…`;
  const left = Math.max(2, Math.ceil((maxChars - 1) * 0.62));
  const right = Math.max(1, maxChars - 1 - left);
  return `${normalized.slice(0, left)}…${normalized.slice(normalized.length - right)}`;
}

function compactStatusTitleLabels(args: ShortenedStatusTitles): ShortenedStatusTitles {
  const entries = [
    { key: 'material' as const, label: args.material },
    { key: 'rootFollow' as const, label: args.rootFollow },
    { key: 'drum' as const, label: args.drum },
    { key: 'bass' as const, label: args.bass },
  ];
  const limits = entries.map((entry) => Math.max(0, entry.label.trim().length));
  while (limits.reduce((sum, value) => sum + value, 0) > STATUS_TITLE_TOTAL_CHAR_LIMIT) {
    let longestIndex = -1;
    let longestValue = -Infinity;
    for (let index = 0; index < limits.length; index += 1) {
      const value = limits[index] ?? 0;
      if (value > STATUS_TITLE_MIN_CHARS && value > longestValue) {
        longestValue = value;
        longestIndex = index;
      }
    }
    if (longestIndex < 0) break;
    limits[longestIndex] = Math.max(STATUS_TITLE_MIN_CHARS, (limits[longestIndex] ?? STATUS_TITLE_MIN_CHARS) - 1);
  }
  return entries.reduce((out, entry, index) => {
    out[entry.key] = shortenMiddle(entry.label, limits[index] ?? entry.label.length);
    return out;
  }, {} as ShortenedStatusTitles);
}

function dispatchManagerOpenEvent(eventName: string) {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(eventName));
  }, 0);
}

export function ResonanceStatusStrip({
  particleSystemLabel,
  particleDisplayModeLabel,
  cursorHudHzLabel,
  gridTuningLabel,
  gridModeLabel,
  gridBaseHzLabel,
  hotkeyModeLabel,
  materialLoopNameLabel,
  rootFollowLoopNameLabel,
  drumPatternNameLabel,
  bassPatternNameLabel,
  onOpenMaterialLoopManager,
  onOpenRootFollowLoopManager,
  onOpenDrumPatternManager,
  onOpenBassPatternManager,
  onOpenGridTuningRack,
  materialLoopActive,
  rootFollowLoopActive,
  materialLoopHotkeysActive,
  rootFollowLoopHotkeysActive,
  octaveActive,
  sustainActive,
  swellActive,
  echoActive,
  driveActive,
}: ResonanceStatusStripProps) {
  const [liveCursorHudHzLabel, setLiveCursorHudHzLabel] = useState(cursorHudHzLabel);

  useEffect(() => {
    const handleCursorHudHz = (event: Event) => {
      const hz = (event as ResonanceCursorHudHzEvent).detail?.hz;
      if (Number.isFinite(hz)) setLiveCursorHudHzLabel(formatHzCompact(hz));
    };
    window.addEventListener(RESONANCE_CURSOR_HUD_HZ_EVENT, handleCursorHudHz);
    return () => window.removeEventListener(RESONANCE_CURSOR_HUD_HZ_EVENT, handleCursorHudHz);
  }, []);
  const handleOpenMaterialLoopManager = () => {
    onOpenMaterialLoopManager?.();
    dispatchManagerOpenEvent(OPEN_MATERIAL_LOOP_MANAGER_EVENT);
  };

  const handleOpenRootFollowLoopManager = () => {
    onOpenRootFollowLoopManager?.();
    dispatchManagerOpenEvent(OPEN_ROOT_FOLLOW_LOOP_MANAGER_EVENT);
  };

  const handleOpenDrumPatternManager = () => {
    onOpenDrumPatternManager?.();
    dispatchManagerOpenEvent(OPEN_DRUM_PATTERN_MANAGER_EVENT);
  };

  const handleOpenBassPatternManager = () => {
    onOpenBassPatternManager?.();
    dispatchManagerOpenEvent(OPEN_BASS_PATTERN_MANAGER_EVENT);
  };

  const handleOpenGridTuningRack = () => {
    onOpenGridTuningRack?.();
    dispatchManagerOpenEvent(OPEN_GRID_TUNING_RACK_EVENT);
  };

  const compactTitles = compactStatusTitleLabels({
    material: materialLoopNameLabel,
    rootFollow: rootFollowLoopNameLabel,
    drum: drumPatternNameLabel,
    bass: bassPatternNameLabel,
  });

  return (
    <div className="mb-2 border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-[10px]">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap leading-none">
        <div className="shrink-0 text-neutral-300">
          <span className="mr-2 uppercase tracking-widest text-[10px] text-neutral-500">Partikel</span>
          <span className="text-amber-200">{particleSystemLabel}</span>
          <span className="text-neutral-500"> · </span>
          <span className="text-neutral-200">{particleDisplayModeLabel}</span>
          <span className="text-neutral-500"> · </span>
          <span className="text-cyan-200">{liveCursorHudHzLabel}</span>
        </div>
        <span className="h-4 w-px shrink-0 bg-neutral-800" aria-hidden="true" />
        <button
          type="button"
          onClick={handleOpenGridTuningRack}
          className="shrink-0 rounded-sm border border-transparent px-1 py-0.5 text-neutral-300 transition hover:border-violet-900/60 hover:bg-violet-950/20"
          title="Raster Werkbank öffnen"
        >
          <span className="mr-1 text-[13px] leading-none text-neutral-300" aria-hidden="true">🪜</span>
          <span className="mr-2 uppercase tracking-widest text-[10px] text-neutral-500">Fretboard</span>
          <span className="text-violet-200">{gridTuningLabel}</span>
          <span className="text-neutral-500"> · </span>
          <span className="text-neutral-200">{gridModeLabel}</span>
          <span className="text-neutral-500"> · </span>
          <span className="text-cyan-200">Grundton {gridBaseHzLabel}</span>
        </button>
        <span className="h-4 w-px shrink-0 bg-neutral-800" aria-hidden="true" />
        <div className="min-w-0 shrink text-neutral-300" title={`Hotkey-Modus: ${hotkeyModeLabel}`}>
          <button
            type="button"
            onClick={handleOpenMaterialLoopManager}
            className={`inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border px-1.5 py-0.5 align-middle transition hover:bg-cyan-950/25 ${materialLoopActive ? "bg-emerald-950/35 text-emerald-100" : "bg-neutral-950/50 text-neutral-400"} ${materialLoopHotkeysActive ? "border-amber-400/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]" : "border-neutral-800"}`}
            title={`Materialspur verwalten: ${materialLoopNameLabel}${materialLoopHotkeysActive ? " · Hotkeys aktiv" : ""}${materialLoopActive ? " · läuft" : ""}`}
          >
            <span className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center text-[13px] leading-none text-neutral-300">📀</span>
            <span className="truncate">{compactTitles.material}</span>
          </button>
          <span className="mx-1 text-neutral-700">/</span>
          <button
            type="button"
            onClick={handleOpenRootFollowLoopManager}
            className={`inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border px-1.5 py-0.5 align-middle transition hover:bg-violet-950/25 ${rootFollowLoopActive ? "bg-emerald-950/35 text-emerald-100" : "bg-neutral-950/50 text-neutral-400"} ${rootFollowLoopHotkeysActive ? "border-amber-400/90 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]" : "border-neutral-800"}`}
            title={`Root Follow Loop verwalten: ${rootFollowLoopNameLabel}${rootFollowLoopHotkeysActive ? " · Hotkeys aktiv" : ""}${rootFollowLoopActive ? " · läuft" : ""}`}
          >
            <RootFollowIconBadge variant="status" />
            <span className="truncate">{compactTitles.rootFollow}</span>
          </button>
          <span className="mx-1 text-neutral-700">/</span>
          <button
            type="button"
            onClick={handleOpenDrumPatternManager}
            className="inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/50 px-1.5 py-0.5 align-middle text-neutral-300 transition hover:bg-fuchsia-950/25"
            title={`Drum Pattern verwalten: ${drumPatternNameLabel}`}
          >
            <span className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center text-[13px] leading-none text-neutral-300">🥁</span>
            <span className="truncate">{compactTitles.drum}</span>
          </button>
          <span className="mx-1 text-neutral-700">/</span>
          <button
            type="button"
            onClick={handleOpenBassPatternManager}
            className="inline-flex h-6 max-w-[8.4rem] min-w-0 items-center gap-1 overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950/50 px-1.5 py-0.5 align-middle text-neutral-300 transition hover:bg-fuchsia-950/25"
            title={`Bass Pattern verwalten: ${bassPatternNameLabel}`}
          >
            <span className="inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center text-[13px] leading-none text-neutral-300">🎸</span>
            <span className="truncate">{compactTitles.bass}</span>
          </button>
        </div>
        <span className="ml-auto" />
        <div className="flex items-center gap-2 pl-1">
          <StatusGlyph kind="octave" active={octaveActive} title="Oktavierung aktiv" />
          <StatusGlyph kind="sustain" active={sustainActive} title="Verlängerung aktiv" />
          <StatusGlyph kind="swell" active={swellActive} title="Lautheits-Swell aktiv" />
          <StatusGlyph kind="echo" active={echoActive} title="Echo aktiv" />
          <StatusGlyph kind="drive" active={driveActive} title="Myzel-Drive aktiv" />
        </div>
      </div>
    </div>
  );
}
