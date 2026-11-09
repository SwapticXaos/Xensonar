
/* P7.37 H1 diagnostics: query window.__XenStartupDiagnostics.snapshot() in DevTools. */
(function(){
 const boot=performance.now(),longTasks=[];let observer=null;
 try{if(typeof PerformanceObserver==='function'){
  observer=new PerformanceObserver(list=>{for(const item of list.getEntries()){
   if(longTasks.length<50)longTasks.push({navigationStartMs:Math.round(item.startTime),durationMs:Math.round(item.duration)});
  }});
  observer.observe({type:'longtask',buffered:true});
 }}catch{};
 let domReady=null,loaded=null,firstPaint=null;
 document.addEventListener('DOMContentLoaded',()=>{domReady=Math.round(performance.now()-boot);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{firstPaint=Math.round(performance.now()-boot)}));
 },{once:true});
 window.addEventListener('load',()=>{loaded=Math.round(performance.now()-boot)},{once:true});
 setTimeout(()=>observer?.disconnect(),9000);
 window.__XenStartupDiagnostics={snapshot:()=>({domReadyMs:domReady,loadMs:loaded,afterTwoFramesMs:firstPaint,
  longTasks:longTasks.slice(),jsHeapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null})};
})();
