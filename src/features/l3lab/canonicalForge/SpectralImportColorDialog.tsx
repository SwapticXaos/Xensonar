import * as React from 'react';
import { isReservedImportPink } from './melodicImportLanePolicy';

type Hsv = { h: number; s: number; v: number };

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hsvToHex({ h, s, v }: Hsv) {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0; let g = 0; let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(value: string): Hsv {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return { h: 188, s: 0.85, v: 0.88 };
  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0.0001) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * (((b - r) / d) + 2);
    else h = 60 * (((r - g) / d) + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max <= 0 ? 0 : d / max, v: max };
}

export function SpectralImportColorDialog(props: {
  open: boolean;
  importLabel: string;
  color: string;
  busy?: boolean;
  onColorChange: (color: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { open, importLabel, color, busy = false, onColorChange, onConfirm, onCancel } = props;
  const [hsv, setHsv] = React.useState<Hsv>(() => hexToHsv(color));
  const planeRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setHsv(hexToHsv(color));
  }, [color, open]);

  const commitHsv = React.useCallback((next: Hsv) => {
    const normalized = { h: ((next.h % 360) + 360) % 360, s: clamp01(next.s), v: clamp01(next.v) };
    setHsv(normalized);
    onColorChange(hsvToHex(normalized));
  }, [onColorChange]);

  const pickSv = React.useCallback((clientX: number, clientY: number) => {
    const rect = planeRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    commitHsv({
      ...hsv,
      s: clamp01((clientX - rect.left) / rect.width),
      v: clamp01(1 - (clientY - rect.top) / rect.height),
    });
  }, [commitHsv, hsv]);

  if (!open) return null;
  const reservedPink = isReservedImportPink(color);
  const pureHue = `hsl(${Math.round(hsv.h)} 100% 50%)`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Farbe für weitere Importspur wählen">
      <div className="w-full max-w-xl rounded-lg border border-fuchsia-700/70 bg-neutral-950 p-4 shadow-2xl">
        <div className="text-[10px] uppercase tracking-[0.24em] text-fuchsia-300/80">Mehrfach-Import</div>
        <div className="mt-1 text-base font-semibold text-white">Es liegt bereits eine pinke Spur im Melodic Loop.</div>
        <div className="mt-2 text-xs leading-relaxed text-neutral-300">
          <span className="font-medium text-neutral-100">{importLabel}</span> wird als eigene zusätzliche Importspur angelegt. Vorhandene Importspuren werden nicht ersetzt.
        </div>

        <div className="mt-4 rounded border border-neutral-800 bg-black/35 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-cyan-100">Farbe wählen</span>
            <span className="flex items-center gap-2 font-mono text-[11px] text-neutral-300">
              <span className="inline-block h-4 w-7 rounded border border-white/30" style={{ backgroundColor: color }} />
              {color.toUpperCase()}
            </span>
          </div>

          <div
            ref={planeRef}
            className="relative h-44 w-full cursor-crosshair overflow-hidden rounded border border-neutral-700"
            style={{
              backgroundColor: pureHue,
              backgroundImage: 'linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%)',
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pickSv(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              pickSv(event.clientX, event.clientY);
            }}
          >
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <input
            aria-label="Spektraler Farbton"
            type="range"
            min={0}
            max={360}
            step={1}
            value={Math.round(hsv.h)}
            onChange={(event) => commitHsv({ ...hsv, h: Number(event.currentTarget.value) })}
            className="mt-3 h-3 w-full cursor-pointer appearance-none rounded"
            style={{ background: 'linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)' }}
          />
          <div className="mt-1 flex justify-between text-[10px] text-neutral-500"><span>Rot</span><span>Grün</span><span>Cyan</span><span>Blau</span><span>Magenta</span></div>
          {reservedPink ? (
            <div className="mt-3 rounded border border-amber-700/60 bg-amber-950/25 px-3 py-2 text-[11px] text-amber-100">
              Pink bleibt der ersten Importspur vorbehalten. Wähle für den Mehrfach-Import eine andere Farbe.
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">Abbrechen</button>
          <button type="button" disabled={busy || reservedPink} onClick={onConfirm} className="rounded border border-cyan-500/70 bg-cyan-950/35 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-40">Import mit dieser Farbe</button>
        </div>
      </div>
    </div>
  );
}
