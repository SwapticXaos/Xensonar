import type { ReactNode } from "react";
import type { StampData } from "../audio/SpectralData";
import CarrierIntegralPanel from "./CarrierIntegralPanel";
import CustomStampLibraryPanel from "./CustomStampLibraryPanel";
import InlineSynthLabPanel from "./InlineSynthLabPanel";
import ProjectLibraryPanel from "./ProjectLibraryPanel";

export type SpectralForgeWorkbenchSidebarProps = {
  variant: "legacy" | "forge3";
  sidebarTop?: ReactNode;
  onOpenGestureProjectsInSpectralForge: () => void;
  onSendStampAsMelodicSample?: (args: {
    name: string;
    stampData: StampData;
  }) => Promise<void> | void;
};

export default function SpectralForgeWorkbenchSidebar({
  variant,
  sidebarTop,
  onOpenGestureProjectsInSpectralForge,
  onSendStampAsMelodicSample,
}: SpectralForgeWorkbenchSidebarProps) {
  return (
    <aside
      className="min-w-0 space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/70 p-2 text-xs text-neutral-400"
      aria-label="Projekte und Klangmaterial"
      data-xensonar-spectralforge-sidebar-compact-workbench="true"
    >
      {sidebarTop}
      <h2 className="px-1 text-[11px] font-semibold text-neutral-300">
        Projekte und Material
      </h2>
      <ProjectLibraryPanel />
      {variant === "forge3" ? (
        <CarrierIntegralPanel
          onOpenInSpectralForge={onOpenGestureProjectsInSpectralForge}
        />
      ) : null}
      <CustomStampLibraryPanel
        onSendStampAsMelodicSample={onSendStampAsMelodicSample}
      />
      {variant === "forge3" ? <InlineSynthLabPanel /> : null}
    </aside>
  );
}
