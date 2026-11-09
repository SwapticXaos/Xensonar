import type { RefObject } from "react";
import { DURATION } from "../../state/store";
import type { AudioImportReadMode } from "../../audio/AudioImporter";
import type { PendingAudioImport } from "./transportBarTypes";

type Props = {
  pendingAudioImport: PendingAudioImport;
  audioPreviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  rendering: boolean;
  closeAudioImport: () => void;
  updatePendingAudioImport: (patch: Partial<PendingAudioImport>) => void;
  handleConfirmAudioImport: () => void;
};

export function TransportAudioImportDialog({
  pendingAudioImport,
  audioPreviewCanvasRef,
  rendering,
  closeAudioImport,
  updatePendingAudioImport,
  handleConfirmAudioImport,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">
              Audio → SpectralForge
            </div>
            <h3 className="text-lg font-semibold text-neutral-100">
              Quelle behalten, Fenster projizieren, Original weiter abhören
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">
              Die Forge bekommt jetzt nicht nur die 10s-Projektion, sondern
              behält die Originalquelle als eigenes Asset. So lassen sich
              Forge-Resynthese und Originalfenster direkt gegeneinander hören,
              ohne die Herkunft zu verlieren.
            </p>
          </div>
          <button
            type="button"
            onClick={closeAudioImport}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Schließen
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <canvas
                ref={audioPreviewCanvasRef}
                width={800}
                height={220}
                className="h-auto w-full rounded-lg border border-neutral-700 bg-[#060913]"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Quelle
                </div>
                <div className="mt-2 break-all font-medium text-neutral-100">
                  {pendingAudioImport.file.name}
                </div>
                <div className="mt-1 text-neutral-400">
                  {pendingAudioImport.source.originalDuration.toFixed(2)}s ·{" "}
                  {pendingAudioImport.source.channelCount} Kanäle ·{" "}
                  {pendingAudioImport.source.sampleRate} Hz
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Forge-Fenster
                </div>
                <div className="mt-2 font-medium text-neutral-100">
                  {Math.min(
                    DURATION,
                    pendingAudioImport.source.originalDuration,
                  ).toFixed(2)}
                  s
                </div>
                <div className="mt-1 text-neutral-400">
                  sichtbare Panorama-Fläche bleibt 2048 × 512
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Zukunft
                </div>
                <div className="mt-2 text-neutral-100">
                  Original bleibt erhalten
                </div>
                <div className="mt-1 text-neutral-400">
                  spätere source-aware Tools können daran andocken
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
            <label className="block space-y-1 text-xs text-neutral-300">
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Fensterstart im Original
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(
                  0,
                  pendingAudioImport.source.originalDuration -
                    Math.min(
                      DURATION,
                      pendingAudioImport.source.originalDuration,
                    ),
                )}
                step={0.01}
                value={pendingAudioImport.startSec}
                disabled={
                  pendingAudioImport.source.originalDuration <= DURATION
                }
                onChange={(event) =>
                  updatePendingAudioImport({
                    startSec: Number(event.target.value),
                  })
                }
                className="w-full accent-cyan-400 disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>Anfang</span>
                <span>{pendingAudioImport.startSec.toFixed(2)}s</span>
                <span>Ende</span>
              </div>
            </label>

            <label className="block space-y-1 text-xs text-neutral-300">
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Audio-Lesart / Projection
              </span>
              <select
                value={pendingAudioImport.readMode}
                onChange={(event) =>
                  updatePendingAudioImport({
                    readMode: event.target.value as AudioImportReadMode,
                  })
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
              >
                <option value="legacy">
                  Legacy · rohe spektrale Masse / darkpsy
                </option>
                <option value="transient">
                  Transient · Konturen / Anschläge / Rillen
                </option>
                <option value="hybrid">Hybrid · Masse + Kontur mischen</option>
              </select>
            </label>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
              Erst wird ein explizites Zeitfenster gewählt, dann die
              Forge-Projektion erzeugt. Die Originalquelle bleibt daneben
              erhalten und kann später für source-aware Pinsel, lokale Effekte
              oder A/B-Vergleiche herangezogen werden.
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
              Legacy bleibt der bisherige rohe, darkpsy-nahe Pfad. Transient
              hebt eher Anschläge, spektrale Konturen und Rillen hervor; Hybrid
              sitzt dazwischen. Das ist bewusst experimentell und soll hörbar
              verschiedene Eingangsmaterialien provozieren.
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={closeAudioImport}
                className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmAudioImport}
                disabled={rendering}
                className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                Audio in SpectralForge einlesen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
