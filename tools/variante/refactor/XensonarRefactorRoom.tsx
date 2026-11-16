import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SharedFieldController } from "./sharedFieldController";
import {
  CENTER_X,
  CENTER_Y,
  HEIGHT,
  MODE_LABELS,
  WIDTH,
  buildAgents,
  buildGridLines,
  clamp,
  ensureStepOffsetArray,
  lerp,
  nearestGridLine,
  normalizePointer,
  snapYToGrid,
  stepFromY,
  yFromStep,
} from "./music";
import {
  DEFAULT_PARAMS,
  type Agent,
  type DirectedPulse,
  type Direction,
  type Mode,
  type Params,
  type Ripple,
  type TrailPoint,
} from "./types";
import { XENSONAR_VARIANTE_LABEL } from "./refucktorPresentation";
import { XensonarRefactorControlPanels, XensonarRefactorHeader } from "./XensonarRefactorRoomPanels";
import { drawAgentCoreOverlay, drawAgents, drawGrid, drawInstallationField, drawPulses, drawRipples, drawTrails } from "./rendering";
import { useXensonarSharedFieldRuntime, type InstallationNode } from "./useXensonarSharedFieldRuntime";
import { useXensonarRecordingRuntime } from "./useXensonarRecordingRuntime";
import { useXensonarRefactorKeyboardScope, type XensonarRefactorAstralCursor } from "./useXensonarRefactorKeyboardScope";
import { runXensonarRefactorSimulationFrame } from "./xensonarRefactorSimulationFrame";
import { useXensonarRefactorFrameRuntime } from "./useXensonarRefactorFrameRuntime";
import { useXensonarRefactorAudioRuntime, useXensonarRefactorAudioRuntimeCleanup } from "./useXensonarRefactorAudioRuntime";


type XensonarRefactorRoomProps = {
  embedded?: boolean;
  title?: string;
  sharedField?: SharedFieldController | null;
};

const TWO_PI = Math.PI * 2;

