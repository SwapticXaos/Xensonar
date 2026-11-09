(function(){
 let frame=0;
 function recalc(){frame=0;const strip=document.querySelector('[data-xensonar-performance-strip]');
  const main=document.querySelector('main.flex-1');if(!strip||!main)return;
  const rel=Math.round(strip.getBoundingClientRect().bottom-main.getBoundingClientRect().top+8);
  document.documentElement.style.setProperty('--xen-h3-relrail-top',rel+'px');
 }
 function queue(){if(!frame)frame=requestAnimationFrame(recalc)}
 function init(){window.addEventListener('resize',queue,{passive:true});
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:false});queue();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();