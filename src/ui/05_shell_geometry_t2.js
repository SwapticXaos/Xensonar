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
  // Additional outward arch-fit extension (12px) closing the inner .nd-legacy-card padding gap
  // so the three upper vault tiers hug the outer R=198 cyan column echo arc.
  const ARCH_FIT_PX = 12;
  const finite = (v,lo=0,hi=1e5) => Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : 0;
  let scheduled=false, frame=0, observer=null, attachedRoom=null, resizeObs=null, lastGeometry=[];
  function geometry(room) {
    // The nine-slice SVG uses viewBox 0 0 198 960 with border-image-slice: 170 0 170 0 fill.
    // Because border-image-width is unitless (0), the top 170 SVG units scale linearly
    // with the full room height: sy = (screenY - room.y) / room.height * 960.
    // At sy, the outermost cyan echo arc (R=198) sits at x_svg(sy) = sqrt(198^2 - (170 - sy)^2).
    const css=getComputedStyle(room,'::before');
    const source=(css.borderImageSource || '')+' '+(css.backgroundImage || ''); // FF-ARCH-01: arch may be a background
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
    return {rect,width,sample,sampleForPanel:sample};
  }
  function setPx(node,name,value) {
    const val=(Math.round(value*100)/100)+'px';
    if(node.style.getPropertyValue(name)!==val)node.style.setProperty(name,val);
  }
  const VAULT_PALETTES = Object.freeze({
    heading: {topFill:'#183c48',midFill:'#0f2831',botFill:'#08161c',glow:'#327885',goldGlow:'#e8bd70',stroke:'#94ece0',inner:'#58a8a1',gold:'#f0c67a',rune:'#e5be73'},
    root:    {topFill:'#14333d',midFill:'#0d222a',botFill:'#071318',glow:'#27626d',goldGlow:'#d8ae62',stroke:'#76d1c5',inner:'#488d88',gold:'#e0b66c',rune:'#d4ad66'},
    ball:    {topFill:'#112b34',midFill:'#0b1d24',botFill:'#061015',glow:'#1e4f58',goldGlow:'#c69c54',stroke:'#5eb8ae',inner:'#3a7572',gold:'#cea45e',rune:'#c29b58'},
    advanced:{topFill:'#0e2229',midFill:'#09171c',botFill:'#050d11',glow:'#163a42',goldGlow:'#ab8444',stroke:'#49948d',inner:'#2e5c5a',gold:'#b68e4c',rune:'#a88346'}
  });
  /* VAULT-STYLE-03: panel art after 0a23211 (side archivolts, centre rings + fan ribs, beam joints, keystones; no side glyphs),
     without the curved inner vault/fan/groin lines and keystone halos (they fought the straight
     text and reached into labels) and without the corner circuit traces (they crossed text).
     Horizontals stay straight; everything curved follows the side walls only. */
  function buildVaultSvg(kind,totalW,h,topExt,midExt,botExt) {
    const pal=VAULT_PALETTES[kind]||VAULT_PALETTES.ball;
    const W=Math.max(320,Math.round(totalW)),H=Math.max(36,Math.round(h));
    // Left side x-coordinates at y=0, y=H/2, y=H inside [0..W]
    const xT=2,xB=Math.max(2,topExt-botExt+2);
    const xMid=Math.max(2,topExt-midExt+2);
    // Quadratic Bezier control point so the side wall passes smoothly through xMid at t=0.5
    const cL=Math.max(2,2*xMid-.5*(xT+xB));
    const rT=W-xT,rB=W-xB,cR=W-cL,cx=Math.round(W/2);
    const yT=1.5,yB=H-1.5,yM=H*.5;
    const n=v=>v.toFixed(1);
    const wall=(dT,dM,dB,right)=>right
      ? `M ${n(rT-dT)} ${n(yT)} Q ${n(cR-dM)} ${n(yM)} ${n(rB-dB)} ${n(yB)}`
      : `M ${n(xT+dT)} ${n(yT)} Q ${n(cL+dM)} ${n(yM)} ${n(xB+dB)} ${n(yB)}`;
    const outerPath=`M ${n(xT)} ${n(yT)} H ${n(rT)} Q ${n(cR)} ${n(yM)} ${n(rB)} ${n(yB)} H ${n(xB)} Q ${n(cL)} ${n(yM)} ${n(xT)} ${n(yT)} Z`;
    const io=6.5,ixT=xT+io,ixB=xB+io,icL=cL+io,irT=rT-io,irB=rB-io,icR=cR-io,iyT=yT+3.8,iyB=yB-3.8;
    const innerPath=`M ${n(ixT)} ${n(iyT)} H ${n(irT)} Q ${n(icR)} ${n(yM)} ${n(irB)} ${n(iyB)} H ${n(ixB)} Q ${n(icL)} ${n(yM)} ${n(ixT)} ${n(iyT)} Z`;
    // Side archivolts: two walls parallel to the outer side, forming a rune channel.
    const rib1=`${wall(15,13,11,false)} ${wall(15,13,11,true)}`;
    const rib2=`${wall(28,24,21,false)} ${wall(28,24,21,true)}`;
    // Centre relief (after 0a23211): concentric rings round the keystone and fan ribs falling
    // from it. Centre only, faint, behind the controls; no curves spanning the full width.
    const ky0=yT+3.6, depth=yB-ky0;
    const rings=[[18,pal.gold,.30,'2 3'],[30,pal.stroke,.20,''],[44,pal.gold,.18,'2 4'],[62,pal.stroke,.12,''],[84,pal.inner,.10,'1 5']]
      .map(([r,c,o,da])=>`<circle cx="${cx}" cy="${n(ky0)}" r="${r}" stroke="${c}" stroke-opacity="${o}" stroke-width=".85"${da?` stroke-dasharray="${da}"`:''}/>`).join('');
    const fan=[[90,165],[150,250],[210,330]].map(([c,e])=>
      `M ${cx} ${n(ky0+1)} Q ${cx-c} ${n(ky0+depth*.42)} ${cx-e} ${n(yB-2)} M ${cx} ${n(ky0+1)} Q ${cx+c} ${n(ky0+depth*.42)} ${cx+e} ${n(yB-2)}`).join(' ');
    const relief=`<g>${rings}<path d="${fan}" stroke="${pal.stroke}" stroke-opacity=".13" stroke-width=".85"/>`+
      `<path d="M ${cx} ${n(ky0+8)} V ${n(yB-6)}" stroke="${pal.gold}" stroke-opacity=".14" stroke-width=".8" stroke-dasharray="2 3"/></g>`;
    // Beam joints: short straight ticks hanging from the top beam, mirrored on the bottom beam (shorter).
    let joints='';
    for(const f of [.12,.2,.28,.36,.64,.72,.8,.88]){
      const vx=n(xT+(rT-xT)*f), bx=n(xB+(rB-xB)*f);
      joints+=`M ${vx} ${n(yT)} V ${n(yT+3.6)} M ${bx} ${n(yB)} V ${n(yB-2.4)} `;
    }
    // Flat keystones (never deeper than ~7px, so labels under the beam stay clear).
    const ky=yT+3.6,kby=yB-3.2;
    const keyTop=`<path d="M ${cx-62} ${n(yT)} H ${cx-22} M ${cx+22} ${n(yT)} H ${cx+62}" stroke="${pal.gold}" stroke-opacity=".82" stroke-width="1.3"/>`+
      `<path d="M ${cx-70} ${n(yT)} h 3 M ${cx+67} ${n(yT)} h 3" stroke="${pal.gold}" stroke-opacity=".6" stroke-width="1.3"/>`+
      `<polygon points="${cx},${n(yT-.2)} ${cx+17},${n(ky)} ${cx},${n(yT+7.2)} ${cx-17},${n(ky)}" fill="#07151c" stroke="${pal.gold}" stroke-opacity=".95" stroke-width="1.1"/>`+
      `<polygon points="${cx},${n(yT+1.6)} ${cx+8},${n(ky)} ${cx},${n(yT+5.6)} ${cx-8},${n(ky)}" stroke="${pal.stroke}" stroke-opacity=".75" stroke-width=".8"/>`+
      `<circle cx="${cx}" cy="${n(ky)}" r="1.6" fill="${pal.gold}"/>`+
      `<path d="M ${cx-21} ${n(ky)} h -5 M ${cx+21} ${n(ky)} h 5" stroke="${pal.stroke}" stroke-opacity=".6" stroke-width=".8"/>`;
    const keyBot=`<polygon points="${cx},${n(yB-6.4)} ${cx+11},${n(kby)} ${cx},${n(yB+.2)} ${cx-11},${n(kby)}" fill="#07151c" stroke="${pal.stroke}" stroke-opacity=".8" stroke-width="1"/>`+
      `<circle cx="${cx}" cy="${n(kby)}" r="1.3" fill="${pal.gold}" fill-opacity=".9"/>`+
      `<path d="M ${cx-40} ${n(yB)} H ${cx-14} M ${cx+14} ${n(yB)} H ${cx+40}" stroke="${pal.stroke}" stroke-opacity=".55" stroke-width="1"/>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" fill="none">`+
      `<defs>`+
      `<linearGradient id="vf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${pal.topFill}" stop-opacity="0.96"/><stop offset="46%" stop-color="${pal.midFill}" stop-opacity="0.94"/><stop offset="100%" stop-color="${pal.botFill}" stop-opacity="0.98"/></linearGradient>`+
      `<radialGradient id="vg" cx="50%" cy="6%" r="68%"><stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.6"/><stop offset="52%" stop-color="${pal.topFill}" stop-opacity="0.2"/><stop offset="100%" stop-color="${pal.botFill}" stop-opacity="0"/></radialGradient>`+
      `<radialGradient id="vk" cx="50%" cy="4%" r="30%"><stop offset="0%" stop-color="${pal.goldGlow}" stop-opacity="0.28"/><stop offset="100%" stop-color="${pal.goldGlow}" stop-opacity="0"/></radialGradient>`+
      `<linearGradient id="vs" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${pal.stroke}" stop-opacity="0.98"/><stop offset="14%" stop-color="${pal.inner}" stop-opacity="0.76"/><stop offset="36%" stop-color="${pal.stroke}" stop-opacity="0.84"/><stop offset="50%" stop-color="${pal.gold}" stop-opacity="0.98"/><stop offset="64%" stop-color="${pal.stroke}" stop-opacity="0.84"/><stop offset="86%" stop-color="${pal.inner}" stop-opacity="0.76"/><stop offset="100%" stop-color="${pal.stroke}" stop-opacity="0.98"/></linearGradient>`+
      `</defs>`+
      `<path d="${outerPath}" fill="url(#vf)"/>`+
      `<path d="${outerPath}" fill="url(#vg)"/>`+
      `<path d="${outerPath}" fill="url(#vk)"/>`+
      `<path d="${rib1}" stroke="${pal.stroke}" stroke-opacity=".46" stroke-width="1.1"/>`+
      `<path d="${rib2}" stroke="${pal.inner}" stroke-opacity=".36" stroke-width=".9" stroke-dasharray="5 4"/>`+
      relief+
      `<path d="${innerPath}" stroke="${pal.inner}" stroke-opacity=".42" stroke-width=".9" stroke-dasharray="8 4"/>`+
      `<path d="${joints}" stroke="${pal.gold}" stroke-opacity=".5" stroke-width=".95"/>`+
      `<path d="${outerPath}" stroke="url(#vs)" stroke-width="1.6"/>`+
      keyTop+keyBot+
      `<circle cx="${n(xT+4.5)}" cy="${n(yT+3.2)}" r="1.9" fill="${pal.gold}" fill-opacity=".9"/>`+
      `<circle cx="${n(rT-4.5)}" cy="${n(yT+3.2)}" r="1.9" fill="${pal.gold}" fill-opacity=".9"/>`+
      `<circle cx="${n(xB+4.5)}" cy="${n(yB-3.2)}" r="1.7" fill="${pal.stroke}" fill-opacity=".84"/>`+
      `<circle cx="${n(rB-4.5)}" cy="${n(yB-3.2)}" r="1.7" fill="${pal.stroke}" fill-opacity=".84"/>`+
      `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
  function reset(room) {
    if (!room) return;
    room.classList.remove('nd-geo-t2');
    for (const selector of [SEL.root,SEL.ball,SEL.advanced]) {
      const panel=room.querySelector(selector);
      if (!panel) continue;
      delete panel.__vaultSig;
      for (const name of ['--nd-geo-top','--nd-geo-bottom','--nd-geo-mid','--nd-geo-vault-svg','--nd-geo-info-shift','--nd-geo-tool-shift','--nd-geo-row-shift','--nd-geo-ball-shift']) panel.style.removeProperty(name);
    }
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if (heading) {
      delete heading.__vaultSig;
      for (const name of ['--nd-geo-top','--nd-geo-bottom','--nd-geo-mid','--nd-geo-vault-svg','--nd-geo-heading-edge','--nd-geo-nav-shift']) heading.style.removeProperty(name);
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
      const top=enabled?geo.sampleForPanel(r.top,r):0;
      const mid=enabled?geo.sampleForPanel(r.top+r.height*.5,r):0;
      const bottom=enabled?geo.sampleForPanel(r.bottom,r):0;
      setPx(panel,'--nd-geo-top',top);
      setPx(panel,'--nd-geo-mid',mid);
      setPx(panel,'--nd-geo-bottom',bottom);
      if(enabled){
        const fit=name==='advanced'?0:ARCH_FIT_PX;
        const sig=`${Math.round(r.width)}:${Math.round(r.height)}:${Math.round(top*10)}:${Math.round(mid*10)}:${Math.round(bottom*10)}`;
        if(panel.__vaultSig!==sig){
          panel.__vaultSig=sig;
          panel.style.setProperty('--nd-geo-vault-svg',buildVaultSvg(name,r.width+2*(top+fit),r.height,top+fit,mid+fit,bottom+fit));
        }
      }
      lastGeometry.push({name,top,mid,bottom,angleDeg:Math.atan2(Math.max(0,top-bottom),Math.max(1,r.height))*180/Math.PI,rect:[r.x,r.y,r.width,r.height]});
    }
    const meta=panels[0][1],metaRect=meta.getBoundingClientRect();
    const info=meta.querySelector('.nd-legacy-info');
    const tools=meta.querySelector('.nd-legacy-tools');
    const row=meta.querySelector(':scope > div:last-child');
    // Sample each control row at its bottom edge (the narrowest part of the
    // vaulted tier) so corners like Rebuild Layout stay cleanly inside the rib wall.
    if(info) setPx(meta,'--nd-geo-info-shift',enabled?Math.max(0,geo.sampleForPanel(info.getBoundingClientRect().bottom,metaRect)-GLYPH_CLEARANCE):0);
    if(tools) setPx(meta,'--nd-geo-tool-shift',enabled?Math.max(0,geo.sampleForPanel(tools.getBoundingClientRect().bottom,metaRect)-GLYPH_CLEARANCE):0);
    if(row) setPx(meta,'--nd-geo-row-shift',enabled?Math.max(0,geo.sampleForPanel(row.getBoundingClientRect().bottom,metaRect)-GLYPH_CLEARANCE):0);
    const ball=panels[1][1];
    if(ball){
      const br=ball.getBoundingClientRect();
      setPx(ball,'--nd-geo-ball-shift',enabled?Math.max(0,geo.sampleForPanel(br.bottom,br)-GLYPH_CLEARANCE):0);
    }
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if(heading){
      const hr=heading.getBoundingClientRect();
      const headTop=enabled?geo.sampleForPanel(hr.top,hr):0;
      const headMid=enabled?geo.sampleForPanel(hr.top+hr.height*.5,hr):0;
      const headBottom=enabled?geo.sampleForPanel(hr.bottom,hr):0;
      setPx(heading,'--nd-geo-top',headTop);
      setPx(heading,'--nd-geo-mid',headMid);
      setPx(heading,'--nd-geo-bottom',headBottom);
      setPx(heading,'--nd-geo-heading-edge',headBottom);
      if(enabled){
        const sig=`${Math.round(hr.width)}:${Math.round(hr.height)}:${Math.round(headTop*10)}:${Math.round(headMid*10)}:${Math.round(headBottom*10)}`;
        if(heading.__vaultSig!==sig){
          heading.__vaultSig=sig;
          heading.style.setProperty('--nd-geo-vault-svg',buildVaultSvg('heading',hr.width+2*(headTop+ARCH_FIT_PX),hr.height,headTop+ARCH_FIT_PX,headMid+ARCH_FIT_PX,headBottom+ARCH_FIT_PX));
        }
      }
      // Align all three header copy lines onto a single crisp vertical editorial
      // spine anchored safely inside the vaulted frieze wall.
      const copyShift=enabled?Math.max(0,headBottom-GLYPH_CLEARANCE):0;
      for(const item of heading.querySelectorAll('.nd-heading-copy > .nd-eyebrow,.nd-heading-copy > h2,.nd-heading-copy > p')) {
        setPx(item,'--nd-geo-heading-shift',copyShift);
      }
      const nav=heading.querySelector('.nd-modes');
      const navY=nav?nav.getBoundingClientRect().bottom:hr.bottom;
      setPx(heading,'--nd-geo-nav-shift',enabled?Math.max(0,geo.sampleForPanel(navY,hr)-GLYPH_CLEARANCE):0);
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
      if(room&&(room!==previous||muts.some(m=>m.type==='attributes'||(m.type==='childList'&&(m.target===room||m.target.classList?.contains('nd-legacy-card'))))))schedule();
    });
    observer.observe(document.getElementById('root') || document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-nodal-mode','aria-expanded']});
    window.addEventListener('resize',schedule,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncRoom();schedule()}});
    syncRoom();schedule();
    window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);scheduled=false;frame=0;observer.disconnect();resizeObs.disconnect();resizeObs.__room=null});
    window.addEventListener('pageshow',event=>{if(event.persisted){observer.observe(document.getElementById('root') || document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-nodal-mode','aria-expanded']});syncRoom();schedule()}});
  }
  window.__xenNodalShellGeometryT2=Object.freeze({version:'T3-geometry-clearance-V3',refresh:schedule,inspect:()=>lastGeometry.slice()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
