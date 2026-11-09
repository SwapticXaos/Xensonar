import { type MutableRefObject, useCallback, useEffect, type RefObject } from "react";
import { type Room } from "../../app/roomRegistry";
import { JI_NODES } from "../../shared/tuning/harmonicNodes";
import { quantizeStepSeconds } from "../../shared/tuning/grid";
import { type ResonanceState } from "../resonance/config/state";
import { type SemanticNode } from "../runtime/types";
import { useSimulationLoop } from "../runtime/useSimulationLoop";
import { VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS } from "../runtime/visualRuntimeContract";

export type TopologyRefsRef = MutableRefObject<{
  nodes: SemanticNode[];
  cursor: { x: number; y: number; vx: number; vy: number };
  osc: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  gain: GainNode | null;
  fmOsc: OscillatorNode | null;
  fmGain: GainNode | null;
}>;

export type TopologyParams = {
  tension: number;
  slimLayers: number;
  rawReality: number;
};

export type UseTopologyLoopArgs = {
  room: Room;
  topologyActive: boolean;
  audioCtx: AudioContext | null;
  topologyCanvasRef: RefObject<HTMLCanvasElement | null>;
  topologyRefs: TopologyRefsRef;
  tParams: TopologyParams;
  setSystemState: (state: string) => void;
  topologyQuantizeRef: MutableRefObject<Pick<ResonanceState, "quantizeOn" | "quantizeBpm" | "quantizeSubdivision">>;
  topoWidth: number;
  topoHeight: number;
  freq: (base: number, cents: number) => number;
};

const BASE_FREQ = 220;

