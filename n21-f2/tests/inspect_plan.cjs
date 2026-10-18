const {harness}=require('./emilia3_harness.cjs');const fs=require('fs');const {api,context}=harness();const base=api.snapshot();
for(const dx of [0,.52]){const r=api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,x:[.15,.34,.23][i]+dx,y:[.37,.46,.27][i],ratio:1}))});
context.r=r;
const p=require('vm').runInContext('compileEmiliaNetworkColor(r.model)',context);
console.log(JSON.stringify({dx,exc:p.emiliaExcitation,pickup:p.bands.map(b=>b.pickup),hz:p.bands.map(b=>b.frequencies),fixed:p.emiliaFixedModes}).slice(0,3500));
}
