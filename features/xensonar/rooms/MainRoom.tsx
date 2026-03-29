type MainRoomProps = {
  onEnterResonance: () => void;
};

export function MainRoom({ onEnterResonance }: MainRoomProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh] opacity-50">
      <div className="flex flex-col items-center gap-3">
        <p>Die konventionellen Räume I und II sind archiviert.</p>
        <button type="button" onClick={onEnterResonance} className="border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-900">
          Direkt zu Resonance
        </button>
      </div>
    </div>
  );
}