export function useTopologyLoop({
  room,
  topologyActive,
  audioCtx,
  topologyCanvasRef,
  topologyRefs,
  tParams,
  setSystemState,
  topologyQuantizeRef,
  topoWidth,
  topoHeight,
  freq,
}: UseTopologyLoopArgs) {
  const active = room === "TOPOLOGY" && !!topologyActive && !!audioCtx;

  useEffect(() => {
    if (!active || !audioCtx) return;

    const ctx = audioCtx;
    topologyRefs.current.nodes = JI_NODES.map((ji) => ({
      x: topoWidth * 0.1 + Math.random() * topoWidth * 0.8,
      y: topoHeight * 0.1 + Math.random() * topoHeight * 0.8,
      freq: freq(BASE_FREQ, ji.cents),
      energy: 0,
      label: ji.label,
    }));
    topologyRefs.current.cursor = { x: topoWidth / 2, y: topoHeight / 2, vx: 0, vy: 0 };

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const fmOsc = ctx.createOscillator();
    const fmGain = ctx.createGain();

    osc.type = "sine";
    fmOsc.type = "sine";
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    fmOsc.connect(fmGain);
    fmGain.connect(osc.frequency);

    osc.frequency.value = BASE_FREQ;
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 1;
    gain.gain.value = 0.18;
    fmGain.gain.value = 0;

    osc.start();
    fmOsc.start();

    topologyRefs.current.osc = osc;
    topologyRefs.current.filter = filter;
    topologyRefs.current.gain = gain;
    topologyRefs.current.fmOsc = fmOsc;
    topologyRefs.current.fmGain = fmGain;

    return () => {
      osc.stop();
      fmOsc.stop();
      osc.disconnect();
      fmOsc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }, [active, audioCtx, topoWidth, topoHeight, freq, topologyRefs]);

  const update = useCallback(
    (_dt: number) => {
      const refs = topologyRefs.current;
      const cur = refs.cursor;
      const { tension, slimLayers, rawReality } = tParams;
      const dissipationRate = 0.005 + slimLayers * 0.02;

      let maxEnergy = 0;
      let dominantFreq = BASE_FREQ;
      let pullX = 0;
      let pullY = 0;
      let activeNode: SemanticNode | null = null;

      for (const node of refs.nodes) {
        const dx = node.x - cur.x;
        const dy = node.y - cur.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = (1 / (dist + 10)) * tension * 500;
        pullX += (dx / dist) * force;
        pullY += (dy / dist) * force;

        if (dist < 80) {
          node.energy += 0.015 * (1 - slimLayers * 0.5);
        }
        node.energy = Math.max(0, Math.min(1, node.energy - dissipationRate));

        if (node.energy > maxEnergy) {
          maxEnergy = node.energy;
          dominantFreq = node.freq;
          if (node.energy > 0.7) {
            activeNode = node;
          }
        }
      }

      cur.vx += (Math.random() - 0.5) * 2.5;
      cur.vy += (Math.random() - 0.5) * 2.5;
      cur.vx += pullX;
      cur.vy += pullY;
      cur.vx *= 0.94;
      cur.vy *= 0.94;
      cur.x += cur.vx;
      cur.y += cur.vy;

      if (cur.x < 0 || cur.x > topoWidth) cur.vx *= -1;
      if (cur.y < 0 || cur.y > topoHeight) cur.vy *= -1;

      if (audioCtx) {
        const rawNow = audioCtx.currentTime;
        const n = topologyQuantizeRef.current;
        const gridStep = quantizeStepSeconds(n.quantizeBpm, n.quantizeSubdivision);
        const now = n.quantizeOn ? Math.ceil(rawNow / gridStep) * gridStep : rawNow;
        const rawFreq = BASE_FREQ + (cur.y / topoHeight) * BASE_FREQ;
        const targetFreq = rawFreq * rawReality + dominantFreq * (1 - rawReality);
        refs.osc?.frequency.setTargetAtTime(targetFreq, now, 0.1);
        refs.filter?.frequency.setTargetAtTime(400 + (cur.x / topoWidth) * 1500, now, 0.1);

        if (activeNode) {
          refs.fmGain?.gain.setTargetAtTime(targetFreq * 1.2, now, 0.3);
          refs.fmOsc?.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.3);
          refs.filter?.Q.setTargetAtTime(4, now, 0.3);
          setSystemState(
            maxEnergy > 0.9
              ? `Strukturelle Resonanz: Myzel vibriert intensiv an [${activeNode.label}]`
              : `Lokale Verdichtung um [${activeNode.label}]`,
          );
        } else {
          refs.fmGain?.gain.setTargetAtTime(0, now, 0.5);
          refs.filter?.Q.setTargetAtTime(1, now, 0.5);
          setSystemState("Fließendes Myzel");
        }
      }
    },
    [
      tParams,
      topologyRefs,
      topologyQuantizeRef,
      setSystemState,
      topoWidth,
      topoHeight,
      audioCtx,
    ],
  );

  const draw = useCallback(
    (c: CanvasRenderingContext2D) => {
      const refs = topologyRefs.current;
      const cur = refs.cursor;

      c.fillStyle = "#0a0a0c";
      c.fillRect(0, 0, topoWidth, topoHeight);

      c.strokeStyle = "rgba(255,255,255,0.05)";
      c.lineWidth = 1;
      refs.nodes.forEach((n1, i) => {
        refs.nodes.slice(i + 1).forEach((n2) => {
          const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (d < 200) {
            c.beginPath();
            c.moveTo(n1.x, n1.y);
            c.lineTo(n2.x, n2.y);
            c.stroke();
          }
        });
      });

      refs.nodes.forEach((node) => {
        const radius = 4 + node.energy * 25;
        c.beginPath();
        c.arc(node.x, node.y, radius, 0, Math.PI * 2);
        const r = 100 + node.energy * 155;
        const g = 100 + node.energy * 100;
        const b = 200 - node.energy * 150;
        const a = 0.3 + node.energy * 0.5;
        c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        c.fill();

        c.fillStyle = "rgba(255,255,255,0.75)";
        c.font = "10px monospace";
        c.fillText(node.label, node.x + 10, node.y - 10);
      });

      c.beginPath();
      c.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
      c.fillStyle = "#fff";
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.3)";
      c.beginPath();
      c.moveTo(cur.x, cur.y);
      c.lineTo(cur.x - cur.vx * 6, cur.y - cur.vy * 6);
      c.stroke();

      // Cursor→pitch discoverability label (vision §5: controls understandable; exploratory instrument)
      const cursorFreq = BASE_FREQ + (cur.y / topoHeight) * BASE_FREQ;
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.font = "11px monospace";
      c.fillText(`~${Math.round(cursorFreq)} Hz`, cur.x + 14, cur.y + 4);
    },
    [topologyRefs, topoWidth, topoHeight],
  );

  useSimulationLoop({
    canvasRef: topologyCanvasRef,
    active,
    update,
    draw,
    registerRaf: true,
    roomId: "TOPOLOGY",
    maxFrameMs: VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS,
  });
}
