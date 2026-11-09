/**
 * Agent toggles and per-agent volume block for Resonance room.
 * Vision §8: clearer modules; keeps ResonanceRoom layout-only.
 */

import { AGENT_KEYS } from "../config/constants";

type ResonanceAgentsBlockProps = {
  agentEnabled: boolean[];
  agentVolumes: number[];
  swarmCount: number;
  onToggleAgent: (index: number) => void;
  onAgentVolume: (index: number, value: number) => void;
};

export function ResonanceAgentsBlock({
  agentEnabled,
  agentVolumes,
  swarmCount,
  onToggleAgent,
  onAgentVolume,
}: ResonanceAgentsBlockProps) {
  return (
    <div className="border border-neutral-800 bg-black p-5">
      <div className="text-sm text-neutral-300 mb-3">
        Agents ({agentEnabled.filter(Boolean).length}/{swarmCount}) - Keys: {AGENT_KEYS.join(" ")}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {agentEnabled.map((enabled, idx) => (
          <div key={idx} className="border border-neutral-800 p-2 space-y-2">
            <button
              type="button"
              className={`w-full px-2 py-1 border ${enabled ? "border-emerald-500 text-emerald-300" : "border-neutral-600 text-neutral-400"}`}
              onClick={() => onToggleAgent(idx)}
            >
              {AGENT_KEYS[idx] ?? idx}: {enabled ? "ON" : "OFF"}
            </button>
            <input
              className="w-full"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={agentVolumes[idx] ?? 1}
              onChange={(e) => onAgentVolume(idx, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
