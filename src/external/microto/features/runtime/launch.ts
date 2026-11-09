import type { Room } from "../../app/roomRegistry";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import type { HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { ResonanceSceneId } from "../resonance/config/scenes";
import { getTrainingFlows, type TrainingFlowId } from "../../domain/trainingFlows";
import {
  getPracticeGoals,
  getPracticeScenesForGoal,
  type PracticeGoalId,
} from "../../domain/practiceGoals";
import { RESONANCE_SCENES } from "../resonance/config/scenes";
import { pickRandomScene } from "../resonance/config/sceneCatalog";
import { harmonicWorldSpineApi } from "../harmonicWorldSpineApi";
import type { WorldJourney } from "../../domain/worldGallery";
import { setLastPracticeSceneId } from "../../app/practiceSessionMemory";

export type LaunchContext = {
  initAudio: EnsureAudio;
  setRoom: (room: Room) => void;
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onImportWorld?: (world: HarmonicWorldExport) => void;
};

export async function launchScene(sceneId: ResonanceSceneId, ctx: LaunchContext) {
  if (!ctx.onSelectResonanceScene) return;
  const audio = await ctx.initAudio();
  if (!audio) return;
  ctx.onSelectResonanceScene(sceneId);
  setLastPracticeSceneId(sceneId);
}

export async function launchWorld(world: HarmonicWorldExport, ctx: LaunchContext) {
  if (!ctx.onImportWorld) return;
  const audio = await ctx.initAudio();
  if (!audio) return;
  ctx.onImportWorld(world);
  ctx.setRoom("RESONANCE");
}

export async function launchPracticeGoal(goalId: PracticeGoalId, ctx: LaunchContext) {
  if (ctx.onImportWorld) {
    const worlds = harmonicWorldSpineApi.getWorldsForPracticeGoal(goalId);
    if (worlds.length > 0) {
      const firstWorld = worlds[0];
      if (!firstWorld) return;
      await launchWorld(firstWorld, ctx);
      return;
    }
  }

  if (!ctx.onSelectResonanceScene) return;
  const sceneIds = getPracticeScenesForGoal(goalId);
  if (sceneIds.length === 0) return;
  const candidates = RESONANCE_SCENES.filter((scene) => sceneIds.includes(scene.id));
  const choice = pickRandomScene(candidates as readonly (typeof RESONANCE_SCENES)[number][]);
  if (!choice) return;
  await launchScene(choice.id, ctx);
}

export async function launchTrainingFlow(flowId: TrainingFlowId, ctx: LaunchContext) {
  if (ctx.onImportWorld) {
    const worlds = harmonicWorldSpineApi.getWorldsForTrainingFlow(flowId);
    if (worlds.length > 0) {
      const firstWorld = worlds[0];
      if (!firstWorld) return;
      await launchWorld(firstWorld, ctx);
      return;
    }
  }

  if (!ctx.onSelectResonanceScene) return;
  const flows = getTrainingFlows();
  const flow = flows.find((f) => f.id === flowId);
  if (!flow || flow.sceneIds.length === 0) return;
  const firstSceneId = flow.sceneIds[0];
  if (!firstSceneId) return;
  await launchScene(firstSceneId, ctx);
}

export async function launchRandomPracticeGoal(ctx: LaunchContext) {
  const goals = getPracticeGoals();
  if (goals.length === 0) return;

  // Weighted random pick: higher-weight goals are more likely when using Surprise goal.
  const totalWeight = goals.reduce((sum, goal) => sum + (goal.weight ?? 1), 0);
  if (totalWeight <= 0) return;

  let r = Math.random() * totalWeight;
  for (const goal of goals) {
    r -= goal.weight ?? 1;
    if (r <= 0) {
      await launchPracticeGoal(goal.id, ctx);
      return;
    }
  }
}

export async function launchRandomTrainingFlow(ctx: LaunchContext) {
  const flows = getTrainingFlows();
  if (flows.length === 0) return;
  const totalWeight = flows.reduce((sum, flow) => sum + (flow.weight ?? 1), 0);
  if (totalWeight <= 0) return;

  let r = Math.random() * totalWeight;
  for (const flow of flows) {
    r -= flow.weight ?? 1;
    if (r <= 0) {
      await launchTrainingFlow(flow.id, ctx);
      return;
    }
  }
}

export async function launchJourneyStep(
  journey: WorldJourney,
  currentWorldId: string | null | undefined,
  direction: "next" | "prev",
  ctx: LaunchContext,
) {
  if (!ctx.onImportWorld) return;
  const target = harmonicWorldSpineApi.getStepWorldForJourney(journey, currentWorldId ?? null, direction);
  if (!target) return;
  await launchWorld(target, ctx);
}

