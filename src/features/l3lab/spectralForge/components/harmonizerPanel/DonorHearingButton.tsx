import { useId } from "react";

export type DonorHearingButtonProps = {
  ready: boolean;
  selected?: boolean;
  phase: "idle" | "rendering" | "playing" | "error";
  error?: string | null;
  onPreview?: () => void;
};

export function DonorHearingButton({
  ready,
  selected = false,
  phase,
  error,
  onPreview,
}: DonorHearingButtonProps) {
  const statusId = useId();
  // Stop/cancel must remain reachable even if the donor becomes stale mid-preview.
  const active = phase === "playing" || phase === "rendering";
  const enabled = !!onPreview && (ready || active);
  const action =
    phase === "rendering"
      ? "Abbrechen"
      : phase === "playing"
        ? "Stop"
        : !ready
          ? "gesperrt"
          : phase === "error"
            ? "Erneut hören"
            : "Hören";
  const description =
    phase === "rendering"
      ? "Klangkörper wird berechnet …"
      : phase === "playing"
        ? "Donor-Klangfarbe in deiner Figur"
        : !ready
          ? "Audio auswählen und „Timbre extrahieren“."
          : "Extrahierte Klangfarbe · bereit";
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={!enabled}
        onClick={() => {
          if (enabled) onPreview?.();
        }}
        className={`min-h-11 w-full rounded-lg border px-2 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:opacity-50 disabled:cursor-not-allowed ${active || selected ? "border-violet-400 bg-violet-950 text-violet-100" : ready ? "border-violet-700 bg-violet-950/30 text-violet-100 hover:bg-violet-950/60" : "border-neutral-700 bg-gray-900/80 text-gray-300"}`}
        title={
          error ||
          (!ready && !active ? "Zuerst Timbre extrahieren" : description)
        }
        aria-pressed={active || selected}
        aria-describedby={statusId}
        aria-label={`Donor: ${action}`}
        data-spectral-forge-donor-hearing="true"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="rounded border border-violet-700 px-1.5 py-0.5 text-[10px]"
            >
              D
            </span>
            <span className="text-[11px] font-semibold">Donor</span>
          </span>
          <span className="text-[10px]">{action}</span>
        </span>
      </button>
      <p
        id={statusId}
        role="status"
        className="px-1 text-[10px] leading-relaxed text-neutral-400"
      >
        {description}
      </p>
      {error && (
        <div
          role="alert"
          className="rounded border border-amber-800 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100"
        >
          {error}
        </div>
      )}
    </div>
  );
}
