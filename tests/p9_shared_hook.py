hook=r'''
window.__p8={key:'material:p8-manual',mount(seed=true){
 const host=document.createElement('div');host.id='p8-root';host.style='position:fixed;z-index:100000;top:5px;left:5px;width:810px;';document.body.appendChild(host);
 const c=Array.from({length:360},(_,i)=>i>40&&i<280?.88:i>300?-.65:0);
 if(seed)__XenEQ.set(this.key,{a:c,b:c.map((x,i)=>i>110&&i<270?-.65:x),bands:12,mode:'adaptive',morph:0});
 this.root=iY.createRoot(host);this.root.render(u.jsx(__XenEQPanel,{sourceKey:this.key,owner:'P8',expanded:true,onClose:()=>{},setExpanded:()=>{}}));
},audioMount(){const ctx=new AudioContext({latencyHint:'interactive'});const d=__XenEQ.create(ctx,this.key);this.audio={ctx,d};return{backend:d.backend,filters:d.response().filters.length}},
 audioRead(){const c=__XenEQ.get(this.key);return{applied:this.audio.d.appliedPlan.filters.map(f=>f.frequency),model:__XenEQ.peekPlan(c,this.audio.ctx.sampleRate,this.key).filters.map(f=>f.frequency),rate:this.audio.ctx.sampleRate,backend:this.audio.d.backend,nativeFilterCount:this.audio.d.response().filters.length}},
 audioDispose(){this.audio.d.dispose();this.audio.ctx.close()},
 store(){__XenEQ.flush();return localStorage.getItem('xensonar.quickrack.eq.v1')},inspect(name='a'){
 const cfg=__XenEQ.get(this.key),rate=48000,p=__XenEQ.peekPlan(cfg,rate,this.key);
 const profile=__XenEQ.responseProfile(cfg,rate,240,p);
 const visual=__xenEqBandVisuals({cfg,plan:p,profile,sampleRate:rate},cfg[name]);
 const canvas=document.querySelector('#p8-root [data-eq-paint="'+name+'"] canvas');
 if(!canvas||!visual.length)return {missing:true,cfg,visual};
 const pos=PF(canvas),rect=canvas.getBoundingClientRect();
 const pts=visual.map(b=>{const goal=b.goal>=0?(cfg.high?b.goal/cfg.high:0):b.goal/-cfg.low;
   const sx=(pos.padX+b.x*pos.usableW)/canvas.width*rect.width+rect.left;
   const sy=(pos.midY-goal*pos.ampH)/canvas.height*rect.height+rect.top;
   return {index:b.index,f:b.frequency,goal:b.goal,x:sx,y:sy,inside:sx>=rect.left&&sx<=rect.right&&sy>=rect.top&&sy<=rect.bottom}
 });
 return {pts,canvas:{...rect.toJSON(),widthNative:canvas.width,heightNative:canvas.height},mode:cfg.mode,manual:cfg.manualCenters,plan:p,tool:document.querySelector('#p8-root [aria-label="Paint EQ curves"]')?.getAttribute('aria-pressed')};
},state(){const cfg=__XenEQ.get(this.key),p=__XenEQ.peekPlan(cfg,48000,this.key);return{freq:p.filters.map(f=>f.frequency),manual:cfg.manualCenters,curveA:[...cfg.a],curveB:[...cfg.b],diag:__XenEQ.diagnostics()}}
};
'''
