'use strict';
// BASS-V2-01 (real app, probe build): modern bass voices on the resident bass synth.
//  1. superset: every OLD voice played through the new note description (a recipe with an extra field at its classic default)
//     equals the classic path sample by sample (offline render, SNR >= 90 dB) - opening a modern control does not change the sound
//  2. the new factory voices sit in the loudness range of the old ones (-3.5 .. +1 dB vs Classic Forge on one phrase), no clipping
//  3. the new features act: 24 dB slope removes more highs than 12 dB; Sub 808's pitch drop starts higher and settles on the note;
//     attack softens the onset
//  4. recipes: an old recipe keeps exactly its fields; new fields are bounded
//  5. UI: the voices are listed in the Bass Workshop, the modern controls show the voice and an edit becomes a working copy
// Usage: node tests/e2e/bass_v2_voices.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 const r=await p.evaluate(async()=>{
  const ev=__xenProbe.draw.evalInBundle,OPe=ev('OPe'),V=ev('__f48BassVoices'),factory=ev('__xenBassVoiceFactoryRecipe'),clean=ev('__xenBassVoiceRecipeClean');const SR=48000;
  const render=async(params,notes,len)=>{const ctx=new OfflineAudioContext(1,Math.ceil(len*SR),SR);
   const e={audioCtx:ctx,nexusParamsRef:{current:params},applyLiveAttack:false,bassDestination:ctx.destination,ensureFinalMixBus:()=>ctx.destination,enterHoldPsyFxEnabled:false,enterHoldRef:{current:false}};
   const o=OPe(e);for(const n of notes)o.playBassNote(n.time,n.hz,n.level,n.dur,n.accent,n.opt);return (await ctx.startRendering()).getChannelData(0)};
  const snr=(a,b)=>{let r=0,d=0;for(let i=0;i<a.length;i++){r+=a[i]*a[i];d+=(a[i]-b[i])**2}return d?10*Math.log10(r/d):999};
  const rnd=(s=>()=>(s=(s*1103515245+12345)%2147483648)/2147483648)(11);
  const notes=[];let t=.05;for(let k=0;k<10;k++){notes.push({time:t,hz:[41.2,55,61.7,82.4,110][k%5],level:.5+rnd()*.4,dur:.1+rnd()*.3,accent:rnd(),opt:{glideToNext:k%3===1,ghost:k%4===3}});t+=.2}
  const out={superset:{},loud:{},features:{}};
  // 1. old voices through the new description
  for(const id of ['classic','sub','round','acid','hollow','wire'])for(const grit of [0,.3,.75]){
   const base={bassTone:.4,bassGrit:grit,bassSub:1.1,bassEnvelope:1.3,bassResonance:.3,bassDecay:1};
   const a=await render({...base,bassVoice:id},notes,t+.6),bb=await render({...base,bassVoice:'custom',bassVoiceRecipe:{...factory(id),att:0}},notes,t+.6);
   out.superset[id+'@'+grit]=+snr(a,bb).toFixed(1)}
  // 2. loudness on one phrase with default Live Room params
  const phrase=[];let u=.05;const hz=[41.2,55,61.7,55,73.4,55,49,41.2];for(let k=0;k<16;k++){phrase.push({time:u,hz:hz[k%8],level:.7,dur:.22,accent:k%4===0?1:.6,opt:{glideToNext:k%8===3}});u+=.25}
  const def={bassTone:.48,bassGrit:.18,bassSub:1,bassEnvelope:1,bassResonance:0,bassDecay:1};
  for(const id of Object.keys(V)){const x=await render({...def,bassVoice:id},phrase,u+.6);let s=0,pk=0;for(const y of x){s+=y*y;pk=Math.max(pk,Math.abs(y))}out.loud[id]={db:10*Math.log10(s/x.length),peak:pk}}
  // 3. features
  const one=[{time:.05,hz:55,level:.7,dur:.6,accent:.8,opt:{}}];
  // default Live Room settings, 110 Hz
  // energy at 1-4 kHz relative to the whole signal, Goertzel over the steady part (0.25-0.45 s)
  const hiEnergy=x=>{const a0=Math.floor(.25*SR),N=Math.floor(.2*SR);let tot=0;for(let i=a0;i<a0+N;i++)tot+=x[i]*x[i];let hi=0;
   for(let f=1000;f<=4000;f+=25){const w=2*Math.PI*f/SR,c=2*Math.cos(w);let s1=0,s2=0;for(let i=a0;i<a0+N;i++){const s0=x[i]+c*s1-s2;s2=s1;s1=s0}hi+=(s1*s1+s2*s2-c*s1*s2)/N}return hi/tot};
  const bright={...def},hi=[{time:.05,hz:110,level:.7,dur:.6,accent:1,opt:{}}];
  // the slope alone: same recipe with a fixed cutoff (no filter envelope, no extra resonance), 12 vs 24 dB
  const acid={...factory('acid_line'),fenv:0,res:0},r12=await render({...bright,bassVoice:'custom',bassVoiceRecipe:{...acid,poles:2}},hi,.8),r24=await render({...bright,bassVoice:'custom',bassVoiceRecipe:{...acid,poles:4}},hi,.8);
  out.features.highs12=hiEnergy(r12);out.features.highs24=hiEnergy(r24);
  const s808=await render({...def,bassVoice:'sub808'},one,.8);
  const zc=(x,a,b)=>{let c=0;for(let i=Math.floor(a*SR)+1;i<b*SR;i++)if((x[i-1]<0)!==(x[i]<0))c++;return c/2/(b-a)};
  out.features.f808early=zc(s808,.052,.07);out.features.f808late=zc(s808,.3,.5);
  const att0=await render({...def,bassVoice:'custom',bassVoiceRecipe:{...factory('classic'),att:0}},one,.3),att30=await render({...def,bassVoice:'custom',bassVoiceRecipe:{...factory('classic'),att:.03}},one,.3);
  const peakIn=(x,a,b)=>{let m=0;for(let i=Math.floor(a*SR);i<b*SR;i++)m=Math.max(m,Math.abs(x[i]));return m};
  out.features.onset0=peakIn(att0,.05,.056);out.features.onset30=peakIn(att30,.05,.056);
  // 4. recipes
  const old={wave:'sawtooth',second:'triangle',detune:1.004,sub:1,color:1,gain:1,classicMode:true};
  out.recipeOld=clean(old);out.recipeBounded=clean({...old,att:5,uni:7.6,spread:-1,poles:4,pdrop:.2});
  return out});
 const sup=Object.entries(r.superset);console.log('superset SNR (dB):',sup.map(([k,v])=>k+' '+v).join(' · '));
 for(const [k,v] of sup)assert.ok(v>=90,'old voice '+k+' through the new description equals the classic path: '+v+' dB');
 const c=r.loud.classic.db,newIds=['acid_line','sub808','reese','deep_pluck','square_punch'];
 console.log('loudness vs Classic Forge:',Object.entries(r.loud).map(([k,v])=>k+' '+(v.db-c).toFixed(2)+' dB/pk '+v.peak.toFixed(2)).join(' · '));
 for(const id of newIds){assert.ok(r.loud[id],'voice '+id+' exists');const d=r.loud[id].db-c;assert.ok(d>-3.5&&d<1,id+' sits in the loudness range of the old voices: '+d.toFixed(2)+' dB');assert.ok(r.loud[id].peak<1,id+' does not clip: '+r.loud[id].peak.toFixed(3))}
 console.log('features',JSON.stringify(Object.fromEntries(Object.entries(r.features).map(([k,v])=>[k,+v.toPrecision(4)]))));
 assert.ok(r.features.highs24<r.features.highs12*.8,'24 dB slope removes more highs than 12 dB');
 assert.ok(r.features.f808early>r.features.f808late*1.3&&Math.abs(r.features.f808late-55)<4,'Sub 808 starts higher and settles on 55 Hz: '+r.features.f808early.toFixed(1)+' -> '+r.features.f808late.toFixed(1)+' Hz');
 assert.ok(r.features.onset30<r.features.onset0*.5,'attack softens the onset');
 assert.deepEqual(r.recipeOld,{wave:'sawtooth',second:'triangle',detune:1.004,sub:1,color:1,gain:1,classicMode:true},'an old recipe keeps exactly its fields');
 assert.deepEqual({att:r.recipeBounded.att,uni:r.recipeBounded.uni,spread:r.recipeBounded.spread,poles:r.recipeBounded.poles,pdrop:r.recipeBounded.pdrop},{att:.08,uni:3,spread:0,poles:4,pdrop:1},'new fields are bounded');
 // 5. UI
 await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-bass-pattern-manager')));await p.waitForTimeout(2000);
 const sel=p.getByLabel('Bass Voice').first();const labels=await sel.locator('option').allInnerTexts();
 for(const l of ['Acid Line · 24 dB','Sub 808','Reese · detuned','Deep Pluck','Square Punch'])assert.ok(labels.includes(l),'listed: '+l);
 await sel.selectOption('acid_line');await p.waitForTimeout(400);
 await p.locator('[data-xen-bass-edit-toggle]').first().click();await p.waitForTimeout(300);
 assert.equal(await p.getByLabel('Filter Slope').first().inputValue(),'4','the editor shows the 24 dB slope of Acid Line');
 await p.getByLabel('Unison Voices').first().fill('2');await p.waitForTimeout(400);
 const after=JSON.parse(await p.evaluate(()=>__xenProbe.draw.evalInBundle('JSON.stringify({v:__NodalBallGrid.params().bassVoice,r:__NodalBallGrid.params().bassVoiceRecipe})')));
 assert.equal(after.v,'custom','an edit becomes a working copy');assert.equal(after.r.uni,2);assert.equal(after.r.poles,4,'the working copy keeps the modern fields');
 assert.deepEqual(errors,[]);console.log('PASS BASS-V2-01: old voices unchanged through the new description, 5 new voices level-matched, 24 dB / pitch drop / attack act, recipes safe, editor works');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
