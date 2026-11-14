
/* XenSonar Wissensraum Bridge D · Schwebestrom
   Self-contained visual-only adapter; no React, audio or storage hooks.
   Anchors: .xen-meta-rack lower edge -> .xen-quick-save-trigger left edge.
   Trigger: disk pointer hover (plus keyboard focus), never Meta-Menu hover.
   Designed as independent change on the P7_38_12C FullBleed-DripShell branch.
*/
(() => {
  'use strict';
  if (window.__xenWissensraumBridgeD) return;
  const ROOT = document.documentElement;
  const STYLE_ID = 'xen-wissensraum-bridge-d-style';
  const CANVAS_ID = 'xen-wissensraum-bridge-d-canvas';
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const conf = Object.freeze({segments:64, fps:30, shoulder:72, waist:4.4, end:16.4,
    falloff:.185, returnT:.21, bend:.71, amplitude:39, widthWave:.42,
    alpha:.59, sigma:.45, glow:.15, noise:.125,
    fadeInMs:370, fadeOutMs:270});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const widthCount=(conf.segments+1)*2*7;
  const mesh = new Float32Array(widthCount);
  let canvas=null,gl=null,program=null,buffer=null,loc={},fallback=null;
  let hovered=false, focused=false, visible=false, scheduled=false, time=0,last=0;
  let frame=0, anchor=null;
  let bounds={left:0,top:0,w:0,h:0}, webglReady=false;

  const style=document.createElement('style');style.id=STYLE_ID;
  style.textContent=`
    #${CANVAS_ID}{position:fixed;pointer-events:none;z-index:65;opacity:0;
      transition:opacity ${conf.fadeOutMs}ms cubic-bezier(.28,.08,.34,1);
      will-change:opacity;contain:paint}
    html.xen-wissensraum-d-active #${CANVAS_ID}{opacity:1;
      transition-duration:${conf.fadeInMs}ms;
      transition-timing-function:cubic-bezier(.16,.45,.25,1)}
    html.xen-wissensraum-d-active .xen-meta-rack{border-bottom-color:#64c9d1;
      box-shadow:0 2px 9px #46e6d61e}
    @media (prefers-reduced-motion:reduce){#${CANVAS_ID}{transition-duration:0ms!important}}
  `;
  document.head.append(style);

  function isVisible(el){
    if(!el || !el.isConnected || !el.getClientRects().length) return false;
    const s=getComputedStyle(el);const r=el.getBoundingClientRect();
    return s.visibility!=='hidden'&&s.display!=='none'&&r.width>1&&r.height>1 && r.bottom>0&&r.right>0&&r.left<innerWidth&&r.top<innerHeight;
  }
  function rect(el){const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
  function getAnchors(){
    const disk=document.querySelector('.xen-quick-save-trigger');
    const meta=document.querySelector('.xen-meta-rack');
    if(!isVisible(disk)||!isVisible(meta)||meta.getAttribute('aria-expanded')==='true'||document.querySelector('.xen-quick-save-overlay'))return null;
    return {meta:rect(meta),disk:rect(disk),metaElement:meta,diskElement:disk};
  }
  function initRenderer(){
    if(canvas)return;
    canvas=document.createElement('canvas');canvas.id=CANVAS_ID;canvas.setAttribute('aria-hidden','true');
    document.body.append(canvas);
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'low-power'});
      if(!gl) throw new Error('WebGL unavailable');
      const vs=`attribute vec2 a_center;attribute vec2 a_normal;attribute float a_half;attribute float a_side;attribute float a_t;
        uniform vec2 u_resolution;uniform float u_spread;varying float v_cross;varying float v_t;
        void main(){vec2 p=a_center+a_normal*a_half*a_side*u_spread;
        gl_Position=vec4(p.x/u_resolution.x*2.0-1.0,1.0-p.y/u_resolution.y*2.0,0.0,1.0);
        v_cross=a_side;v_t=a_t;}`;
      const fs=`precision mediump float;varying float v_cross;varying float v_t;
        uniform float u_alpha,u_sigma,u_time,u_noise;uniform vec3 u_a,u_b;
        void main(){float u=abs(v_cross);float gaussian=exp(-0.5*pow(u/u_sigma,2.0));
        float feather=1.0-smoothstep(.83,1.0,u);
        float shimmer=1.0+u_noise*(sin(v_t*21.0-u_time*.53)+.5*sin(v_t*37.0+u_time*.34));
        float longitudinal=.83+.17*cos(v_t*6.283185);
        float aa=u_alpha*gaussian*feather*shimmer*longitudinal;
        vec3 col=mix(u_a,u_b,smoothstep(0.0,1.0,v_t));col*=.91+.09*sin(v_t*9.0-u_time*.16);
        gl_FragColor=vec4(col,clamp(aa,0.0,.96));}`;
      function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader}
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.byteLength,gl.DYNAMIC_DRAW);
      for(const [n,count,offset] of [['a_center',2,0],['a_normal',2,8],['a_half',1,16],['a_side',1,20],['a_t',1,24]]){
        const pos=gl.getAttribLocation(program,n);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,count,gl.FLOAT,false,28,offset);
      }
      for(const n of ['u_resolution','u_spread','u_alpha','u_sigma','u_time','u_noise','u_a','u_b'])loc[n]=gl.getUniformLocation(program,n);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();webglReady=false;gl=null;program=null;buffer=null;});
      canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();canvas=null;gl=null;initRenderer(); if(visible)render(time)});
      webglReady=true;
    } catch(error){
      gl=null;webglReady=false;
      fallback=canvas.getContext('2d');
    }
  }
  function resizeCanvas(a){
    const margin=clamp(Math.max(a.meta.width,a.disk.height)*1.12+conf.amplitude*2,110,235);
    const l=Math.floor(clamp(Math.min(a.meta.left,a.disk.left)-margin,0,innerWidth));
    const t=Math.floor(clamp(Math.min(a.meta.top,a.disk.top)-margin,0,innerHeight));
    const r=Math.ceil(clamp(Math.max(a.meta.right,a.disk.right)+margin,0,innerWidth));
    const b=Math.ceil(clamp(Math.max(a.meta.bottom,a.disk.bottom)+margin,0,innerHeight));
    const w=Math.max(1,r-l),h=Math.max(1,b-t);
    if(l===bounds.left&&t===bounds.top&&w===bounds.w&&h===bounds.h)return;
    bounds={left:l,top:t,w,h};canvas.style.left=l+'px';canvas.style.top=t+'px';canvas.style.width=w+'px';canvas.style.height=h+'px';
    // Restrict GPU surface to the connection's bounding region, no fullscreen render target.
    canvas.width=w;canvas.height=h;if(gl)gl.viewport(0,0,w,h);
  }
  const pnt=(t,theta,a)=>{
    const x0=a.meta.left+a.meta.width*.5-bounds.left,y0=a.meta.bottom-bounds.top;
    const x1=a.disk.left-bounds.left,y1=a.disk.top+a.disk.height*.5-bounds.top;
    const dis=Math.hypot(x1-x0,y1-y0),bend=dis*conf.bend;
    const p0={x:x0,y:y0},p1={x:x0,y:y0+bend*.61},p2={x:x1-bend*.59,y:y1},p3={x:x1,y:y1};
    const q=1-t,q2=q*q,t2=t*t;
    let x=q*q2*p0.x+3*q2*t*p1.x+3*q*t2*p2.x+t*t2*p3.x;
    let y=q*q2*p0.y+3*q2*t*p1.y+3*q*t2*p2.y+t*t2*p3.y;
    const dx=3*q2*(p1.x-p0.x)+6*q*t*(p2.x-p1.x)+3*t2*(p3.x-p2.x);
    const dy=3*q2*(p1.y-p0.y)+6*q*t*(p2.y-p1.y)+3*t2*(p3.y-p2.y);
    const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    const env=Math.pow(Math.sin(Math.PI*t),2);
    const motion=RM.matches?0:1;
    const wave=motion*conf.amplitude*env*(.82*Math.sin(7.0*t-theta*.53)+.42*Math.sin(13.0*t+theta*.76));
    x+=nx*wave;y+=ny*wave;
    const shoulder=Math.min(conf.shoulder,a.meta.width*.80);
    const ending=Math.min(conf.end,a.disk.height*.73);
    const root=Math.exp(-Math.pow(t/conf.falloff,2.35));
    const tip=Math.exp(-Math.pow((1-t)/conf.returnT,2.15));
    const ripple=1+motion*conf.widthWave*env*(.55*Math.sin(15*t-theta*.82)+.30*Math.sin(29*t+theta*.41));
    const width=Math.max(1.4,(conf.waist+(shoulder-conf.waist)*root+(ending-conf.waist)*tip)*ripple);
    return {x,y,width};
  };
  function geometry(theta,a){
    const samples=[];for(let i=0;i<=conf.segments;i++)samples.push(pnt(i/conf.segments,theta,a));
    for(let i=0;i<=conf.segments;i++){
      const v=samples[i],prev=samples[Math.max(0,i-1)],next=samples[Math.min(conf.segments,i+1)];
      const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;
      let nx=-dy/len,ny=dx/len;
      // Exactly horizontal menu lower-edge attachment and vertical disk left-edge attachment.
      if(i===0){nx=-1;ny=0}if(i===conf.segments){nx=0;ny=1}
      for(let side=0;side<2;side++){
        const j=(i*2+side)*7;mesh[j]=v.x;mesh[j+1]=v.y;mesh[j+2]=nx;mesh[j+3]=ny;
        mesh[j+4]=v.width*.5;mesh[j+5]=side?1:-1;mesh[j+6]=i/conf.segments;
      }
    }
    return samples;
  }
  function render(theta){
    if(!canvas || !visible)return;
    const a=getAnchors();if(!a){setActive(false);return}
    anchor=a;resizeCanvas(a);const samples=geometry(theta,a);
    if(gl&&webglReady){
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,mesh);
      gl.uniform2f(loc.u_resolution,bounds.w,bounds.h);gl.uniform1f(loc.u_time,theta);gl.uniform1f(loc.u_noise,conf.noise);
      const pass=(spread,alpha,sigma,aColor,bColor)=>{
        gl.uniform1f(loc.u_spread,spread);gl.uniform1f(loc.u_alpha,alpha);gl.uniform1f(loc.u_sigma,sigma);
        gl.uniform3fv(loc.u_a,aColor);gl.uniform3fv(loc.u_b,bColor);gl.drawArrays(gl.TRIANGLE_STRIP,0,(conf.segments+1)*2);
      };
      pass(1.7,conf.glow,conf.sigma*.84,[.13,.85,.89],[.22,.94,.62]);
      pass(1,conf.alpha,conf.sigma,[.37,.94,.99],[.42,1,.72]);
    }else if(fallback){
      fallback.clearRect(0,0,bounds.w,bounds.h);
      // Nested full-length contours approximate a smooth cross-section on WebGL-less devices.
      const gradient=fallback.createLinearGradient(samples[0].x,samples[0].y,samples.at(-1).x,samples.at(-1).y);
      gradient.addColorStop(0,'rgb(105,228,244)');gradient.addColorStop(1,'rgb(110,255,198)');fallback.fillStyle=gradient;
      let accumulated=0;
      for(let layer=0;layer<48;layer++){
        const radius=1-layer/48,edge=1-clamp((radius-.83)/.17,0,1)**2*(3-2*clamp((radius-.83)/.17,0,1));
        const target=conf.alpha*Math.exp(-.5*(radius/conf.sigma)**2)*edge;
        const opacity=clamp((target-accumulated)/(1-accumulated),0,1);accumulated=target;
        if(opacity<.00005)continue;fallback.globalAlpha=opacity;fallback.beginPath();
        const pt=(i,mult)=>{const j=i*14;return [samples[i].x+mesh[j+2]*samples[i].width*.5*radius*mult,samples[i].y+mesh[j+3]*samples[i].width*.5*radius*mult]};
        for(let i=0;i<=conf.segments;i++){const [x,y]=pt(i,1);i?fallback.lineTo(x,y):fallback.moveTo(x,y)}
        for(let i=conf.segments;i>=0;i--){const [x,y]=pt(i,-1);fallback.lineTo(x,y)}
        fallback.closePath();fallback.fill();
      }
      fallback.globalAlpha=1;
    }
  }
  function animate(ts){
    scheduled=false;frame=0;
    if(!visible||!canvas||document.hidden)return;
    if(!last||ts-last>=1000/conf.fps){last=ts;time=ts*.001;render(time)}
    if(visible&&!RM.matches)schedule();
  }
  function schedule(){if(scheduled||RM.matches||!visible||document.hidden)return;scheduled=true;frame=requestAnimationFrame(animate)}
  function setActive(want){
    if(want){const a=getAnchors();if(!a)return;initRenderer();anchor=a;
      if(!visible){visible=true;last=0;render(time); // Draw before the CSS opacity transition starts.
        requestAnimationFrame(()=>{if(visible)ROOT.classList.add('xen-wissensraum-d-active')});}
      schedule();
    }else{
      if(!visible)return;visible=false;ROOT.classList.remove('xen-wissensraum-d-active');
      if(frame)cancelAnimationFrame(frame);frame=0;scheduled=false;last=0;
    }
  }
  const sync=()=>setActive(hovered||focused);
  function maybeDisk(event){const e=event.target;return e instanceof Element?e.closest('.xen-quick-save-trigger'):null}
  document.addEventListener('pointerover',event=>{const b=maybeDisk(event);if(!b||b.contains(event.relatedTarget))return;hovered=true;sync()},true);
  document.addEventListener('pointerout',event=>{const b=maybeDisk(event);if(!b||b.contains(event.relatedTarget))return;hovered=false;sync()},true);
  document.addEventListener('focusin',event=>{if(maybeDisk(event)){focused=true;sync()}},true);
  document.addEventListener('focusout',event=>{if(maybeDisk(event)){focused=false;sync()}},true);
  document.addEventListener('click',event=>{if(maybeDisk(event))setActive(false)},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)render(time);if(!document.hidden)schedule()});
  window.addEventListener('resize',()=>{if(visible)render(time)},{passive:true});
  window.addEventListener('scroll',()=>{if(visible)render(time)},{passive:true});
  window.__xenWissensraumBridgeD={
    version:'D-Schwebestrom/1.0',config:conf,
    state:()=>({active:visible,hovered,focused,renderer:webglReady?'webgl':fallback?'canvas2d':'uninitialized',
      rects:anchor?{meta:anchor.meta,disk:anchor.disk}:null,
      attach:anchor?{meta:{x:anchor.meta.left+anchor.meta.width/2,y:anchor.meta.bottom},disk:{x:anchor.disk.left,y:anchor.disk.top+anchor.disk.height/2}}:null}),
    deactivate:()=>{hovered=false;focused=false;setActive(false)}
  };
})();

