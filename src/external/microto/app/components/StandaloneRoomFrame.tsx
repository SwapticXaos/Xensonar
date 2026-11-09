import * as React from 'react';
/**
 * Shared layout frame for standalone rooms (Commons, L3, Platformer, Sandbox, TuningLab).
 * Unifies section shell, header (title + description), Back button, and optional primary action (e.g. Start/Pause).
 * Keeps room-level behavior isolated while reducing duplicated layout structure (vision: modular domains, clearer modules).
 */

type StandaloneRoomFrameProps = {
  title: string;
  description: string;
  onBack: () => void;
  /** Optional primary action slot (e.g. Start/Pause button). */
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
  /** Optional extra class for the section (e.g. different padding). */
  sectionClassName?: string;
  /** Optional class for the back button. */
  backButtonClassName?: string;
  /** Optional class for the title (default: text-2xl text-violet-100). */
  titleClassName?: string;
  /** Optional class for the description (default: text-sm text-neutral-400). */
  descriptionClassName?: string;
  /** Optional back button label (default: Zurueck). */
  backLabel?: string;
};

export function StandaloneRoomFrame({
  title,
  description,
  onBack,
  primaryAction,
  children,
  sectionClassName = "border border-neutral-800 bg-neutral-950 p-5 mt-4",
  backButtonClassName = "px-3 py-2 border border-neutral-700 text-neutral-300 hover:bg-neutral-800",
  titleClassName = "text-2xl text-violet-100",
  descriptionClassName = "text-sm text-neutral-400",
  backLabel = "Zurueck",
}: StandaloneRoomFrameProps) {
  return (
    <section className={sectionClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className={titleClassName}>{title}</h2>
          <p className={descriptionClassName}>{description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className={backButtonClassName}>
            {backLabel}
          </button>
          {primaryAction}
        </div>
      </div>
      {children}
    </section>
  );
}
