import type { RefObject } from "react";
import type {
  ImageImportFitMode,
  ImageImportReadMode,
} from "../../audio/ImageImporter";
import {
  HARD_IMAGE_CONTRAST,
  type PendingImageImport,
} from "./transportBarTypes";

type Props = {
  pendingImageImport: PendingImageImport;
  imagePreviewCanvasRef: RefObject<HTMLCanvasElement | null>;
  spectralWidth: number;
  spectralHeight: number;
  rendering: boolean;
  closeImageImport: () => void;
  updatePendingImageImport: (patch: Partial<PendingImageImport>) => void;
  handleConfirmImageImport: () => void;
};

export function TransportImageImportDialog({
  pendingImageImport,
  imagePreviewCanvasRef,
  spectralWidth,
  spectralHeight,
  rendering,
  closeImageImport,
  updatePendingImageImport,
  handleConfirmImageImport,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">
              Bild → SpectralForge
            </div>
            <h3 className="text-lg font-semibold text-neutral-100">
              Asemic / grafische Notation in Klangfläche einlesen
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">
              Links → rechts wird Zeit, oben → unten wird Pitch. Dunkle Spuren
              werden Klang, helle Flächen bleiben still. Crop füllt die Fläche,
              links/rechtsbündig lassen Luft für späteres Weiterbauen.
            </p>
          </div>
          <button
            type="button"
            onClick={closeImageImport}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Schließen
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <canvas
                ref={imagePreviewCanvasRef}
                width={800}
                height={200}
                className="h-auto w-full rounded-lg border border-neutral-700 bg-white"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Quelle
                </div>
                <div className="mt-2 break-all font-medium text-neutral-100">
                  {pendingImageImport.file.name}
                </div>
                <div className="mt-1 text-neutral-400">
                  {pendingImageImport.image.naturalWidth} ×{" "}
                  {pendingImageImport.image.naturalHeight}px
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Ziel
                </div>
                <div className="mt-2 font-medium text-neutral-100">
                  {spectralWidth} × {spectralHeight}
                </div>
                <div className="mt-1 text-neutral-400">
                  Panorama-Spektrum der Forge
                </div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300">
                <div className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  Lesart
                </div>
                <div className="mt-2 text-neutral-100">
                  Zeit = X · Pitch = Y
                </div>
                <div className="mt-1 text-neutral-400">
                  Legacy, Kontur oder Hybrid als Lesart
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
            <label className="block space-y-1 text-xs text-neutral-300">
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Lesart / Mapping
              </span>
              <select
                value={pendingImageImport.readMode}
                onChange={(event) =>
                  updatePendingImageImport({
                    readMode: event.target.value as ImageImportReadMode,
                  })
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
              >
                <option value="legacy">
                  Legacy · dunkle Masse direkt lesen
                </option>
                <option value="contour">
                  Kontur · Kanten / Linien priorisieren
                </option>
                <option value="hybrid">Hybrid · Masse + Kontur mischen</option>
              </select>
            </label>

            <label className="block space-y-1 text-xs text-neutral-300">
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Einpassung
              </span>
              <select
                value={pendingImageImport.fitMode}
                onChange={(event) =>
                  updatePendingImageImport({
                    fitMode: event.target.value as ImageImportFitMode,
                  })
                }
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100"
              >
                <option value="crop">Crop / Fläche füllen</option>
                <option value="stretch">Stauchen / Vollfläche</option>
                <option value="containLeft">Linksbündig / Rest frei</option>
                <option value="containRight">Rechtsbündig / Rest frei</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={pendingImageImport.hardContrast}
                onChange={(event) =>
                  updatePendingImageImport({
                    hardContrast: event.target.checked,
                  })
                }
              />
              <span>Harter Kontrast (Default) · Papierrauschen filtern</span>
            </label>

            <label
              className={`block space-y-1 text-xs ${pendingImageImport.hardContrast ? "text-neutral-600" : "text-neutral-300"}`}
            >
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Stillefilter / Kontrast
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={pendingImageImport.contrast}
                disabled={pendingImageImport.hardContrast}
                onChange={(event) =>
                  updatePendingImageImport({
                    contrast: Number(event.target.value),
                  })
                }
                className="w-full accent-cyan-400 disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>weich / mehr Grauwert</span>
                <span>
                  {pendingImageImport.hardContrast
                    ? `Hart ${HARD_IMAGE_CONTRAST.toFixed(2)}`
                    : pendingImageImport.contrast.toFixed(2)}
                </span>
                <span>hart / mehr Stille</span>
              </div>
            </label>

            <label
              className={`block space-y-1 text-xs ${pendingImageImport.fitMode === "crop" ? "text-neutral-300" : "text-neutral-600"}`}
            >
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Crop-Verschiebung horizontal
              </span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={pendingImageImport.shiftX}
                disabled={pendingImageImport.fitMode !== "crop"}
                onChange={(event) =>
                  updatePendingImageImport({
                    shiftX: Number(event.target.value),
                  })
                }
                className="w-full accent-violet-400 disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>links</span>
                <span>{pendingImageImport.shiftX.toFixed(2)}</span>
                <span>rechts</span>
              </div>
            </label>

            <label
              className={`block space-y-1 text-xs ${pendingImageImport.fitMode === "crop" ? "text-neutral-300" : "text-neutral-600"}`}
            >
              <span className="uppercase tracking-[0.2em] text-neutral-500">
                Crop-Verschiebung vertikal
              </span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={pendingImageImport.shiftY}
                disabled={pendingImageImport.fitMode !== "crop"}
                onChange={(event) =>
                  updatePendingImageImport({
                    shiftY: Number(event.target.value),
                  })
                }
                className="w-full accent-emerald-400 disabled:opacity-40"
              />
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>oben</span>
                <span>{pendingImageImport.shiftY.toFixed(2)}</span>
                <span>unten</span>
              </div>
            </label>

            <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400">
              Hartkontrast ist hier der Default, damit fotografiertes Papier und
              helle Flächen nicht als Bildrauschen in SpectralForge landen. So
              eignen sich Asemic Writings, Glyphen und grafische Notation eher
              wie hineingemalte Struktur statt wie Foto-Noise.
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={closeImageImport}
                className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmImageImport}
                disabled={rendering}
                className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
              >
                Bild in SpectralForge einlesen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
