import type { RecoveryTrack } from "../../data/xensonarRecovery";
import { StatusBadge } from "./StatusBadge";

type RecoveryTrackCardProps = {
  track: RecoveryTrack;
  active: boolean;
  onSelect: (id: string) => void;
};

const toneByStatus = {
  captured: "emerald",
  partial: "amber",
  "needs-rebuild": "violet",
  stabilized: "cyan",
} as const;

export function RecoveryTrackCard({ track, active, onSelect }: RecoveryTrackCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(track.id)}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-cyan-300/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/20"
          : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{track.name}</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{track.summary}</p>
        </div>
        <StatusBadge tone={toneByStatus[track.status]}>{track.status}</StatusBadge>
      </div>
    </button>
  );
}
