import { useCallback, useEffect, useMemo, useState } from 'react';
import { JumpRunSoundtrackRoom } from '../../../external/microto/game/jumpRunSoundtrack/JumpRunSoundtrackRoom';
import type { MicrotoMelodicLoopSeedExport, MicrotoXensonarLoopExport } from '../../../external/microto/integrations/xensonar/types';

export interface EmbeddedMicrotoPlatformerDockProps {
  onBackToHost: () => void;
  onExportLoopToXensonar: (payload: MicrotoXensonarLoopExport) => Promise<void>;
  onExportLoopToForge1: (payload: MicrotoXensonarLoopExport) => Promise<void>;
  onExportLoopToForge2: (payload: MicrotoXensonarLoopExport) => Promise<void>;
  onExportSeedToMelodicLoop: (payload: MicrotoMelodicLoopSeedExport) => Promise<void>;
}

export function EmbeddedMicrotoPlatformerDock({
  onBackToHost,
  onExportLoopToXensonar,
  onExportLoopToForge1,
  onExportLoopToForge2,
  onExportSeedToMelodicLoop,
}: EmbeddedMicrotoPlatformerDockProps) {
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const initAudio = useCallback(async () => {
    try {
      setAudioError(null);
      if (audioCtx) {
        if (audioCtx.state !== 'running') {
          await audioCtx.resume();
        }
        return audioCtx;
      }
      const ctx = new window.AudioContext();
      await ctx.resume();
      setAudioCtx(ctx);
      return ctx;
    } catch {
      setAudioError('Microto-Audio konnte im Dock nicht gestartet werden.');
      return null;
    }
  }, [audioCtx]);

  useEffect(() => () => {
    if (audioCtx) {
      void audioCtx.close().catch(() => undefined);
    }
  }, [audioCtx]);

  const dockHeader = useMemo(() => (
    <div className="rounded border border-cyan-900/50 bg-cyan-950/20 p-3 text-xs leading-relaxed text-cyan-100/90">
      <div className="mb-1 uppercase tracking-[0.25em] text-cyan-300">MicrotoSynFlow · Andockkorridor</div>
      <div>
        Hier ist jetzt der erste echte Eingang in die fremde App: nicht die ganze Universal-Plugin-Theorie,
        sondern direkt der exportfähige <span className="text-white">IV Spiele · Xenpolar 3</span>-Shortcut. Die Irrlicht Arena bleibt ein eigener Spielraum; von hier aus kann ein Loop gebounct und sofort in Xensonars Materialspur, SpectralForge oder SyntheticForge weitergereicht werden.
      </div>
      {audioError ? <div className="mt-2 text-rose-200">{audioError}</div> : null}
    </div>
  ), [audioError]);

  return (
    <div className="space-y-3">
      {dockHeader}
      <JumpRunSoundtrackRoom
        room="PLATFORMER"
        onBack={onBackToHost}
        audioCtx={audioCtx}
        onEnableAudio={initAudio}
        onExportLoopToXensonar={onExportLoopToXensonar}
        onExportLoopToForge1={onExportLoopToForge1}
        onExportLoopToForge2={onExportLoopToForge2}
        onExportSeedToMelodicLoop={onExportSeedToMelodicLoop}
      />
    </div>
  );
}
