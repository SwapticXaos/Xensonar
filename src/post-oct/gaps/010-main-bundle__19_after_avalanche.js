// Control plane only. Each held gesture owns a bounded reusable C11 plan group.
const __XenHoldXLivePairExperiment=(()=>{try{return new URLSearchParams(location.search).get('xenHoldXPair')!=='0'}catch{return true}})();
const __XenHoldResident=(()=>{
 let serial=0;const sessions=new Map(),failed=new Map(),totals={sessionsCreated:0,captures:0,rejections:0,stops:0,ready:0,goReady:0,fires:0,active:0,prefixUnderruns:0};
 function disposeListeners(s){
  if(!s?.listeners)return;
  for(const [host,listener] of s.listeners)try{host.node?.port?.removeEventListener?.('message',listener)}catch{}
  s.listeners.clear();
 }
 function stop(s){
  if(!s)return;
  totals.stops++;
  disposeListeners(s);
  for(const host of s.hosts)try{host.node?.port?.postMessage({type:'HOLD_STOP',id:s.id})}catch{}
  if(sessions.get(s.key)===s)sessions.delete(s.key);
  if(typeof __XenHoldMod!=='undefined')__XenHoldMod.cancel(s);
  s.armed=false;
 }
 function reject(s){if(!s)return;totals.rejections++;
  // Prevent failed resident takeovers from retrying every 60 Hz RAF frame.
  // This throttles only preparations; the original Main hold loop still plays.
  if(failed.size>=32&&!failed.has(s.key))failed.delete(failed.keys().next().value);
  failed.set(s.key,{signature:s.signature,gestureStartAtMs:s.gestureStartAtMs,ctx:s.ctx,until:performance.now()+400});
  stop(s);s.unsupported=true;}
 function clear(){__XenNodalSurfaces.stopHoldClocks?.();failed.clear();for(const s of [...sessions.values()])stop(s)}
