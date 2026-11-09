import type { SourcePreviewMode } from "../../state/storeTypes";
import type { Forge3AudioMode } from "../../types/spectralForgeUiTypes";
import type { SpectralForgePreviewRouteKind } from "../previewSession/spectralForgePreviewSessionTypes";

export type TransportBarVariant = "legacy" | "forge3";
export type TransportForge3AudioMode = Forge3AudioMode;

export type TransportPreviewModeButton = {
  id: SourcePreviewMode;
  label: string;
};

export const TRANSPORT_PREVIEW_MODE_BUTTONS: TransportPreviewModeButton[] = [
  { id: "forge", label: "Forge" },
  { id: "sourceWindow", label: "Quelle-Fenster" },
  { id: "sourceFull", label: "Quelle komplett" },
];

export const TRANSPORT_PLAY_BUTTON_STYLE = {
  width: 42,
  minWidth: 42,
  height: 34,
  minHeight: 34,
  padding: 0,
};

export type TransportPlayButtonViewModel = {
  symbol: "▶" | "⏸";
  className: string;
  title: string;
  screenReaderLabel: string;
};

export function resolveTransportPlayButtonViewModel(input: {
  renderFillActive: boolean;
  renderFillPercent: number;
  isPlaying: boolean;
  rendering: boolean;
  previewReadyForImmediatePlay: boolean;
  previewRenderRouteKind: SpectralForgePreviewRouteKind;
}): TransportPlayButtonViewModel {
  const symbol = input.isPlaying && !input.rendering ? "⏸" : "▶";
  const stateClassName = input.renderFillActive
    ? "border-neutral-300 bg-neutral-700 text-white shadow-inner disabled:cursor-progress"
    : input.isPlaying
      ? "border-red-400/40 bg-red-600 text-white hover:bg-red-500"
      : input.previewReadyForImmediatePlay
        ? "border-green-400/40 bg-green-600 text-white hover:bg-green-500"
        : "border-neutral-500/60 bg-neutral-700 text-neutral-100 hover:bg-neutral-600";

  if (input.renderFillActive) {
    return {
      symbol,
      className: buildPlayButtonClassName(stateClassName),
      title: `Vorschau wird vorbereitet · ${input.renderFillPercent}%`,
      screenReaderLabel: `Vorschau wird vorbereitet · ${input.renderFillPercent} Prozent`,
    };
  }
  if (input.isPlaying) {
    return {
      symbol,
      className: buildPlayButtonClassName(stateClassName),
      title: "Vorschau pausieren",
      screenReaderLabel: "Vorschau pausieren",
    };
  }
  if (input.previewReadyForImmediatePlay) {
    return {
      symbol,
      className: buildPlayButtonClassName(stateClassName),
      title: "Vorschau bereit · startet sofort",
      screenReaderLabel: "Vorschau bereit, startet sofort",
    };
  }
  if (input.previewRenderRouteKind === "basis-hearing") {
    return {
      symbol,
      className: buildPlayButtonClassName(stateClassName),
      title: "Hörweise wird automatisch vorgerechnet",
      screenReaderLabel: "Hörweise wird automatisch vorgerechnet",
    };
  }
  return {
    symbol,
    className: buildPlayButtonClassName(stateClassName),
    title: "Vorschau noch nicht vorgerechnet",
    screenReaderLabel: "Vorschau noch nicht vorgerechnet",
  };
}

function buildPlayButtonClassName(stateClassName: string) {
  return `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded border font-bold text-lg leading-none transition-[border-color,box-shadow,transform] duration-150 ${stateClassName}`;
}

export function formatTransportTime(
  position: number,
  durationSec: number,
) {
  const t = position * durationSec;
  const min = Math.floor(t / 60);
  const sec = t % 60;
  return `${min}:${sec.toFixed(2).padStart(5, "0")}`;
}

