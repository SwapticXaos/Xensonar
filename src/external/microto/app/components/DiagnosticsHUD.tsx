import { useEffect, useRef, useState } from "react";
import { type Room } from "../roomRegistry";
import { getRafCount, getRafRoomLabels } from "../../features/runtime/rafCount";
import { getSchedulerDriftMs } from "../../features/runtime/schedulerDrift";
import { getDevNodeCount } from "../../features/runtime/audioNodeCount";
import { getPerformanceRecorder } from "../../features/runtime/performanceRecorder";
import { CANVAS_ROOMS } from "../../features/runtime/canvasRooms";
import { DiagnosticsLogPanel } from "./DiagnosticsLogPanel";

type DiagnosticsHUDProps = {
  room: Room;
  audioCtx: AudioContext | null;
};

export function DiagnosticsHUD({ room, audioCtx }: DiagnosticsHUDProps) {
  const [fps, setFps] = useState(0);
  const [rafLoops, setRafLoops] = useState(0);
  const [schedulerDriftMs, setSchedulerDriftMs] = useState<number | null>(null);
  const [inputLogCount, setInputLogCount] = useState(0);
  const [rafRoomLabels, setRafRoomLabels] = useState<string[]>([]);
  const [audioNodeCount, setAudioNodeCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const previousRoomRef = useRef<Room | null>(null);

  useEffect(() => {
    const prev = previousRoomRef.current;
    previousRoomRef.current = room;
    if (prev == null) return;
    if (!CANVAS_ROOMS.includes(prev)) return;
    const timer = window.setTimeout(() => {
      const labels = getRafRoomLabels();
      if (labels.includes(prev) || (prev === "GAME" && labels.some((l) => l.startsWith("GAME")))) {
        console.warn(
          `[XENSONAR dev] Possible RAF leak: room "${prev}" still in RAF set after switch. Labels: ${labels.join(", ")}. Check cleanup (unregisterRaf) when leaving room.`,
        );
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [room]);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      frameCountRef.current += 1;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        setRafLoops(getRafCount());
        setRafRoomLabels(getRafRoomLabels());
        setSchedulerDriftMs(getSchedulerDriftMs());
        setAudioNodeCount(getDevNodeCount());
        setInputLogCount(getPerformanceRecorder().getLog().length);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleToggle = () => setExpanded((prev) => !prev);

  if (!expanded) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-2 left-2 z-50 bg-black/60 border border-neutral-800 text-neutral-400 text-[10px] px-2 py-1 rounded hover:bg-neutral-900/80 hover:text-neutral-200 transition-colors"
      >
        DEV: {fps} FPS
      </button>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 z-50 bg-black/85 border border-neutral-700 text-xs text-neutral-300 p-3 w-48 rounded shadow-xl backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2 pb-1 border-b border-neutral-800">
        <span className="font-semibold text-cyan-500">Diagnostics</span>
        <button onClick={handleToggle} className="text-neutral-500 hover:text-white">✕</button>
      </div>
      <div className="space-y-1 font-mono">
        <div className="flex justify-between">
          <span className="text-neutral-500">FPS:</span>
          <span className={fps < 50 ? "text-amber-400" : "text-emerald-400"}>{fps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Room:</span>
          <span className="text-violet-300">{room}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Audio:</span>
          <span className={audioCtx?.state === "running" ? "text-emerald-400" : "text-neutral-400"}>
            {audioCtx ? audioCtx.state : "offline"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">SR:</span>
          <span>{audioCtx ? `${(audioCtx.sampleRate / 1000).toFixed(1)}k` : "--"}</span>
        </div>
        {audioCtx && (
          <div className="flex justify-between">
            <span className="text-neutral-500">Latency:</span>
            <span className="text-sky-300/90" title="baseLatency + outputLatency (ms); high values may indicate buffer congestion">
              {((audioCtx.baseLatency + (audioCtx.outputLatency ?? 0)) * 1000).toFixed(1)} ms
            </span>
          </div>
        )}
        {audioCtx && (
          <div className="flex justify-between">
            <span className="text-neutral-500">Nodes:</span>
            <span className="text-amber-300/90" title="Dev-only: Web Audio nodes created (osc/gain/filter/delay); oscillators decrement on ended">
              {audioNodeCount}
            </span>
          </div>
        )}
        <div className="flex justify-between items-start gap-1">
          <span className="text-neutral-500">RAF:</span>
          <span className="text-amber-300/90" title={rafRoomLabels.length ? rafRoomLabels.join(", ") : undefined}>
            {rafLoops}{rafRoomLabels.length ? ` (${rafRoomLabels.join(", ")})` : ""}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Drift:</span>
          <span className="text-sky-300/90">
            {schedulerDriftMs != null ? `${Math.round(schedulerDriftMs)} ms` : "—"}
          </span>
        </div>
        <DiagnosticsLogPanel
          inputLogCount={inputLogCount}
          onClear={() => setInputLogCount(0)}
          onLogChange={() => setInputLogCount(getPerformanceRecorder().getLog().length)}
        />
      </div>
    </div>
  );
}
