import { type MutableRefObject, useEffect } from "react";
import { type Room } from "../../app/roomRegistry";
import { DRONE_JI_OVERTONES } from "./config/overtones";

type NexusRefsRef = MutableRefObject<{
  cursorY: number;
  osc?: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  gain: GainNode | null;
  droneGroupBus: GainNode | null;
  droneRhythmGain: GainNode | null;
  droneVolumeBus: GainNode | null;
  flangerWet: GainNode | null;
  flangerFeedback: GainNode | null;
  overtoneMaster: GainNode | null;
  manualJiMaster: GainNode | null;
  manualJiOscs: Record<string, OscillatorNode>;
  manualJiGains: Record<string, GainNode>;
  jiOscs: Record<string, OscillatorNode>;
  jiGains: Record<string, GainNode>;
  oscB: OscillatorNode | null;
  gainB: GainNode | null;
  lfo: OscillatorNode | null;
  lfoGain: GainNode | null;
}>;

type UseResonanceAudioArgs = {
  room: Room;
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  nexusRefs: NexusRefsRef;
};

export function useResonanceAudio({
  room,
  audioCtx,
  nexusActive,
  nexusRefs,
}: UseResonanceAudioArgs) {
  useEffect(() => {
    if (room !== "RESONANCE" || !audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    if (!refs.manualJiMaster) {
      const master = audioCtx.createGain();
      master.gain.value = 0.85;
      if (refs.droneGroupBus) {
        master.connect(refs.droneGroupBus);
      } else {
        master.connect(audioCtx.destination);
      }
      refs.manualJiMaster = master;
    }

    const manualJiMaster = refs.manualJiMaster;
    if (!manualJiMaster) return;

    DRONE_JI_OVERTONES.forEach((node) => {
      if (refs.manualJiOscs[node.label]) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(manualJiMaster);
      osc.start();
      refs.manualJiOscs[node.label] = osc;
      refs.manualJiGains[node.label] = gain;
    });

    return () => {
      const refsNow = nexusRefs.current;
      Object.values(refsNow.manualJiOscs).forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // Oscillator may already be stopped.
        }
      });
      Object.values(refsNow.manualJiGains).forEach((gain) => gain.disconnect());
      refsNow.manualJiOscs = {};
      refsNow.manualJiGains = {};
      if (refsNow.manualJiMaster) {
        refsNow.manualJiMaster.disconnect();
        refsNow.manualJiMaster = null;
      }
    };
  }, [audioCtx, nexusActive, room, nexusRefs]);

  useEffect(() => {
    if (room !== "RESONANCE" || !audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    if (!refs.filter || !refs.gain) return;

    if (!refs.overtoneMaster) {
      const overtoneMaster = audioCtx.createGain();
      overtoneMaster.gain.value = 0.72;
      if (refs.droneGroupBus) {
        overtoneMaster.connect(refs.droneGroupBus);
      } else {
        overtoneMaster.connect(audioCtx.destination);
      }
      refs.overtoneMaster = overtoneMaster;
    }

    for (const node of DRONE_JI_OVERTONES) {
      if (!refs.jiOscs[node.label]) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(refs.overtoneMaster);
        osc.start();
        refs.jiOscs[node.label] = osc;
        refs.jiGains[node.label] = gain;
      }
    }

    return () => {
      const refsNow = nexusRefs.current;
      Object.values(refsNow.jiOscs).forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Oscillator may already be stopped/disconnected.
        }
      });
      Object.values(refsNow.jiGains).forEach((gain) => {
        try {
          gain.disconnect();
        } catch {
          // Node may already be disconnected.
        }
      });
      refsNow.jiOscs = {};
      refsNow.jiGains = {};
      if (refsNow.overtoneMaster) {
        try {
          refsNow.overtoneMaster.disconnect();
        } catch {
          // Node may already be disconnected.
        }
        refsNow.overtoneMaster = null;
      }
    };
  }, [audioCtx, nexusActive, room, nexusRefs]);

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;

    const refs = nexusRefs.current;
    if (!refs.osc || !refs.filter || !refs.gain) return;

    if (!refs.oscB || !refs.gainB) {
      const oscB = audioCtx.createOscillator();
      const gainB = audioCtx.createGain();
      oscB.type = "triangle";
      oscB.detune.value = 6;
      gainB.gain.value = 0.0001;
      oscB.connect(gainB);
      gainB.connect(refs.filter);
      oscB.start();
      refs.oscB = oscB;
      refs.gainB = gainB;
    }

    if (!refs.lfo || !refs.lfoGain) {
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.13;
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(refs.filter.detune);
      lfo.start();
      refs.lfo = lfo;
      refs.lfoGain = lfoGain;
    }

    return () => {
      refs.oscB?.stop();
      refs.oscB?.disconnect();
      refs.gainB?.disconnect();
      refs.lfo?.stop();
      refs.lfo?.disconnect();
      refs.lfoGain?.disconnect();
      refs.oscB = null;
      refs.gainB = null;
      refs.lfo = null;
      refs.lfoGain = null;
    };
  }, [room, nexusActive, audioCtx, nexusRefs]);
}
