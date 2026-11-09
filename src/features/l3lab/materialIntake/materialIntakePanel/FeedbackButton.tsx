import type { ReactNode } from 'react';

export interface FeedbackButtonProps {
  tone?: 'neutral' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'pink';
  active?: boolean;
  pending?: boolean;
  success?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function FeedbackButton({
  tone = 'neutral',
  active = false,
  pending = false,
  success = false,
  disabled = false,
  className = '',
  children,
  onClick,
}: FeedbackButtonProps) {
  const toneClasses: Record<NonNullable<FeedbackButtonProps['tone']>, string> = {
    neutral: 'border-neutral-700 text-neutral-100 hover:bg-neutral-900',
    cyan: 'border-cyan-700 text-cyan-100 hover:bg-cyan-950/30',
    violet: 'border-violet-700 text-violet-100 hover:bg-violet-950/30',
    emerald: 'border-emerald-700 text-emerald-100 hover:bg-emerald-950/30',
    amber: 'border-amber-700 text-amber-100 hover:bg-amber-950/30',
    pink: 'border-pink-600 text-pink-100 hover:bg-pink-950/30',
  };

  const activeClasses: Record<NonNullable<FeedbackButtonProps['tone']>, string> = {
    neutral: 'bg-neutral-800/90 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]',
    cyan: 'bg-cyan-950/60 shadow-[0_0_0_1px_rgba(34,211,238,0.38)]',
    violet: 'bg-violet-950/60 shadow-[0_0_0_1px_rgba(168,85,247,0.4)]',
    emerald: 'bg-emerald-950/65 shadow-[0_0_0_1px_rgba(16,185,129,0.42)]',
    amber: 'bg-amber-950/60 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]',
    pink: 'bg-pink-950/60 shadow-[0_0_0_1px_rgba(236,72,153,0.42)]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-3 py-2 transition ${toneClasses[tone]} ${active || pending || success ? activeClasses[tone] : ''} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        <span>{children}</span>
        {pending ? <span className="text-[11px] opacity-80">…</span> : null}
        {!pending && success ? <span className="text-[11px] text-emerald-300">✓</span> : null}
      </span>
    </button>
  );
}
