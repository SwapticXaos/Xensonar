import * as React from 'react';
import {
  applyLocalFieldBrushStroke,
  clamp01,
  cloneLocalFieldState,
  drawLocalFieldWorkbench,
  ensureLocalFieldState,
  getLocalFieldCanvasMetrics,
  paintLocalFieldSegment,
  resetLocalFieldTarget,
  resolveLocalFieldCurveForTarget,
  setLocalFieldActiveTarget,
  setLocalFieldEdgeHandle,
  type LocalFieldInterpreterKind,
  type LocalFieldModuleState,
} from './localField';

type ToolMode = 'morph' | 'draw';
type EffectTarget = Extract<LocalFieldInterpreterKind, 'dynamic-fade' | 'pitch-elastic'>;

type InteractionState =
  | { kind: 'handle'; handle: 'left' | 'right'; pointerId: number }
  | { kind: 'brush'; pointerId: number; lastRatio: number; lastValue: number }
  | { kind: 'draw'; pointerId: number; lastIndex: number; lastValue: number }
  | null;

type HoverPoint = { ratio: number; value: number } | null;

type TargetCardConfig = {
  target: EffectTarget;
  label: string;
  activeClasses: string;
  inactiveClasses: string;
  lineColor: string;
  zeroColor: string;
};

const TARGET_CARDS: TargetCardConfig[] = [
  {
    target: 'dynamic-fade',
    label: 'Lautstärke',
    activeClasses: 'border-fuchsia-500/70 bg-fuchsia-950/40 shadow-[0_0_0_1px_rgba(217,70,239,0.18)]',
    inactiveClasses: 'border-pink-900/45 bg-pink-950/10 hover:bg-pink-950/18',
    lineColor: '#f5a3ff',
    zeroColor: '#7a245c',
  },
  {
    target: 'pitch-elastic',
    label: 'Tonhöhe',
    activeClasses: 'border-cyan-500/70 bg-cyan-950/35 shadow-[0_0_0_1px_rgba(34,211,238,0.16)]',
    inactiveClasses: 'border-pink-900/45 bg-pink-950/10 hover:bg-pink-950/18',
    lineColor: '#67e8f9',
    zeroColor: '#164e63',
  },
];

export type LocalFieldEditorPanelProps = {
  fieldInput?: LocalFieldModuleState | null;
  historyKey: string;
  title?: string;
  description?: string;
  statusDescription?: string;
  fixedTarget?: EffectTarget | null;
  onCommit: (nextField: LocalFieldModuleState, statusMessage?: string) => void;
};

function eventPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number, resolution = 360) {
  const rect = canvas.getBoundingClientRect();
  const metrics = getLocalFieldCanvasMetrics(canvas);
  const localX = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
  const localY = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
  const ratio = clamp01((localX - metrics.padX) / Math.max(1, metrics.usableW));
  const normalizedY = clamp01((localY - metrics.padY) / Math.max(1, metrics.usableH));
  const value = Math.max(-1, Math.min(1, 1 - normalizedY * 2));
  const maxIndex = Math.max(0, Math.round(resolution) - 1);
  const index = Math.max(0, Math.min(maxIndex, Math.round(ratio * maxIndex)));
  return {
    ratio,
    value,
    index,
    plotWidth: metrics.usableW,
    plotHeight: metrics.usableH,
  };
}

function handleHitTest(canvas: HTMLCanvasElement, field: LocalFieldModuleState, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const metrics = getLocalFieldCanvasMetrics(canvas);
  const localX = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
  const localY = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
  const toleranceX = 18;
  const toleranceY = 18;
  const leftX = metrics.padX;
  const rightX = canvas.width - metrics.padX;
  const projectY = (value: number) => metrics.padY + ((1 - Math.max(-1, Math.min(1, value))) / 2) * metrics.usableH;
  const leftY = projectY(field.edgeHandles.left);
  const rightY = projectY(field.edgeHandles.right);
  const leftHit = Math.abs(localX - leftX) <= toleranceX && Math.abs(localY - leftY) <= toleranceY;
  const rightHit = Math.abs(localX - rightX) <= toleranceX && Math.abs(localY - rightY) <= toleranceY;
  if (leftHit) return 'left' as const;
  if (rightHit) return 'right' as const;
  return null;
}

function buildPreviewPath(values: number[]) {
  if (!values.length) return '';
  return values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / Math.max(1, values.length - 1)) * 100;
    const y = 50 - Math.max(-1, Math.min(1, value)) * 38;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function curveShapeLabel(values: number[]) {
  const strongest = values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  return strongest < 0.02 ? 'Neutral' : 'Geformt';
}

