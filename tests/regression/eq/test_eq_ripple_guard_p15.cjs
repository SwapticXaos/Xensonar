'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(process.env.XEN_EQ_CORE_PATH||path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const sandbox={localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console,Math,Number,Array,Object,JSON,Set,WeakMap,WeakSet,Date,Map};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',sandbox);const eq=sandbox.eq;
const paths=[
 {name:'broad_plateaus',points:[[0,0],[.15,-.1],[.19,-.4],[.22,.8],[.29,.8],[.36,.54],[.41,.2],[.44,-1],[.59,-1],[.69,0],[.74,.62],[.90,.62],[.94,-1],[1,-1]]},
 {name:'smooth_undulations',points:[[0,-.5],[.12,-.35],[.23,-.18],[.34,-.15],[.44,.65],[.52,.65],[.60,.14],[.69,-.1],[.76,.8],[.83,.75],[.88,.35],[.94,.75],[1,.72]]},
 {name:'two_broad_humps',points:[[0,-.7],[.14,-.7],[.21,-.2],[.29,.7],[.39,.7],[.46,-.25],[.5,-.65],[.66,-.65],[.74,0],[.80,.82],[.9,.82],[.95,-.1],[1,-.1]]}
];
function interp(points,x){let j=0;while(j<points.length-2&&x>points[j+1][0])j++;const [x0,y0]=points[j],[x1,y1]=points[j+1];const t=Math.max(0,Math.min(1,(x-x0)/(x1-x0)));return y0+(y1-y0)*t}
function metrics(c,r){const wanted=r.map((v,i)=>eq.target(c,i/(r.length-1)));let sq=0,excess=0,peak=0;const misses=[];for(let i=0;i<r.length;i++){const d=r[i]-wanted[i];sq+=d*d;let lo=Infinity,hi=-Infinity;for(let k=Math.max(0,i-3);k<=Math.min(r.length-1,i+3);k++){lo=Math.min(lo,wanted[k]);hi=Math.max(hi,wanted[k]);}const spill=Math.max(0,r[i]-hi,lo-r[i]);excess+=spill*spill;peak=Math.max(peak,spill);if(spill>5)misses.push([i/(r.length-1),+spill.toFixed(1)])}return{rmse:Math.sqrt(sq/r.length),leak:Math.sqrt(excess/r.length),peak,misses:misses.slice(0,12)}}
let bad=false;
for(const item of paths)for(const bands of [12,24]){
 const values=Array.from({length:360},(_,i)=>interp(item.points,i/359)); const cfg=eq.clean({...eq.neutral(),a:values,b:values,mode:'adaptive',bands});
 const plan=eq.plan(cfg,48000),r=eq.response(cfg,48000,360,plan),m=metrics(cfg,r);
 console.log(JSON.stringify({name:item.name,bands,...m,fitError:plan.fitError}));
 if((item.name==='broad_plateaus'&&bands===24&&(m.leak>1.8||m.peak>10))||
    (item.name==='broad_plateaus'&&bands===12&&(m.leak>4||m.peak>20))||
    (item.name==='smooth_undulations'&&(m.peak>3||m.rmse>1.3))||
    (item.name==='two_broad_humps'&&m.peak>8))bad=true;
}
assert.equal(bad,false,'The audio EQ must limit unpainted peaks with a bounded filter budget');
