import { DirtyRootFollowWalze } from './rootFollowDirtyMaschine';
import { executeRootFollowMaterialWindowRenderPlan, type RootFollowMaterialWindowRenderPlan } from './rootFollowMaterialRenderPlan';

type ForgeAux = { ctx: AudioContext; forgeSend: GainNode; gain: GainNode; walze: DirtyRootFollowWalze };
const byContext = new WeakMap<AudioContext, ForgeAux>();
const all = new Set<ForgeAux>();

function ensureForgeAux(ctx: AudioContext, forgeSend: GainNode, volume: number): ForgeAux {
  let aux = byContext.get(ctx);
  if (!aux || aux.forgeSend !== forgeSend || aux.walze.disposed) {
    if (aux) { aux.walze.dispose(); try { aux.gain.disconnect(); } catch {} all.delete(aux); }
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0.0001, volume);
    gain.connect(forgeSend);
    const walze = new DirtyRootFollowWalze(ctx, gain);
    aux = { ctx, forgeSend, gain, walze };
    byContext.set(ctx, aux); all.add(aux);
  }
  aux.gain.gain.cancelScheduledValues(ctx.currentTime);
  aux.gain.gain.setTargetAtTime(Math.max(0.0001, volume), ctx.currentTime, 0.018);
  aux.walze.drosselnWalzeBedOnly();
  aux.walze.setElasticGain(Math.max(0.0001, Math.min(0.32, volume * 0.92)), 0.038);
  return aux;
}

export function executeNativeOwnedRootFollowForgeAux(args: {
  ctx: AudioContext;
  forgeSend: GainNode | null;
  volume: number;
  buffer: AudioBuffer;
  plan: RootFollowMaterialWindowRenderPlan;
  registerNode: (node: AudioNode) => void;
}): void {
  if (!args.forgeSend) return;
  const aux = ensureForgeAux(args.ctx, args.forgeSend, args.volume);
  executeRootFollowMaterialWindowRenderPlan({
    ctx: args.ctx,
    destination: aux.walze.getElasticDestination(),
    buffer: args.buffer,
    plan: args.plan,
    registerNode: args.registerNode,
  });
}

export function disposeAllNativeRootFollowMaterialForgeAux(): void {
  for (const aux of all) { aux.walze.dispose(); try { aux.gain.disconnect(); } catch {} }
  all.clear();
}
