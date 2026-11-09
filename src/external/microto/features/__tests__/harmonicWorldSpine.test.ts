import { describe, expect, it } from "vitest";
import {
  getNextSceneInPracticeGoal,
  getNextSceneInAnyGoal,
  getNextSceneInTrainingFlow,
  getPracticeGoalsForScene,
  getRandomSimilarScene,
  getSimilarScenes,
  getSuggestedNextScenes,
  getSuggestedSimilarScene,
} from "../harmonicWorldSpine";

describe("harmonicWorldSpine", () => {
  describe("getNextSceneInPracticeGoal", () => {
    it("returns null when currentSceneId is null", () => {
      expect(getNextSceneInPracticeGoal("ladder_training", null)).toBeNull();
    });

    it("returns next scene when current is in goal and not last", () => {
      const next = getNextSceneInPracticeGoal("ladder_training", "edo12_reference_orbit");
      expect(next).not.toBeNull();
      expect(next!.id).toBe("edo17_training_ladder");
      expect(next!.label).toBeDefined();
    });

    it("returns null when current is last scene in goal", () => {
      expect(getNextSceneInPracticeGoal("ladder_training", "edo31_training_orbit")).toBeNull();
    });

    it("returns null when current scene is not in goal", () => {
      expect(getNextSceneInPracticeGoal("ladder_training", "ji_warm_pad_groove")).toBeNull();
    });

    it("returns correct next for middle of sequence (ear_training)", () => {
      const next = getNextSceneInPracticeGoal("ear_training", "ji_commons_practice_space");
      expect(next).not.toBeNull();
      expect(next!.id).toBe("ji_commons_wash_orbit");
    });

  });

  describe("getNextSceneInAnyGoal", () => {
    it("returns null when currentSceneId is null", () => {
      expect(getNextSceneInAnyGoal(null)).toBeNull();
    });

    it("returns first goal with next scene when current is in multiple goals", () => {
      // bp_glass_halo is in ambient_exploration and non_octave_bp_exploration; ambient_exploration comes first in PRACTICE_GOALS and now has next (ji_noon_exploration)
      const result = getNextSceneInAnyGoal("bp_glass_halo");
      expect(result).not.toBeNull();
      expect(result!.goal.id).toBe("ambient_exploration");
      expect(result!.nextScene.id).toBe("ji_noon_exploration");
    });

    it("returns goal and next scene for ladder first scene", () => {
      const result = getNextSceneInAnyGoal("edo12_reference_orbit");
      expect(result).not.toBeNull();
      expect(result!.goal.id).toBe("ladder_training");
      expect(result!.nextScene.id).toBe("edo17_training_ladder");
    });

    it("returns null when current is last in all containing goals", () => {
      // edo31_training_orbit is only in ladder_training and is last there
      expect(getNextSceneInAnyGoal("edo31_training_orbit")).toBeNull();
    });

    it("returns null when scene is not in any goal", () => {
      const result = getNextSceneInAnyGoal("edo22_evening_meditation");
      expect(result).toBeNull();
    });

    it("returns next for scene that is first in a goal (ear_training)", () => {
      const result = getNextSceneInAnyGoal("ji_warm_pad_groove");
      expect(result).not.toBeNull();
      expect(result!.goal.id).toBe("ear_training");
      expect(result!.nextScene.id).toBe("ji_commons_practice_space");
    });
  });

  describe("getSuggestedSimilarScene", () => {
    it("returns null when currentSceneId is null", () => {
      expect(getSuggestedSimilarScene(null)).toBeNull();
    });

    it("returns a different scene when current is valid (same mood or same tuning)", () => {
      const similar = getSuggestedSimilarScene("ji_warm_pad_groove");
      expect(similar).not.toBeNull();
      expect(similar!.id).not.toBe("ji_warm_pad_groove");
      expect(similar!.label).toBeDefined();
    });

    it("returns another JI scene for a JI scene when no same-mood match", () => {
      const similar = getSuggestedSimilarScene("ji_dawn_wash");
      expect(similar).not.toBeNull();
      expect(similar!.id).not.toBe("ji_dawn_wash");
      expect(similar!.gridTuning).toBe("ji");
    });
  });

  describe("getPracticeGoalsForScene", () => {
    it("returns empty when sceneId is null", () => {
      expect(getPracticeGoalsForScene(null)).toEqual([]);
    });

    it("returns goals that contain the scene (ladder_training)", () => {
      const goals = getPracticeGoalsForScene("edo12_reference_orbit");
      expect(goals.length).toBeGreaterThanOrEqual(1);
      expect(goals.some((g) => g.id === "ladder_training")).toBe(true);
    });

    it("returns multiple goals when scene is in more than one", () => {
      const goals = getPracticeGoalsForScene("bp_glass_halo");
      expect(goals.length).toBe(2);
      expect(goals.map((g) => g.id).sort()).toEqual(["ambient_exploration", "non_octave_bp_exploration"]);
    });
  });

  describe("getNextSceneInTrainingFlow", () => {
    it("returns null when currentSceneId is null", () => {
      expect(getNextSceneInTrainingFlow(null)).toBeNull();
    });

    it("returns next scene when current is in a flow and not last", () => {
      const next = getNextSceneInTrainingFlow("edo12_reference_orbit");
      expect(next).not.toBeNull();
      expect(next!.id).toBe("edo17_training_ladder");
    });

    it("returns null when current is last in flow", () => {
      expect(getNextSceneInTrainingFlow("edo31_training_orbit")).toBeNull();
    });

    it("returns next for bp_glass_halo (reference-bp-intro flow)", () => {
      const next = getNextSceneInTrainingFlow("bp_glass_halo");
      expect(next).not.toBeNull();
      expect(next!.id).toBe("bp_lantern_run");
    });
  });

  describe("getSimilarScenes", () => {
    it("returns empty when currentSceneId is null", () => {
      expect(getSimilarScenes(null)).toEqual([]);
    });
    it("returns scenes with same mood or tuning, excluding current", () => {
      const similar = getSimilarScenes("ji_warm_pad_groove", { byMood: true, byTuning: true, limit: 20 });
      expect(similar.length).toBeGreaterThan(0);
      expect(similar.every((s) => s.id !== "ji_warm_pad_groove")).toBe(true);
    });
    it("respects limit option", () => {
      const limited = getSimilarScenes("ji_aurora_wash", { limit: 3 });
      expect(limited.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getRandomSimilarScene", () => {
    it("returns a scene when currentSceneId is null (falls back to full catalog)", () => {
      const scene = getRandomSimilarScene(null);
      expect(scene).not.toBeNull();
      expect(scene!.id).toBeDefined();
      expect(typeof scene!.label).toBe("string");
    });
    it("returns a scene when current scene has similar family", () => {
      const scene = getRandomSimilarScene("ji_aurora_wash");
      expect(scene).not.toBeNull();
      expect(scene!.id).toBeDefined();
      expect(typeof scene!.label).toBe("string");
    });
  });

  describe("getSuggestedNextScenes", () => {
    it("returns empty when currentSceneId is null", () => {
      expect(getSuggestedNextScenes(null)).toEqual([]);
    });

    it("returns up to limit entries with id and label", () => {
      const suggested = getSuggestedNextScenes("edo12_reference_orbit", { limit: 3 });
      expect(suggested.length).toBeGreaterThan(0);
      expect(suggested.length).toBeLessThanOrEqual(3);
      for (const entry of suggested) {
        expect(entry.id).toBeDefined();
        expect(typeof entry.label).toBe("string");
        expect(entry.label.length).toBeGreaterThan(0);
      }
    });

    it("respects limit option", () => {
      const two = getSuggestedNextScenes("ji_warm_pad_groove", { limit: 2 });
      expect(two.length).toBeLessThanOrEqual(2);
    });
  });
});
