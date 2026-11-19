// MYZEL-COSMOS-01: every Rebuild Layout of the Art Installation gets its own sound world.
// Runs the real geometry (07), live bridge (08) and kernel (09) of the Mycelium hum via
// tests/helpers/myzel_cosmos_rig.cjs; the G2 parent files (93dbe4d) are the reference.
const test=require('node:test'),assert=require('node:assert');
const R=require('./helpers/myzel_cosmos_rig.cjs');
const maxDiff=(a,b)=>{let d=0;for(let i=0;i<a.left.length;i++)d=Math.max(d,Math.abs(a.left[i]-b.left[i]),Math.abs(a.right[i]-b.right[i]));return d;};

test('Constellation Web 0 % sounds exactly like the G2 parent (bridge + kernel, PCM bit-identical)',()=>{
  for(const [seed,coupling] of [[7,true],[11,false]]){
    const parent=R.render({dir:R.PARENT,seed,seconds:4,coupling}),now=R.render({seed,seconds:4,coupling,mix:{webLevel:0}});
    assert.equal(maxDiff(parent,now),0,`seed ${seed}, coupling ${coupling}`);
  }
});

test('the kernel without a web payload is the G2 kernel (same messages, same PCM)',()=>{
  const recorded=R.render({dir:R.PARENT,seed:3,seconds:3});
  const replay=dir=>{const dsp=R.load(dir).createMyzelGDSP(48000),out=[new Float32Array(128),new Float32Array(128)],pcm=[];
    let m=0;for(let b=0;b<1125;b++){if(b%11===0&&m<recorded.messages.length)dsp.controls(structuredClone(recorded.messages[m++]));dsp.process(null,out);pcm.push(out[0][5],out[1][77]);}return pcm;};
  assert.deepEqual(replay(R.SRC),replay(R.PARENT));
});

test('the cosmos is pure geometry: same layout, same cosmos; ids and node order do not matter',()=>{
  const api=R.load(R.SRC),nodes=R.layout(5),snap=list=>({myzelAudioNodes:list,myzelAudioWidth:R.W,myzelAudioHeight:R.H});
  const a=api.constellation(snap(nodes)),again=api.constellation(snap(nodes.map(n=>({...n}))));
  assert.equal(again,a,'unchanged layout: cached object, no recomputation');
  const other=R.load(R.SRC).constellation(snap(nodes.slice().reverse().map((n,i)=>({...n,id:'saved-'+i}))));
  for(const key of Object.keys(a.params))assert.ok(Math.abs(a.params[key]-other.params[key])<1e-12,key);
  assert.equal(other.summary,a.summary);assert.equal(other.links.length,a.links.length);
});

test('rolls spread the cosmos over its full range (G2 colour values barely moved)',()=>{
  const api=R.load(R.SRC),parent=R.load(R.PARENT),values={},frame=[],summaries=new Set();
  for(let seed=1;seed<=60;seed++){const s={myzelAudioNodes:R.layout(seed),myzelAudioWidth:R.W,myzelAudioHeight:R.H,cursorNormalizedX:.5,cursorNormalizedY:.5};
    const c=api.constellation(s);summaries.add(c.summary);for(const [k,v] of Object.entries(c.params))(values[k]=values[k]||[]).push(v);
    frame.push(parent.myzelGSpatialFrame(s,220).density);}
  const span=k=>{const a=values[k].slice().sort((x,y)=>x-y);return [a[3],a[56]];};
  const sd=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length);};
  assert.ok(sd(frame)<.07,'G2 density hardly varies between rolls: '+sd(frame));
  const [w0,w1]=span('web'),[m0,m1]=span('metal'),[a0,a1]=span('attack'),[t0,t1]=span('travel'),[d0,d1]=span('decay');
  assert.ok(w1-w0>.3,`web feedback ${w0}..${w1}`);assert.ok(m1-m0>.5,`metal ${m0}..${m1}`);
  assert.ok(a1/a0>8,`attack ${a0}..${a1}`);assert.ok(t1/t0>2.5,`travel ${t0}..${t1}`);assert.ok(d1/d0>2.5,`decay ${d0}..${d1}`);
  assert.ok(summaries.size>=50,'almost every roll gets its own description: '+summaries.size);
});

