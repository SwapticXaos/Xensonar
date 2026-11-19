'use strict';
// MYZEL-COSMOS-01 measurement (not a test): how much does the layout decide the character of the
// Art-Installation hum, G2 parent (tests/fixtures/myzel_g2_pre_cosmos) against the current source?
// Renders N random Rebuild-Layout rolls, each with two different ball paths, through the real
// bridge + kernel (tests/helpers/myzel_cosmos_rig.cjs) and reports
//   ICC   share of a descriptor's variance explained by the layout (vs. the ball path), 0..1
//   spread of the cosmos parameters over rolls, level ratio cosmos/G2, kernel time.
// Usage: node tools/probes/myzel_cosmos_measure.cjs [layouts=16] [seconds=10]
const R=require('../../tests/helpers/myzel_cosmos_rig.cjs');
const N=+process.argv[2]||16,sec=+process.argv[3]||10;
const paths=[R.ball,t=>({x:.5+.42*Math.sin(2*Math.PI*t/6.1+2.2),y:.5+.40*Math.sin(2*Math.PI*t/8.3+.4)})];
const keys=['slope','swell','cascade','flutter','width','modulation','centroidHz','rms'];
function icc(rows){const all=rows.flat(),m=all.reduce((a,b)=>a+b,0)/all.length;let between=0,within=0;
  for(const r of rows){const rm=(r[0]+r[1])/2;between+=(rm-m)**2;within+=(r[0]-rm)**2+(r[1]-rm)**2;}
  between/=rows.length;within/=rows.length;return Math.max(0,(between-within/2)/(between+within/2));}
const result={};
for(const [name,dir] of [['G2 parent',R.PARENT],['cosmos',R.SRC]]){
  const per=keys.map(()=>[]);let cpu=0,rms=0;
  for(let seed=200;seed<200+N;seed++){const d=paths.map(p=>{const r=R.render({dir,seed,seconds:sec,ballPath:p});cpu+=r.cpuMsPerSecond;return R.describe(r);});
    keys.forEach((k,i)=>per[i].push([d[0][k],d[1][k]]));rms+=d[0].rms+d[1].rms;}
  result[name]={icc:Object.fromEntries(keys.map((k,i)=>[k,+icc(per[i]).toFixed(2)])),cpuMsPerAudioSecond:+(cpu/N/2).toFixed(1),meanRms:+(rms/N/2).toFixed(4)};
}
const api=R.load(R.SRC),parent=R.load(R.PARENT),params={},frame={density:[],hollow:[],bloom:[]},summaries=new Set();
for(let seed=1;seed<=400;seed++){const s={myzelAudioNodes:R.layout(seed),myzelAudioWidth:R.W,myzelAudioHeight:R.H,cursorNormalizedX:.5,cursorNormalizedY:.5};
  const c=api.constellation(s);summaries.add(c.summary);for(const [k,v] of Object.entries(c.params))(params[k]=params[k]||[]).push(v);
  const f=parent.myzelGSpatialFrame(s,220);for(const k of Object.keys(frame))frame[k].push(f[k]);}
const pct=(a,q)=>{const s=a.slice().sort((x,y)=>x-y);return +s[Math.round(q*(s.length-1))].toFixed(3);};
result.cosmosParams=Object.fromEntries(Object.entries(params).map(([k,v])=>[k,{p5:pct(v,.05),p50:pct(v,.5),p95:pct(v,.95)}]));
result.g2Colour=Object.fromEntries(Object.entries(frame).map(([k,v])=>[k,{p5:pct(v,.05),p50:pct(v,.5),p95:pct(v,.95)}]));
result.distinctDescriptions=`${summaries.size} of 400 rolls`;
console.log(JSON.stringify(result,null,1));
