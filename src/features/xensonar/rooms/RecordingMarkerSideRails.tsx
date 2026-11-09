type SideMarkerPulse = {
  id: string;
  side: "left" | "right";
};

type RecordingMarkerSideRailsProps = {
  isRecording: boolean;
  sideMarkerPulses: SideMarkerPulse[];
  scrollbarInsetPx: number;
  onAddLeftMarker: () => void;
  onAddRightMarker: () => void;
};

export function RecordingMarkerSideRails({
  isRecording,
  sideMarkerPulses,
  scrollbarInsetPx,
  onAddLeftMarker,
  onAddRightMarker,
}: RecordingMarkerSideRailsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onAddLeftMarker}
        disabled={!isRecording}
        className={`hidden xl:flex fixed items-start justify-start px-3 py-3 text-left transition-colors overflow-hidden ${isRecording ? "left-[12px] cursor-pointer hover:bg-neutral-950/25" : "left-[12px] cursor-default opacity-40 pointer-events-none"}`}
        style={{ top: 156, bottom: 24, width: 'max(0px, calc((100vw - 72rem) / 2 - 28px))' }}
        aria-label="Marker links setzen"
        title={isRecording ? "Marker setzen" : "Marker nur waehrend Aufnahme"}
      >
        {sideMarkerPulses.filter((pulse) => pulse.side === "left").map((pulse, idx) => (
          <span
            key={pulse.id}
            className="pointer-events-none absolute left-3 top-3 rounded-full border border-emerald-300/80"
            style={{
              width: 16,
              height: 16,
              animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
            }}
          />
        ))}
        <span className="relative z-10 text-[10px] leading-tight text-neutral-500">klicke die Flaeche um eine Markierung in der Aufnahme zu setzen.</span>
      </button>
      <button
        type="button"
        onClick={onAddRightMarker}
        disabled={!isRecording}
        className={`hidden xl:flex fixed items-start justify-end px-3 py-3 text-right transition-colors overflow-hidden ${isRecording ? "cursor-pointer hover:bg-neutral-950/25" : "cursor-default opacity-40 pointer-events-none"}`}
        style={{ top: 156, bottom: 24, right: `${scrollbarInsetPx}px`, width: `max(0px, calc((100vw - 72rem) / 2 - ${scrollbarInsetPx + 16}px))` }}
        aria-label="Marker rechts setzen"
        title={isRecording ? "Marker setzen" : "Marker nur waehrend Aufnahme"}
      >
        {sideMarkerPulses.filter((pulse) => pulse.side === "right").map((pulse, idx) => (
          <span
            key={pulse.id}
            className="pointer-events-none absolute right-3 top-3 rounded-full border border-emerald-300/80"
            style={{
              width: 16,
              height: 16,
              animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
            }}
          />
        ))}
        <span className="relative z-10 text-[10px] leading-tight text-neutral-500">Hier geht&apos;s auch</span>
      </button>
    </>
  );
}
