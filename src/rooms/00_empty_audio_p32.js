/* XenSonar P32 – FIRST-CONTACT only. Decorative, never a sample or a source.
 * The true `source` from Material Intake determines whether this component mounts.
 * A single existing Import Audio input handles both the rack button and mirrored cue.
 */
function __XenForgeNoAudioP32({onImport,disabled=false,controls}){
 const h=P.createElement,mirror=P.useRef(null),[connect,setConnect]=P.useState(null);
 P.useEffect(()=>{
  let active=true,frame=0;
  const update=()=>{
   frame=0;
   if(!active)return;
   const up=document.querySelector('[data-forge-rack-import-audio] svg');
   const down=mirror.current;
   if(!up||!down){setConnect(null);return;}
   const a=up.getBoundingClientRect(),b=down.getBoundingClientRect();
   const inView=r=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;
   if(!inView(a)||!inView(b)){setConnect(null);return;}
   // Source has a downward triangle; destination an upward mirror triangle.
   const source=[[a.left+a.width*.045,a.top+a.height*.087],
    [a.left+a.width*.955,a.top+a.height*.087],[a.left+a.width*.5,a.top+a.height*.913]];
   const dest=[[b.left+b.width*.08,b.top+b.height*.89],
    [b.left+b.width*.92,b.top+b.height*.89],[b.left+b.width*.5,b.top+b.height*.10]];
   const w=window.innerWidth,H=window.innerHeight;
   setConnect(old=>JSON.stringify(old?.source)===JSON.stringify(source)&&
      JSON.stringify(old?.dest)===JSON.stringify(dest)&&old?.w===w&&old?.H===H?old:{source,dest,w,H});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  schedule();const timer=setTimeout(schedule,160);
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
  let observer=null;
  if(typeof ResizeObserver!=='undefined'){
   observer=new ResizeObserver(schedule);
   if(mirror.current)observer.observe(mirror.current);
   const input=document.querySelector('[data-forge-rack-import-audio]');
   if(input)observer.observe(input);
  }
  return()=>{active=false;clearTimeout(timer);if(frame)cancelAnimationFrame(frame);
   observer?.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true)};
 },[]);
 /* P33: the SOURCE animation is transplanted, not redrawn: drawTrack / buildTextMask
  * come directly from uploaded animated-waveform-placeholder-animation.zip. */
 const visualCanvas=[P.useRef(null),P.useRef(null)];
 // P34: turn the A of the original animated NO SIGNAL into the import cue.
 // Use the actual existing donor text-mask runs to place the glyph substitute;
 // no font guesswork or secondary waveform renderer.
 const substituteA=(mask,canvas)=>{
  const groups=[];let start=-1;
  for(let x=0;x<mask.width;x++){
   if(mask.ink[x]&&start<0)start=x;
   if(start>=0&&(!mask.ink[x]||x===mask.width-1)){
    groups.push([start,mask.ink[x]?x:x-1]);start=-1;
   }
  }
  // Invalid glyph geometry must never leave a replacement over a real A.
  const triangle=mirror.current,button=triangle?.parentElement;
  const retire=()=>{if(button){button.style.visibility='hidden';button.style.width='0px';button.style.height='0px';}};
  // N O / S I G N A L: eight visible glyphs; A is number seven.
  if(groups.length!==8){retire();return false;}
  const [first,last]=groups[6];let yMin=mask.height,yMax=0;
  for(let x=first;x<=last;x++){
   const run=mask.runs[x];
   for(let j=0;j<run.length;j+=2){
    yMin=Math.min(yMin,mask.height/2+run[j]*mask.height/2);
    yMax=Math.max(yMax,mask.height/2+run[j+1]*mask.height/2);
   }
  }
  if(yMax<=yMin){retire();return false;}
  const upper=canvas.parentElement;
  if(!button||!upper){retire();return false;}
  const box=canvas.getBoundingClientRect(),parent=upper.getBoundingClientRect();
  const sx=box.width/mask.width,sy=box.height/mask.height;
  button.style.left=(box.left-parent.left+(first+last+1)/2*sx)+'px';
  button.style.top=(box.top-parent.top+yMin*sy)+'px';
  button.style.width=Math.max(16,(last-first+1)*sx)+'px';
  button.style.height=Math.max(20,(yMax-yMin)*sy)+'px';
  button.style.visibility='visible';
  // Hide the waveform A *only when* the replacement is successfully placed.
  for(let x=first;x<=last;x++){
   mask.runs[x]=new Float32Array(0);mask.ink[x]=0;
   mask.coverage[x]=0;mask.env[x]=0;mask.top[x]=0;mask.bottom[x]=0;
  }
  return true;
 };
 P.useEffect(()=>{
  const wave=__XenIdleWaveDonorP33;
  let active=true,raf=0,last=0,start=performance.now(),sizes=['',''];
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const colors=[
   {peak:'#5fe3f7',core:'#d7fbff',body:'rgba(34,211,238,.24)',bodyEdge:'rgba(34,211,238,.08)',noise:'rgba(94,215,240,.42)'},
   {peak:'#bda6ff',core:'#efe9ff',body:'rgba(167,139,250,.24)',bodyEdge:'rgba(167,139,250,.08)',noise:'rgba(181,160,255,.4)'}
  ];
  const cache=[null,null],surfaces=[null,null];
  let visible=true,dirty=true;
  const measure=()=>{
   dirty=false;
   for(let i=0;i<2;i++){
    const el=visualCanvas[i].current;if(!el)continue;
    const box=el.getBoundingClientRect();
    if(box.width<2||box.height<2){
     surfaces[i]=null;sizes[i]='';cache[i]=null;
     if(i===0){const button=mirror.current?.parentElement;if(button){button.style.visibility='hidden';button.style.width='0px';button.style.height='0px';}}
     continue;
    }
    const width=Math.max(1,Math.min(1000,Math.round(box.width))),height=Math.max(8,Math.round(box.height));
    const dpr=Math.min(2,window.devicePixelRatio||1),key=width+','+height+','+dpr;
    surfaces[i]={el,ctx:el.getContext('2d'),width,height,dpr};
    if(sizes[i]!==key){
     sizes[i]=key;el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);
     cache[i]=wave.buildTextMask(i===0?'NO SIGNAL':'NO SOUND',width,height,
      {fill:width<320?.96:.88,capHeight:.78,tracking:width<320?.04:.08});
     if(i===0)substituteA(cache[i],el);
    }
   }
  };
  const schedule=()=>{if(active&&!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);};
  const tick=now=>{
   raf=0;if(!active||!visible||document.hidden)return;
   if(!reduce&&now-last<1000/30){schedule();return;}
   last=now;if(dirty)measure();
   const t=reduce?wave.IDLE.sweep+.15:(now-start)/1000;
   const cycleT=reduce?wave.IDLE.sweep+.15:t%wave.IDLE_CYCLE;
   const head=reduce?1:Math.min(1,cycleT/wave.IDLE.sweep);
   for(let i=0;i<2;i++){
    const surface=surfaces[i];if(!surface?.ctx||!cache[i])continue;
    const {ctx,width,height,dpr}=surface;
    wave.drawTrack({ctx,width,height,dpr,time:t,cycleT,head,mode:'idle',
     mask:cache[i],peaks:null,colors:colors[i],seed:i*977+13,gain:1,muted:false,
     gridXs:[],frame:Math.round(now/33.333)});
   }
   if(!reduce)schedule();
  };
  const onResize=()=>{dirty=true;schedule();};
  const pause=()=>{if(raf)cancelAnimationFrame(raf);raf=0;};
  const onVisibility=()=>{if(document.hidden)pause();else{dirty=true;schedule();}};
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(onResize):null;
  for(const ref of visualCanvas)if(ref.current)resize?.observe(ref.current);
  const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
   visible=entries.some(entry=>entry.isIntersecting);if(visible){dirty=true;schedule();}else pause();
  }):null;
  if(visualCanvas[0].current)intersection?.observe(visualCanvas[0].current.closest('[data-p32-empty-audio]'));
  window.addEventListener('resize',onResize);document.addEventListener('visibilitychange',onVisibility);
  document.fonts?.ready?.then(()=>{if(active){sizes=['',''];dirty=true;schedule();}});
  schedule();
  return()=>{active=false;pause();resize?.disconnect();intersection?.disconnect();
   window.removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);};
 },[]);
 // Identical controls are supplied by the active Material Intake owner.
 // Inert disables keyboard/pointer focus and prevents any first-contact side effects.
 const inactiveRack=h('div',{'data-p33-inactive-rack':'true',className:'xen-p33-inactive-rack',
  inert:true,'aria-label':'Forge actions available after audio import'},controls);

 const upper=h('div',{className:'xen-p32-upper'},
  h('svg',{viewBox:'0 0 1200 102',preserveAspectRatio:'none',
   className:'xen-p32-wave','aria-label':'No Signal. Upper source waveform is empty.',role:'img'},
   h('rect',{width:1200,height:102,fill:'#010414'}),
   h('line',{x1:0,x2:1200,y1:51,y2:51,stroke:'rgba(178,210,230,.42)',strokeWidth:1.4,strokeDasharray:'2 2'}),
   h('rect',{x:124,y:2,width:932,height:98,stroke:'#00d4fa',strokeWidth:2,fill:'rgba(0,144,198,.17)'}),
   h('rect',{x:344,y:7,width:736,height:88,stroke:'#a24de7',strokeWidth:2,fill:'rgba(122,65,180,.19)'})),
  h('canvas',{ref:visualCanvas[0],className:'xen-p33-wave-canvas xen-p33-wave-canvas-upper',
   'data-p33-animated-canvas':'no-signal','aria-hidden':'true'}),
  h('button',{type:'button',disabled,onClick:onImport,'aria-label':'Import Audio – no signal loaded',
   title:'Import Audio · select an audio file',className:'xen-p32-mirror-button'},
   h('svg',{ref:mirror,'data-p32-import-mirror-triangle':'true','data-p34-a-triangle':'true',viewBox:'0 0 64 64',
    'aria-hidden':'true',className:'xen-p32-mirror-triangle'},
    h('path',{d:'M5 57 L32 5 L59 57 Z',fill:'rgba(115,20,39,.35)',stroke:'#ff5060',strokeWidth:2.3}),
    h('path',{d:'M32 14 L42 36 L22 36 Z',fill:'rgba(255,145,151,.12)',stroke:'rgba(255,151,157,.5)',strokeWidth:1}),
    h('path',{d:'M18 40 H46',stroke:'#ff8791',strokeWidth:4,strokeLinecap:'round'}))));
 const lower=h('svg',{viewBox:'0 0 1200 124',preserveAspectRatio:'none',
  className:'xen-p32-wave','aria-label':'No Sound. Lower loop mask has no audio.',role:'img'},
  h('rect',{width:1200,height:124,fill:'#010414'}),
  h('line',{x1:0,x2:1200,y1:62,y2:62,stroke:'rgba(180,196,227,.37)',strokeDasharray:'2 3'}),
  h('rect',{x:208,y:2,width:834,height:120,fill:'rgba(110,56,163,.25)',stroke:'#ad54ee',strokeWidth:2}));
 const paths=connect?(()=>{
  const {source,dest,w,H}=connect;
  const curve=(p,q,i)=>{
   const bend=(i-1)*11;
   return `M ${p[0].toFixed(1)} ${p[1].toFixed(1)} Q ${((p[0]+q[0])/2+bend).toFixed(1)} ${((p[1]+q[1])/2).toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  };
  return ao.createPortal(h('svg',{'data-p32-connector':'three-corners',
   'aria-hidden':'true',width:w,height:H,viewBox:`0 0 ${w} ${H}`,
   style:{position:'fixed',inset:0,pointerEvents:'none',zIndex:31,overflow:'visible'}},
   h('defs',null,h('linearGradient',{id:'xen-p32-three-corners',x1:'0%',y1:'0%',x2:'0%',y2:'100%'},
    h('stop',{offset:'0%',stopColor:'#59eaff',stopOpacity:.18}),
    h('stop',{offset:'52%',stopColor:'#d7a4eb',stopOpacity:.45}),
    h('stop',{offset:'100%',stopColor:'#ff5663',stopOpacity:.60}))),
   // Elastic translucent membrane connects the three mirrored corners.
   h('path',{d:`M ${source[0]} L ${source[1]} Q ${(source[1][0]+dest[1][0])/2} ${(source[1][1]+dest[1][1])/2} ${dest[1]} L ${dest[0]} Q ${(source[0][0]+dest[0][0])/2} ${(source[0][1]+dest[0][1])/2} ${source[0]} Z`,
    fill:'rgba(161,123,191,.045)',className:'xen-p32-membrane'}),
   ...source.map((p,i)=>h('path',{key:i,d:curve(p,dest[i],i),
    stroke:'url(#xen-p32-three-corners)',strokeWidth:i===2?1.4:2.1,fill:'none',
    strokeLinecap:'round',className:'xen-p32-filament',style:{animationDelay:(i*.34)+'s'}}))),
   document.body);
 })():null;
 return h('div',{'data-p32-empty-audio':'true',className:'xen-p32-empty-audio'},
  h('div',{className:'xen-p32-label-row'},h('span',null,'Entire File'),h('span',null,'No audio imported · select IMPORT AUDIO above')),
  upper,
  h('div',{className:'xen-p32-mask-guide'},
   h('span',null,'VIEWPORT · NO SIGNAL'),h('span',null,'FINE SELECTION · EMPTY'),
   h('span',{className:'xen-p32-mask-guide-info'},'Upper mask = zoom · lower mask = loop selection')),
  h('div',{className:'xen-p32-label-row'},h('span',null,'Loop Mask'),h('span',null,'Awaiting audio')),
  h('div',{className:'xen-p33-lower'},lower,
   h('canvas',{ref:visualCanvas[1],className:'xen-p33-wave-canvas xen-p33-wave-canvas-lower',
    'data-p33-animated-canvas':'no-sound','aria-hidden':'true'})),
  h('div',{className:'xen-p32-meter-label xen-p33-meter-label'},
   h('span',null,"Taktometer · Start = 1 · Let's say Seven Bars")),
  h('svg',{viewBox:'0 0 1200 34',preserveAspectRatio:'none',className:'xen-p32-wave xen-p32-meter',
   'aria-hidden':'true'},h('rect',{width:1200,height:34,fill:'#000712'}),
   h('rect',{x:208,y:1,width:834,height:32,fill:'rgba(0,115,154,.13)',stroke:'#00b6d7',strokeWidth:2}),
   ...Array.from({length:8},(_,i)=>h('line',{key:'p33bar'+i,
    'data-p33-seven-bars':i===0?'true':undefined,
    x1:208+i*834/7,x2:208+i*834/7,y1:1,y2:33,
    stroke:i===0?'#ffce4b':'rgba(176,103,247,.62)',strokeWidth:i===0?3:1.5}))),
  inactiveRack,paths);
}
