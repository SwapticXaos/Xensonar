(function(){
 let watched=null,observer=null,frame=0;
 function recalc(){frame=0;const strip=document.querySelector('[data-xensonar-performance-strip]');
  const main=document.querySelector('main.flex-1');if(!strip||!main)return;
  if(strip!==watched){if(observer)observer.disconnect();watched=strip;
   if(typeof ResizeObserver==='function'){observer=new ResizeObserver(queue);observer.observe(strip);}}
  const rel=Math.round(strip.getBoundingClientRect().bottom-main.getBoundingClientRect().top+8);
  document.documentElement.style.setProperty('--xen-h3-relrail-top',rel+'px');
 }
 function queue(){if(!frame)frame=requestAnimationFrame(recalc)}
 function init(){
  if(!document.querySelector('[data-xensonar-performance-strip]')){
   const mo=new MutationObserver(()=>{if(document.querySelector('[data-xensonar-performance-strip]')){mo.disconnect();queue()}});
   mo.observe(document.body,{childList:true,subtree:true});
  }
  window.addEventListener('resize',queue,{passive:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('.xen-h1-room-btn'))requestAnimationFrame(queue)},{passive:true});
  queue();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();