test('the ball plucks a node and the impulse travels along its links with their delay',()=>{
  // three nodes in a row; the ball rests at the left one, then leaves.
  const node=(id,x,f,type)=>({id,x,y:200,frequency:f,muted:false,isCustomResident:false,energy:0,config:{auraRadius:120,modules:[{type,intensity:.8}]}});
  const nodes=[node('a',200,220,'chorus'),node('b',500,330,'chorus'),node('c',900,275,'chorus')];
  const ballPath=t=>t<.6?{x:-1,y:.5}:t<1.2?{x:200/1100,y:.5}:{x:-1,y:.5};
  const seen=[],onset={};
  const r=R.render({nodes,seconds:4,ballPath,mix:{rootLevel:0,ballLevel:0,nodeLevel:0,webLevel:1,ballToneMode:'continuous'},
    onMessage:m=>{if(m.web)seen.push(m.web);},
    onBlock:(dsp,t)=>{const w=dsp.snapshot().web;w.ids.forEach((id,k)=>{if(onset[id]===undefined&&w.amp[k]>.01)onset[id]=t;});}});
  assert.equal(seen.length,1,'the layout travels once, not with every frame');
  const cosmos=r.cosmos,ab=cosmos.links.find(l=>cosmos.nodes[l.a].id==='a'&&cosmos.nodes[l.b].id==='b');
  assert.ok(ab,'a and b are linked');
  // b starts sounding one link delay after the pluck of a
  const env=[],hop=480;for(let s=0;s+hop<=r.left.length;s+=hop){let e=0;for(let i=s;i<s+hop;i++)e+=r.left[i]**2+r.right[i]**2;env.push(Math.sqrt(e/hop));}
  const first=env.findIndex(x=>x>1e-3)*hop/48000;
  assert.ok(first>.55&&first<.75,'a sounds when the ball arrives: '+first);
  assert.ok(r.dsp.snapshot().web.links>=4,'links are directed both ways');
  const delay=onset.b-onset.a;
  assert.ok(Math.abs(delay-ab.delay)<.03,`b answers one link delay after a: ${delay.toFixed(3)} s, link ${ab.delay.toFixed(3)} s`);
  const tail=env.slice(Math.round(3.5*48000/hop)).reduce((x,y)=>Math.max(x,y),0);
  assert.ok(tail<env.reduce((x,y)=>Math.max(x,y),0)*.5,'the web dies away after the ball has left');
});

test('a dense cluster rings longer than a spread-out line (the web is the constellation)',()=>{
  const make=(pos)=>pos.map(([x,y],i)=>({id:'n'+i,x,y,frequency:220*[1,9/8,6/5,5/4,4/3,11/8,3/2,8/5,13/8,5/3,7/4,15/8][i],muted:false,isCustomResident:false,energy:0,
    config:{auraRadius:150,modules:[{type:['resonator','chorus','comb_filter'][i%3],intensity:.8}]}}));
  const cluster=make(Array.from({length:12},(_,i)=>[550+60*Math.cos(i*2.4)*(1+i/12),200+50*Math.sin(i*2.4)*(1+i/12)]));
  const line=make(Array.from({length:12},(_,i)=>[120+i*78,200+(i%2)*12]));
  const tail=nodes=>{const r=R.render({nodes,seconds:5,mix:{rootLevel:0,ballLevel:0,nodeLevel:0,webLevel:1,ballToneMode:'continuous'},
      ballPath:t=>t<1.5?{x:(550+300*(t/1.5-.5))/1100,y:.5}:{x:-1,y:-1}});
    let e=0;for(let i=Math.round(2.5*48000);i<r.left.length;i++)e+=r.left[i]**2;return {e,cosmos:r.cosmos};};
  const a=tail(cluster),b=tail(line);
  assert.ok(a.cosmos.params.web>b.cosmos.params.web,'cluster carries more: '+a.cosmos.params.web+' vs '+b.cosmos.params.web);
  assert.ok(a.cosmos.params.decay>b.cosmos.params.decay,'cluster rings longer');
  assert.notEqual(a.cosmos.summary,b.cosmos.summary);
  assert.ok(a.e>b.e*2,`after the ball has gone the cluster is still ringing: ${a.e} vs ${b.e}`);
});

