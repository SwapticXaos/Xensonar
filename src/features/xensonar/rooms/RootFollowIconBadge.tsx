export function RootFollowIconBadge({
  variant = 'status',
}: {
  variant?: 'status' | 'window';
}) {
  const slotClassName =
    variant === 'window'
      ? 'relative inline-flex h-4 w-4 shrink-0 items-center justify-center text-[13px] leading-none text-neutral-950'
      : 'relative inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center text-[13px] leading-none text-neutral-950';
  return (
    <span
      className={slotClassName}
      data-xensonar-root-follow-icon-bg="white-circle-behind-icon"
      data-xensonar-root-follow-icon-slot={variant}
      aria-hidden="true"
    >
      <span className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm shadow-black/40" />
      <span className="relative z-10">🎼</span>
    </span>
  );
}
