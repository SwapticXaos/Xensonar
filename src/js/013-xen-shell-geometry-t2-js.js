/* XenSonar · V3-shell-sampled straight-edge adapter T2.
   Design contract: the visible V3 SVG is the single reference. This JS changes
   only ornamental boundary variables and indentation of header/root copy.
   It never rewrites React state, audio, or existing outer-shell geometry. */
(() => {
  'use strict';
  if (window.__xenNodalShellGeometryT2) return;
  const SEL = {
    room:'.nd-room.nd-room-shell[data-nodal-mode="installation"]',
    root:'.nd-legacy-meta',
    ball:'[data-nodal-ball-controls]',
    advanced:'.nd-legacy-card > .mt-5 > section:has(> button[aria-expanded])'
  };
  const REF = Object.freeze({svgWidth:198,svgHeight:960,outerRadius:170,arcEnd:170});
  // Visible glyphs/controls must stay inside the decorative polygon.
  // Preserve the rectangular content/hitboxes: only cap the inherited T2 transforms.
  const GLYPH_CLEARANCE = 14;
  const finite = (v,lo=0,hi=1e5) => Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : 0;
  let scheduled=false, frame=0, observer=null, attachedRoom=null, resizeObs=null, lastGeometry=[];
  function geometry(room) {
    // The nine-slice SVG uses viewBox 0 0 198 960 and an arc from
    // M0 0 to A170 170 ... 170 170, followed by L170 790 (vertical).
    // The CSS border-image paints this source across the full wing-height;
    // horizontal/vertical scaling are different, as in the approved V3.
    const css=getComputedStyle(room,'::before');
    const source=css.borderImageSource || '';
    if (!source.includes('data:image/svg+xml') || !source.includes('170')) return null;
    const width=finite(parseFloat(css.width),0,1000);
    const rect=room.getBoundingClientRect();
    if (!width || rect.height<=0) return null;
    const fullX=REF.arcEnd * width / REF.svgWidth;
    const sample=(screenY)=>{
      const sy=finite((screenY-rect.y)/rect.height*REF.svgHeight,0,REF.arcEnd);
      const sx=Math.sqrt(Math.max(0,2*REF.outerRadius*sy-sy*sy));
      return finite(fullX - width*sx/REF.svgWidth,0,fullX);
    };
    return {rect,width,fullX,sample};
  }
  function setPx(node,name,value) {
    const val=(Math.round(value*100)/100)+'px';
    if(node.style.getPropertyValue(name)!==val)node.style.setProperty(name,val);
  }
  function reset(room) {
    if (!room) return;
    room.classList.remove('nd-geo-t2');
    for (const selector of [SEL.root,SEL.ball,SEL.advanced]) {
      const panel=room.querySelector(selector);
      if (!panel) continue;
      for (const name of ['--nd-geo-top','--nd-geo-bottom','--nd-geo-info-shift','--nd-geo-tool-shift','--nd-geo-row-shift']) panel.style.removeProperty(name);
    }
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if (heading) {
      heading.style.removeProperty('--nd-geo-heading-edge');
      for (const item of heading.querySelectorAll('.nd-heading-copy > .nd-eyebrow,.nd-heading-copy > h2,.nd-heading-copy > p')) item.style.removeProperty('--nd-geo-heading-shift');
    }
    lastGeometry=[];
    if (attachedRoom===room) attachedRoom=null;
  }
  function apply() {
    scheduled=false;frame=0;
    if(document.hidden)return;
    const room=document.querySelector(SEL.room);
    if (attachedRoom && attachedRoom!==room) reset(attachedRoom);
    if (!room) {
      return;
    }
    const geo=geometry(room);
    if (!geo || window.innerWidth<=1100 || geo.width<=1) { reset(room);return; }
    const panels=[['root',room.querySelector(SEL.root)],['ball',room.querySelector(SEL.ball)],['advanced',room.querySelector(SEL.advanced)]];
    if (!panels.every(x=>x[1])) { reset(room);return; }
    const enabled=window.innerWidth>1100 && geo.width>1;
    room.classList.toggle('nd-geo-t2',enabled);attachedRoom=room;
    lastGeometry=[];
    for(const [name,panel] of panels){
      const r=panel.getBoundingClientRect();
      const top=enabled?geo.sample(r.top):0;
      const bottom=enabled?geo.sample(r.bottom):0;
      setPx(panel,'--nd-geo-top',top);
      setPx(panel,'--nd-geo-bottom',bottom);
      lastGeometry.push({name,top,bottom,angleDeg:Math.atan2(Math.max(0,top-bottom),Math.max(1,r.height))*180/Math.PI,rect:[r.x,r.y,r.width,r.height]});
    }
    const meta=panels[0][1];
    const info=meta.querySelector('.nd-legacy-info');
    const tools=meta.querySelector('.nd-legacy-tools');
    const row=meta.querySelector(':scope > div:last-child');
    if(info) setPx(meta,'--nd-geo-info-shift',enabled?Math.max(0,geo.sample(info.getBoundingClientRect().top)-GLYPH_CLEARANCE):0);
    if(tools) setPx(meta,'--nd-geo-tool-shift',enabled?Math.max(0,geo.sample(tools.getBoundingClientRect().top)-GLYPH_CLEARANCE):0);
    if(row) setPx(meta,'--nd-geo-row-shift',enabled?Math.max(0,geo.sample(row.getBoundingClientRect().top)-GLYPH_CLEARANCE):0);
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if(heading){
      setPx(heading,'--nd-geo-heading-edge',enabled?geo.sample(heading.getBoundingClientRect().bottom):0);
      for(const item of heading.querySelectorAll('.nd-heading-copy > .nd-eyebrow,.nd-heading-copy > h2,.nd-heading-copy > p')) {
        // getBoundingClientRect includes our own transform. offsetTop tracks
        // the original normal-flow position instead, preventing feedback.
        const y=heading.getBoundingClientRect().top+item.offsetTop;
        setPx(item,'--nd-geo-heading-shift',enabled?geo.sample(y):0);
      }
    }
  }
  function schedule(){if(!scheduled&&!document.hidden){scheduled=true;frame=requestAnimationFrame(apply)}}
  function syncRoom(){
    const room=document.querySelector(SEL.room),previous=resizeObs.__room;
    if(room===previous)return room;
    if(previous)resizeObs.unobserve(previous);
    if(attachedRoom&&attachedRoom!==room)reset(attachedRoom);
    if(!room)lastGeometry=[];
    resizeObs.__room=room;
    if(room){resizeObs.observe(room);schedule()}
    return room;
  }
  function init(){
    resizeObs=new ResizeObserver(schedule);
    // Mounts, removals and mode switches already have a DOM lifecycle signal.
    // Attach immediately; no permanent 1500ms discovery timer is necessary.
    observer=new MutationObserver(muts=>{
      const previous=resizeObs.__room,room=syncRoom();
      if(room&&(room!==previous||muts.some(m=>room.contains(m.target))))schedule();
    });
    observer.observe(document.getElementById('root') || document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-nodal-mode']});
    window.addEventListener('resize',schedule,{passive:true});
    document.addEventListener('click',ev=>{if(ev.target.closest('.nd-room'))schedule()},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncRoom();schedule()}});
    syncRoom();schedule();
    window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);scheduled=false;frame=0;observer.disconnect();resizeObs.disconnect();resizeObs.__room=null});
    window.addEventListener('pageshow',event=>{if(event.persisted){observer.observe(document.getElementById('root') || document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-nodal-mode']});syncRoom();schedule()}});
  }
  window.__xenNodalShellGeometryT2=Object.freeze({version:'T3-geometry-clearance-V3',refresh:schedule,inspect:()=>lastGeometry.slice()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
