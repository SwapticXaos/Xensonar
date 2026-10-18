import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
script='''
window.__f53Integration = (async()=>{
 const sampleRate=8000,length=8000,pcm=new Int16Array(length);for(let i=0;i<length;i++)pcm[i]=Math.round(Math.sin(i*2*Math.PI*130/sampleRate)*24000);
 const wav=new ArrayBuffer(44+length*2),view=new DataView(wav),ascii=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
 ascii(0,'RIFF');view.setUint32(4,36+length*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,length*2,true);
 for(let i=0;i<length;i++)view.setInt16(44+i*2,pcm[i],true);
 const blob=new Blob([wav],{type:'audio/wav'}),savedGw=gw;gw=async id=>id==='fixture-sample'?blob:null;
 try{
  const grid={useCustom:true,presetSource:'broken_lilt',bars:1,segmentsPerBar:4,stepCount:4,segmentMarkers:[.25,.5,.75],laneOrder:['sample1','sample2','sample3'],laneSteps:{sample1:[1,0,0,0],sample2:[0,0,0,0],sample3:[0,0,0,0]},stepPrograms:{},sampleSlots:{sample1:{id:'fixture-sample',volume:1,pan:0}}};
  const composer={bars:1,beatsPerBar:4,stepsPerBar:16,notes:[],tracks:[],activeTrackIds:[]};
  const out=await z$({composer,trackIds:[],bpm:120,bars:1,drumKit:'dusty_tape',drumLevel:1,customDrumPattern:grid},{drumOnly:true,sampleRate:8000,tailSec:.02});
  const data=out.getChannelData(0);let peak=0,mean=0;for(let i=0;i<data.length;i++){const v=Math.abs(data[i]);peak=Math.max(peak,v);mean+=v};mean/=data.length;
  if(peak<.1||mean<.01)throw Error('full drum stem silent '+peak+' '+mean);
  const after=await z$({composer,trackIds:[],bpm:120,bars:1,drumKit:'dusty_tape',drumLevel:1,customDrumPattern:{...grid,laneSteps:{...grid.laneSteps,sample1:[0,0,0,0]}}},{drumOnly:true,sampleRate:8000,tailSec:.02});
  const p0=after.getChannelData(0).reduce((m,v)=>Math.max(m,Math.abs(v)),0);
  if(p0>.002)throw Error('untriggered sample still audible '+p0);
  // Main-room live route: real D9/FPe native WebAudio sources, rendered in a real OfflineAudioContext.
  // Disable only the marker method used by D9 to distinguish offline from live.
  const liveGrid={...grid,segmentsPerBar:16,stepCount:16,segmentMarkers:Array.from({length:15},(_,i)=>(i+1)/16),laneSteps:{sample1:[1,...Array(15).fill(0)],sample2:Array(16).fill(0),sample3:Array(16).fill(0)},stepPrograms:{}};
  const liveRender=async(g,prepare=true)=>{
   const ctx=new OfflineAudioContext(2,16000*2,16000),start=ctx.startRendering;
   Object.defineProperty(ctx,'startRendering',{value:undefined,configurable:true});
   const bus=ctx.createGain();bus.connect(ctx.destination);const machine=D9(ctx,bus);
   if(prepare)await machine.prepareSamples(g);
   FPe({drumMachine:machine,entry:g,stepIndex:0,time:.06,stepDurationSec:.125,drumLevel:1,
     drumStyle:{edge:.5,softness:.4,air:.3,snap:.5,swing:0,pan:0,decayScale:1},runtimeGlobalKit:'dusty_tape',laneKitOverrides:{},laneSettings:{}});
   const diagnostics=machine.getDiagnostics().samples;
   delete ctx.startRendering;
   const rendered=await start.call(ctx),arr=rendered.getChannelData(0);
   const peak=arr.reduce((m,v)=>Math.max(m,Math.abs(v)),0),mean=arr.reduce((sum,v)=>sum+Math.abs(v),0)/arr.length;
   return {peak,mean,diagnostics};
  };
  const live=await liveRender(liveGrid);
  if(live.peak<.1||live.mean<.005||live.diagnostics.played!==1)throw Error('main-room Sample A does not produce PCM '+JSON.stringify(live));
  const empty=await liveRender({...liveGrid,stepPrograms:{sample1:{0:{probability:0}}}});
  if(empty.peak>.002||empty.diagnostics.played!==0)throw Error('probability 0 not silent in main-room '+JSON.stringify(empty));
  const locked=await liveRender({...liveGrid,stepPrograms:{sample1:{0:{decayLock:.25,toneLock:.1}}}});
  if(locked.peak<.005||locked.mean>=live.mean*.7)throw Error('locks not active in main-room PCM '+JSON.stringify({locked,live}));
  const unloaded=await liveRender(liveGrid,false);
  if(unloaded.peak>.002||unloaded.diagnostics.misses!==1||unloaded.diagnostics.played!==0)throw Error('uncached sample not dropped '+JSON.stringify(unloaded));
  const normal=WH({probability:.3,decayLock:.4,toneLock:.2},'sample1',0,1);
  if(normal.probability!==.3||normal.decayLock!==.4||normal.toneLock!==.2)throw Error('step locks not retained by persistence normalizer');
  return {status:'PASS',peak,mean,mutedPeak:p0,frames:out.length,sampleRate:out.sampleRate,live,empty,locked,unloaded,normalized:normal};
 }finally{gw=savedGw;}
})().catch(error=>({status:'FAIL',error:String(error.stack||error)}));
'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
 page=b.new_page();page.evaluate('''()=>{const m=new Map();const s={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]||null,get length(){return m.size}};Object.defineProperty(window,'localStorage',{configurable:true,value:s});Object.defineProperty(window,'sessionStorage',{configurable:true,value:s})}''')
 page.set_content(html.replace('</script>',script+'</script>',1),wait_until='domcontentloaded',timeout=50000)
 result=page.evaluate('async()=>await window.__f53Integration');print(json.dumps(result,indent=2));(root/'results/f353_audio_pipeline.json').write_text(json.dumps(result,indent=2))
 assert result['status']=='PASS',result
 b.close()