export function resolveCurrentPreviewLabel(input: {
  variant: TransportBarVariant;
  hasSourceAsset: boolean;
  sourcePreviewMode: SourcePreviewMode;
  forge3AudioMode: TransportForge3AudioMode;
}) {
  if (input.variant === "forge3" && input.hasSourceAsset && input.sourcePreviewMode === "forge") {
    return input.forge3AudioMode === "body" ? "Mit-Quelle-Klang" : "Werkbank-Klang";
  }
  if (input.hasSourceAsset && input.sourcePreviewMode === "sourceWindow") return "Quellfenster";
  if (input.hasSourceAsset && input.sourcePreviewMode === "sourceFull") return "Volle Quelle";
  return "Rohmaterial";
}

export function resolveTransportDurationLabel(input: {
  variant: TransportBarVariant;
  hasSourceAsset: boolean;
  sourcePreviewMode: SourcePreviewMode;
  previewDurationSec: number;
  sourceOriginalDuration?: number;
  sourceImportStartSec?: number;
  sourceImportDurationSec?: number;
}) {
  if (input.variant === "forge3" && input.hasSourceAsset && input.sourcePreviewMode === "forge") {
    return `Vorschau ${input.previewDurationSec.toFixed(2)}s`;
  }
  if (input.hasSourceAsset && input.sourcePreviewMode !== "forge") {
    if (input.sourcePreviewMode === "sourceFull") {
      return `Quelle ${(input.sourceOriginalDuration ?? 0).toFixed(2)}s`;
    }
    const start = input.sourceImportStartSec ?? 0;
    const end = start + (input.sourceImportDurationSec ?? 0);
    return `Fenster ${start.toFixed(2)}–${end.toFixed(2)}s`;
  }
  return `Vorschau ${input.previewDurationSec.toFixed(2)}s`;
}

export function resolveBasisHearingBridgeFill(input: {
  routeKind: SpectralForgePreviewRouteKind;
  bridgeRequestKey: string | null | undefined;
  currentRequestKey: string;
  bridgeMachineId: string | number | null | undefined;
  currentMachineId: string | number | null | undefined;
  bridgePhase: string;
  bridgeProgress: number;
  isPlaying: boolean;
}) {
  const matchesCurrentRoute =
    input.routeKind === "basis-hearing" &&
    input.bridgeRequestKey === input.currentRequestKey &&
    input.bridgeMachineId === input.currentMachineId &&
    input.bridgePhase !== "idle";
  const fillActive = matchesCurrentRoute && input.bridgePhase === "preparing" && !input.isPlaying;
  const fillPercent = fillActive
    ? Math.max(4, Math.min(100, Math.round(input.bridgeProgress * 100)))
    : 0;
  return { matchesCurrentRoute, fillActive, fillPercent };
}

export type TransportBadgeViewModel = {
  key: string;
  label: string;
  title: string;
  className: string;
};

export function buildForge3TransportBadges(input: {
  undoBadgeLabel: string;
  sourceAssetContext: string | null | undefined;
  forge3BodyActive: boolean;
  forge3BodyLabel: string;
}): TransportBadgeViewModel[] {
  const badges: TransportBadgeViewModel[] = [
    {
      key: "undo-domain",
      label: input.undoBadgeLabel,
      title: "Globales Undo wirkt hier auf die Werkbank.",
      className: "rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300",
    },
  ];
  if (input.sourceAssetContext === "forge3_main") {
    badges.push({
      key: "source-loaded",
      label: "Quelle geladen",
      title: "Eine Audioquelle ist geladen und steht SpectralForge als Material zur Verfügung.",
      className: "rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300",
    });
  }
  if (input.forge3BodyActive) {
    badges.push({
      key: "source-prepared",
      label: "Quelle vorbereitet",
      title: "Die geladene Quelle ist für SpectralForge vorbereitet.",
      className: "rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-200",
    });
  }
  badges.push({
    key: "body-label",
    label: input.forge3BodyLabel,
    title: "Zeigt, ob der gekoppelte Körperpfad gerade zur Forge-Vorschau gehört.",
    className: "rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300",
  });
  return badges;
}
