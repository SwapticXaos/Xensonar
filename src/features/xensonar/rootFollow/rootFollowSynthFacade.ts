import type {
  RootFollowSynthRenderArgs,
  RootFollowSynthRenderResult,
} from "./rootFollowRendererTypes";
import { scheduleRootFollowSynthWindow as scheduleRootFollowSynthWindowInternal } from "./rootFollowSynthRenderer";

export type {
  RootFollowSynthRenderArgs,
  RootFollowSynthRenderResult,
} from "./rootFollowRendererTypes";

export async function scheduleRootFollowSynthWindow(
  args: RootFollowSynthRenderArgs,
): Promise<RootFollowSynthRenderResult> {
  return scheduleRootFollowSynthWindowInternal(args);
}
