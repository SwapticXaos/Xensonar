(function(){
 'use strict';
 let watched=null,observer=null,frame=0;
 const refresh=()=>{
  frame=0;
  const strip=document.querySelector('[data-xensonar-performance-strip]');
  if(!strip)return;
  if(strip!==watched){
   if(observer)observer.disconnect();
   watched=strip;
   if(typeof ResizeObserver==='function'){
    observer=new ResizeObserver(queue);observer.observe(strip);
   }
  }
  const bottom=strip.getBoundingClientRect().bottom+window.scrollY;
  const px=Math.ceil(Math.max(156,bottom+8));
  document.documentElement.style.setProperty('--xen-h1-side-rail-top',px+'px');
 };
 const queue=()=>{if(!frame)frame=requestAnimationFrame(refresh)};
 const init=()=>{
  // Observe only initial mount; do not continuously scan audio/UI mutations.
  if(!document.querySelector('[data-xensonar-performance-strip]')){
   const mo=new MutationObserver(()=>{
    if(document.querySelector('[data-xensonar-performance-strip]')){mo.disconnect();queue()}
   });
   mo.observe(document.body,{childList:true,subtree:true});
  }
  window.addEventListener('resize',queue,{passive:true});
  document.addEventListener('click',event=>{
   if(event.target.closest?.('.xen-h1-room-btn'))requestAnimationFrame(queue);
  },{passive:true});
  queue();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();