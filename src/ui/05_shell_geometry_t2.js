/* XenSonar · Nodal Art Installation · Torbogen + Gewoelbe-Panels (ARCH-FIT-02).
   One pixel-exact arch drives everything: the side pillars (drawn into the room's
   ::before/::after wings via --nd-arch-svg) and the curved trapezoid panels
   (heading, root bar, ball controls) whose sides run parallel to that arch.
   The arch spans the whole panel stack (room top -> spring line under the ball
   controls), independent of the window width; below the spring the pillars run
   straight beside the stage. Decoration only: never touches React state, audio,
   canvas or hitboxes (content is only shifted by CSS transforms/margins). */
(() => {
  'use strict';
  if (window.__xenNodalShellGeometryT2) return;
  const SEL = {
    room:'.nd-room.nd-room-shell[data-nodal-mode="installation"]',
    root:'.nd-legacy-meta',
    ball:'[data-nodal-ball-controls]',
    advanced:'.nd-legacy-card > .mt-5 > section:has(> button[aria-expanded])'
  };
  // Arch: horizontal flare A = min(ARCH_MAX, wing - ARCH_EDGE); below ARCH_MIN the
  // wings are too narrow for an arch and the plain room layout is kept.
  const ARCH_MAX = 176, ARCH_MIN = 40, ARCH_EDGE = 4;
  const SPRING_GAP = 14;      // spring line this far below the ball controls
  const PANEL_GAP = 9;        // constant clear band between arch edge and panel edge
  const GLYPH_CLEARANCE = 14; // text/control spine inside the panel edge
  const ARCH_FIT_PX = 12;     // CSS: ::after inset = -(--nd-geo-top + --nd-geo-arch-fit)
  const finite = (v,lo=0,hi=1e5) => Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : 0;
  const f1 = v => (Math.round(v*10)/10).toString();
  let scheduled=false, frame=0, observer=null, attachedRoom=null, resizeObs=null, lastGeometry=[];

  /* Geometry. off(y) = how far the arch edge lies outside the room edge at screen y. */
  function geometry(room, springScreenY) {
    const css=getComputedStyle(room,'::before');
    const wing=finite(parseFloat(css.width),0,4000);
    const rect=room.getBoundingClientRect();
    if (!wing || rect.height<=0) return null;
    const A=Math.min(ARCH_MAX,wing-ARCH_EDGE);
    if (A<ARCH_MIN) return null;
    const Hs=finite(springScreenY-rect.y,60,rect.height);
    const off=screenY=>{
      const y=finite(screenY-rect.y,0,Hs);
      const u=(Hs-y)/Hs;
      return A*(1-Math.sqrt(Math.max(0,1-u*u)));
    };
    return {rect,wing,A,Hs,off};
  }
  function setPx(node,name,value) {
    const val=(Math.round(value*100)/100)+'px';
    if(node.style.getPropertyValue(name)!==val)node.style.setProperty(name,val);
  }
  const svgUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  /* Pillar / arch art for one wing (left wing; the right wing is the CSS mirror). */
  function buildArchSvg(G,H,A,Hs) {
    G=Math.max(8,Math.round(G));H=Math.max(200,Math.round(H));
    const cx=G-A, Hb=Math.min(Hs,Math.max(120,Math.round(H*.12)));
    const yB=H-Hb;
    const edge=`M ${f1(cx)} 0 A ${f1(A)} ${f1(Hs)} 0 0 1 ${G} ${f1(Hs)} L ${G} ${f1(yB)} A ${f1(A)} ${f1(Hb)} 0 0 1 ${f1(cx)} ${H}`;
    const pillar=`M 0 0 H ${f1(cx)} A ${f1(A)} ${f1(Hs)} 0 0 1 ${G} ${f1(Hs)} L ${G} ${f1(yB)} A ${f1(A)} ${f1(Hb)} 0 0 1 ${f1(cx)} ${H} H 0 Z`;
    // Concentric mouldings: horizontal at the capital, curving into vertical flutes.
    const ring=d=>{
      const rx=A-d, ry=Hs-d, rb=Hb-d;
      if (rx<6||ry<6||rb<6) return '';
      return `M 0 ${f1(d)} H ${f1(cx)} A ${f1(rx)} ${f1(ry)} 0 0 1 ${f1(G-d)} ${f1(Hs)} L ${f1(G-d)} ${f1(yB)} A ${f1(rx)} ${f1(rb)} 0 0 1 ${f1(cx)} ${f1(H-d)} H 0`;
    };
    const rings=[[4,'#e2b96d',.55,.8],[11,'#7fd8cc',.34,.9],[22,'#6fb5ad',.26,.8],[38,'#6fb5ad',.18,.8],[60,'#5f9a96',.12,.8],[88,'#5f9a96',.08,.8]]
      .filter(r=>r[0]<A-8).map(([d,c,o,w])=>{const p=ring(d);return p?`<path d="${p}" stroke="${c}" stroke-opacity="${o}" stroke-width="${w}"/>`:''}).join('');
    // Voussoir ticks along the arch (stones of the Torbogen) + gold nodes.
    let ticks='', nodes='';
    const n=Math.max(7,Math.min(15,Math.round(Hs/34)));
    for (let k=1;k<n;k++){
      const t=k/n*Math.PI/2, s=Math.sin(t), c=Math.cos(t);
      const p=d=>[cx+(A-d)*s, Hs-(Hs-d)*c];
      const [x1,y1]=p(5),[x2,y2]=p(k%3===0?19:14);
      ticks+=`M ${f1(x1)} ${f1(y1)} L ${f1(x2)} ${f1(y2)} `;
      if (k%3===0){const [nx,ny]=p(26);nodes+=`<rect x="${f1(nx-1.4)}" y="${f1(ny-1.4)}" width="2.8" height="2.8" transform="rotate(${f1(t*180/Math.PI+45)} ${f1(nx)} ${f1(ny)})" fill="#e2b96d" fill-opacity=".85"/>`;}
    }
    const kx=G-11, ky=Hs;
    const keystone=`<path d="M ${f1(kx)} ${f1(ky-13)} V ${f1(ky-7)} M ${f1(kx)} ${f1(ky+7)} V ${f1(ky+13)}" stroke="#e2b96d" stroke-opacity=".8" stroke-width=".9"/>`+
      `<circle cx="${f1(kx)}" cy="${f1(ky)}" r="5" fill="#05121a" stroke="#e2b96d" stroke-width="1"/><circle cx="${f1(kx)}" cy="${f1(ky)}" r="3" stroke="#7fd8cc" stroke-opacity=".6" stroke-width=".6"/>`+
      `<ellipse cx="${f1(kx)}" cy="${f1(ky)}" rx=".9" ry="3.6" fill="#f0c67a"/>`+
      `<path d="M ${f1(kx)} ${f1(yB-5)} L ${f1(kx+3.5)} ${f1(yB)} L ${f1(kx)} ${f1(yB+5)} L ${f1(kx-3.5)} ${f1(yB)} Z" stroke="#7fd8cc" stroke-opacity=".7" stroke-width=".9"/>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${H}" viewBox="0 0 ${G} ${H}" fill="none">`+
      `<defs>`+
      `<linearGradient id="pf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040709"/><stop offset=".72" stop-color="#071015"/><stop offset="1" stop-color="#0b1a20"/></linearGradient>`+
      `<linearGradient id="pv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd8cc" stop-opacity=".10"/><stop offset="${f1(Math.min(.6,Hs/H*1.4))}" stop-color="#7fd8cc" stop-opacity="0"/></linearGradient>`+
      `<linearGradient id="es" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6efe4"/><stop offset="${f1(Math.min(.5,Hs/H))}" stop-color="#7fd8cc"/><stop offset="1" stop-color="#4f8f8a"/></linearGradient>`+
      `<filter id="gl" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="3.2"/></filter>`+
      `</defs>`+
      `<path d="${pillar}" fill="url(#pf)"/>`+
      `<path d="${pillar}" fill="url(#pv)"/>`+
      rings+
      `<path d="${ticks}" stroke="#7fd8cc" stroke-opacity=".42" stroke-width=".9"/>`+nodes+
      `<path d="${edge}" stroke="#7fd8cc" stroke-opacity=".55" stroke-width="4" filter="url(#gl)"/>`+
      `<path d="${edge}" stroke="url(#es)" stroke-width="1.6"/>`+
      keystone+
      `</svg>`;
    return svgUrl(svg);
  }

  /* Panel art. ext[] = outward extension of the panel edge over the panel box at
     evenly spaced heights (t = 0 .. 1); the side contour is the arch, offset inward. */
  const VAULT_PALETTES = Object.freeze({
    heading: {top:'#173a45',mid:'#0f2830',bot:'#08161c',glow:'#3a8792',stroke:'#9cefe3',inner:'#5aaaa3',gold:'#f0c67a'},
    root:    {top:'#14323c',mid:'#0d222a',bot:'#071318',glow:'#2c6d77',stroke:'#7ed6ca',inner:'#4a8f8a',gold:'#e2b96d'},
    ball:    {top:'#112b34',mid:'#0b1d24',bot:'#061015',glow:'#22575f',stroke:'#66bfb4',inner:'#3c7874',gold:'#d2a961'},
    advanced:{top:'#0e2229',mid:'#09171c',bot:'#050d11',glow:'#163a42',stroke:'#49948d',inner:'#2e5c5a',gold:'#b68e4c'}
  });
  function smoothSide(points) {
    // Catmull-Rom through the sampled points as cubic Beziers (points top -> bottom).
    let d='';
    for (let i=0;i<points.length-1;i++){
      const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];
      const c1=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
      d+=` C ${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  }
  /* Centre ornament (local coords: x=0 centre, y=0 on the edge, +y into the panel).
     Xeno glyph band: a slit-pupil "eye" in an orbit ring, chevrons, a hanging string of
     angular script marks and a segmented, decaying rule. Straight strokes only, no flourishes. */
  const GLYPHS=[[13,4.6,'t'],[15.6,2.2],[17.4,5.8,'g'],[20.8,1.6],[22.4,3.4,'x'],[26.6,6.4,'d'],[28.6,2.2],[30.4,4.2,'t'],[34.8,1.6],[36.4,5.2,'g'],[38.2,2.8],[42.6,3.8,'x']];
  function glyphHalf(pal,big) {
    let marks='',gold='',dots='';
    for (const [x,hh,k] of GLYPHS){
      const H=hh*(big?1.15:1);
      (k==='g'?(v=>gold+=v):(v=>marks+=v))(`M ${x} 0.8 V ${f1(0.8+H)} `);
      if (k==='t') marks+=`M ${f1(x-1.4)} ${f1(0.8+H)} H ${f1(x+1.4)} `;
      if (k==='x') marks+=`M ${f1(x-1.3)} ${f1(H-0.6)} L ${f1(x+1.3)} ${f1(H+1.6)} `;
      if (k==='d') dots+=`<rect x="${f1(x-1)}" y="${f1(H+1.2)}" width="2" height="2" transform="rotate(45 ${x} ${f1(H+2.2)})" fill="${pal.gold}"/>`;
    }
    const segs=[[47,60],[63,70],[73,77],[79.5,81.5],[83.5,84.5]].map(([x1,x2])=>`M ${x1} 0.7 H ${x2}`).join(' ');
    return `<path d="M 7.6 0.8 L 10.4 4 L 7.6 7.2" stroke="${pal.stroke}" stroke-opacity=".85" stroke-width=".9"/>`+
      `<path d="${marks}" stroke="${pal.stroke}" stroke-opacity=".7" stroke-width=".85"/>`+
      `<path d="${gold}" stroke="${pal.gold}" stroke-opacity=".9" stroke-width=".95"/>`+dots+
      `<path d="M 11 0.7 H 45" stroke="${pal.gold}" stroke-opacity=".55" stroke-width=".7"/>`+
      `<path d="${segs}" stroke="${pal.gold}" stroke-opacity=".75" stroke-width="1.2"/>`+
      (big?`<path d="M 90 0.7 H 128 M 92 3.4 H 112" stroke="${pal.stroke}" stroke-opacity=".35" stroke-width=".7"/><path d="M 128 0.7 L 131 3.7 L 128 6.7 L 125 3.7 Z" stroke="${pal.stroke}" stroke-opacity=".6" stroke-width=".7"/>`:'');
  }
  function xenoEye(pal,r) {
    // Slit-pupil eye hanging just below the edge, in a dashed orbit with two satellites.
    const cy=r+1.4, R=r*1.6;
    return `<path d="M ${f1(-R)} ${f1(cy)} A ${f1(R)} ${f1(R)} 0 0 0 ${f1(R)} ${f1(cy)}" stroke="${pal.stroke}" stroke-opacity=".45" stroke-width=".7" stroke-dasharray="1.4 2.2"/>`+
      `<circle cx="${f1(-R*.71)}" cy="${f1(cy+R*.71)}" r=".95" fill="${pal.stroke}"/><circle cx="${f1(R*.92)}" cy="${f1(cy+R*.39)}" r=".8" fill="${pal.gold}"/>`+
      `<circle cx="0" cy="${f1(cy)}" r="${f1(r)}" fill="#05121a" stroke="${pal.gold}" stroke-width="1"/>`+
      `<circle cx="0" cy="${f1(cy)}" r="${f1(r*0.62)}" stroke="${pal.stroke}" stroke-opacity=".55" stroke-width=".6"/>`+
      `<ellipse cx="0" cy="${f1(cy)}" rx="${f1(r*0.17)}" ry="${f1(r*0.74)}" fill="${pal.gold}"/>`;
  }
  function ornament(pal,big) {
    const half=glyphHalf(pal,big);
    let crest='';
    if (big) {
      // Inverted triangular crest the eye hangs in, with stepped side fins.
      crest=`<path d="M -21 0.6 L 0 19.5 L 21 0.6" fill="#05121a" fill-opacity=".6" stroke="${pal.gold}" stroke-opacity=".7" stroke-width=".9"/>`+
        `<path d="M -12.5 0.6 L 0 11.8 L 12.5 0.6" stroke="${pal.stroke}" stroke-opacity=".4" stroke-width=".6"/>`+
        `<path d="M -27 0.6 V 4 H -22 V 7.2 M 27 0.6 V 4 H 22 V 7.2" stroke="${pal.stroke}" stroke-opacity=".6" stroke-width=".7"/>`+
        `<path d="M 0 19.5 V 23" stroke="${pal.gold}" stroke-opacity=".8" stroke-width=".8"/><circle cx="0" cy="24" r=".9" fill="${pal.gold}"/>`;
    }
    return crest+`<g>${half}</g><g transform="scale(-1 1)">${half}</g>`+xenoEye(pal,big?4.6:3.3);
  }
  function buildVaultSvg(kind,boxW,h,ext) {
    const pal=VAULT_PALETTES[kind]||VAULT_PALETTES.ball;
    const E=Math.max(0,...ext), W=Math.max(320,Math.round(boxW+2*E)), H=Math.max(30,Math.round(h));
    const N=ext.length-1;
    // Closed outline: top edge left->right, right side down, bottom edge right->left, left side up.
    const outline=(inset,y0,y1)=>{
      const L=ext.map((e,i)=>[E-e+1.5+inset,y0+(y1-y0)*i/N]);
      const R=L.map(([x,y])=>[W-x,y]);
      const Lup=L.slice().reverse();
      return `M ${f1(L[0][0])} ${f1(L[0][1])} H ${f1(R[0][0])}`+smoothSide(R)+` H ${f1(Lup[0][0])}`+smoothSide(Lup)+' Z';
    };
    const outer=outline(0,1.2,H-1.2), inner=outline(5,4.6,H-4.6);
    const cx=W/2, x0=E-ext[0]+1.5, xr=W-x0, xb=E-ext[N]+1.5, xbr=W-xb;
    const crown=kind==='heading';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" fill="none">`+
      `<defs>`+
      `<linearGradient id="vf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.top}" stop-opacity=".97"/><stop offset=".5" stop-color="${pal.mid}" stop-opacity=".95"/><stop offset="1" stop-color="${pal.bot}" stop-opacity=".98"/></linearGradient>`+
      `<radialGradient id="vg" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="${pal.glow}" stop-opacity=".55"/><stop offset=".55" stop-color="${pal.top}" stop-opacity=".12"/><stop offset="1" stop-color="${pal.bot}" stop-opacity="0"/></radialGradient>`+
      `<linearGradient id="vs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${pal.stroke}"/><stop offset=".18" stop-color="${pal.inner}" stop-opacity=".8"/><stop offset=".42" stop-color="${pal.stroke}" stop-opacity=".85"/><stop offset=".5" stop-color="${pal.gold}"/><stop offset=".58" stop-color="${pal.stroke}" stop-opacity=".85"/><stop offset=".82" stop-color="${pal.inner}" stop-opacity=".8"/><stop offset="1" stop-color="${pal.stroke}"/></linearGradient>`+
      `</defs>`+
      `<path d="${outer}" fill="url(#vf)"/>`+
      `<path d="${outer}" fill="url(#vg)"/>`+
      `<path d="${inner}" stroke="${pal.inner}" stroke-opacity=".34" stroke-width=".8"/>`+
      `<path d="${outer}" stroke="url(#vs)" stroke-width="1.5"/>`+
      `<g transform="translate(${f1(cx)} 1.2)${crown?' scale(1.3)':''}">${ornament(pal,crown)}</g>`+
      `<g transform="translate(${f1(cx)} ${f1(H-1.2)}) scale(.72 -.72)">${ornament(pal,false)}</g>`+
      `<circle cx="${f1(x0+4.5)}" cy="4" r="1.8" fill="${pal.gold}" fill-opacity=".9"/><circle cx="${f1(xr-4.5)}" cy="4" r="1.8" fill="${pal.gold}" fill-opacity=".9"/>`+
      `<circle cx="${f1(xb+4.5)}" cy="${f1(H-4)}" r="1.5" fill="${pal.stroke}" fill-opacity=".8"/><circle cx="${f1(xbr-4.5)}" cy="${f1(H-4)}" r="1.5" fill="${pal.stroke}" fill-opacity=".8"/>`+
      `</svg>`;
    return svgUrl(svg);
  }

  const PANEL_VARS=['--nd-geo-top','--nd-geo-bottom','--nd-geo-mid','--nd-geo-vault-svg','--nd-geo-info-shift','--nd-geo-tool-shift','--nd-geo-row-shift','--nd-geo-ball-shift'];
  function reset(room) {
    if (!room) return;
    room.classList.remove('nd-geo-t2');
    if (room.style) { room.style.removeProperty('--nd-arch-svg'); delete room.__archSig; }
    for (const selector of [SEL.root,SEL.ball,SEL.advanced]) {
      const panel=room.querySelector(selector);
      if (!panel) continue;
      delete panel.__vaultSig;
      for (const name of PANEL_VARS) panel.style.removeProperty(name);
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
    if (!room) return;
    const panels=[['root',room.querySelector(SEL.root)],['ball',room.querySelector(SEL.ball)],['advanced',room.querySelector(SEL.advanced)]];
    if (!panels.every(x=>x[1]) || window.innerWidth<=1100) { reset(room);return; }
    const ballRect=panels[1][1].getBoundingClientRect();
    const geo=geometry(room,ballRect.bottom+SPRING_GAP);
    if (!geo) { reset(room);return; }
    room.classList.toggle('nd-geo-t2',true);attachedRoom=room;
    const roomLeft=geo.rect.x;
    // Pillars / arch in the wings.
    if (room.style) {
      const sig=`${Math.round(geo.wing)}:${Math.round(geo.rect.height)}:${Math.round(geo.A)}:${Math.round(geo.Hs)}`;
      if (room.__archSig!==sig){room.__archSig=sig;room.style.setProperty('--nd-arch-svg',buildArchSvg(geo.wing,geo.rect.height,geo.A,geo.Hs));}
    }
    // Panel edge extension over its own box at screen y (0 below the spring line).
    const extAt=(r,y)=>Math.max(0,(r.x-roomLeft)+geo.off(y)-PANEL_GAP);
    const sampleExt=(r,n=8)=>Array.from({length:n+1},(_,i)=>extAt(r,r.top+r.height*i/n));
    // CSS contract: visual edge = box edge - (--nd-geo-top + arch-fit); text shift = edge-relative.
    const varOf=(r,y,fit)=>Math.max(0,extAt(r,y)-fit);
    lastGeometry=[];
    for(const [name,panel] of panels){
      const r=panel.getBoundingClientRect();
      const below=name==='advanced'||r.top>=geo.rect.y+geo.Hs;
      const fit=below?0:ARCH_FIT_PX;
      const top=below?0:varOf(r,r.top,fit), mid=below?0:varOf(r,r.top+r.height*.5,fit), bottom=below?0:varOf(r,r.bottom,fit);
      setPx(panel,'--nd-geo-top',top);
      setPx(panel,'--nd-geo-mid',mid);
      setPx(panel,'--nd-geo-bottom',bottom);
      const ext=below?[0,0]:sampleExt(r);
      // The SVG spans box + 2*(top+fit) = box + 2*ext[0]; ext[0] is the widest point.
      const sig=`${Math.round(r.width)}:${Math.round(r.height)}:${ext.map(e=>Math.round(e)).join(',')}`;
      if(panel.__vaultSig!==sig){
        panel.__vaultSig=sig;
        panel.style.setProperty('--nd-geo-vault-svg',buildVaultSvg(name,r.width,r.height,below?[fit,fit]:ext));
      }
      lastGeometry.push({name,top,mid,bottom,ext:ext.map(e=>Math.round(e*10)/10),angleDeg:Math.atan2(Math.max(0,top-bottom),Math.max(1,r.height))*180/Math.PI,rect:[r.x,r.y,r.width,r.height]});
    }
    const shiftAt=(r,y)=>Math.max(0,extAt(r,y)-ARCH_FIT_PX-GLYPH_CLEARANCE);
    const meta=panels[0][1],metaRect=meta.getBoundingClientRect();
    const info=meta.querySelector('.nd-legacy-info');
    const tools=meta.querySelector('.nd-legacy-tools');
    const row=meta.querySelector(':scope > div:last-child');
    // Each control row is sampled at its bottom edge (the narrowest part of the tier).
    if(info) setPx(meta,'--nd-geo-info-shift',shiftAt(metaRect,info.getBoundingClientRect().bottom));
    if(tools) setPx(meta,'--nd-geo-tool-shift',shiftAt(metaRect,tools.getBoundingClientRect().bottom));
    if(row) setPx(meta,'--nd-geo-row-shift',shiftAt(metaRect,row.getBoundingClientRect().bottom));
    const ball=panels[1][1];
    setPx(ball,'--nd-geo-ball-shift',shiftAt(ballRect,ballRect.bottom));
    const heading=room.querySelector(':scope > .nd-shared-heading');
    if(heading){
      const hr=heading.getBoundingClientRect();
      const headTop=varOf(hr,hr.top,ARCH_FIT_PX), headMid=varOf(hr,hr.top+hr.height*.5,ARCH_FIT_PX), headBottom=varOf(hr,hr.bottom,ARCH_FIT_PX);
      setPx(heading,'--nd-geo-top',headTop);
      setPx(heading,'--nd-geo-mid',headMid);
      setPx(heading,'--nd-geo-bottom',headBottom);
      setPx(heading,'--nd-geo-heading-edge',headBottom);
      const ext=sampleExt(hr);
      const sig=`${Math.round(hr.width)}:${Math.round(hr.height)}:${ext.map(e=>Math.round(e)).join(',')}`;
      if(heading.__vaultSig!==sig){
        heading.__vaultSig=sig;
        heading.style.setProperty('--nd-geo-vault-svg',buildVaultSvg('heading',hr.width,hr.height,ext));
      }
      // All three header copy lines share one vertical spine, inside the narrowest (bottom) edge.
      const copyShift=Math.max(0,headBottom-GLYPH_CLEARANCE);
      for(const item of heading.querySelectorAll('.nd-heading-copy > .nd-eyebrow,.nd-heading-copy > h2,.nd-heading-copy > p')) setPx(item,'--nd-geo-heading-shift',copyShift);
      const nav=heading.querySelector('.nd-modes');
      const navY=nav?nav.getBoundingClientRect().bottom:hr.bottom;
      setPx(heading,'--nd-geo-nav-shift',shiftAt(hr,navY));
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
  window.__xenNodalShellGeometryT2=Object.freeze({version:'ARCH-FIT-02',refresh:schedule,inspect:()=>lastGeometry.slice()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