function XensonarRefactorRoom({ embedded = false, title = XENSONAR_VARIANTE_LABEL, sharedField = null }: XensonarRefactorRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridDragStepRef = useRef<number | null>(null);
  const gridDragStartYRef = useRef<number | null>(null);
  const gridDragBaseOffsetRef = useRef<number>(0);
  const gridDragMovedRef = useRef(false);
  const agentsRef = useRef<Agent[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const pulsesRef = useRef<DirectedPulse[]>([]);
  const cursorRef = useRef({ x: CENTER_X, y: CENTER_Y, active: false });
  const astralCursorRef = useRef<XensonarRefactorAstralCursor>({ active: false, step: stepFromY(CENTER_Y, DEFAULT_PARAMS.tuning, DEFAULT_PARAMS.gridPerspective, DEFAULT_PARAMS.tonicHz), x: CENTER_X });
  const {
    sharedFieldSnapshotRef,
    installationNodesRef,
    installationDragNodeIdRef,
    syncSharedField,
    endSharedFieldDrag,
  } = useXensonarSharedFieldRuntime(sharedField);
  const trailsRef = useRef<Map<number, TrailPoint[]>>(new Map());
  const seqRef = useRef(0);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const paramsRef = useRef(params);
  const [powered, setPowered] = useState(false);
  const poweredRef = useRef(false);
  const startupSilenceUntilRef = useRef(0);
  const [showLabels, setShowLabels] = useState(true);
  const [status, setStatus] = useState("Offline");
  const {
    recorderDestinationRef,
    recording,
    recordingUrl,
    toggleReadyRecording,
  } = useXensonarRecordingRuntime({ setStatus });
  const [lastEvent, setLastEvent] = useState<string>("-");
  const [transportBeat, setTransportBeat] = useState(0);
  const transportBeatRef = useRef(0);
  const lastTransportBeatUiCommitRef = useRef(0);
  const [cursorStepUi, setCursorStepUi] = useState(0);
  const [rootStepUi, setRootStepUi] = useState(0);
  const [astralActiveUi, setAstralActiveUi] = useState(false);
  const [astralXUi, setAstralXUi] = useState(CENTER_X);


  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    poweredRef.current = powered;
  }, [powered]);

  const rebuildAgents = useCallback(() => {
    const next = buildAgents(paramsRef.current);
    agentsRef.current = next;
    trailsRef.current = new Map(next.map((a) => [a.id, []]));
  }, []);

  useEffect(() => {
    rebuildAgents();
  }, [params.tuning, params.mode, params.density, rebuildAgents]);

  const {
    audioRef,
    ensureAudio,
    triggerVoice,
    triggerWaveStart,
    triggerInstallationNodeVoice,
    openPowerGate,
    closePowerGate,
    stopDrone,
    disposeAudioRuntime,
  } = useXensonarRefactorAudioRuntime({
    params,
    paramsRef,
    powered,
    poweredRef,
    sharedField,
    cursorRef,
    astralCursorRef,
    recorderDestinationRef,
    setStatus,
    setLastEvent,
  });


  const resetRoomAudioState = useCallback(() => {
    ripplesRef.current = [];
    pulsesRef.current = [];
    trailsRef.current.clear();
    for (const agent of agentsRef.current) {
      agent.lastTrigger = 0;
      agent.energy = lerp(agent.energy, agent.enabled ? 0.24 : 0.08, 1);
    }
    for (const node of installationNodesRef.current.values()) {
      node.lastTrigger = 0;
      node.energy = node.muted ? 0.04 : 0.12;
    }
  }, []);

  const spawnRipple = useCallback(async (x?: number, y?: number, energy = 1) => {
    if (!poweredRef.current) return;
    await ensureAudio();
    const px = x ?? (astralCursorRef.current.active ? astralCursorRef.current.x : cursorRef.current.x);
    const py = y ?? (astralCursorRef.current.active ? yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz) : cursorRef.current.y);
    const rootStep = stepFromY(py, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
    const ripple: Ripple = {
      id: seqRef.current++,
      x: px,
      y: py,
      radius: 6,
      maxRadius: paramsRef.current.rippleRadius,
      speed: paramsRef.current.rippleSpeed,
      width: paramsRef.current.rippleWidth,
      energy,
      falloff: paramsRef.current.rippleFalloff,
      rootStep,
    };
    ripplesRef.current.push(ripple);
    setRootStepUi(rootStep);
    await triggerWaveStart(rootStep, clamp(energy, 0.2, 1), (px / WIDTH) * 2 - 1);
    setLastEvent(`Ripple root ${rootStep} @ ${Math.round(ripple.x)},${Math.round(ripple.y)}`);
  }, [ensureAudio, triggerWaveStart]);

  const spawnDirectedPulse = useCallback(async (direction: Direction) => {
    if (!poweredRef.current) return;
    await ensureAudio();
    pulsesRef.current.push({
      id: seqRef.current++,
      direction,
      pos: direction === "left" ? WIDTH : direction === "right" ? 0 : direction === "up" ? HEIGHT : 0,
      speed: 420,
      energy: 1,
    });
    setLastEvent(`Pulse ${direction}`);
  }, [ensureAudio]);

  const togglePower = useCallback(async () => {
    const ctx = await ensureAudio();
    if (!ctx) return;

    if (!poweredRef.current) {
      resetRoomAudioState();
      startupSilenceUntilRef.current = performance.now() + 340;
      openPowerGate(ctx.currentTime);
      poweredRef.current = true;
      setPowered(true);
      setStatus("Nexus aktiv");
      return;
    }

    poweredRef.current = false;
    startupSilenceUntilRef.current = 0;
    closePowerGate(ctx.currentTime);
    setPowered(false);
    setStatus("Offline");
    resetRoomAudioState();
    stopDrone();
  }, [closePowerGate, ensureAudio, openPowerGate, resetRoomAudioState, stopDrone]);

  const pointerMove = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = normalizePointer(canvas, clientX, clientY);
    const paramsNow = paramsRef.current;
    const snappedY = paramsNow.gridSnap ? snapYToGrid(y, paramsNow) : y;
    cursorRef.current = { x, y: snappedY, active: true };
    astralCursorRef.current.active = false;
    astralCursorRef.current.step = stepFromY(snappedY, paramsNow.tuning, paramsNow.gridPerspective, paramsNow.tonicHz);
    astralCursorRef.current.x = x;
    setAstralActiveUi(false);
    setAstralXUi(x);
    setCursorStepUi(astralCursorRef.current.step);
  }, []);

  const handleCanvasPointerDown = useCallback(async (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = normalizePointer(canvas, ev.clientX, ev.clientY);
    const paramsNow = paramsRef.current;
    const lines = buildGridLines(paramsNow);

    if (sharedField?.active && sharedField.interactive) {
      let hitNode: InstallationNode | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const node of installationNodesRef.current.values()) {
        const dist = Math.hypot(node.x - x, node.y - y);
        const radius = Math.max(14, 18 + node.energy * 12);
        if (dist <= radius && dist < bestDistance) {
          hitNode = node;
          bestDistance = dist;
        }
      }
      if (hitNode) {
        ev.preventDefault();
        installationDragNodeIdRef.current = hitNode.id;
        sharedField.onNodeDragStart?.(hitNode.id, ev.clientX, ev.clientY, canvas.getBoundingClientRect());
        return;
      }
    }

    if (paramsNow.showGridTriangles && x < 28) {
      const nearest = nearestGridLine(lines, y);
      if (nearest && Math.abs(nearest.y - y) < 12) {
        gridDragStepRef.current = nearest.stepIndex;
        gridDragStartYRef.current = y;
        gridDragBaseOffsetRef.current = paramsNow.manualStepOffsets[nearest.stepIndex] ?? 0;
        gridDragMovedRef.current = false;
        return;
      }
    }

    pointerMove(ev.clientX, ev.clientY);
    if (!poweredRef.current) return;
    await spawnRipple(cursorRef.current.x, cursorRef.current.y);
  }, [pointerMove, sharedField, spawnRipple]);

  const updateTrails = useCallback((agent: Agent) => {
    if (!paramsRef.current.trailOn) return;
    const map = trailsRef.current;
    const arr = map.get(agent.id) ?? [];
    arr.push({ x: agent.x, y: agent.y, age: 0 });
    while (arr.length > paramsRef.current.trailLength) arr.shift();
    map.set(agent.id, arr);
  }, []);

  const stepSimulation = useCallback((dt: number, nowMs: number) => {
    runXensonarRefactorSimulationFrame({
      dt,
      nowMs,
      paramsRef,
      astralCursorRef,
      cursorRef,
      ripplesRef,
      pulsesRef,
      trailsRef,
      startupSilenceUntilRef,
      agentsRef,
      sharedField,
      sharedFieldSnapshotRef,
      installationNodesRef,
      installationDragNodeIdRef,
      triggerInstallationNodeVoice,
      triggerVoice,
      updateTrails,
      audioRef,
      transportBeatRef,
      lastTransportBeatUiCommitRef,
      setTransportBeat,
    });
  }, [sharedField, triggerInstallationNodeVoice, triggerVoice, updateTrails]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGrid(ctx);
    if (paramsRef.current.trailOn) drawTrails(ctx, trailsRef.current);
    drawRipples(ctx, ripplesRef.current);
    drawPulses(ctx, pulsesRef.current);

    const activeCursor = astralCursorRef.current.active
      ? { x: astralCursorRef.current.x, y: yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz), active: true }
      : cursorRef.current;

    drawAgents(ctx, agentsRef.current, showLabels, activeCursor, paramsRef.current);
    if (sharedField?.active) drawInstallationField(ctx, Array.from(installationNodesRef.current.values()), sharedFieldSnapshotRef.current.ball);
    drawAgentCoreOverlay(ctx, agentsRef.current, activeCursor, paramsRef.current);

    ctx.save();
    const rootY = yFromStep(rootStepUi, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
    const spiritY = yFromStep(cursorStepUi, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
    const overlayGrid = buildGridLines(paramsRef.current);

    if (paramsRef.current.showGridTriangles) {
      overlayGrid.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(15, line.y);
        ctx.lineTo(0, line.y - 5);
        ctx.lineTo(0, line.y + 5);
        ctx.closePath();
        if (line.muted) ctx.fillStyle = "rgba(255,100,100,0.34)";
        else if (Math.abs(line.y - spiritY) <= 1.4) ctx.fillStyle = "rgba(78,164,98,0.92)";
        else ctx.fillStyle = "rgba(150,200,255,0.58)";
        ctx.fill();

        if (Math.abs(line.offset) > 0.01) {
          ctx.fillStyle = "rgba(255,230,180,0.72)";
          ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
          ctx.fillText(line.offset > 0 ? `+${line.offset.toFixed(1)}` : line.offset.toFixed(1), 20, line.y - 5);
        }
      });
    }

    ctx.strokeStyle = "rgba(255,210,120,0.28)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, rootY);
    ctx.lineTo(WIDTH, rootY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(130,190,255,0.24)";
    ctx.beginPath();
    ctx.moveTo(0, spiritY);
    ctx.lineTo(WIDTH, spiritY);
    ctx.stroke();

    const spiritX = astralCursorRef.current.active ? astralCursorRef.current.x : cursorRef.current.x;
    ctx.beginPath();
    ctx.moveTo(spiritX, 0);
    ctx.lineTo(spiritX, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    if (astralCursorRef.current.active) {
      const y = yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(110,200,255,0.85)";
      ctx.fillStyle = "rgba(120,220,255,0.95)";
      ctx.beginPath();
      ctx.arc(astralCursorRef.current.x, y, 9, 0, TWO_PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(180,240,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(astralCursorRef.current.x, y, 18, 0, TWO_PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(190,240,255,0.85)";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText("GEIST", astralCursorRef.current.x + 14, y - 10);
    }

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`Tuning: ${paramsRef.current.tuning}`, 18, 24);
    ctx.fillText(`Mode: ${MODE_LABELS[paramsRef.current.mode] ?? paramsRef.current.mode}`, 18, 42);
    ctx.fillText(`Beat: ${transportBeatRef.current.toFixed(2)}`, 18, 60);
    ctx.fillText(powered ? "NEXUS ONLINE" : "OFFLINE", WIDTH - 140, 24);
    ctx.restore();
  }, [powered, rootStepUi, sharedField?.active, showLabels, cursorStepUi]);

  useXensonarRefactorFrameRuntime({
    powered,
    syncSharedField,
    stepSimulation,
    draw,
  });

  useXensonarRefactorKeyboardScope({
    pressedKeysRef,
    astralCursorRef,
    cursorRef,
    paramsRef,
    setParams,
    setAstralActiveUi,
    setAstralXUi,
    setCursorStepUi,
    spawnRipple,
    spawnDirectedPulse,
    triggerWaveStart,
  });

  useXensonarRefactorAudioRuntimeCleanup({ recordingUrl, disposeAudioRuntime });

  const toggleRecording = useCallback(async () => {
    const ctx = await ensureAudio();
    if (!ctx || !recorderDestinationRef.current) return;
    toggleReadyRecording();
  }, [ensureAudio, recorderDestinationRef, toggleReadyRecording]);

  const setQuickMode = useCallback((mode: Mode) => {
    setParams((prev) => ({ ...prev, mode }));
  }, []);

  const enabledCount = useMemo(() => agentsRef.current.filter((a) => a.enabled).length, [params.tuning, params.mode, params.density, transportBeat]);

  return (
    <div className={embedded ? "text-neutral-100" : "min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 overflow-auto"}>
      <div className={embedded ? "space-y-4" : "max-w-7xl mx-auto space-y-4"}>
        <XensonarRefactorHeader
          title={title}
          powered={powered}
          recording={recording}
          onTogglePower={() => void togglePower()}
          onRipple={() => void spawnRipple()}
          onPulse={(direction) => void spawnDirectedPulse(direction)}
          onToggleRecording={() => void toggleRecording()}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
          <div className="border border-neutral-800 bg-neutral-950 rounded-2xl p-3">
            <div className="relative overflow-hidden rounded-xl border border-neutral-900 bg-black">
              <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                className="w-full h-auto block bg-black cursor-crosshair"
                onPointerMove={(ev) => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const { y } = normalizePointer(canvas, ev.clientX, ev.clientY);
                  const gridDragStep = gridDragStepRef.current;
                  if (gridDragStep !== null && gridDragStartYRef.current !== null) {
                    gridDragMovedRef.current = true;
                    const delta = (gridDragStartYRef.current - y) / 18;
                    setParams((prev) => {
                      const nextOffsets = [...ensureStepOffsetArray(prev.tuning, prev.manualStepOffsets)];
                      nextOffsets[gridDragStep] = clamp(gridDragBaseOffsetRef.current + delta, -6, 6);
                      return { ...prev, manualStepOffsets: nextOffsets };
                    });
                    return;
                  }
                  if (installationDragNodeIdRef.current && sharedField?.interactive) {
                    sharedField.onNodeDragMove?.(installationDragNodeIdRef.current, ev.clientX, ev.clientY, canvas.getBoundingClientRect());
                    return;
                  }
                  pointerMove(ev.clientX, ev.clientY);
                }}
                onPointerDown={(ev) => void handleCanvasPointerDown(ev)}
                onPointerUp={() => {
                  endSharedFieldDrag();
                  if (gridDragStepRef.current !== null) {
                    const gridDragStep = gridDragStepRef.current;
                    if (!gridDragMovedRef.current && gridDragStep !== null) {
                      setParams((prev) => {
                        const muted = new Set(prev.manualMutedSteps);
                        if (muted.has(gridDragStep)) muted.delete(gridDragStep);
                        else muted.add(gridDragStep);
                        return { ...prev, manualMutedSteps: [...muted].sort((a, b) => a - b) };
                      });
                    }
                    gridDragStepRef.current = null;
                    gridDragStartYRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  endSharedFieldDrag();
                  gridDragStepRef.current = null;
                  gridDragStartYRef.current = null;
                }}
              />
            </div>
            <div className="mt-3 text-xs text-neutral-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Klick-Y = Ripple-Grundton / Root</span>
              <span>Natural Grid: unten dichter, oben weiter</span>
              <span>Maus/Touch: setzt echten Wellenursprung</span>
              <span>Mausbewegung beendet Astralreise</span>
              <span>Klick/Space: endlicher Ripple</span>
              <span>Y/X/C/V: Linien- oder Sektorwellen</span>
              <span>1-0, Q-T, Z-P: 20er Step-Fenster als Astralcursor (QWERTZ)</span>
              <span>ß / Ü: Fenster verschieben</span>
              <span>Pfeile: Cursor-Geist frei bewegen, ohne Scrollen</span>
            </div>
          </div>

          <XensonarRefactorControlPanels
            params={params}
            setParams={setParams}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            status={status}
            lastEvent={lastEvent}
            enabledCount={enabledCount}
            cursorStepUi={cursorStepUi}
            rootStepUi={rootStepUi}
            astralActiveUi={astralActiveUi}
            astralXUi={astralXUi}
            recordingUrl={recordingUrl}
            onQuickMode={setQuickMode}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(XensonarRefactorRoom);
