
/* P9 M2: passive, budget-aware startup lane; no audio starts and no code imports. */
(function(){
 const start=performance.now(),steps=[{name:'shell',ms:0}];let finished=false;
 let lastLongTaskEnd=performance.now(),longTaskCount=0;
 try{if(typeof PerformanceObserver==='function'){
   const taskObserver=new PerformanceObserver(list=>{for(const task of list.getEntries()){
     lastLongTaskEnd=Math.max(lastLongTaskEnd,task.startTime+task.duration);longTaskCount++;
   }});
   taskObserver.observe({type:'longtask',buffered:true});
   setTimeout(()=>taskObserver.disconnect(),12000);
 }}catch{}
 const mark=name=>{steps.push({name,ms:Math.round(performance.now()-start)})};
 let firstPaintDone=false,firstPaintAt=Infinity,lastColdFinishAt=-Infinity;
 let coldPending=0,coldDone=0,coldCancelled=0;
 const afterPaint=new Set();
 // Ω1-A: lightweight admission gate for NON-CRITICAL cold tasks only.
 // No audio nodes, no scheduled notes, no queues, and no interference with
 // the existing direct path when the AudioContext is running.
 function createXenInputGate(now,doc){
   let blockedUntil=0,events=0,lastType=null;
   const protect=type=>{events++;lastType=type;blockedUntil=Math.max(blockedUntil,now()+220)};
   const key=event=>{if(!event.repeat)protect('key')};
   const down=()=>protect('pointer');
   const move=event=>{if(event.buttons)protect('drag')};
   const wheel=()=>protect('wheel');
   const handlers=[['keydown',key],['pointerdown',down],['pointermove',move],['wheel',wheel]];
   for(const [type,handler] of handlers)doc.addEventListener(type,handler,{passive:true,capture:true});
   return Object.freeze({
     quietDelay:()=>Math.max(0,Math.ceil(blockedUntil-now())),
     state:()=>({events,lastType,quietDelayMs:Math.max(0,Math.ceil(blockedUntil-now()))}),
     dispose:()=>{for(const [type,handler] of handlers)doc.removeEventListener(type,handler,{capture:true})}
   });
 }
 const liveGate=createXenInputGate(()=>performance.now(),document);
 window.__XenOmegaLiveGate=Object.freeze({state:()=>liveGate.state()});
 // Control-side preparation only. A running AudioContext still takes its
 // existing direct selection path; this lane cannot touch realtime DSP.
 function scheduleCold(jobs,run){
   if(!Array.isArray(jobs)||!jobs.length)return ()=>{};
   let cancelled=false,complete=false,index=0,idleId=null,timerId=null,frameId=null;
   coldPending++;
   const clearScheduled=()=>{
     if(idleId!=null&&typeof cancelIdleCallback==='function')cancelIdleCallback(idleId);
     if(timerId!=null)clearTimeout(timerId);
     if(frameId!=null)cancelAnimationFrame(frameId);
     idleId=timerId=frameId=null;
   };
   const release=(isCancelled=false)=>{
     if(complete)return;
     complete=true;coldPending=Math.max(0,coldPending-1);
     if(isCancelled){coldCancelled++;mark('cold-cancelled');}
     else{coldDone++;mark('cold-complete');}
     document.removeEventListener('visibilitychange',onVisibility);
   };
   const wait=delay=>{timerId=setTimeout(()=>{timerId=null;advance()},delay)};
   const onVisibility=()=>{if(!document.hidden&&firstPaintDone&&!cancelled){
     clearScheduled();advance();
   }};
   function advance(){
     if(cancelled||complete)return;
     // Never prepare inactive/background tabs: restore immediately on focus.
     if(document.hidden){document.addEventListener('visibilitychange',onVisibility);return;}
     // One quiet period after each completed task, even if its Promise settled
     // before the browser could run the next animation frame.
     const cooldown=performance.now()-lastColdFinishAt;
     if(cooldown<120){wait(Math.max(35,Math.ceil(125-cooldown)));return;}
     const liveWait=liveGate.quietDelay();
     if(liveWait>0){wait(Math.max(35,liveWait));return;}
     const quiet=performance.now()-lastLongTaskEnd;
     if(quiet<100){wait(Math.max(35,Math.ceil(110-quiet)));return;}
     try{if(navigator.scheduling?.isInputPending?.()){wait(125);return;}}catch{}
     const execute=deadline=>{
       idleId=timerId=null;
       if(cancelled||complete)return;
       if(document.hidden){advance();return;}
       const inputWait=liveGate.quietDelay();
       if(inputWait>0){wait(Math.max(35,inputWait));return;}
       if(deadline&&!deadline.didTimeout&&deadline.timeRemaining()<5){wait(60);return;}
       const [lane,id]=jobs[index++];mark('cold-start:'+lane);
       Promise.resolve().then(()=>run(lane,id)).catch(()=>{}).finally(()=>{
         lastColdFinishAt=performance.now();
         if(cancelled||complete)return;
         if(index>=jobs.length){release();return;}
         frameId=requestAnimationFrame(()=>{frameId=null;advance()});
       });
     };
     if(typeof requestIdleCallback==='function')idleId=requestIdleCallback(execute,{timeout:1200});
     else timerId=setTimeout(()=>execute(),70);
   }
   if(firstPaintDone)advance();else afterPaint.add(advance);
   return ()=>{if(cancelled||complete)return;
     cancelled=true;clearScheduled();afterPaint.delete(advance);release(true);
   };
 }
 window.__XenBoot={mark,scheduleCold,
   state:()=>({ready:finished,painted:firstPaintDone,steps:steps.slice(),longTaskCount,
     lastLongTaskEndMs:Math.round(lastLongTaskEnd-start),coldPending,coldDone,coldCancelled,liveInputWaitMs:liveGate.quietDelay()}),whenReady:null};
 let resolveReady;window.__XenBoot.whenReady=new Promise(ok=>resolveReady=ok);
 const observer=new MutationObserver(()=>{
   const root=document.getElementById('root');
   if(!root||!root.querySelector('main'))return;
   observer.disconnect();mark('main-mounted');
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
     mark('main-painted');firstPaintDone=true;firstPaintAt=performance.now();
     for(const startCold of afterPaint)startCold();afterPaint.clear();
     const finishIfQuiet=()=>{
       if(finished)return;
       // Briefly retain the mandala while cold jobs are actively staging.
       // Bounded: an AudioContext awaiting user gesture can never trap UI.
       if(coldPending>0&&performance.now()-firstPaintAt<2400){
         setTimeout(finishIfQuiet,90);return;
       }
       const since=performance.now()-lastLongTaskEnd;
       if(since<480){setTimeout(finishIfQuiet,Math.max(65,495-since));return;}
       const splash=document.getElementById('xen-boot-mandala');
       if(!splash||!document.querySelector('#root main'))return;
       if(coldPending>0)mark('cold-fade-budget-reached');
       mark('startup-quiet');finished=true;resolveReady();
       splash.classList.add('xen-boot-leaving');
       splash.addEventListener('transitionend',()=>splash.remove(),{once:true});
       if(matchMedia('(prefers-reduced-motion: reduce)').matches)splash.remove();
     };
     finishIfQuiet();
   }));
 });
 document.addEventListener('DOMContentLoaded',()=>{
   mark('document-parsed');const root=document.getElementById('root');
   if(root)observer.observe(root,{childList:true,subtree:true});
   if(root?.querySelector('main')){const n=document.createElement('span');root.append(n);n.remove();}
 },{once:true});
 setTimeout(()=>{if(!finished)document.getElementById('xen-boot-mandala')?.classList.add('xen-boot-stalled')},22000);
})();
