type StatusBadgeProps = {
  tone?: "cyan" | "emerald" | "amber" | "violet";
  children: string;
};

const toneMap = {
  cyan: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  emerald: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  amber: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  violet: "border-violet-300/30 bg-violet-400/10 text-violet-100",
} as const;

export function StatusBadge({ tone = "cyan", children }: StatusBadgeProps) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
