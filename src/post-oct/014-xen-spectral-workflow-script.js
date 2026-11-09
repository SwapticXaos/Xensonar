
/* XenSonar WF-04: compact, automatically unrolling spectral scroll. Visual help only. */
(function(){
  'use strict';
  const CONNECTOR=30, FOLDED=66;
  const OPEN_MS=980, CLOSE_MS=660;
  let current=null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function setButton(trigger,open){
    if(!trigger.isConnected)return;
    trigger.textContent=open?'Less ↖':'More ↗';
    trigger.setAttribute('aria-expanded',String(open));
    trigger.setAttribute('aria-label',open?'Less: close Spectral Forge creative workflow':'More about Spectral Forge workflow');
    trigger.setAttribute('title',open?'Less · Close creative workflow':'Explore the creative workflow');
    trigger.classList.toggle('xen-wf-more-active',open);
  }
  function closeWorkflow(){
    const s=current;
    if(!s||s.closing)return;
    s.closing=true;
    if(s.openFrame)cancelAnimationFrame(s.openFrame);
    if(s.openTimer)clearTimeout(s.openTimer);
    document.removeEventListener('keydown',s.onKey,true);
    window.removeEventListener('scroll',s.reposition);
    window.removeEventListener('resize',s.onResize);
    s.overlay.removeEventListener('wheel',s.onWheel,true);
    s.overlay.classList.add('is-closing');
    s.windowEl.style.height=`${FOLDED}px`;
    /* Keep the rods visible for the reverse roll-up, then remove everything. */
    const finish=()=>{
      if(current!==s)return;
      window.scrollTo({top:s.originalScrollY,behavior:'instant'});
      s.overlay.remove();
      s.runway.remove();
      setButton(s.trigger,false);
      if(s.trigger.isConnected)s.trigger.focus({preventScroll:true});
      current=null;
    };
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)finish();
    else s.closeTimer=setTimeout(finish,CLOSE_MS+65);
  }
  function openWorkflow(trigger){
    if(current){if(!current.closing)closeWorkflow();return;}
    if(!(trigger instanceof HTMLElement)||!trigger.isConnected)return;
    const overlay=document.createElement('div');
    overlay.className='xen-wf-overlay';
    overlay.setAttribute('data-xen-workflow-overlay','true');
    overlay.innerHTML=`
      <div class="xen-wf-backdrop" data-xen-workflow-backdrop></div>
      <button type="button" class="xen-wf-more xen-wf-more-active xen-wf-more-mirror" aria-label="Less: close Spectral Forge creative workflow" title="Less · Close creative workflow">Less ↖</button>
      <div class="xen-wf-attachment" data-xen-workflow-attachment>
        <div class="xen-wf-cords" aria-hidden="true"><i></i><i></i></div>
        <div class="xen-wf-window" id="xen-creative-workflow" role="dialog" aria-modal="true" aria-labelledby="xen-wf-title" >
          <div class="xen-wf-rod xen-wf-rod-top" aria-hidden="true"></div>
          <div class="xen-wf-folded-title" aria-hidden="true">✦ &nbsp;Creative Workflow · From Drawing to Sound</div>
          <article class="xen-wf-paper">
            <header class="xen-wf-paper-head"><span>FIELD NOTES / SPECTRAL FORGE 001</span><button type="button" class="xen-wf-close" data-xen-wf-close aria-label="Close creative workflow">×</button></header>
            <div class="xen-wf-reading">
              <h2 id="xen-wf-title">Creative Workflow: <span>From Drawing to Sound</span></h2>
              <div class="xen-wf-copy">
                <p>Start in <strong>Spectral Forge</strong>. Paint or stamp a melody, pluck notes, and use the <strong>Warp Tool</strong> to pull and shape it until it feels right.</p>
                <p>Now open <strong>Melodic Loop</strong>. Choose <strong>Compose from Scratch</strong> for an empty canvas, then set a grid that fits your musical idea.</p>
                <aside class="xen-wf-recommend"><span class="icon" aria-hidden="true">✧</span><p><strong>Recommended:</strong> Save your drawing as a <strong>Figure Project</strong> in Spectral Forge, then send it to Melodic Loop in <strong>Scattered</strong> mode.</p></aside>
                <p>Position your melody, edit individual notes, adjust the rhythm, or continue shaping the composition.</p>
                <p>Explore its sound: choose an instrument, add more instruments, or replace and layer notes with different sounds.</p>
                <p><strong>Or take another route:</strong> Send it back to Spectral Forge and use <strong>Donor</strong> to transfer another sound's timbre onto your melody.</p>
                <p><strong>Even your own voice works:</strong> Record it with your microphone and use it as a donor.</p>
                <p><strong>Take it live:</strong> Bring the result into the <strong>Live Room</strong>, as a <strong>Material Track</strong> or material for the <strong>Root Follow Loop</strong>.</p>
              </div>
              <p class="xen-wf-mantra"><strong>Paint it. Shape it. Arrange it. Give it a voice. Take it live.</strong></p>
            </div>
            <footer class="xen-wf-footer"><span>YOUR DRAWING · YOUR SOUND · YOUR LOOP</span><button type="button" data-xen-wf-back>Back to Spectral Forge →</button></footer>
          </article>
          <div class="xen-wf-rod xen-wf-rod-bottom" aria-hidden="true"></div>
        </div>
      </div>`;
    const attach=overlay.querySelector('[data-xen-workflow-attachment]');
    const paper=overlay.querySelector('.xen-wf-paper');
    const windowEl=overlay.querySelector('.xen-wf-window');
    const mirror=overlay.querySelector('.xen-wf-more-mirror');
    const footer=overlay.querySelector('.xen-wf-footer');
    const content=overlay.querySelector('.xen-wf-reading');
    const runway=document.createElement('div');
    runway.className='xen-wf-runway';
    runway.setAttribute('aria-hidden','true');
    runway.style.pointerEvents='none';
    const s={overlay,trigger,attach,paper,windowEl,mirror,footer,content,runway,
      closing:false,expanded:false,fullHeight:FOLDED,
      originalScrollY:window.scrollY,openFrame:0,openTimer:0,closeTimer:0};
    function measure(){
      s.fullHeight=Math.max(FOLDED+10,Math.ceil(paper.scrollHeight+52));
      /* The runway supplies document scroll on narrow screens, without nested scrolling. */
      runway.style.height=`${Math.ceil(s.fullHeight+innerHeight)}px`;
      if(s.expanded)windowEl.style.height=`${s.fullHeight}px`;
    }
    function reposition(){
      if(!trigger.isConnected){closeWorkflow();return;}
      const r=trigger.getBoundingClientRect();
      const width=Math.min(690,innerWidth-24);
      const left=Math.round(clamp(r.right-width+12,12,Math.max(12,innerWidth-width-12)));
      attach.style.width=`${width}px`;
      attach.style.left=`${left}px`;
      attach.style.top=`${r.bottom+CONNECTOR}px`;
      attach.style.setProperty('--wf-cord-x',`${r.left+r.width/2-left-12}px`);
      mirror.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    }
    function finishOpen(){
      if(s.closing)return;
      s.expanded=true;
      overlay.classList.remove('is-folded');
      windowEl.style.height=`${s.fullHeight}px`;
      const enableReading=()=>{
        if(s.closing)return;
        overlay.classList.add('is-fully-open');
        for(const btn of overlay.querySelectorAll('[data-xen-wf-close],[data-xen-wf-back]'))btn.inert=false;
      };
      if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)enableReading();
      else s.openTimer=setTimeout(enableReading,OPEN_MS+30);
    }
    s.onResize=()=>{reposition();measure();};
    s.reposition=reposition;
    s.onWheel=e=>{
      /* Ordinary wheel navigation. No wheel-driven unrolling and no nested pane. */
      if(e.ctrlKey)return;
      e.preventDefault();
      const factor=e.deltaMode===1?18:e.deltaMode===2?innerHeight:1;
      window.scrollBy({top:e.deltaY*factor,left:0,behavior:'instant'});
    };
    s.onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeWorkflow();return;}
      if(e.key==='Tab'){
        const focusables=[mirror,...overlay.querySelectorAll('button[data-xen-wf-close]:not([inert]),button[data-xen-wf-back]:not([inert])')];
        const index=focusables.indexOf(document.activeElement);
        if(e.shiftKey&&index===0){e.preventDefault();focusables[focusables.length-1].focus();}
        else if(!e.shiftKey&&(index===focusables.length-1||index===-1)){e.preventDefault();focusables[0].focus();}
        return;
      }
    };
    current=s;
    document.body.appendChild(runway);
    document.body.appendChild(overlay);
    setButton(trigger,true);
    reposition();measure();
    overlay.classList.add('is-folded');
    for(const btn of overlay.querySelectorAll('[data-xen-wf-close],[data-xen-wf-back]'))btn.inert=true;
    mirror.addEventListener('click',closeWorkflow);
    overlay.querySelector('[data-xen-workflow-backdrop]').addEventListener('click',closeWorkflow);
    overlay.querySelector('[data-xen-wf-close]').addEventListener('click',closeWorkflow);
    overlay.querySelector('[data-xen-wf-back]').addEventListener('click',closeWorkflow);
    overlay.addEventListener('wheel',s.onWheel,{passive:false,capture:true});
    window.addEventListener('resize',s.onResize);
    window.addEventListener('scroll',s.reposition,{passive:true});
    document.addEventListener('keydown',s.onKey,true);
    requestAnimationFrame(()=>{overlay.classList.add('is-open');
      s.openFrame=requestAnimationFrame(finishOpen);
    });
    mirror.focus({preventScroll:true});
  }
  window.__xenOpenForgeWorkflow=openWorkflow;
})();