export function LocalFieldEditorPanel({
  fieldInput,
  historyKey,
  title = 'Feldmodul',
  description = 'Tonhöhe und Lautstärke haben hier eigene Kurven. Du wechselst nur die Ansicht der gerade bearbeiteten Linie.',
  statusDescription = 'Malen schreibt direkt in die sichtbare Kurve. Morph / Warp verformt nur diese eine Ansicht; die andere Kurve bleibt separat erhalten. Die Dreiecke halten die jeweilige Null-Achse.',
  fixedTarget = null,
  onCommit,
}: LocalFieldEditorPanelProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const historyRef = React.useRef(new Map<string, LocalFieldModuleState[]>());
  const [toolMode, setToolMode] = React.useState<ToolMode>('morph');
  const [brushSizePx, setBrushSizePx] = React.useState(122);
  const [intensity, setIntensity] = React.useState(0.58);
  const [hardness, setHardness] = React.useState(0);
  const [fluidity, setFluidity] = React.useState(1);
  const [interaction, setInteraction] = React.useState<InteractionState>(null);
  const [hoverPoint, setHoverPoint] = React.useState<HoverPoint>({ ratio: 0.5, value: 0 });

  const field = React.useMemo(() => {
    const ensured = ensureLocalFieldState(fieldInput);
    if (!fixedTarget) return ensured;
    return setLocalFieldActiveTarget(ensured, fixedTarget);
  }, [fieldInput, fixedTarget]);
  const activeTarget: EffectTarget = field.interpreterKind === 'pitch-elastic' ? 'pitch-elastic' : 'dynamic-fade';

  const targetCards = React.useMemo(() => {
    if (fixedTarget) return [];
    return TARGET_CARDS.map((config) => {
      const preview = resolveLocalFieldCurveForTarget(field, config.target, 96).resolved;
      return {
        ...config,
        path: buildPreviewPath(preview),
        shapeLabel: curveShapeLabel(preview),
      };
    });
  }, [field, fixedTarget]);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    drawLocalFieldWorkbench({
      canvas: canvasRef.current,
      field,
      brushPreview: toolMode === 'morph' && hoverPoint
        ? {
          ratio: hoverPoint.ratio,
          value: hoverPoint.value,
          radiusPx: brushSizePx,
          mode: 'warp',
          pointerDown: interaction?.kind === 'brush',
        }
        : null,
    });
  }, [brushSizePx, field, hoverPoint, interaction, toolMode]);

  React.useEffect(() => {
    setInteraction(null);
    setHoverPoint({ ratio: 0.5, value: 0 });
  }, [historyKey]);

  const commitMutator = React.useCallback((mutator: (field: LocalFieldModuleState) => LocalFieldModuleState, statusMessage?: string) => {
    const next = ensureLocalFieldState(mutator(field));
    if (fixedTarget) {
      onCommit(setLocalFieldActiveTarget(next, fixedTarget), statusMessage);
      return;
    }
    onCommit(next, statusMessage);
  }, [field, fixedTarget, onCommit]);

  const pushHistorySnapshot = React.useCallback(() => {
    const stack = historyRef.current.get(historyKey) ?? [];
    stack.push(cloneLocalFieldState(field));
    historyRef.current.set(historyKey, stack.slice(-24));
  }, [field, historyKey]);

  const undoField = React.useCallback(() => {
    const stack = historyRef.current.get(historyKey) ?? [];
    const previous = stack.pop();
    historyRef.current.set(historyKey, stack);
    if (!previous) return;
    const next = ensureLocalFieldState(previous);
    if (fixedTarget) {
      onCommit(setLocalFieldActiveTarget(next, fixedTarget), 'Feldmodul rückgängig.');
      return;
    }
    onCommit(next, 'Feldmodul rückgängig.');
  }, [fixedTarget, historyKey, onCommit]);

  const targetSelectorVisible = !fixedTarget;
  const activeStatusLabel = (fixedTarget ?? activeTarget) === 'pitch-elastic' ? 'Tonhöhe' : 'Lautstärke';

  return (
    <div className="rounded border border-pink-900/45 bg-pink-950/15 p-3 text-[11px] text-pink-100/82">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-pink-100">{title}</div>
          {description ? <div className="mt-1 text-pink-100/74">{description}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <div className="inline-flex rounded border border-pink-800/70 bg-pink-950/20 p-[2px]">
            <button
              type="button"
              className={`rounded px-2 py-1 ${toolMode === 'morph' ? 'bg-pink-700/35 text-white' : 'text-pink-100/78 hover:bg-pink-900/30'}`}
              onClick={() => setToolMode('morph')}
            >
              Morph / Warp
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${toolMode === 'draw' ? 'bg-amber-500/35 text-white' : 'text-pink-100/78 hover:bg-pink-900/30'}`}
              onClick={() => setToolMode('draw')}
            >
              Malen
            </button>
          </div>
          <button
            type="button"
            className={`rounded border px-2 py-1 ${field.bypassed ? 'border-pink-800/70 text-pink-200/70 hover:bg-pink-950/30' : 'border-pink-400/70 bg-pink-600/20 text-white hover:bg-pink-500/30'}`}
            onClick={() => commitMutator((current) => ({ ...current, bypassed: !current.bypassed }), field.bypassed ? 'Feld wieder aktiv.' : 'Feld vorübergehend umgangen.')}
          >
            {field.bypassed ? 'Bypass aus' : 'Bypass an'}
          </button>
          <button
            type="button"
            className="rounded border border-pink-800/70 px-2 py-1 text-pink-100 hover:bg-pink-950/30"
            onClick={undoField}
          >
            Rückgängig
          </button>
          <button
            type="button"
            className="rounded border border-pink-800/70 px-2 py-1 text-pink-100 hover:bg-pink-950/30"
            onClick={() => {
              pushHistorySnapshot();
              const reset = ensureLocalFieldState(null);
              if (fixedTarget) {
                onCommit(setLocalFieldActiveTarget(reset, fixedTarget), 'Feld zurückgesetzt.');
                return;
              }
              onCommit(reset, 'Feld zurückgesetzt.');
            }}
          >
            Alles zurücksetzen
          </button>
        </div>
      </div>

      {targetSelectorVisible ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-pink-200/78">
            <span>Aktive Kurve: {activeStatusLabel}</span>
            <span>Kurven getrennt</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {targetCards.map((config) => {
              const isActive = activeTarget === config.target;
              return (
                <button
                  key={config.target}
                  type="button"
                  className={`group rounded border p-2 text-left transition ${isActive ? config.activeClasses : config.inactiveClasses}`}
                  onClick={() => {
                    if (isActive) return;
                    commitMutator((current) => setLocalFieldActiveTarget(current, config.target), `Aktive Kurve: ${config.label}.`);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-pink-50">{config.label}</div>
                      <div className="mt-0.5 text-[10px] text-pink-100/62">{isActive ? 'Aktiv im Editor' : 'Zum Bearbeiten öffnen'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${config.shapeLabel === 'Neutral' ? 'bg-black/30 text-pink-100/62' : 'bg-black/30 text-white'}`}>{config.shapeLabel}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/10 text-white' : 'bg-black/25 text-pink-100/62'}`}>{isActive ? 'Aktive Kurve' : 'Inaktiv'}</span>
                    </div>
                  </div>
                  <div className="mt-2 rounded border border-black/30 bg-black/30 p-1.5">
                    <svg viewBox="0 0 100 100" className="block h-16 w-full overflow-visible rounded">
                      <line x1="0" y1="50" x2="100" y2="50" stroke={config.zeroColor} strokeWidth="1.2" strokeDasharray="3 3" />
                      <path d={config.path} fill="none" stroke={config.lineColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-pink-100/65">
                    <span>{config.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded border border-pink-800/60 px-1.5 py-0.5 text-pink-100 hover:bg-pink-950/30"
                      onClick={(event) => {
                        event.stopPropagation();
                        pushHistorySnapshot();
                        commitMutator((current) => resetLocalFieldTarget(current, config.target), `${config.label} zurückgesetzt.`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        pushHistorySnapshot();
                        commitMutator((current) => resetLocalFieldTarget(current, config.target), `${config.label} zurückgesetzt.`);
                      }}
                    >
                      Zurücksetzen
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded border border-pink-900/45 bg-black/50 p-2">
        <canvas
          ref={canvasRef}
          width={980}
          height={320}
          className="block h-[320px] w-full rounded border border-pink-900/30 bg-black"
          onPointerDown={(event) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const point = eventPoint(canvas, event.clientX, event.clientY, field.deformation.resolution);
            setHoverPoint({ ratio: point.ratio, value: point.value });
            const hit = handleHitTest(canvas, field, event.clientX, event.clientY);
            if (hit) {
              pushHistorySnapshot();
              commitMutator((current) => setLocalFieldEdgeHandle(current, hit, point.value), hit === 'left' ? 'Kurvenstart verschoben.' : 'Kurvenende verschoben.');
              setInteraction({ kind: 'handle', handle: hit, pointerId: event.pointerId });
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            if (toolMode === 'draw') {
              pushHistorySnapshot();
              commitMutator((current) => paintLocalFieldSegment(current, point.index, point.index, point.value, point.value));
              setInteraction({ kind: 'draw', pointerId: event.pointerId, lastIndex: point.index, lastValue: point.value });
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            pushHistorySnapshot();
            setInteraction({ kind: 'brush', pointerId: event.pointerId, lastRatio: point.ratio, lastValue: point.value });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const point = eventPoint(canvas, event.clientX, event.clientY, field.deformation.resolution);
            setHoverPoint({ ratio: point.ratio, value: point.value });
            if (!interaction || interaction.pointerId !== event.pointerId) return;
            if (interaction.kind === 'draw') {
              if (interaction.lastIndex === point.index && Math.abs(interaction.lastValue - point.value) < 0.002) return;
              commitMutator((current) => paintLocalFieldSegment(current, interaction.lastIndex, point.index, interaction.lastValue, point.value));
              setInteraction({ kind: 'draw', pointerId: interaction.pointerId, lastIndex: point.index, lastValue: point.value });
              return;
            }
            if (interaction.kind === 'handle') {
              commitMutator((current) => setLocalFieldEdgeHandle(current, interaction.handle, point.value));
              return;
            }
            const deltaRatio = point.ratio - interaction.lastRatio;
            const deltaValue = point.value - interaction.lastValue;
            if (Math.abs(deltaRatio) + Math.abs(deltaValue) < 0.0015) return;
            commitMutator((current) => applyLocalFieldBrushStroke(current, 'warp', {
              focusRatio: point.ratio,
              focusValue: point.value,
              radiusPx: brushSizePx,
              intensity,
              hardness,
              fluidity,
              plotWidth: point.plotWidth,
              plotHeight: point.plotHeight,
              deltaRatio,
              deltaValue,
            }));
            setInteraction({ kind: 'brush', pointerId: interaction.pointerId, lastRatio: point.ratio, lastValue: point.value });
          }}
          onPointerUp={(event) => {
            if (interaction?.pointerId !== event.pointerId) return;
            setInteraction(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            if (interaction?.pointerId !== event.pointerId) return;
            setInteraction(null);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerLeave={() => {
            if (!interaction) setHoverPoint(null);
          }}
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.14em] text-pink-200/80">Pinselgröße</span>
              <span className="text-pink-100/78">{Math.round(brushSizePx)} px</span>
            </div>
            <input type="range" min={24} max={240} step={1} value={brushSizePx} onChange={(event) => setBrushSizePx(Number(event.target.value))} className="w-full" />
          </label>
          <label className="space-y-1 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.14em] text-pink-200/80">Intensität</span>
              <span className="text-pink-100/78">{intensity.toFixed(2)}</span>
            </div>
            <input type="range" min={0.05} max={1} step={0.01} value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} className="w-full" />
          </label>
          <label className="space-y-1 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.14em] text-pink-200/80">Härte</span>
              <span className="text-pink-100/78">{hardness.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={hardness} onChange={(event) => setHardness(Number(event.target.value))} className="w-full" />
          </label>
          <label className="space-y-1 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-[0.14em] text-pink-200/80">Drahtig · Flüssig</span>
              <span className="text-pink-100/78">{(1 - fluidity).toFixed(2)} · {fluidity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.01} value={fluidity} onChange={(event) => setFluidity(Number(event.target.value))} className="w-full" />
          </label>
        </div>
        <div className="rounded border border-pink-900/40 bg-pink-950/10 px-3 py-2 text-[11px] text-pink-100/76">
          <div className="uppercase tracking-[0.14em] text-pink-300/80">Status</div>
          <div className="mt-1">Werkzeug {toolMode === 'draw' ? 'Malen' : 'Morph / Warp'} · Aktive Kurve {activeStatusLabel}</div>
          <div className="mt-1">Kurvenstart {(field.edgeHandles.left * 100).toFixed(0)} · Kurvenende {(field.edgeHandles.right * 100).toFixed(0)}</div>
          {targetSelectorVisible ? (
            <div className="mt-1">Lautstärke {targetCards.find((item) => item.target === 'dynamic-fade')?.shapeLabel ?? 'Neutral'} · Tonhöhe {targetCards.find((item) => item.target === 'pitch-elastic')?.shapeLabel ?? 'Neutral'}</div>
          ) : null}
          <div className="mt-1">Funktion aktiv: {activeStatusLabel} {field.bypassed ? '· umgangen' : '· aktiv'}</div>
          {statusDescription ? <div className="mt-2 text-pink-100/62">{statusDescription}</div> : null}
        </div>
      </div>
    </div>
  );
}
