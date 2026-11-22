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
  const REF = Object.freeze({svgWidth:198,svgHeight:960,outerRadius:170,echoRadius:198,arcEnd:170});
  // Visible glyphs/controls must stay inside the decorative polygon and clear of
  // all three outer cyan column echo lines (R=178, 186, 198).
  // Preserve rectangular content/hitboxes: only compute safe T2/T4 panel bounds & shifts.
  const GLYPH_CLEARANCE = 14;
  const finite = (v,lo=0,hi=1e5) => Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : 0;
  let scheduled=false, frame=0, observer=null, attachedRoom=null, resizeObs=null, lastGeometry=[];
  function geometry(room) {
    // The nine-slice SVG uses viewBox 0 0 198 960. Its black recess arc uses R=170,
    // and its outermost visible cyan echo arc uses R=198 (M101.5 0 A198 198 ... 198 170).
    // Sampling R=198 keeps every panel border and glyph cleanly parallel to — and
    // never crossing — the outermost visible column line.
    const css=getComputedStyle(room,'::before');
    const source=css.borderImageSource || '';
    if (!source.includes('data:image/svg+xml') || !source.includes('170')) return null;
    const width=finite(parseFloat(css.width),0,1000);
    const rect=room.getBoundingClientRect();
    if (!width || rect.height<=0) return null;
    const sample=(screenY)=>{
      const sy=finite((screenY-rect.y)/rect.height*REF.svgHeight,0,REF.arcEnd);
      const dy=REF.arcEnd-sy;
      const sx=Math.sqrt(Math.max(0,REF.echoRadius*REF.echoRadius-dy*dy));
      return finite(width*(REF.svgWidth-sx)/REF.svgWidth,0,width);
    };
    return {rect,width,sample};
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
      for (const name of ['--nd-geo-top','--nd-geo-bottom','--nd-geo-info-shift','--nd-geo-tool-shift','--nd-geo-row-shift','--nd-geo-ball-shift']) panel.style.removeProperty(name);
    }
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if (heading) {
      for (const name of ['--nd-geo-top','--nd-geo-bottom','--nd-geo-heading-edge','--nd-geo-nav-shift']) heading.style.removeProperty(name);
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
    // Sample each control row at its bottom edge (the narrowest part of the
    // slanted trapezoid) so corners like Rebuild Layout never breach the border.
    if(info) setPx(meta,'--nd-geo-info-shift',enabled?Math.max(0,geo.sample(info.getBoundingClientRect().bottom)-GLYPH_CLEARANCE):0);
    if(tools) setPx(meta,'--nd-geo-tool-shift',enabled?Math.max(0,geo.sample(tools.getBoundingClientRect().bottom)-GLYPH_CLEARANCE):0);
    if(row) setPx(meta,'--nd-geo-row-shift',enabled?Math.max(0,geo.sample(row.getBoundingClientRect().bottom)-GLYPH_CLEARANCE):0);
    const ball=panels[1][1];
    if(ball) setPx(ball,'--nd-geo-ball-shift',enabled?Math.max(0,geo.sample(ball.getBoundingClientRect().bottom)-GLYPH_CLEARANCE):0);
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if(heading){
      const hr=heading.getBoundingClientRect();
      const headTop=enabled?geo.sample(hr.top):0;
      const headBottom=enabled?geo.sample(hr.bottom):0;
      setPx(heading,'--nd-geo-top',headTop);
      setPx(heading,'--nd-geo-bottom',headBottom);
      setPx(heading,'--nd-geo-heading-edge',headBottom);
      // Align all three header copy lines onto a single crisp vertical editorial
      // spine anchored safely inside the slanted frieze wall.
      const copyShift=enabled?Math.max(0,headBottom-GLYPH_CLEARANCE):0;
      for(const item of heading.querySelectorAll('.nd-heading-copy > .nd-eyebrow,.nd-heading-copy > h2,.nd-heading-copy > p')) {
        setPx(item,'--nd-geo-heading-shift',copyShift);
      }
      const nav=heading.querySelector('.nd-modes');
      const navY=nav?nav.getBoundingClientRect().bottom:hr.bottom;
      setPx(heading,'--nd-geo-nav-shift',enabled?Math.max(0,geo.sample(navY)-GLYPH_CLEARANCE):0);
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