test('extreme layouts stay finite and bounded; the web drains when the ball is uncoupled',()=>{
  const same=Array.from({length:16},(_,i)=>({id:'s'+i,x:550,y:200,frequency:110*(1+i/7),muted:false,isCustomResident:i>11,energy:0,config:{auraRadius:300,modules:[{type:'resonator',intensity:1}]}}));
  const two=same.slice(0,2).map((n,i)=>({...n,x:300+i*400}));
  for(const nodes of [same,two,[]]){
    const r=R.render({nodes,seconds:6,mix:{webLevel:1},ballPath:t=>({x:.5+.45*Math.sin(t*9),y:.5+.45*Math.cos(t*7)})});
    let peak=0;for(let i=0;i<r.left.length;i++){assert.ok(Number.isFinite(r.left[i])&&Number.isFinite(r.right[i]));peak=Math.max(peak,Math.abs(r.left[i]),Math.abs(r.right[i]));}
    assert.ok(peak<=1,'peak '+peak);const w=r.dsp.snapshot().web;assert.ok(Math.max(0,...w.amp)<=1.25);
  }
  const r=R.render({nodes:same,seconds:12,coupling:false,mix:{webLevel:1},ballPath:t=>({x:.5,y:.5})});
  const w=r.dsp.snapshot().web;assert.equal(w.queued,0,'no impulse left on its way');assert.equal(w.awake,0,'all node voices asleep');
});

test('a new roll while the web sounds: no jump in the waveform',()=>{
  // Two layouts, switched at 3 s while voices ring (the Rebuild Layout case): the
  // steps around the switch stay within what the sound does anyway before it.
  const one=R.layout(21),two=R.layout(22),nodes=one.slice();let swapped=false;
  const r=R.render({nodes,seconds:5,mix:{webLevel:1},ballPath:t=>{if(t>=3&&!swapped){swapped=true;nodes.splice(0,nodes.length,...two);}return R.ball(t);}});
  const step=(x,from,to)=>{let m=0;for(let i=Math.round(from*48000)+1;i<Math.round(to*48000);i++)m=Math.max(m,Math.abs(x.left[i]-x.left[i-1]),Math.abs(x.right[i]-x.right[i-1]));return m;};
  const around=step(r,2.98,3.15),before=step(r,1,2.95);
  assert.ok(swapped);assert.ok(around<=before*1.15,`step around the new roll ${around}, before ${before}`);
});

test('resonator organs ring with their linked neighbours only when the cosmos is on',()=>{
  const nodes=R.layout(9),seen={on:[],off:[]};
  for(const [key,webLevel] of [['on',.7],['off',0]])
    R.render({nodes,seconds:6,mix:{webLevel},onMessage:m=>{for(const s of m.stages||[])if(s.type==='resonator')seen[key].push(s);}});
  assert.ok(seen.on.length&&seen.on.every(s=>s.partnerA>=2&&s.partnerA<4),'partners folded into 2..4');
  assert.ok(seen.off.length&&seen.off.every(s=>s.partnerA===undefined),'no partners at 0 %');
});

test('cost: the web adds well under twice the G2 kernel time',()=>{
  let parent=0,now=0;for(let seed=40;seed<43;seed++){parent+=R.render({dir:R.PARENT,seed,seconds:4}).cpuMsPerSecond;now+=R.render({seed,seconds:4}).cpuMsPerSecond;}
  console.log(`kernel ms per audio second: G2 ${(parent/3).toFixed(1)}, cosmos ${(now/3).toFixed(1)}`);
  assert.ok(now<parent*1.8,`${now} vs ${parent}`);
});
