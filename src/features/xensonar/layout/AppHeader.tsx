import { useState } from "react";
import type { Room } from "../types";
import { XENSONAR_EXTRAS_ENABLED, XENSONAR_MATERIALSCHMIEDE_ENABLED } from "../rooms/coreBuildProfile";
import { PackageStationControl } from "./PackageStationControl";
import { HeaderRecordingButton } from "./HeaderRecordingButton";
import { HeaderNativeAudioControl } from "./HeaderNativeAudioControl";

type LogoMarkerPulse = { id: string };

type AppHeaderProps = {
  room: Room;
  recordingActive: boolean;
  logoMarkerPulses: LogoMarkerPulse[];
  recordingDurationLabel: string;
  xenpolarShortcutActive: boolean;
  xenpolarButtonActive: boolean;
  onLogoClick: () => void;
  onToggleRecordingFromHeader: () => void;
  onOpenResonance: () => void;
  onOpenTopology: () => void;
  onOpenMaterialschmiede: () => void;
  onOpenXenpolar: () => void;
};

export function AppHeader({
  room,
  recordingActive,
  logoMarkerPulses,
  recordingDurationLabel,
  xenpolarShortcutActive,
  xenpolarButtonActive,
  onLogoClick,
  onToggleRecordingFromHeader,
  onOpenResonance,
  onOpenTopology,
  onOpenMaterialschmiede,
  onOpenXenpolar,
}: AppHeaderProps) {
  const [packageStationOpen, setPackageStationOpen] = useState(false);
  return (
    <header className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLogoClick}
          className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          aria-label={recordingActive ? "Marker setzen" : "Xensonar Logo"}
          title={recordingActive ? "Marker setzen (Logo/F9)" : "Xensonar Logo"}
        >
          {logoMarkerPulses.map((pulse, idx) => (
            <span
              key={pulse.id}
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-emerald-300/80"
              style={{
                width: 16,
                height: 16,
                transform: "translate(-50%, -50%)",
                animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
              }}
            />
          ))}
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-neutral-300">
            <g stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="32" cy="32" rx="3.4" ry="12.2" />
              <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(45 32 32)" />
              <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(90 32 32)" />
              <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(135 32 32)" />
              <circle cx="32" cy="23" r="9.2" />
              <circle cx="41" cy="32" r="9.2" />
              <circle cx="32" cy="41" r="9.2" />
              <circle cx="23" cy="32" r="9.2" />
              <polygon points="32,4.4 38.0,10.5 26.0,10.5" />
              <polygon points="59.6,32 53.5,38.0 53.5,26.0" />
              <polygon points="32,59.6 26.0,53.5 38.0,53.5" />
              <polygon points="4.4,32 10.5,26.0 10.5,38.0" />
              <polygon points="13.1,13.1 21.1,13.1 13.1,21.1" />
              <polygon points="50.9,13.1 42.9,13.1 50.9,21.1" />
              <polygon points="13.1,50.9 21.1,50.9 13.1,42.9" />
              <polygon points="50.9,50.9 42.9,50.9 50.9,42.9" />
            </g>
            <circle cx="32" cy="14.0" r="1.5" fill="currentColor" />
            <circle cx="44.7" cy="19.3" r="1.5" fill="currentColor" />
            <circle cx="50.0" cy="32" r="1.5" fill="currentColor" />
            <circle cx="44.7" cy="44.7" r="1.5" fill="currentColor" />
            <circle cx="32" cy="50.0" r="1.5" fill="currentColor" />
            <circle cx="19.3" cy="44.7" r="1.5" fill="currentColor" />
            <circle cx="14.0" cy="32" r="1.5" fill="currentColor" />
            <circle cx="19.3" cy="19.3" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-widest bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent" style={{ fontFamily: "'Trebuchet MS', serif" }}>
            XENSONAR
          </h1>
          <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">Microtonal Synthesizer</p>
        </div>
        <PackageStationControl
          open={packageStationOpen}
          onToggleOpen={() => setPackageStationOpen((value) => !value)}
          onOpenMaterialschmiede={onOpenMaterialschmiede}
        />
        <HeaderRecordingButton
          recordingActive={recordingActive}
          recordingDurationLabel={recordingDurationLabel}
          onToggleRecordingFromHeader={onToggleRecordingFromHeader}
        />
        <HeaderNativeAudioControl />
      </div>
      <div className="hidden xl:block text-[11px] text-amber-200/85 tracking-wide">
        (&quot;Auch&quot; für Banana-Groove geeignet!!!)
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button className={`px-4 py-1 text-sm ${room === "RESONANCE" ? "bg-purple-300 text-black" : "border border-neutral-700"}`} onClick={onOpenResonance}>I. XENSONAR HAUPTRAUM</button>
        {XENSONAR_MATERIALSCHMIEDE_ENABLED && (
          <button className={`px-4 py-1 text-sm ${room === "L3LAB" && !xenpolarShortcutActive ? "bg-cyan-200 text-black" : "border border-neutral-700"}`} onClick={onOpenMaterialschmiede}>II. MATERIALSCHMIEDE</button>
        )}
        <button className={`px-4 py-1 text-sm ${room === "TOPOLOGY" ? "bg-white text-black" : "border border-neutral-700"}`} onClick={onOpenTopology}>III. NODAL INSTALLATION</button>
        {XENSONAR_EXTRAS_ENABLED && (
          <button
            className={`px-4 py-1 text-sm ${xenpolarButtonActive ? "bg-amber-200 text-black border border-amber-100" : "border border-amber-700 text-amber-100 hover:bg-amber-950/40"}`}
            onClick={onOpenXenpolar}
          >
            IV. SPIELE
          </button>
        )}
      </div>
    </header>
  );
}
