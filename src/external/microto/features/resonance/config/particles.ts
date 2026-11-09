import { modeMask, type ChurchMode } from "../../../shared/tuning/modes";
import { BP_13TET_RATIOS, DEFAULT_SWARM_COUNT } from "./constants";
import { JI_NODES } from "./overtones";
import { type ParticleSystem } from "./types";

const COMPLEX_JI_DEFAULT_MUTED = new Set<string>();

export type ParticleNode = { ratio: number; label: string };

export const getBaseParticleNodes = (system: ParticleSystem): ParticleNode[] => {
  if (system === "12edo") {
    return Array.from({ length: 12 }, (_, step) => ({
      ratio: Math.pow(2, step / 12),
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  if (system === "bp") {
    return Array.from({ length: 13 }, (_, step) => ({
      ratio: BP_13TET_RATIOS[step],
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  return JI_NODES.map((node) => ({ ratio: node.ratio, label: node.label }));
};

export const getParticleNodes = (system: ParticleSystem, count = DEFAULT_SWARM_COUNT): ParticleNode[] => {
  const base = getBaseParticleNodes(system);
  const safeCount = Math.max(4, Math.min(48, Math.floor(count)));
  if (safeCount <= base.length) return base.slice(0, safeCount);

  const nodes: ParticleNode[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    const source = base[i % base.length];
    const tier = Math.floor(i / base.length);
    const shift = tier % 3 === 0 ? 0 : tier % 3 === 1 ? -1 : 1;
    nodes.push({
      ratio: source.ratio * Math.pow(2, shift),
      label: tier === 0 ? source.label : `${source.label}.${tier + 1}`,
    });
  }
  return nodes;
};

export const defaultAgentEnabled = (system: ParticleSystem, mode: ChurchMode, count = DEFAULT_SWARM_COUNT) => {
  const nodes = getParticleNodes(system, count);
  if (system === "12edo") {
    const mask = modeMask(mode);
    return nodes.map((_, idx) => mask[idx % mask.length]);
  }
  if (system === "bp") return nodes.map(() => true);
  return nodes.map((node) => !COMPLEX_JI_DEFAULT_MUTED.has(node.label.split(".")[0]));
};

