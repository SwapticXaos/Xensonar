import type { RootFollowMaterialWindowRenderPlan } from './rootFollowMaterialRenderPlan';

export type NativeRootFollowMaterialWindowRequest = {
  entryId: string;
  buffer: AudioBuffer;
  plan: RootFollowMaterialWindowRenderPlan;
  audioNowSec: number;
  requestedAtMs: number;
  volume: number;
};
export type NativeRootFollowMaterialWindowResult = { owned: boolean; reason?: string };
type WindowHandler = (request: NativeRootFollowMaterialWindowRequest) => Promise<NativeRootFollowMaterialWindowResult>;
type BatchHandler = (requests: NativeRootFollowMaterialWindowRequest[]) => Promise<NativeRootFollowMaterialWindowResult[]>;
type StopHandler = () => void;
let windowHandler: WindowHandler | null = null;
let batchHandler: BatchHandler | null = null;
let stopHandler: StopHandler | null = null;

export function registerNativeRootFollowMaterialBridge(handler: WindowHandler | null, stop: StopHandler | null = null, batch: BatchHandler | null = null) {
  windowHandler = handler;
  batchHandler = batch;
  stopHandler = stop;
}
export async function tryNativeRootFollowMaterialWindow(request: NativeRootFollowMaterialWindowRequest): Promise<NativeRootFollowMaterialWindowResult> {
  if (!windowHandler) return { owned: false, reason: 'native-material-disabled' };
  return windowHandler(request);
}
export async function tryNativeRootFollowMaterialWindows(requests: NativeRootFollowMaterialWindowRequest[]): Promise<NativeRootFollowMaterialWindowResult[]> {
  if (requests.length === 0) return [];
  if (batchHandler) return batchHandler(requests);
  if (!windowHandler) return requests.map(() => ({ owned: false, reason: 'native-material-disabled' }));
  const out: NativeRootFollowMaterialWindowResult[] = [];
  for (const request of requests) out.push(await windowHandler(request));
  return out;
}
export function stopNativeRootFollowMaterialBridge(): void { stopHandler?.(); }
