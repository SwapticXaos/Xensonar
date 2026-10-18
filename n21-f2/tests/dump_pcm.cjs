const fs=require('fs');const {harness}=require('./emilia3_harness.cjs');const {api}=harness();const base=api.snapshot();(async()=>{
for(const dx of [0,.52]){const r=api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,x:[.15,.34,.23][i]+dx,y:[.37,.46,.27][i],ratio:1}))});const a=await api.renderPCM({instrument:r,tracks:[{at:t=>({hz:196,gain:.65})}],durationSec:1,sampleRate:24000});fs.writeFileSync('/mnt/data/emilia_emergent_graph/results/spectral-'+dx+'.f32',Buffer.from(a.left.buffer));}}
)();
