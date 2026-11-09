'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(process.env.XEN_EQ_CORE_PATH||path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const s={localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console};
vm.runInNewContext(src+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
for(const bands of [4,12,24]){
 const stroke=Array.from({length:360},(_,i)=>{const band=Math.min(bands-1,Math.floor(i/359*bands));return band>=Math.floor(bands*.25)&&band<Math.floor(bands*.75)?1:0});
 const cfg=eq.clean({...eq.neutral(),mode:'raster',bands,a:stroke,b:stroke});
 const p=eq.plan(cfg,48000),r=eq.response(cfg,48000,2400,p),at=x=>r[Math.round(x*(r.length-1))];
 const first=Math.floor(bands*.25),last=Math.floor(bands*.75)-1;
 const mid=at((Math.floor((first+last)/2)+1)/bands);
 assert(mid>=(bands===4?9.5:10.5),`flat ${bands}-band boost must not collapse between its centers (${mid.toFixed(2)} dB)`);
 const centerErr=Math.max(...p.anchors.map(a=>Math.abs(a.actual-a.goal)));
 assert(centerErr<.1,`flat ${bands}-band center accuracy must be preserved (${centerErr.toFixed(3)})`);
 assert(p.filters.filter(f=>Math.abs(f.gain)>1e-6).length<=bands);
 console.log('PASS plateau',bands,'bands, between centers',mid.toFixed(2),'dB; center max error',centerErr.toFixed(4));
}
for(const bands of [12,24]){
 const zig=Array.from({length:360},(_,i)=>Math.min(bands-1,Math.floor(i/359*bands))%2===0?1:-1);
 const cfg=eq.clean({...eq.neutral(),mode:'raster',bands,a:zig,b:zig});
 const p=eq.plan(cfg,48000);
 const err=Math.max(...p.anchors.map(a=>Math.abs(a.actual-a.goal)));
 assert(err<.05,`intentional ±48 dB zigzag must stay independently adjustable at the band's exact center (${err.toFixed(3)})`);
 console.log('PASS alternating extreme stroke',bands,'bands, center max error',err.toFixed(4));
}
