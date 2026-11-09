type HeaderRecordingButtonProps = {
  recordingActive: boolean;
  recordingDurationLabel: string;
  onToggleRecordingFromHeader: () => void;
};

export function HeaderRecordingButton({
  recordingActive,
  recordingDurationLabel,
  onToggleRecordingFromHeader,
}: HeaderRecordingButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggleRecordingFromHeader}
      className={`rounded border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] ${recordingActive ? "border-red-500 bg-red-950/55 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.18)]" : "border-fuchsia-500/80 bg-fuchsia-950/35 text-fuchsia-100 hover:bg-fuchsia-900/35"}`}
      title={recordingActive ? "Aufnahme stoppen und zur Master Aufnahme springen" : "Master Aufnahme starten"}
    >
      {recordingActive ? `Stop ${recordingDurationLabel}` : "Rec"}
    </button>
  );
}
