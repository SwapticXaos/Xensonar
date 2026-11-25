/* W01 UI: native DOM overlay; source owner remains lGe, PCM authority remains Core. */
(function(root){'use strict';
const instances=new WeakMap(),canvasOwners=new WeakMap(),liveEditors=new Set()/* FORGE-SLEEP-01: editors that exist; awake = the Forge is the shown room (set only by the Forge lifecycle owner __setForgeWorkspaceVisible) */,peakCache=new WeakMap();let forgeAwake=typeof __forgeWorkspaceVisible==='boolean'?__forgeWorkspaceVisible:false,serial=0,clipboard=null,laneClipboard=null;
const $=(tag,attrs={},text)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v)}if(text!=null)e.textContent=text;return e};
const button=(text,fn,attrs={})=>$('button',{type:'button',...attrs,onclick:fn},text);
// W20: styling and SVGs are exactly Chromatic Contour's static design assets.
// Event owners remain the original Wave Editor edit commands; this is not a second editor.
const CHROMATIC_EDIT_ASSETS=Object.freeze({"copy":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><rect height=\"14\" rx=\"1.6\" width=\"11\" x=\"8\" y=\"7\"></rect><path d=\"M16 7V5.1A2.1 2.1 0 0 0 13.9 3H6.2A2.2 2.2 0 0 0 4 5.2v11.7A2.1 2.1 0 0 0 6.1 19H8\"></path><path d=\"M11 11h5M11 14h5\"></path></svg>","accent":"#64caff","mid":"#203753","tip":"#2a4d6c"},"cut":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><circle cx=\"5.5\" cy=\"6\" r=\"2.5\"></circle><circle cx=\"5.5\" cy=\"18\" r=\"2.5\"></circle><path d=\"M7.5 8l11 10M7.5 16l11-10M18 6l2-2M18 18l2 2\"></path><circle cx=\"11.5\" cy=\"12\" fill=\"currentColor\" r=\".7\" stroke=\"none\"></circle></svg>","accent":"#ff8ca6","mid":"#342f47","tip":"#533d55"},"insert":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M5 13v7h14v-7M12 3v12M8 11l4 4 4-4M7 20v-3h10v3\"></path></svg>","accent":"#69ddab","mid":"#213948","tip":"#2c5257"},"overwrite":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><rect height=\"14\" rx=\"2\" width=\"15\" x=\"4.5\" y=\"5\"></rect><path d=\"M7.5 10h9M7.5 13h9\" opacity=\".6\"></path><path d=\"M9 16l3-3 3 3M12 13v5\"></path></svg>","accent":"#ffba70","mid":"#343540","tip":"#534947"},"mix":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2.5 9c3-9 5 9 8 0s5 9 8 0 3-2 3-2M2.5 15c3-9 5 9 8 0s5 9 8 0 3-2 3-2\"></path><path d=\"M12 3v18\" opacity=\".52\"></path></svg>","accent":"#bca1ff","mid":"#2c3253","tip":"#41426c"},"delete":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 12h4l2-5 3.2 10 2.5-5h2.3M17 7l5 10M22 7l-5 10\"></path><path d=\"M4 5v3M4 16v3\" opacity=\".55\"></path></svg>","accent":"#ff6b89","mid":"#342b43","tip":"#53344e"},"trim":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 7V4h4M21 7V4h-4M3 17v3h4M21 17v3h-4\"></path><path d=\"M6 12h2l1.5-4 2.5 8 2-6 1 2h3\"></path><path d=\"M7 3v18M17 3v18\" opacity=\".4\"></path></svg>","accent":"#65e5d6","mid":"#203a4d","tip":"#2b5462"},"split":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 12h2l1.8-5 2.2 10 1.4-5h1.1M15 12h1l1.3-5 2.3 10 1.6-5H22\"></path><path d=\"M13 3v18\" stroke-dasharray=\"2 2\"></path></svg>","accent":"#ffd47c","mid":"#343842","tip":"#53504a"},"silence":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 9v6h4l5 4V5L7 9H3Z\"></path><path d=\"M16 8l6 8M22 8l-6 8\"></path></svg>","accent":"#9eaddc","mid":"#28334e","tip":"#394563"},"reverse":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M9 7 4 12l5 5M4 12h12a4 4 0 0 0 0-8h-3\"></path><path d=\"M17.5 15 12 19v-8z\" stroke-linejoin=\"round\"></path></svg>","accent":"#879bff","mid":"#253153","tip":"#33416c"},"invert":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 7h5M4.5 4.5v5M2 17h5M10 7h2l2-4 3 8 2-4h3M10 17h2l2 4 3-8 2 4h3\"></path></svg>","accent":"#e98de6","mid":"#312f4f","tip":"#4d3d66"},"normalize":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 5h18M3 19h18M3 12h2l1.5-3 2 6L11 4l2.5 16L16 8l1.5 7 1.5-3h2\"></path><path d=\"M20 3v4M20 17v4\"></path></svg>","accent":"#68d7e9","mid":"#213950","tip":"#2b5067"},"dcRemove":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 12h20\" opacity=\".5\" stroke-dasharray=\"2 2\"></path><path d=\"M3 8h2l1.5-4 2.5 8 3-7 2.5 7 2-4H21\"></path><path d=\"M12 14v7m-3-3 3 3 3-3\"></path></svg>","accent":"#b7e174","mid":"#2b3a41","tip":"#405348"},"envelope":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M2 20h20M3 18 7 8l5 5 4-8 5 7\"></path><circle cx=\"3\" cy=\"18\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"7\" cy=\"8\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"12\" cy=\"13\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"16\" cy=\"5\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle><circle cx=\"21\" cy=\"12\" fill=\"currentColor\" r=\"1.7\" stroke=\"none\"></circle></svg>","accent":"#ff9ed7","mid":"#34314e","tip":"#534262"},"gain":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 20h18M5 17v-4M9 17V9M13 17V6M17 17V3\"></path><path d=\"M18 9h5M20.5 6.5v5\"></path></svg>","accent":"#ffb673","mid":"#343441","tip":"#534848"},"insertSilence":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><path d=\"M3 7v10M21 7v10M9 6v12M15 6v12\"></path><path d=\"M5 12h3M16 12h3\" opacity=\".45\"></path></svg>","accent":"#8dbce9","mid":"#253550","tip":"#354967"},"analyze":{"svg":"<svg aria-hidden=\"true\" class=\"glyph\" fill=\"none\" focusable=\"false\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.7\" viewbox=\"0 0 24 24\"><circle cx=\"10\" cy=\"10\" r=\"6.4\"></circle><path d=\"M14.5 14.5 21 21M5.5 10h2l1.2-2.5 2.2 5 1.3-2.5h2.2\"></path></svg>","accent":"#73dbc5","mid":"#22394b","tip":"#2e515d"}});
const chromaticButton=(key,label,fn,attrs={})=>{
 const asset=CHROMATIC_EDIT_ASSETS[key];if(!asset)return button(label,fn,attrs);
 const control=button(label,fn,{...attrs,class:'xwe-chromatic-action','data-xwe-chromatic-action':key,'aria-label':label});
 control.style.setProperty('--xwe-accent',asset.accent);control.style.setProperty('--xwe-mid',asset.mid);control.style.setProperty('--xwe-tip',asset.tip);
 const icon=$('span',{class:'xwe-chromatic-mark','aria-hidden':'true'});icon.innerHTML=asset.svg;
 const name=$('span',{class:'xwe-chromatic-label'},label);control.replaceChildren(icon,name);
 return control;
};

const core=()=>root.__XenWaveCoreW01,dsp=()=>root.__XenWaveDSPW01;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),fmt=(v,n=3)=>Number(v||0).toFixed(n);
function channels(asset){return asset?.channelCount>1&&asset.leftSamples?.length&&asset.rightSamples?.length?[asset.leftSamples,asset.rightSamples]:[asset?.monoSamples||asset?.leftSamples||new Float32Array()]}
function peaks(asset,range,width){let cache=peakCache.get(asset);if(!cache){cache=new Map();peakCache.set(asset,cache)}const key=[range.startSec,range.durationSec,width].join(':');if(cache.has(key))return cache.get(key);const sr=asset.sampleRate,cs=channels(asset),start=Math.max(0,Math.floor(range.startSec*sr)),end=Math.min(cs[0].length,Math.ceil((range.startSec+range.durationSec)*sr)),span=Math.max(1,end-start);const result=cs.map(samples=>{const out=new Float32Array(width*2);for(let x=0;x<width;x++){let lo=0,hi=0;const a=start+Math.floor(x/width*span),b=Math.min(end,Math.max(a+1,start+Math.floor((x+1)/width*span)));for(let i=a;i<b;i++){const y=samples[i]||0;if(y<lo)lo=y;if(y>hi)hi=y}out[x*2]=lo;out[x*2+1]=hi}return out});if(cache.size>8)cache.clear();cache.set(key,result);return result}
function drawStereo(ctx,asset,range,width,height,gain=1){
 if(!asset)return false;
 const ps=peaks(asset,range,width),lane=height/ps.length;
 const editor=canvasOwners.get(ctx.canvas),hover=editor?.hoverChannelLabel;
 ctx.save();ctx.fillStyle='#030817';ctx.fillRect(0,0,width,height);
 for(let c=0;c<ps.length;c++){
  const middle=lane*(c+.5),p=ps[c];
  ctx.strokeStyle=c?'#c4a7ff':'#7dd3fc';ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<width;x++){ctx.moveTo(x+.5,middle-clamp(p[x*2+1]*gain,-1,1)*lane*.41);ctx.lineTo(x+.5,middle-clamp(p[x*2]*gain,-1,1)*lane*.41)}ctx.stroke();
  ctx.strokeStyle='#33405a';ctx.beginPath();ctx.moveTo(0,middle+.5);ctx.lineTo(width,middle+.5);ctx.stroke();
  const ch=ps.length===1?'MONO':c?'R':'L',isHover=hover?.canvas===ctx.canvas&&hover?.channel===ch;
  const selected=editor?.channel==='all'||editor?.channel===ch;
  ctx.fillStyle=isHover?'#ffffff':selected?(c?'#e5cfff':'#b5f0ff'):'#72809a';
  ctx.font=`700 ${isHover?16:11}px system-ui`;
  ctx.fillText(ch,24,lane*c+18);
 }
 ctx.restore();return true;
}
function registry(){const r=dsp()?.getRegistry?.()||dsp()?.registry||[];return Array.isArray(r)?r:Object.entries(r).map(([type,v])=>({type,...v}))}
function selectableEffects(){return registry().filter(e=>e.type!=='fadeIn'&&e.type!=='fadeOut')}
function definitions(effect){const p=effect?.params||effect?.parameters||{};return Array.isArray(p)?p.map(x=>[x.key||x.id,x]):Object.entries(p).map(([key,value])=>[key,typeof value==='object'?value:{default:value}])}
const ENGLISH_EFFECT_TEXT=Object.freeze({
 'Effekte':'Effects','Lautstärke & Dynamik':'Gain & Dynamics','Delay & Raum':'Delay & Space','Verzerrung & Amp':'Distortion & Amp','Stereo & Kanäle':'Stereo & Channels',
 'Verstärkung':'Gain','Einblenden':'Fade In','Ausblenden':'Fade Out','Tiefpass':'Low-Pass Filter','Hochpass':'High-Pass Filter','Bandpass':'Band-Pass Filter','Kerbfilter':'Notch Filter','Parametrischer EQ':'Parametric EQ',
 'Kompressor':'Compressor','Algorithmischer Hall':'Reverb','Sättigung / Distortion':'Saturation / Distortion','Stereobreite':'Stereo Width',
 'Frequenz':'Frequency','Resonanz Q':'Resonance Q','Effektanteil':'Wet Mix','LFO-Frequenz':'LFO Rate','Bandverstärkung':'Band Gain','Schwelle':'Threshold','Verhältnis':'Ratio','Knie':'Knee','Aufholverstärkung':'Makeup Gain','Vorausschau':'Lookahead','Expansionsverhältnis':'Expansion Ratio','Delayzeit':'Delay Time','Rückkopplung':'Feedback','Raumgröße':'Room Size','Höhendämpfung':'High-Frequency Damping','Modulationstiefe':'Modulation Depth','Basisdelay':'Base Delay','Balance':'Balance','Kurvenexponent':'Curve Exponent'
});
/* MTW-03: an interval typed the XenSonar way: a frequency ratio (3/2, 7:4, 1.5x) or cents (50, -1200, "386.3 ct"). A plain number is cents for pitch and a factor for length. */
function parseInterval(text,kind){const t=String(text??'').trim().toLowerCase().replace(',','.');if(!t)return kind==='time'?1:1;
 let m=/^([+-]?\d*\.?\d+)\s*[/:]\s*(\d*\.?\d+)$/.exec(t);if(m){const a=Number(m[1]),b=Number(m[2]);return a>0&&b>0?a/b:NaN}
 m=/^x?\s*([+-]?\d*\.?\d+)\s*x$|^x\s*([+-]?\d*\.?\d+)$/.exec(t);if(m){const v=Number(m[1]??m[2]);return v>0?v:NaN}
 m=/^([+-]?\d*\.?\d+)\s*(c|ct|cent|cents)?$/.exec(t);if(!m)return NaN;const v=Number(m[1]);if(kind==='time'&&!m[2])return v>0?v:NaN;return Math.pow(2,v/1200)}
function displayText(t){return ENGLISH_EFFECT_TEXT[t]||t}
function displayEffect(effect){return displayText(effect?.label||effect?.type||'Effect')}
function category(effect){return displayText(effect.category||'Effects')}

function attach(options){const canvas=options.detailCanvas;if(!canvas)return()=>{};let inst=instances.get(canvas);if(inst){inst.update(options);return()=>{}}try{inst=new Editor(options)}catch(error){console.warn('[Wave Editor W01] source unsupported:',error);return()=>{}}instances.set(canvas,inst);liveEditors.add(inst);return()=>{inst.dispose();liveEditors.delete(inst);instances.delete(canvas)}}
class Editor{
 constructor(options){this.options=options;this.bluePanFrame=null;this.bluePanHeld=null;this.bluePanStopOnBlur=()=>this.stopBluePan();this.bluePanStopOnVisibility=()=>{if(document.hidden)this.stopBluePan()};root.addEventListener('blur',this.bluePanStopOnBlur);document.addEventListener('visibilitychange',this.bluePanStopOnVisibility);this.enabled=false;this.goldenMoveArmed=false;this.goldenGesture=null;this.doc=null;this.source=null;this.nodes=[];this.activeNode=null;this.eqVisible=false;this.channel='all';this.maskVertical={top:0,bottom:1};this.activeWorkspace='project';this.fxFocus='morph';this.scratchContext=null;this.projectContext=null;this.renderToken=0;this.lastResult=null;this.computeJob=null;this.computeNoticeTimer=null;this.status='Ready · Right-click either waveform for editing and effects.';this.update(options);this.context=e=>this.contextMenu(e);options.detailCanvas.addEventListener('contextmenu',this.context);options.overviewCanvas?.addEventListener('contextmenu',this.context);const region=options.detailCanvas.closest('[data-material-intake-gateway="true"]')||document;this.launchHost=region.querySelector('[data-xwe-launch-slot="true"]');this.launch=button('Wave Editor',()=>this.open(),{class:'xwe-launch',title:'Open stereo Wave Editor · right-click the waveform','aria-label':'Open Wave Editor'});this.launchHost?.append(this.launch);this.editPointerDown=e=>this.beginEditPointer(e);this.goldenDoubleClick=e=>this.toggleGoldenMove(e);this.channelPointerDown=e=>this.handleChannelPointerDown(e);
 this.hoverPointerMove=e=>this.onWavePointerMove(e);
 this.hoverPointerLeave=e=>this.onWavePointerLeave(e);
 for(const canvas of [options.overviewCanvas,options.detailCanvas])if(canvas){canvasOwners.set(canvas,this);canvas.addEventListener('pointerdown',this.channelPointerDown,true);canvas.addEventListener('pointermove',this.hoverPointerMove,true);canvas.addEventListener('pointerleave',this.hoverPointerLeave,true)}
 this.attachLoopMaskResize();
 options.detailCanvas.addEventListener('pointerdown',this.editPointerDown,true);options.detailCanvas.addEventListener('dblclick',this.goldenDoubleClick,true);this.key=e=>this.handleKey(e);/* WAVE-KEYS-03: the edit keys belong to the editor when the LAST pointer press was inside its audio box (waveforms, Loop Mask, Taktometer, 'Wave Editor' button, editor panel), even if the focus stayed on a button there */this.keyZone=e=>{const g=this.options.detailCanvas?.closest?.('[data-material-intake-gateway]')||this.options.detailCanvas?.parentElement;this.pointerOwnsKeys=!!(g&&g.contains(e.target))||!!this.dialog?.contains(e.target)};this.listenKeys(forgeAwake);this.eqLastConfigs=new Map();this.eqUnsubscribe=root.__XenWaveOfflineEQ?.subscribe(()=>{let changed=false;for(const n of this.nodes){if(n.type!=='liveRoomEQ')continue;const cfg=root.__XenWaveOfflineEQ.get(n.eqSourceKey);if(this.eqLastConfigs.get(n.eqSourceKey)!==cfg){this.eqLastConfigs.set(n.eqSourceKey,cfg);changed=true}}if(changed)this.invalidate()})}
 handleKey(e){/* WAVE-KEYS-01: a mouse click on the waveform or the Taktometer leaves the focus on the focusable Forge panel that hosts the canvases (not on the canvas), so Delete/Backspace/Space/arrows were ignored until a button was clicked; that host counts as the editor's own focus */const host=this.options.detailCanvas?.closest?.('[tabindex]');
  /* WAVE-KEYS-03 room separation: FORGE-SLEEP-01 removes this listener while the Forge is parked */if(!this.options.detailCanvas?.isConnected)return;
  const editable=/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||!!e.target.isContentEditable,foreign=!this.dialog?.contains(e.target)&&!!e.target.closest?.('[role=menu],[role=listbox],[role=dialog]'),zone=!!this.pointerOwnsKeys&&!editable&&!foreign,nav=!!e.target.closest?.('header')&&!e.target.closest('[data-xen-forge-room]')&&!editable&&!foreign;/* FORGE-SLEEP-01: the room navigation owns no edit key. Coming back by a header button leaves the focus on it; for the awake editor that counts as focus nowhere (Backspace/Delete/Ctrl+X cut at once, as after any other way in) */
  /* only the EDIT keys are taken when the focus is on the Forge panel or nowhere: Escape, Space and the arrows stay with whoever owns them (e.g. the Taktometer menu) */
  const editKey=['Delete','Backspace'].includes(e.key)||((e.ctrlKey||e.metaKey)&&['x','c','v','z','y'].includes(String(e.key).toLowerCase())),weak=(host&&e.target===host)||/^(BODY|HTML)$/.test(e.target.tagName)||zone||nav;/* WAVE-KEYS-02: in the import view the editor panel is not open (edits come from the right-click menu); the edit keys run the SAME runEdit as that menu there too (Delete/Backspace = Ripple Delete, Ctrl+X/C/V/Z/Y) while the waveform or its Forge panel has focus */
  if(!this.overlay){if(!this.doc||this.menu?.contains(e.target)||!(e.target===this.options.detailCanvas||e.target===this.options.overviewCanvas||(host&&e.target===host)||/^(BODY|HTML)$/.test(e.target.tagName)||zone||nav)||editable)return;
   const mod=e.ctrlKey||e.metaKey,k=String(e.key).toLowerCase();let type=null;
   if(!mod&&['Delete','Backspace'].includes(e.key))type='delete';else if(mod&&!e.shiftKey&&!e.altKey&&k==='x')type='cut';else if(mod&&!e.shiftKey&&!e.altKey&&k==='c')type='copy';else if(mod&&!e.shiftKey&&!e.altKey&&k==='v')type='insert';else if(mod&&k==='z')type=e.shiftKey?'redo':'undo';else if(mod&&k==='y')type='redo';
   if(type){e.preventDefault();e.stopImmediatePropagation();this.runEdit(type)}return}
  if(!this.overlay||this.menu?.contains(e.target)||!(this.dialog?.contains(e.target)||e.target===this.options.detailCanvas||e.target===this.options.overviewCanvas||(weak&&editKey)))return;if(e.target.closest?.('[data-xwe-view-controls]'))return;if(e.key==='Tab')return;const input=/INPUT|SELECT|TEXTAREA/.test(e.target.tagName),mod=e.ctrlKey||e.metaKey;
  // Hotkeys only when editor or waveform owns focus; other XenSonar instruments keep their keyboard events.
  e.stopImmediatePropagation();
  if(e.key==='Escape'){e.preventDefault();if(this.goldenMoveArmed&&!this.goldenGesture){this.goldenMoveArmed=false;this.options.onViewChange?.();this.setStatus('Golden Move cancelled.');return}if(this.mixPopover)this.closeMixPane();else this.close();return}

  if(input)return;
  if(mod){const key=e.key.toLowerCase();if(['z','y','c','x','v','a'].includes(key)){e.preventDefault();if(key==='z')this.runEdit(e.shiftKey?'redo':'undo');if(key==='y')this.runEdit('redo');if(key==='c')this.runEdit('copy');if(key==='x')this.runEdit('cut');if(key==='v'){if(e.shiftKey)this.openMixPane();else this.runEdit(e.altKey?'overwrite':'insert')}if(key==='a'){this.doc=core().setSelection(this.doc,0,this.doc.frames);this.applySelection();this.refresh(false)}}return}
  if(e.code==='Space'){e.preventDefault();this.preview('chain');return}
  if(e.key==='z'||e.key==='Z'){e.preventDefault();this.snapZero();return}
  if(['Delete','Backspace'].includes(e.key)){e.preventDefault();this.runEdit('delete');return}
  if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let f=this.doc.selection.start;if(e.key==='Home')f=0;else if(e.key==='End')f=this.doc.frames;else f=clamp(f+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?Math.round(this.doc.sampleRate*.01):1),0,this.doc.frames);this.doc=core().setSelection(this.doc,f,f);this.applySelection();this.refresh(false)}
 }


 setFxFocus(target){
  if(target!=='morph'&&target!=='scratch')return;
  this.fxFocus=target;
  this.fxLayout?.setAttribute('data-xwe-fx-focus',target);
  this.morphFocusButton?.setAttribute('aria-pressed',String(target==='morph'));
  this.scratchFocusButton?.setAttribute('aria-pressed',String(target==='scratch'));
  if(target==='scratch')this.drawScratchpad();
  else this.requestMorphRefresh();
  this.scheduleFxLayout();
 }
 retainExpandedScratchHeight(){
  if(this.fxFocus!=='scratch'||!this.fxLayout||!this.scratchRoot||!this.scratchRoot.isConnected)return;
  const previous=parseFloat(this.fxLayout.style.getPropertyValue('--xwe-scratch-retained-height'))||0;
  const current=this.scratchRoot.getBoundingClientRect().height;
  if(current>previous+1)this.fxLayout.style.setProperty('--xwe-scratch-retained-height',Math.ceil(current)+'px');
 }
 scheduleFxLayout(){
  if(this.fxMeasureFrame)root.cancelAnimationFrame(this.fxMeasureFrame);
  this.fxMeasureFrame=root.requestAnimationFrame(()=>{
   this.fxMeasureFrame=null;
   if(!this.fxLayout||!this.morphArea||!this.scratchRoot||!this.fxLayout.isConnected)return;
   if(this.fxFocus!=='morph'&&root.innerWidth>900){
    this.fxLayout.style.removeProperty('--xwe-morph-reserve');
    return;
   }
   // Determine the free top-right band before the full-width native morph editor.
   // Avoid cyclic layout growth by subtracting the previous reserved margin.
   const pane=this.fxLayout.getBoundingClientRect();
   const morph=this.morphArea.getBoundingClientRect();
   const old=Number.parseFloat(this.fxLayout.style.getPropertyValue('--xwe-morph-reserve'))||0;
   const naturalTop=morph.top-pane.top-old;
   const scratchTop=35;
   const available=naturalTop-scratchTop-8;
   const extra=Math.max(0,163-available);
   this.fxLayout.style.setProperty('--xwe-morph-reserve',extra.toFixed(1)+'px');
   const height=Math.max(163,Math.min(258,available+extra));
   this.fxLayout.style.setProperty('--xwe-scratch-compact-height',height.toFixed(1)+'px');
  });
 }
 workspaceSnapshot(){return {doc:this.doc,nodes:this.nodes,activeNode:this.activeNode,channel:this.channel,maskVertical:{...this.maskVertical},bypass:this.bypass||false,lastResult:null,activeParam:this.activeParam,curveHistory:this.curveHistory}}
 restoreWorkspace(snapshot){this.doc=snapshot.doc;this.nodes=snapshot.nodes;this.activeNode=snapshot.activeNode;this.channel=snapshot.channel;this.maskVertical={...snapshot.maskVertical};this.bypass=!!snapshot.bypass;this.activeParam=snapshot.activeParam;this.curveHistory=snapshot.curveHistory;this.lastResult=null}
 changeWorkspace(which){
  if(which===this.activeWorkspace){this.drawScratchpad();return true}
  if(which==='scratch'&&!this.scratchContext){this.setStatus('Copy audio in the project and choose Paste to Scratchpad first.');return false}
  this.abort('choice');this.stopAudio();this.cancelEditGesture?.();this.goldenMoveArmed=false;this.goldenGesture=null;this.closeMixPane();
  if(this.activeWorkspace==='project')this.projectContext=this.workspaceSnapshot();
  else this.scratchContext=this.workspaceSnapshot();
  const next=which==='project'?this.projectContext:this.scratchContext;
  if(!next)return false;
  this.activeWorkspace=which;this.restoreWorkspace(next);
  // A parent navigator can change the project's range while Scratchpad owns
  // the active document. On return, no old FX target may become active again.
  if(which==='project')this.syncFxTargetsToSelection();
  this.dialog?.setAttribute('data-xwe-active-workspace',which);
  this.scratchRoot?.setAttribute('data-active',String(which==='scratch'));
  this.projectSwitch?.setAttribute('aria-pressed',String(which==='project'));
  this.scratchModeLabel&&(this.scratchModeLabel.textContent=which==='scratch'?'Editing: Scratchpad':'Editing: Project');
  if(this.previewTargetButton)this.previewTargetButton.textContent=which==='scratch'?'B · Scratchpad':'B · Project';
  if(this.scratchCanvas){this.scratchCanvas.style.cursor=which==='scratch'?'crosshair':'pointer'}
  if(this.overlay){this.refresh();this.drawScratchpad()}
  this.options.onViewChange?.();this.setStatus(which==='scratch'?'Scratchpad active · changes stay local until copied into Project.':'Project active · use Insert or Mix Paste to place your edited Scratchpad audio.');
  return true;
 }
 ensureScratchSelection(){
  if(this.activeWorkspace!=='scratch'||!this.doc)return false;
  if(this.doc.selection.start===this.doc.selection.end){
   this.doc=core().setSelection(this.doc,0,this.doc.frames);
   this.maskVertical={top:0,bottom:1};
   if(this.channel!=='all')this.setChannel('all',true);
   this.refresh(false);this.drawScratchpad();
   return true;
  }
  return false;
 }
 pasteToScratchpad(){
  if(!clipboard?.frames){this.setStatus('Copy a selection from the project first.');return}
  if(!this.scratchContext){
   const doc=core().create({sampleRate:clipboard.sampleRate,channels:clipboard.channels,label:'Scratchpad'});
   this.scratchContext={doc,nodes:[],activeNode:null,channel:'all',maskVertical:{top:0,bottom:1},bypass:false,lastResult:null,activeParam:null,curveHistory:null};
   this.changeWorkspace('scratch');
   this.setStatus('Copied clipboard into independent Scratchpad PCM.');return;
  }
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  // Existing region stays a region. Only an empty selection means ALL.
  // runEdit performs the visual promotion and uses the canonical core editor.
  this.runEdit('replace');
 }
 scratchAction(type){
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  return this.runEdit(type);
 }
 copyFromScratchpad(){
  if(!this.scratchContext&&this.activeWorkspace!=='scratch'){this.setStatus('Scratchpad is empty.');return}
  if(this.activeWorkspace!=='scratch'&&!this.changeWorkspace('scratch'))return;
  this.runEdit('copy');
  this.setStatus('Scratchpad selection copied · click the upper waveform and Insert or Mix Paste.');
 }
 drawScratchpad(){
  const canvas=this.scratchCanvas;
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#050a14';ctx.fillRect(0,0,w,h);
  const d=this.activeWorkspace==='scratch'?this.doc:this.scratchContext?.doc;
  this.scratchRoot?.setAttribute('data-has-audio',String(!!d));
  if(!d){ctx.fillStyle='#9ca3bb';ctx.font='12px system-ui';ctx.fillText('Copy above → Paste here → edit → Copy → place above',12,43);return}
  // Draw through the already shared stereo waveform renderer's canonical asset contract.
  // Using {channels:...} silently rendered MONO and no waveform.
  // W29/P6: cache the *asset identity*, not the changing selection/document wrapper.
  // drawStereo's existing WeakMap key is an asset object. A new wrapper on each
  // pointer redraw invalidated it even when every PCM frame was identical.
  // Revision AND channel references guard against a revised source (including
  // reloaded sources with reused document IDs). Only one Scratchpad asset is held.
  const prior=this.scratchPeakAsset;
  const samePCM=prior&&prior.revision===d.revision&&prior.frames===d.frames&&
   prior.sampleRate===d.sampleRate&&prior.left===d.channels[0]&&prior.right===(d.channels[1]||null);
  if(!samePCM){
   const asset={channelCount:d.channels.length,leftSamples:d.channels[0],rightSamples:d.channels[1],monoSamples:d.channels[0],sampleRate:d.sampleRate};
   this.scratchPeakAsset={revision:d.revision,frames:d.frames,sampleRate:d.sampleRate,left:d.channels[0],right:d.channels[1]||null,asset};
  }
  drawStereo(ctx,this.scratchPeakAsset.asset,{startSec:0,durationSec:d.frames/Math.max(1,d.sampleRate)},w,h);
  const range=d.selection,from=Math.max(0,Math.min(w,range.start/Math.max(1,d.frames)*w)),to=Math.max(0,Math.min(w,range.end/Math.max(1,d.frames)*w));
  const vertical=(this.activeWorkspace==='scratch'?this.maskVertical:this.scratchContext?.maskVertical)||{top:0,bottom:1};
  const top=vertical.top*h,height=(vertical.bottom-vertical.top)*h;
  if(range.end>range.start){
   ctx.fillStyle='rgba(170,104,237,.26)';ctx.fillRect(from,top,Math.max(1,to-from),height);
   ctx.strokeStyle='#be9ffa';ctx.lineWidth=1.5;ctx.strokeRect(from+.5,top+.5,Math.max(1,to-from-1),Math.max(1,height-1));
  }
  this.scratchInfo&&(this.scratchInfo.textContent=`${(d.frames/d.sampleRate).toFixed(3)} s · ${d.channels.length===2?'Stereo':'Mono'} · ${d.frames} frames`);
 }
 onScratchPointerMove(event){
  if(this.activeWorkspace!=='scratch'||!this.doc){this.scratchCanvas.style.cursor='pointer';return}
  const gesture=this.selectionPointerRegion(event,this.scratchCanvas,this.doc,this.maskVertical,{start:0,end:this.doc.frames});
  this.scratchCanvas.style.cursor=gesture==='move'?'grab':gesture==='resize-left'||gesture==='resize-right'?'ew-resize':'crosshair';
 }
 beginScratchPointer(event){
  if(event.button!==0||!this.scratchContext)return;
  if(!this.changeWorkspace('scratch'))return;
  event.preventDefault();event.stopPropagation();
  const canvas=this.scratchCanvas,rect=canvas.getBoundingClientRect();if(!rect.width)return;
  const full={start:0,end:this.doc.frames},at=e=>Math.round(clamp((e.clientX-rect.left)/rect.width,0,1)*this.doc.frames);
  const mode=this.selectionPointerRegion(event,canvas,this.doc,this.maskVertical,full);
  if(mode==='select'&&this.doc.channels.length===2){
   const y=event.clientY-rect.top,requested=y<rect.height*.25?'L':y>rect.height*.75?'R':'all';
   if(this.channel!==requested)this.setChannel(requested);
  }
  const origin=at(event),prior={...this.doc.selection},vertical={...this.maskVertical},priorChannel=this.channel,id=event.pointerId;
  this.invalidate();
  const redraw=()=>{this.refresh(false);this.drawScratchpad()};
  const move=e=>{
   if(e.pointerId!==id)return;e.stopPropagation();
   if(mode==='move'){
    const span=prior.end-prior.start,shifted=clamp(prior.start+at(e)-origin,0,this.doc.frames-span);
    this.doc=core().setSelection(this.doc,shifted,shifted+span);
   }else if(mode==='resize-left')this.doc=core().setSelection(this.doc,at(e),prior.end);
   else if(mode==='resize-right')this.doc=core().setSelection(this.doc,prior.start,at(e));
   else this.doc=core().setSelection(this.doc,origin,at(e));
   redraw();
  };
  const clear=()=>{root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',finish,true);root.removeEventListener('pointercancel',cancel,true);root.removeEventListener('blur',cancel,true)};
  const finish=e=>{if(e?.pointerId!=null&&e.pointerId!==id)return;move(e);clear()};
  const cancel=e=>{if(e?.pointerId!=null&&e.pointerId!==id)return;clear();this.doc=core().setSelection(this.doc,prior.start,prior.end);this.maskVertical=vertical;if(this.channel!==priorChannel)this.setChannel(priorChannel,true);redraw()};
  root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',finish,true);root.addEventListener('pointercancel',cancel,true);root.addEventListener('blur',cancel,true);
 }
 setChannel(channel,preserveMask=false){
  if(this.doc?.channels.length<2&&channel!=='all')return;
  if(channel!==this.channel){this.lastResult=null;this.abort('choice')}
  this.channel=channel;
  this.syncFxTargetsToSelection();
  if(!preserveMask)this.maskVertical=channel==='L'?{top:0,bottom:.5}:channel==='R'?{top:.5,bottom:1}:{top:0,bottom:1};
  this.channelModes?.querySelectorAll('[data-xwe-channel-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.xweChannelMode===channel)));
  this.syncMixPaneTarget();
  this.options.onViewChange?.();this.setStatus(channel==='all'?'L+R linked · both channels selected.':`Channel ${channel} · editing the ${channel==='L'?'upper':'lower'} waveform.`);
 }
 toggleGoldenMove(event){
  if(!this.overlay||event.button!==0||!this.doc||this.activeWorkspace!=='project')return;
  if(this.selectionPointerRegion(event)!=='move')return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(!this.goldenMoveArmed&&this.nodes.length){this.warnUnappliedFx('Golden Move');return}
  this.goldenMoveArmed=!this.goldenMoveArmed;
  this.goldenGesture=null;
  this.setStatus(this.goldenMoveArmed
    ?'Golden Move armed · drag the top border to move and mix original PCM; double-click again to cancel.'
    :'Golden Move cancelled · purple selection moves normally.');
  this.options.onViewChange?.();
 }
 async applyGoldenMove(sourceRange,destination,channel,targetChannel=channel){
  if(!this.doc||!this.goldenMoveArmed||this.activeWorkspace!=='project')return false;
  if(this.warnUnappliedFx('Golden Move'))return false;
  if(destination===sourceRange.start&&targetChannel===channel)return false;
  try{
   const next=core().edit(this.doc,{type:'moveMix',range:sourceRange,position:destination,channels:channel,targetChannels:targetChannel});
   if(next===this.doc)return false;
   await this.publish(next,'Golden Move & Mix');
   if(targetChannel!==channel&&this.channel!==targetChannel)this.setChannel(targetChannel);
   return true;
  }catch(error){this.setStatus(error.message||String(error));return false}
 }
 beginEditPointer(event){
  if(!this.overlay||event.button!==0||!this.doc)return;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  const target=this.options.detailCanvas,rect=target.getBoundingClientRect();
  if(!rect.width)return;
  // While the Wave Editor is expanded, the existing lower waveform is the edit surface.
  // Closed editor: keep the original P10 donor resize / nested selection gestures.
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  this.cancelEditGesture?.();
  const rate=this.doc.sampleRate,view=this.doc.viewport;
  const at=e=>clamp(Math.round(view.start+clamp((e.clientX-rect.left)/rect.width,0,1)*(view.end-view.start)),0,this.doc.frames);
  const prior={...this.doc.selection};
  const localY=event.clientY-rect.top;
  const stereo=this.doc.channels.length===2,half=rect.height/2;
  const laneTop=stereo&&this.channel==='R'?half:0;
  const laneBottom=stereo&&this.channel!=='all'?laneTop+half:rect.height;
  const viewSpan=Math.max(1,view.end-view.start);
  const px=event.clientX;
  const hasRange=prior.start<prior.end;
  // Same region classifier drives cursor feedback and actual pointer gesture.
  const mode=this.selectionPointerRegion(event);
  // The two native stereo zero-lines are at height/4 and 3*height/4.
  // A fresh range/caret begins in L (above first line), L+R (between
  // lines), or R (below second line), regardless of the previous mode.
  // Edge resize and upper-border move retain their existing lane owner.
  if(mode==='select'&&stereo){
   const requested=localY<rect.height*.25?'L':localY>rect.height*.75?'R':'all';
   if(requested!==this.channel)this.setChannel(requested);
  }
  if(mode!=='move'&&this.goldenMoveArmed){this.goldenMoveArmed=false;this.goldenGesture=null;this.options.onViewChange?.()}
  const golden=mode==='move'&&this.goldenMoveArmed;
  const gesture={start:at(event),clientX:event.clientX,clientY:event.clientY,prior,vertical:{...this.maskVertical},priorChannel:this.channel,pointerId:event.pointerId,active:false,mode,golden};
  if(golden){
   if(this.nodes.length){this.warnUnappliedFx('Golden Move');return}
   this.goldenGesture={sourceStart:prior.start,sourceEnd:prior.end,channels:this.doc.channels,src:this.channel,dest:this.channel};
  }
  // GM02: a single-channel Golden Move retargets by vertical drag, like a fresh mask does:
  // the mask centre above 3/8 = L, 3/8..5/8 = L+R, below 5/8 = R (starting from its own lane).
  const retarget=golden&&stereo&&this.channel!=='all'&&this.goldenGesture;
  this.selectionGestureActive=true;
  /* BAR-METER-LIVE: the Taktometer (and the donor selection) follow the mask WHILE it is dragged, once per frame, as in the import view; before, they jumped at release. A Golden Move keeps its own commit at release. */
  let liveFrame=0;
  const live=()=>{if(golden||liveFrame)return;liveFrame=root.requestAnimationFrame(()=>{liveFrame=0;if(gesture.active)this.applySelection()})};
  const move=e=>{
   if(e.pointerId!==gesture.pointerId)return;
   e.stopPropagation();
   if(!gesture.active&&Math.max(Math.abs(e.clientX-gesture.clientX),Math.abs(e.clientY-gesture.clientY))<4)return;
   if(!gesture.active)this.invalidate();gesture.active=true;
   if(gesture.mode==='move'){
    const span=gesture.prior.end-gesture.prior.start;
    const shifted=clamp(gesture.prior.start+at(e)-gesture.start,0,this.doc.frames-span);
    this.doc=core().setSelection(this.doc,shifted,shifted+span);
    if(retarget){
     const centre=(gesture.priorChannel==='L'?.25:.75)+(e.clientY-gesture.clientY)/Math.max(1,rect.height);
     const dest=centre<.375?'L':centre>.625?'R':'all';
     this.goldenGesture.dest=dest;
     this.maskVertical=dest==='L'?{top:0,bottom:.5}:dest==='R'?{top:.5,bottom:1}:{top:0,bottom:1};
    }
   }else if(gesture.mode==='resize-left'){
    this.doc=core().setSelection(this.doc,at(e),gesture.prior.end);
   }else if(gesture.mode==='resize-right'){
    this.doc=core().setSelection(this.doc,gesture.prior.start,at(e));
   }else this.doc=core().setSelection(this.doc,gesture.start,at(e));
   this.refresh(false);this.options.onViewChange?.();live();
  };
  const clear=()=>{if(liveFrame){root.cancelAnimationFrame(liveFrame);liveFrame=0}root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',up,true);root.removeEventListener('pointercancel',cancel,true);root.removeEventListener('blur',cancel,true);this.cancelEditGesture=null;this.selectionGestureActive=false};
  const up=e=>{if(e.pointerId!==gesture.pointerId)return;e.stopPropagation();clear();
   if(gesture.golden){
    const destination=this.doc.selection.start,dest=this.goldenGesture?.dest||gesture.priorChannel;
    this.doc=core().setSelection(this.doc,gesture.prior.start,gesture.prior.end);
    this.goldenGesture=null;this.maskVertical=gesture.vertical;
    this.refresh(false);this.options.onViewChange?.();
    if(gesture.active&&(destination!==gesture.prior.start||dest!==gesture.priorChannel))void this.applyGoldenMove(gesture.prior,destination,gesture.priorChannel,dest);
    return;
   }
   if(gesture.active)this.applySelection();else if(gesture.mode==='select')this.setCursor(gesture.start);else {this.refresh(false);this.options.onViewChange?.()}
  };
  const cancel=e=>{if(e?.pointerId!=null&&e.pointerId!==gesture.pointerId)return;clear();this.goldenGesture=null;this.doc=core().setSelection(this.doc,gesture.prior.start,gesture.prior.end);this.maskVertical=gesture.vertical;if(this.channel!==gesture.priorChannel)this.setChannel(gesture.priorChannel,true);this.refresh(false);this.options.onViewChange?.()};
  this.cancelEditGesture=cancel;
  root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',up,true);root.addEventListener('pointercancel',cancel,true);root.addEventListener('blur',cancel,true);
 }

 // The visible L/R letters painted by drawStereo are the sole channel controls.
 // Never create a duplicate toolbar control, square badge, or a second pointer overlay.
 waveformChannelHit(event){
  if(!this.overlay||this.doc.channels.length!==2)return null;
  const canvas=event.currentTarget,rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const x=event.clientX-rect.left,y=event.clientY-rect.top,half=rect.height/2;
  const ch=y<25?'L':y>=half&&y<half+25?'R':null;
  if(x<18||x>48||!ch)return null;
  // The blue viewport's left/right resize handles ALWAYS win over channel labels.
  if(canvas===this.options.overviewCanvas){
   const view=this.doc.viewport,scale=rect.width/Math.max(1,this.doc.frames);
   if([view.start,view.end].some(frame=>Math.abs(x-frame*scale)<12))return null;
  }else{
   const view=this.doc.viewport,span=Math.max(1,view.end-view.start);
   if([this.doc.selection.start,this.doc.selection.end].some(frame=>Math.abs(x-(frame-view.start)/span*rect.width)<10))return null;
  }
  return ch;
 }
 handleChannelPointerDown(event){
  if(event.button!==0)return;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  const ch=this.waveformChannelHit(event);
  if(!ch)return;
  event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
  this.setChannel(ch);
 }
 attachLoopMaskResize(){
  const canvas=this.options.detailCanvas;
  canvas.dataset.xweWorkspaceResize='true';
  this.detailResizeMove=e=>{
   const r=canvas.getBoundingClientRect();
   const near=e.clientY>=r.bottom-11&&e.clientY<=r.bottom+3;
   canvas.dataset.xweWorkspaceEdge=String(near);
  };
  this.detailResizeDown=e=>{
   if(e.button!==0)return;
   const r=canvas.getBoundingClientRect();
   if(e.clientY<r.bottom-11||e.clientY>r.bottom+3)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   const initial=canvas.getBoundingClientRect().height,top=e.clientY,id=e.pointerId;
   let scheduled=0,pending=Math.round(initial);
   const queueHeight=y=>{
    pending=Math.round(clamp(initial+(y-top),124,500));
    if(scheduled)return;
    scheduled=root.requestAnimationFrame(()=>{scheduled=0;canvas.style.height=pending+'px'});
   };
   const finish=y=>{
    if(scheduled){root.cancelAnimationFrame(scheduled);scheduled=0}
    pending=Math.round(clamp(initial+(y-top),124,500));
    canvas.style.height=pending+'px';
    // Reallocate the bitmap ONCE at pointer release. Doing this on every
    // pointermove cleared the waveform each time and caused visible flashes.
    const pixels=Math.max(124,Math.round(pending*canvas.width/Math.max(1,r.width)));
    if(canvas.height!==pixels)canvas.height=pixels;
    this.options.onViewChange?.();
   };
   const move=ev=>{if(ev.pointerId===id)queueHeight(ev.clientY)};
   const up=ev=>{if(ev.pointerId!==id)return;finish(ev.clientY);clean()};
   const cancel=()=>{if(scheduled){root.cancelAnimationFrame(scheduled);scheduled=0}clean()};
   const clean=()=>{root.removeEventListener('pointermove',move,true);root.removeEventListener('pointerup',up,true);root.removeEventListener('pointercancel',cancel,true)};
   root.addEventListener('pointermove',move,true);root.addEventListener('pointerup',up,true);root.addEventListener('pointercancel',cancel,true);
  };
  canvas.addEventListener('pointermove',this.detailResizeMove,true);
  canvas.addEventListener('pointerdown',this.detailResizeDown,true);
 }
 onWavePointerMove(event){
  const canvas=event.currentTarget,ch=this.waveformChannelHit(event);
  const old=this.hoverChannelLabel;
  if(ch){
   canvas.dataset.xweHoverHit='channel';
   if(!old||old.canvas!==canvas||old.channel!==ch){this.hoverChannelLabel={canvas,channel:ch};this.options.onViewChange?.()}
   return;
  }
  if(old?.canvas===canvas){this.hoverChannelLabel=null;this.options.onViewChange?.()}
  if(canvas!==this.options.detailCanvas||!this.overlay){delete canvas.dataset.xweHoverHit;return}
  const region=this.selectionPointerRegion(event);
  if(region==='move'||region==='resize-left'||region==='resize-right')canvas.dataset.xweHoverHit=region;
  else delete canvas.dataset.xweHoverHit;
 }
 onWavePointerLeave(event){
  const canvas=event.currentTarget;
  delete canvas.dataset.xweHoverHit;
  if(this.hoverChannelLabel?.canvas===canvas){this.hoverChannelLabel=null;this.options.onViewChange?.()}
 }
 selectionPointerRegion(event,canvas=this.options.detailCanvas,doc=this.doc,mask=this.maskVertical,view=doc?.viewport){
  if(!this.overlay||!doc)return 'select';
  const rect=canvas.getBoundingClientRect();
  const selection=doc.selection;
  if(selection.end<=selection.start)return 'select';
  const y=event.clientY-rect.top,x=event.clientX-rect.left;
  const vertical=mask||{top:0,bottom:1};
  const laneTop=rect.height*vertical.top,laneBottom=rect.height*vertical.bottom;
  if(y<laneTop||y>laneBottom)return 'select';
  const span=Math.max(1,view.end-view.start);
  const left=(selection.start-view.start)/span*rect.width,right=(selection.end-view.start)/span*rect.width;
  if(left>=0&&left<=rect.width&&Math.abs(x-left)<=9)return 'resize-left';
  if(right>=0&&right<=rect.width&&Math.abs(x-right)<=9)return 'resize-right';
  if(x>left&&x<right&&Math.abs(y-laneTop)<=Math.max(5,Math.min(8,rect.height*.07)))return 'move';
  // W17: no bottom edge on the purple mask; resize belongs to the entire
  // Loop Mask waveform's outer lower border (separate workflow).
  return 'select';
 }
 drawEditOverlay(ctx,view,w,h){
  if(!this.overlay||!this.doc||!view?.durationSec)return;
  if(this.activeWorkspace==='scratch')return;
  if(this.doc.markers?.length){
   ctx.save();ctx.fillStyle='rgba(107,241,210,.95)';ctx.strokeStyle='#6bf1d2';ctx.lineWidth=1.5;
   const visibleStart=view.startSec,visibleEnd=view.startSec+view.durationSec;
   for(const frame of this.doc.markers){
    const sec=frame/this.doc.sampleRate;
    if(sec<visibleStart||sec>visibleEnd)continue;
    const mx=Math.round((sec-visibleStart)/view.durationSec*w)+.5;
    ctx.beginPath();ctx.moveTo(mx-5,.5);ctx.lineTo(mx+5,.5);ctx.lineTo(mx,9);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(mx,9);ctx.lineTo(mx,16);ctx.stroke();
   }
   ctx.restore();
  }
  const a=this.doc.selection.start/this.doc.sampleRate,b=this.doc.selection.end/this.doc.sampleRate;
  if(b<view.startSec||a>view.startSec+view.durationSec)return;
  const x=clamp((a-view.startSec)/view.durationSec*w,0,w),end=clamp((b-view.startSec)/view.durationSec*w,0,w);
  const stereo=this.doc.channels.length===2;
  const vertical=this.maskVertical||{top:0,bottom:1};
  const y=h*vertical.top,laneH=h*(vertical.bottom-vertical.top);
  ctx.save();ctx.lineWidth=1;
  if(a===b){ctx.lineWidth=1.35;ctx.strokeStyle='#fbbf24';ctx.beginPath();ctx.moveTo(Math.round(x)+.5,y);ctx.lineTo(Math.round(x)+.5,y+laneH);ctx.stroke()}
  else{
   ctx.fillStyle='rgba(168,85,247,.16)';ctx.fillRect(x,y,end-x,laneH);
   if(this.goldenMoveArmed){
    // The actual edited PCM is unchanged during drag; draw a light ghost
    // from source samples, sampled at a bounded per-pixel cost.
    const ghost=this.goldenGesture;
    if(ghost&&this.selectionGestureActive){
     const frames=ghost.sourceEnd-ghost.sourceStart;
     const columns=Math.min(1200,Math.max(1,Math.round(end-x)));
     const idx=v=>v==='all'?ghost.channels.map((_,i)=>i):[v==='R'?1:0];
     const from=idx(ghost.src||this.channel),to=idx(ghost.dest||this.channel);
     const stereoLanes=ghost.channels.length===2&&to.length===2;
     ctx.fillStyle='rgba(255,215,90,.78)';
     for(let k=0;k<to.length;k++){
      const c=from.length===to.length?from[k]:from[0];
      const cy=y+laneH*(stereoLanes?(k===0?.25:.75):.5);
      const hh=laneH*(stereoLanes?.24:.46);
      const channel=ghost.channels[c];
      for(let col=0;col<columns;col++){
       const lo=Math.floor(frames*col/columns),hi=Math.max(lo+1,Math.ceil(frames*(col+1)/columns));
       let min=0,max=0;
       for(let j=lo;j<hi;j+=Math.max(1,Math.floor((hi-lo)/8))){const v=channel[ghost.sourceStart+j]||0;min=Math.min(min,v);max=Math.max(max,v)}
       const top=cy-Math.min(1,max)*hh,btm=cy-Math.max(-1,min)*hh;
       ctx.fillRect(x+col*(end-x)/columns,top,Math.max(.7,(end-x)/columns),Math.max(1,btm-top));
      }
     }
    }
   }
   ctx.strokeStyle=this.goldenMoveArmed?'#f6c453':'rgba(192,132,252,.85)';
   ctx.lineWidth=this.goldenMoveArmed?2.2:1;
   ctx.strokeRect(x+.5,y+.5,Math.max(1,end-x-1),Math.max(1,laneH-1));
  }
  ctx.restore();
 }


 update(options){
  this.options=options;
  if(!options.source)return;
  let fresh=false;
  if(this.source?.sourceAsset!==options.source.sourceAsset){
   if(this.committedAsset!==options.source.sourceAsset){
    this.abort();if(this.goldenGesture)this.cancelEditGesture?.();this.goldenMoveArmed=false;this.goldenGesture=null;
    this.doc=core().create(options.source,{selection:options.selection,viewport:options.selection?.detailViewport});
    this.scratchContext=null;this.projectContext=null;this.activeWorkspace='project';this.triangleZeroSource=null;
    this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;this.lastResult=null;fresh=true;
    this.stopBluePan();
  if(this.doc.restoreWarning)this.setStatus(this.doc.restoreWarning);
   }
   this.source=options.source;
  }
  let activeSelectionChanged=false;
  if(this.doc&&options.selection){
   // P2: the parent Import Audio navigator is a separate selection owner.
   // When Scratchpad is active, update the dormant *project* document instead
   // of erroneously moving the independent scratch selection.
   const context=this.activeWorkspace==='scratch'&&this.projectContext?this.projectContext:null;
   const owner=context||this;
   const rate=owner.doc.sampleRate,range=options.selection.fineLoopRange,view=options.selection.detailViewport;
   const rangeChanged=range&&(fresh||!this.incomingRange||range.startSec!==this.incomingRange.startSec||range.durationSec!==this.incomingRange.durationSec);
   const viewChanged=view&&(fresh||!this.incomingViewport||view.startSec!==this.incomingViewport.startSec||view.durationSec!==this.incomingViewport.durationSec);
   // Record the parent's new values before requesting any UI refresh: a
   // synchronous React rerender must not see the same update as new again.
   const outgoingEcho=!!(range&&this.pendingOutgoingRange&&range.startSec===this.pendingOutgoingRange.startSec&&range.durationSec===this.pendingOutgoingRange.durationSec);
   if(range){this.incomingRange={startSec:range.startSec,durationSec:range.durationSec};if(outgoingEcho)this.pendingOutgoingRange=null;}
   if(view)this.incomingViewport={startSec:view.startSec,durationSec:view.durationSec};
   // Do not overwrite a live pointer gesture or the editor's local caret with
   // an echo of the last outgoing parent selection.
   if(rangeChanged&&!this.selectionGestureActive&&!outgoingEcho){
    this.goldenMoveArmed=false;this.goldenGesture=null;
    const previous=owner.doc.selection;
    const selected=core().setSelection(owner.doc,Math.round(range.startSec*rate),Math.round((range.startSec+range.durationSec)*rate));
    if(selected.selection.start!==previous.start||selected.selection.end!==previous.end){
     owner.doc=selected;
     if(!context){activeSelectionChanged=true;this.invalidate();if(this.audioNode)this.stopAudio();} // stale preview must not keep playing
     else context.lastResult=null;
     this.syncFxTargetsToSelection(context);
     if(!context&&this.nodes.length&&this.curveHint&&selected.selection.end<=selected.selection.start){
      this.curveHint.textContent='No active time range · select a purple region before Preview FX or Apply.';
     }
    }
   }
   if(viewChanged&&core().setViewport)owner.doc=core().setViewport(owner.doc,Math.round(view.startSec*rate),Math.round((view.startSec+view.durationSec)*rate));
  }
  if(this.overlay){
   this.refresh(false);
   if(activeSelectionChanged&&this.nodes.length){
    this.drawParameters();
    if(this.doc.selection.end<=this.doc.selection.start&&this.curveHint)
     this.curveHint.textContent='No active time range · select a purple region before Preview FX or Apply.';
   }
  }
 }

 dispose(){this.stopBluePan();root.removeEventListener('blur',this.bluePanStopOnBlur);document.removeEventListener('visibilitychange',this.bluePanStopOnVisibility);this.scratchPeakAsset=null;this.clearP5Warning();this.eqUnsubscribe?.();this.releaseOfflineEQState();this.closeMixPane();this.abort();this.stopAudio();this.close();this.closeMenu();this.cancelEditGesture?.();this.launch?.remove();for(const canvas of [this.options.overviewCanvas,this.options.detailCanvas])if(canvas){canvas.removeEventListener('pointerdown',this.channelPointerDown,true);canvas.removeEventListener('pointermove',this.hoverPointerMove,true);canvas.removeEventListener('pointerleave',this.hoverPointerLeave,true);canvasOwners.delete(canvas);delete canvas.dataset.xweHoverHit}
 this.options.detailCanvas.removeEventListener('pointerdown',this.editPointerDown,true);this.options.detailCanvas.removeEventListener('dblclick',this.goldenDoubleClick,true);this.options.detailCanvas.removeEventListener('pointermove',this.detailResizeMove,true);this.options.detailCanvas.removeEventListener('pointerdown',this.detailResizeDown,true);this.options.detailCanvas.removeEventListener('contextmenu',this.context);this.options.overviewCanvas?.removeEventListener('contextmenu',this.context);this.listenKeys(false)}
 /* FORGE-SLEEP-01: the editor's document listeners exist only while the Forge is the shown room. Parked (another room shown) it owns no key and no pointer: Backspace = octave hold in the Live Room, Delete/Backspace in Nodal/Multitrack belong to those rooms */
 listenKeys(on){on=!!on;if(this.keysOn===on)return;this.keysOn=on;const m=on?'addEventListener':'removeEventListener';document[m]('keydown',this.key,true);document[m]('pointerdown',this.keyZone,true)}
 setAwake(on){this.listenKeys(on);if(on)return;this.pointerOwnsKeys=false;this.cancelEditGesture?.();this.closeMenu();this.closeMixPane();this.stopBluePan();if(this.audioNode)this.stopAudio()}
 setStatus(text){this.clearP5Warning();this.status=text;if(this.statusElement)this.statusElement.textContent=text}
 clearP5Warning(){if(this.p5WarningTimer!=null){root.clearTimeout(this.p5WarningTimer);this.p5WarningTimer=null}this.statusElement?.classList.remove('xwe-p5-warning')}
 warnUnappliedFx(operation='Audio edit'){
  if(!this.nodes?.length)return false;
  this.setStatus(`${operation} not applied · ${this.nodes.length} unapplied effect stage(s) preserved. Use Apply / Bake, or remove the stages (×) first.`);
  // W12 uses an invisible ARIA status. Only a blocked action needs brief visible feedback.
  if(this.statusElement){this.statusElement.classList.add('xwe-p5-warning');this.p5WarningTimer=root.setTimeout(()=>this.clearP5Warning(),5000)}
  return true;
 }
 setEnabled(value){this.enabled=value;this.options.onViewChange?.();this.launch?.setAttribute('aria-pressed',String(value))}
 range(){return {...this.doc.selection}}
 target(){return this.channel==='all'?'all':this.channel}
 // Keep every unapplied chain stage attached to the SINGLE visible purple range.
 // Morph automation is stored in absolute frames, so rebase it relatively whenever
 // the range moves/resizes; all stages and L/R ownership move together.
 syncFxTargetsToSelection(context=null){
  const owner=context||this,doc=owner.doc,nodes=owner.nodes;
  if(!doc||!nodes?.length)return false;
  const target={...doc.selection},channels=owner.channel==='all'?'all':owner.channel;
  if(!(target.end>target.start))return false; // A caret is not a valid FX range.
  let changed=false;
  for(const node of nodes){
   const old=node.targetRange||target;
   if(old.start===target.start&&old.end===target.end&&node.channels===channels)continue;
   const oldSpan=Math.max(1,old.end-old.start-1),newSpan=Math.max(1,target.end-target.start-1);
   if(old.start!==target.start||old.end!==target.end){
    const remap=points=>points.map(point=>({...point,frame:Math.round(target.start+clamp((point.frame-old.start)/oldSpan,0,1)*newSpan)}));
    for(const lane of Object.values(node.automation||{})){
     if(Array.isArray(lane?.points))lane.points=remap(lane.points);
    }
    // Undo snapshots are absolute too. Otherwise a later Morph Undo resurrects
    // automation from the old, now invisible location.
    for(const history of owner.curveHistory||[]){
     if(history.id===node.id&&Array.isArray(history.lane?.points))history.lane.points=remap(history.lane.points);
    }
   }
   node.targetRange={...target};node.channels=channels;changed=true;
  }
  if(changed&&!context){this.invalidate();this.requestMorphRefresh()}
  return changed;
 }
 // A cursor-only selection used to silently create a zero-frame FX stage
 // (and therefore no Morph). Honor the whole-audio default visibly.
 ensureEffectSelection(){
  if(!this.doc||this.doc.selection.end>this.doc.selection.start)return;
  this.doc=core().setSelection(this.doc,0,this.doc.frames);
  this.applySelection();this.refresh(false);
  this.setStatus('No range selected · the entire audio is now selected for the effect.');
 }
 abort(reason='replace'){
  this.renderToken++;
  const controller=this.controller;
  const job=this.computeJob;
  this.controller=null;
  if(controller&&!controller.signal.aborted)controller.abort();
  if(job)this.finishComputeFeedback(job.token,reason==='choice'||reason==='manual');
 }
 beginComputeFeedback(token){
  this.clearComputeNotice();
  const job={token,startedAt:root.performance.now(),showTimer:null,longTimer:null};
  this.computeJob=job;
  if(this.computeStrip){this.computeStrip.hidden=true;this.progressElement.hidden=false;this.progressElement.removeAttribute('value');this.computeCancel.hidden=true;this.computeMessage.textContent='Processing…';}
  job.showTimer=root.setTimeout(()=>{
   if(this.computeJob!==job||!this.controller||this.controller.signal.aborted)return;
   this.computeStrip.hidden=false;
  },700);
  job.longTimer=root.setTimeout(()=>{
   if(this.computeJob!==job||!this.controller||this.controller.signal.aborted)return;
   this.computeStrip.hidden=false;this.computeCancel.hidden=false;
  },20000);
 }
 clearComputeNotice(){
  if(this.computeNoticeTimer!=null){root.clearTimeout(this.computeNoticeTimer);this.computeNoticeTimer=null;}
 }
 finishComputeFeedback(token,interrupted=false){
  const job=this.computeJob;
  if(!job||job.token!==token)return;
  root.clearTimeout(job.showTimer);root.clearTimeout(job.longTimer);
  this.computeJob=null;
  if(!this.computeStrip)return;
  this.computeCancel.hidden=true;
  // Don't flash for subsecond invisible work; explicitly stopping stale long work
  // is shown briefly, without adding a permanent button or shifting the panel.
  if(interrupted&&(root.performance.now()-job.startedAt>=600||!this.computeStrip.hidden)){
   this.computeStrip.hidden=false;this.progressElement.hidden=true;
   this.computeMessage.textContent='Interrupted';
   this.clearComputeNotice();
   this.computeNoticeTimer=root.setTimeout(()=>{if(!this.computeJob&&this.computeStrip){this.computeStrip.hidden=true;this.progressElement.hidden=false;}this.computeNoticeTimer=null;},1450);
  }else{this.computeStrip.hidden=true;this.progressElement.hidden=false;}
 }
 async publish(next,message,{consumeChain=false}={}){
  if(!next)return false;
  if(next===this.doc){this.setStatus('Nothing changed.');return false;}
  if(this.nodes.length&&!consumeChain)return !this.warnUnappliedFx(message||'Audio edit');
  if(this.activeWorkspace==='scratch'){
   this.retainExpandedScratchHeight();
   this.abort();this.doc=next;this.lastResult=null;this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;
   this.scratchContext=this.workspaceSnapshot();this.refresh();this.drawScratchpad();
   this.setStatus(message+' · Scratchpad only · revision '+next.revision);return;
  }
  this.goldenMoveArmed=false;this.goldenGesture=null;this.abort();this.doc=next;
  if(next.channels.length===1&&this.channel==='R')this.channel='all';
  this.lastResult=null;this.releaseOfflineEQState();this.nodes=[];this.activeNode=null;
  const result=core().materialize(next,this.source);
  if(next.selection.start===next.selection.end&&result.selection?.fineLoopRange){
   const prior=this.options.selection?.fineLoopRange;
   // The Wave caret is local. Loop/Donor consumers must not receive a zero-duration region.
   const sr=next.sampleRate,min=next.frames?1/sr:0;
   const originalFrames=Math.round((prior?.durationSec||min)*sr);
   const length=Math.min(next.frames,Math.max(next.frames?1:0,originalFrames));
   const start=Math.min(Math.max(0,next.frames-length),Math.round((prior?.startSec||0)*sr));
   result.selection.fineLoopRange={startSec:start/sr,durationSec:length/sr};
   this.pendingOutgoingRange={...result.selection.fineLoopRange};
  }
  this.committedAsset=result.source.sourceAsset;this.source=result.source;
  if(!this.triangleGainPending){this.triangleZeroSource=null;globalThis.__XenForgeRawGain?.resetEditorGain()}
  globalThis.__XenForgeRawGain?.rebindCommitted(result.source);
  this.options.onCommit(result);
  this.options.onViewChange?.();
  this.drawScratchpad();this.setStatus(message+' · revision '+next.revision+(next.history.lastWarning?' · '+next.history.lastWarning:''));
  this.refresh();
 }

 async applyTriangleGain(next,prior){
  if(!this.overlay||this.activeWorkspace!=='project'||!this.doc)return false;
  if(this.warnUnappliedFx('Triangle Gain'))return false;
  if(!Number.isFinite(next)||next<0||next>4||!Number.isFinite(prior)||prior<0||prior>4)return false;
  if(next===prior)return true;
  const current=this.doc;
  let reference=current,factor;
  if(prior===0){
   const zero=this.triangleZeroSource;
   if(!zero||zero.doc.frames!==current.frames||zero.doc.channels.length!==current.channels.length){
    this.setStatus('Gain from mute needs an unchanged audio document; Undo restores the earlier audio.');return false;
   }
   reference=zero.doc;factor=next/zero.gain;
  }else{
   factor=next/prior;
   if(next===0)this.triangleZeroSource={doc:current,gain:prior};
  }
  try{
   // Compute from frozen source channels, then publish one atomic render. Never
   // modify the clipboard or rescale later Insert / Mix Paste operations.
   const channels=reference.channels.map(input=>{
    const output=new Float32Array(input.length);
    for(let i=0;i<input.length;i++){
     const sample=input[i]*factor;
     if(!Number.isFinite(sample)||Math.abs(sample)>3.4028234663852886e38)
       throw Error('Gain would exceed the supported Float32 amplitude; audio unchanged.');
     output[i]=sample;
    }
    return output;
   });
   const result={documentId:current.id,revision:current.revision,
     channels,sampleRate:current.sampleRate,selection:{...current.selection}};
   const edited=core().commitRender(current,result);
   if(edited===current)return true;
   this.triangleGainPending=true;
   try{await this.publish(edited,'Triangle Gain '+(next===0?'mute':(20*Math.log10(next)).toFixed(1)+' dB'))}
   finally{this.triangleGainPending=false}
   if(prior===0||next>0)this.triangleZeroSource=null;
   return true;
  }catch(error){
   if(next===0)this.triangleZeroSource=null;
   this.setStatus(error.message||String(error));return false;
  }
 }

 async runEdit(type,extra={}){try{if(!this.doc)return;
  // P5: no destructive edit, document undo or redo may silently clear a draft FX chain.
  // Copy/navigation and the separate Morph-curve undo remain independent.
  if(type!=='copy'&&this.nodes.length){
   if(type==='undo'&&!this.doc.history.past.length)return;
   if(type==='redo'&&!this.doc.history.future.length)return;
   this.warnUnappliedFx(this.operationLabel(type));return;
  }
  const autoWhole=this.activeWorkspace==='scratch'&&!['undo','redo'].includes(type)?this.ensureScratchSelection():false;
  if(type==='copy'){clipboard=core().copy(this.doc,this.range(),this.target());this.setStatus(`${clipboard.frames} frames copied across ${clipboard.channels.length} channel(s).`);return}if(type==='undo'||type==='redo'){if(!(type==='undo'?this.doc.history.past.length:this.doc.history.future.length))return;await this.publish(core()[type](this.doc),type==='undo'?'Edit undone':'Edit redone');return}const selection=this.range();const op={type:type==='insert'&&selection.start<selection.end?'replace':type,range:selection,channels:this.target(),...extra};if(['insert','overwrite','replace','mix'].includes(type)){if(!clipboard?.frames)throw Error('Copy an audio selection first.');op.clipboard=clipboard}if(type==='cut')clipboard=core().copy(this.doc,this.range(),this.target());if(type==='insertSilence'){op.frames=Math.max(1,Math.round(Number(this.silenceInput?.value||1)*this.doc.sampleRate));op.durationFrames=op.frames;op.durationSec=op.frames/this.doc.sampleRate}if(type==='gain')op.db=Number.isFinite(extra.db)?extra.db:Number(this.gainInput?.value||0);if(type==='normalize')op.targetDb=-1;if(type==='mix'){op.limitToSelection=true;op.existingGain=1;op.insertGain=1;op.crossfadeFrames=0;op.clip=false}await this.publish(core().edit(this.doc,op),this.operationLabel(type)+' applied');
  if(this.activeWorkspace==='scratch'&&this.doc?.frames>0&&type!=='cut'&&autoWhole){
   // A whole-pad action stays visibly whole; never expand a deliberate subset.
   this.doc=core().setSelection(this.doc,0,this.doc.frames);
   this.refresh(false);this.drawScratchpad();
  }
 }catch(error){this.setStatus(error.message||String(error))}}
 operationLabel(type){return({copy:'Copy',cut:'Cut',insert:'Insert',overwrite:'Overwrite',replace:'Replace Selection',mix:'Mix Paste',delete:'Ripple Delete',trim:'Trim to Selection',silence:'Mute Selection',reverse:'Reverse',invert:'Invert Polarity',normalize:'Normalize −1 dB',dcRemove:'Remove DC',gain:'Amplify',fadeIn:'Fade-in',fadeOut:'Fade-out',insertSilence:'Insert Silence',split:'Add Split Marker',toMono:'Convert to Mono',toStereo:'Convert to Stereo',undo:'Undo',redo:'Redo'})[type]||type}
 contextMenu(event){
  if(!this.doc)return;
  const surface=event.currentTarget;
  const scratch=surface===this.scratchCanvas;
  if(scratch){if(this.activeWorkspace!=='scratch')this.changeWorkspace('scratch')}
  else if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  if(!scratch&&surface!==this.options.overviewCanvas&&surface!==this.options.detailCanvas)return;
  const bounds=surface.getBoundingClientRect();
  if(!bounds.width)return;
  const sec=this.doc.sampleRate,full={start:0,end:this.doc.frames},zoom=this.doc.viewport;
  const display=scratch?full:surface===this.options.overviewCanvas?full:zoom;
  const fraction=clamp((event.clientX-bounds.left)/bounds.width,0,1);
  const at=clamp(Math.round(display.start+fraction*(display.end-display.start)),0,this.doc.frames);
  event.preventDefault();event.stopPropagation();
  // Scratch context preserves empty selection: choosing a command will visibly
  // promote the entire pad. The project keeps its original caret semantics.
  if(!scratch&&(at<this.doc.selection.start||at>this.doc.selection.end||this.doc.selection.start===this.doc.selection.end)){
   this.invalidate();this.doc=core().setSelection(this.doc,at,at);
   this.refresh(false);this.options.onViewChange?.();
  }
  this.contextTarget=surface;
  // A context menu is NOT an opened Wave Editor. The Import Audio owner
  // must continue drawing the purple mask until the editor is actually mounted.
  if(this.overlay)this.setEnabled(true);
  this.menuX=event.clientX;this.menuY=event.clientY;
  this.menuPage('root');
 }

 closeMenu(){this.menu?.remove();this.menu=null;if(this.menuOutside)document.removeEventListener('pointerdown',this.menuOutside,true);if(this.menuKey)document.removeEventListener('keydown',this.menuKey,true)}
 menuPage(page){this.closeMenu();const menu=$('div',{class:'xwe-menu',role:'menu','aria-label':'Wave Editor Context Menu'});this.menu=menu;const row=(label,action)=>menu.append(button(label,()=>{this.closeMenu();action()},{role:'menuitem'}));if(page!=='root')row('‹ Back',()=>this.menuPage('root'));menu.append($('div',{class:'xwe-menu-title'},page==='root'?'Wave Editor · Selection':page));if(page==='root'){row('Open Editor & Effect Chain',()=>this.open());row('Edit ›',()=>this.menuPage('Edit'));for(const c of [...new Set(selectableEffects().map(category))])if(c!=='Stereo & Channels')row(c+' ›',()=>this.menuPage(c));row('Stereo & Channels ›',()=>this.menuPage('Stereo & Channels'));row('Analyze · Peaks / RMS / Loudness',()=>{this.open();this.analyze()});row('Export WAV',()=>{this.open();this.downloadWav()})}else if(page==='Edit'){for(const key of ['undo','redo','copy','cut','insert','overwrite','mix','delete','trim','split','insertSilence','silence','reverse','invert','normalize','dcRemove'])row(this.operationLabel(key),()=>{if(key==='insertSilence'){this.open();this.runEdit('insertSilence')}else if(key==='mix'){this.open();this.openMixPane()}else this.runEdit(key)});row('Envelope',()=>this.openVolumeEnvelope())}else if(page==='Stereo & Channels'){row('Both Channels Linked',()=>{this.open();this.setChannel('all')});row('Edit L Only',()=>{this.open();this.setChannel('L')});if(this.doc.channels.length>1)row('Edit R Only',()=>{this.open();this.setChannel('R')});row('Convert to Mono',()=>this.runEdit('toMono'));row('Convert to Stereo',()=>this.runEdit('toStereo'));for(const effect of selectableEffects().filter(x=>category(x)===page))row(displayEffect(effect),()=>{this.open();this.addNode(effect.type)})}else for(const effect of selectableEffects().filter(x=>category(x)===page))row(displayEffect(effect),()=>{this.open();this.addNode(effect.type)});document.body.append(menu);const box=menu.getBoundingClientRect();menu.style.left=clamp(this.menuX,8,Math.max(8,innerWidth-box.width-8))+'px';menu.style.top=clamp(this.menuY,8,Math.max(8,innerHeight-box.height-8))+'px';this.menuOutside=e=>{if(!menu.contains(e.target))this.closeMenu()};this.menuKey=e=>{const items=[...menu.querySelectorAll('button')],index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();this.closeMenu();this.contextTarget?.focus?.()}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}if(e.key==='ArrowLeft'&&page!=='root'){e.preventDefault();this.menuPage('root')}};document.addEventListener('pointerdown',this.menuOutside,true);document.addEventListener('keydown',this.menuKey,true);menu.querySelector('button')?.focus()}
 open(){
  if(!this.doc)return;
  this.closeMenu();
  if(this.overlay){this.dialog.querySelector('button')?.focus({preventScroll:true});return}
  const region=this.options.detailCanvas.closest('[data-material-intake-gateway="true"]')||document;
  const host=region.querySelector('[data-xwe-inline-slot="true"]');
  if(!host){this.setEnabled(false);this.setStatus('Wave Editor mount point not found next to the material timeline.');return}
  this.setEnabled(true);
  this.previousFocus=document.activeElement;
  this.overlay=$('div',{class:'xwe-inline','data-xwe-editor':'open'});
  this.dialog=$('section',{class:'xwe-dialog',role:'region','aria-label':'XenSonar Stereo Wave Editor'});
  this.overlay.append(this.dialog);host.append(this.overlay);
  this.build();globalThis.__XenForgeRawGain?.setMode('gain',this);this.refresh();
  root.dispatchEvent(new CustomEvent('xensonar:wave-editor-visibility',{detail:{open:true}}));
  this.dialog.querySelector('button')?.focus({preventScroll:true});
 }
 close(){
  if(globalThis.__XenMultitrackRoundTrip?.bound(this)){globalThis.__XenMultitrackRoundTrip.cancel('Wave Editor closed without applying the linked Multitrack edit.');window.dispatchEvent(new CustomEvent('xensonar:multitrack:roundtrip-navigate',{detail:{room:'MULTITRACK'}}));}
   this.goldenMoveArmed=false;this.goldenGesture=null;this.stopBluePan();this.clearP5Warning();this.abort();this.tonalAbort?.abort();this.stopAudio();this.cancelEditGesture?.();this.closeMixPane();
  const wasOpen=!!this.overlay;
  if(this.activeWorkspace==='scratch')this.changeWorkspace('project');
  this.overlay?.remove();this.overlay=null;this.dialog=null;for(const canvas of [this.options.overviewCanvas,this.options.detailCanvas])if(canvas)delete canvas.dataset.xweHoverHit;this.hoverChannelLabel=null;
  if(wasOpen)root.dispatchEvent(new CustomEvent('xensonar:wave-editor-visibility',{detail:{open:false}}));
  if(wasOpen){globalThis.__XenForgeRawGain?.setMode('volume');this.setEnabled(false);this.previousFocus?.focus?.({preventScroll:true})}
 }

 closeMixPane(){this.mixPopover?.remove();this.mixPopover=null}
 // Mix Paste has no independent target snapshot: the Wave Editor document and
 // channel owner remain authoritative while the popup is open.
 syncMixPaneTarget(){
  const pane=this.mixPopover,doc=this.doc;
  if(!pane||!doc)return;
  const selected=doc.channels.length===1?'all':this.channel;
  for(const input of pane.querySelectorAll('[data-xwe-mix-channel]')){
   const ch=input.dataset.xweMixChannel;
   input.disabled=doc.channels.length===1?ch==='R':selected!=='all'&&selected!==ch;
  }
  const target=pane.querySelector('[data-xwe-mix-target]');
  if(target){
   const {start,end}=doc.selection;
   const lane=doc.channels.length===1?'Mono':selected==='all'?'L+R':selected;
   const location=start===end?`caret at frame ${start}`:`selection ${start}–${end}`;
   const label=`Target: ${lane} · ${location} · ${fmt(start/doc.sampleRate,6)} s`;
   if(target.textContent!==label)target.textContent=label;
  }
 }
 openMixPane(){
  if(!this.doc)return;
  if(this.warnUnappliedFx('Mix Paste'))return;
  if(!this.overlay){this.open();if(!this.overlay)return}
  this.closeMixPane();
  if(!clipboard){this.setStatus('Mix Paste: copy audio first.');return}
  const pane=$('div',{class:'xwe-mix-popup',role:'dialog','aria-label':'Mix Paste – Stereo','data-xwe-mix-dialog':'true'});
  this.mixPopover=pane;
  pane.append($('h3',{},'Mix Paste · Added Audio'),$('p',{class:'xwe-small'},'7% added = 0.07× the clipboard signal. Existing audio stays at 100% unless you change it below.'));
  // Accessible confirmation of the live editor target; never an error or lock.
  pane.append($('p',{class:'xwe-small','data-xwe-mix-target':'true'}));
  const fields=$('div',{class:'xwe-mix-fields'}),values=this.mixPrefs||{existingL:100,insertL:100,existingR:100,insertR:100};
  const inputs={};
  for(const [key,label,ch] of [['insertL','Added audio L (%)','L'],['insertR','Added audio R (%)','R'],['existingL','Existing audio L (%)','L'],['existingR','Existing audio R (%)','R']]){
   const row=$('label',{class:'xwe-mix-field'},label);
   const input=$('input',{type:'number',min:0,max:400,step:1,'aria-label':label,'data-xwe-mix-channel':ch});
   input.value=String(values[key]);
   row.append(input);fields.append(row);inputs[key]=input;
  }
  const linkRow=$('label',{class:'xwe-mix-link'},'Link added L/R levels');
  const link=$('input',{type:'checkbox','aria-label':'Link added L/R levels'});
  link.checked=this.mixLinkChannels!==false;
  linkRow.prepend(link);
  link.addEventListener('change',()=>{
   if(!link.checked)return;
   const from=this.channel==='R'?'insertR':'insertL',to=from==='insertR'?'insertL':'insertR';
   inputs[to].value=inputs[from].value;
  });
  for(const [which,other] of [['insertL','insertR'],['insertR','insertL']]){
   inputs[which].addEventListener('input',()=>{if(link.checked)inputs[other].value=inputs[which].value});
  }
  pane.append(fields,linkRow);
  const actions=$('div',{class:'xwe-mix-actions'});
  actions.append(button('Cancel',()=>this.closeMixPane()),button('Mix',()=>{
   const next={};
   for(const [key,input] of Object.entries(inputs)){
    const n=Number(input.value);
    if(!Number.isFinite(n)||n<0||n>400){input.focus();this.setStatus('Mix Paste: enter percentages from 0 to 400.');return}
    next[key]=n;
   }
   this.mixPrefs=next;this.mixLinkChannels=link.checked;this.closeMixPane();
   this.runEdit('mix',{existingGainPerChannel:[next.existingL/100,next.existingR/100],insertGainPerChannel:[next.insertL/100,next.insertR/100]});
  },{class:'xwe-primary'}));
  pane.append(actions);this.dialog.append(pane);
  this.syncMixPaneTarget();
  const btn=this.dialog.querySelector('[data-xwe-mix-trigger]');
  const rect=btn?.getBoundingClientRect()||this.dialog.getBoundingClientRect(),box=pane.getBoundingClientRect();
  pane.style.left=clamp(rect.left,8,Math.max(8,innerWidth-box.width-8))+'px';
  pane.style.top=clamp(rect.bottom+5,8,Math.max(8,innerHeight-box.height-8))+'px';
  inputs.existingL?.focus({preventScroll:true});
 }

 build(){const dialog=this.dialog;dialog.replaceChildren();const head=$('header',{class:'xwe-head'}),title=$('div',{class:'xwe-title-with-channels'});title.append($('h2',{},'Wave Editor'));
 this.channelConvertButton=button(this.doc?.channels?.length===1?'Mono':'Stereo',()=>{
  if(this.doc?.channels.length===1)void this.runEdit('toStereo');
 },{'data-xwe-mono-stereo-toggle':'true','aria-label':this.doc?.channels?.length===1?'Convert Mono to Stereo':'Stereo source',title:'Mono: click to convert to stereo · Stereo: source already has two channels'});
 title.append(this.channelConvertButton);
 const actions=$('div',{class:'xwe-header-workflow'}),headActions=$('div',{class:'xwe-head-actions'});
 this.statusElement=$('output',{class:'xwe-status xwe-sr-only','aria-live':'polite'},this.status);
 this.progressElement=$('progress',{class:'xwe-progress',max:1});
 this.computeMessage=$('span',{class:'xwe-compute-message'},'Processing…');
 this.computeCancel=button('×',()=>{this.abort('manual');this.setStatus('Processing interrupted.')},{'aria-label':'Cancel long-running process',title:'Cancel this long-running job only',class:'xwe-compute-cancel',hidden:true});
 this.computeStrip=$('div',{class:'xwe-compute-strip','data-xwe-compute-status':'true',hidden:true});
 this.computeStrip.append(this.computeMessage,this.progressElement,this.computeCancel);
 this.previewButton=button('▶ Preview FX',()=>this.preview('chain'));
 this.applyButton=button('Apply / Bake',()=>this.applyChain(),{class:'xwe-primary'});
 this.undoApplyButton=button('↶ Undo',()=>this.undoDocument(),{'aria-label':'Undo',title:'Undo the last audio edit or applied effect · Ctrl+Z',class:'xwe-apply-undo'});
 this.formatSelect=$('select',{'aria-label':'WAV Format'});
 this.formatSelect.append($('option',{value:'float32'},'WAV Float32'),$('option',{value:'pcm24'},'WAV PCM24'),$('option',{value:'pcm16'},'WAV PCM16 (dither)'));this.formatSelect.title='Export format: 32-bit float (lossless, keeps levels above 0 dBFS), 24-bit PCM, or 16-bit PCM with TPDF dither';
 this.previewTargetButton=button('B · Project',()=>this.preview('document'));
 actions.append(this.buildBlueViewControls(),button('A · Original',()=>this.preview('original')),this.previewTargetButton,this.previewButton,this.applyButton,this.undoApplyButton,this.formatSelect,button('WAV ↓',()=>this.downloadWav()));
 this.playButton=button('▶ Play',()=>this.playSelection(),{'aria-label':'Play Audio','aria-pressed':'false',title:'Play the selection · from caret to project end when no range is selected'});
 /* WAVE-LOOP-01: a second trigger for the big PLAY (Preview Loop) of the Forge panel: no new playback engine; '▶ Play' stays "once", '▶ Loop' = loop */
 this.loopButton=button('▶ Loop',()=>{if(this.audioNode)this.stopAudio();this.options.onLoopPlay?.()},{'aria-label':'Loop Audio','aria-pressed':'false',title:'Play the loop mask round and round (the same as the big PLAY below) · click again to stop'});
 headActions.append(this.playButton,this.loopButton,button('Close ×',()=>this.close()));
 head.append(title,actions,headActions,this.statusElement,this.computeStrip);dialog.append(head);
 const tool=$('div',{class:'xwe-toolbar'});this.redoButton=button('↷ Redo',()=>this.runEdit('redo'),{'data-xwe-document-redo':'true',title:'Redo · Ctrl+Shift+Z'});tool.append(this.redoButton);
 this.channelModes=$('div',{class:'xwe-channel-modes',role:'group','aria-label':'Channel Selection'});
 for(const [value,label] of [['L','L'],['R','R'],['all','L+R · Both']])this.channelModes.append(button(label,()=>this.setChannel(value),{'data-xwe-channel-mode':value,'aria-pressed':String(this.channel===value),title:value==='all'?'Edit Both Channels':`Channel ${value} bearbeiten`}));
 if(this.doc.channels.length>1)tool.append(this.channelModes);
 for(const [key,label] of [['start','Start s'],['end','End s']]){const l=$('label',{},label),input=$('input',{type:'number',step:1/this.doc.sampleRate,min:0,'aria-label':label,onchange:()=>this.setRangeFromFields()});this[key+'Input']=input;l.append(input);tool.append(l)}for(const [key,label] of [['start','Start Frame'],['end','End Frame']]){const l=$('label',{},label),input=$('input',{type:'number',step:1,min:0,'aria-label':label,onchange:()=>this.setRangeFromFrames()});this[key+'FrameInput']=input;l.append(input);tool.append(l)}tool.append(button('Cursor ← Start',()=>this.setCursor(this.doc.selection.start)),button('Cursor → End',()=>this.setCursor(this.doc.selection.end)));tool.append(button('Zoom to Selection',()=>{if(this.doc.selection.start===this.doc.selection.end){this.setStatus('Select an audio range before zooming.');return}this.setEditorViewport(this.doc.selection.start,this.doc.selection.end)}),button('Full View',()=>this.setEditorViewport(0,this.doc.frames)),button('Snap to Zero',()=>this.snapZero(),{'data-xwe-snap-zero':'true',title:'Move the caret or both ends of the selection to the nearest zero crossing (within 5 ms): cuts, mutes and pastes then do not click · Z'}));dialog.append(tool);

 const body=$('div',{class:'xwe-body'}),edits=$('div',{class:'xwe-panel','data-xwe-edit-panel':'true'});edits.append($('h3',{},'Edit Audio'));const grid=$('div',{class:'xwe-edit-grid'});for(const key of ['copy','cut','insert','overwrite','mix','delete','trim','split','silence','reverse','invert','normalize','dcRemove'])grid.append(chromaticButton(key,this.operationLabel(key),()=>key==='mix'?this.openMixPane():this.runEdit(key),key==='mix'?{'data-xwe-mix-trigger':'true'}:{}));grid.append(chromaticButton('envelope','Envelope',()=>this.openVolumeEnvelope(),{title:'Draw a gain envelope with the original XenSonar Morph/Paint tool.'}));edits.append(grid);this.gainInput=this.field(edits,'Gain dB','number',0,{step:.5,min:-96,max:36});edits.append(chromaticButton('gain','Apply Gain',()=>this.runEdit('gain')));this.silenceInput=this.field(edits,'Silence duration (seconds)','number',1,{step:.1,min:.001,max:3600});edits.append(chromaticButton('insertSilence','Insert Silence',()=>this.runEdit('insertSilence')));this.pitchInput=this.field(edits,'Pitch (ratio or cents)','text',this.pitchInput?.value||'0',{'data-xwe-pitch':'true',title:'Retune the selection (or the whole file) without changing its length. A frequency ratio (3/2, 7:4, 81/80) or cents (50, -1200, 386.3). Between ¼ and 4.'});
 this.timeInput=this.field(edits,'Length × (factor or ratio)','text',this.timeInput?.value||'1',{'data-xwe-time':'true',title:'Make the selection (or the whole file) longer or shorter without changing its pitch. 2 = twice as long, 0.5 = half, 3/2 = one and a half. Between ¼ and 4.'});
 this.pitchButton=chromaticButton('reverse','Apply Pitch / Time',()=>this.pitchTime(),{title:'Render with the XenSonar pitch engine (the same one the Material Track and the Multitrack use). One undoable edit.'});this.pitchButton.setAttribute('data-xwe-chromatic-action','pitchtime');edits.append(this.pitchButton);
 this.pitchNotice=$('p',{class:'xwe-small','data-xwe-pitch-notice':'true','aria-live':'polite'},'');edits.append(this.pitchNotice);
 this.lufsInput=this.field(edits,'Loudness target (LUFS)','number',this.lufsInput?.value||-14,{step:.5,min:-70,max:-5,title:'Programme loudness target after ITU-R BS.1770 / EBU R128. Typical: -14 streaming, -16 podcasts, -23 broadcast (EBU R128). The true peak is kept at or below -1 dBTP.','data-xwe-lufs-target':'true'});{const b=chromaticButton('normalize','Normalize Loudness',()=>this.normalizeLoudness(),{title:'Measure the selection (or the whole file when nothing is selected) and bring it to the loudness target with one gain step. Undo works as for every edit.'});b.setAttribute('data-xwe-chromatic-action','loudness');edits.append(b)}edits.append($('p',{class:'xwe-small'},'Click to place the gold insertion caret; drag to select. Ctrl+C/X/V: Copy/Cut/Insert. Ctrl+Alt+V: Overwrite. Ctrl+Shift+V: Mix. Stereo timeline stays synchronized; Float32 preserves levels above 0 dBFS. Normalize or limit before PCM16.'),chromaticButton('analyze','Analyze Selection',()=>this.analyze()));this.analysisElement=$('div',{class:'xwe-analysis xwe-hidden'});edits.append(this.analysisElement);
 this.tonalButton=chromaticButton('analyze','Analyse Tempo · Root · Scale',()=>this.analyseTonal(),{'data-xwe-tonal-analysis':'true',title:'Tempo (BPM), root in Hz, tuning system (12-EDO, 19-EDO, just, Bohlen–Pierce …) and scale of the purple selection, each with an accuracy estimate. With no selection (caret only) the whole file; at most the first 2 minutes. Reads only: nothing is changed.'});this.tonalButton.setAttribute('data-xwe-chromatic-action','tonal-analysis');edits.append(this.tonalButton);this.tonalElement=$('div',{class:'xwe-tonal xwe-hidden','data-xwe-tonal-result':'true','aria-live':'polite'});edits.append(this.tonalElement);body.append(edits);
 const fx=$('div',{class:'xwe-panel xwe-fx-layout','data-xwe-fx-focus':this.fxFocus});this.fxLayout=fx;
 const fxHeader=$('div',{class:'xwe-fx-header','data-xwe-fx-header':'true'});
 fxHeader.append($('h3',{},'Offline Effect Chain'));
 // W21: native per-effect Morph button is the sole focus control.
 this.morphFocusButton=null;
 fx.append(fxHeader);
 const fxControls=$('div',{class:'xwe-fx-controls'});const add=$('div',{class:'xwe-toolbar',style:'padding:0 0 9px;border:0'});this.fxSelect=$('select',{'aria-label':'Add effect'});for(const effect of selectableEffects())this.fxSelect.append($('option',{value:effect.type},displayEffect(effect)));add.append(this.fxSelect,button('+ Effect',()=>this.addNode(this.fxSelect.value)),button('Live-Room EQ · Offline',()=>this.addOfflineEQ(),{'aria-label':'Live-Room EQ · Offline',title:'Process offline PCM with the existing Live-Room EQ'}));this.bypassInput=$('input',{type:'checkbox',onchange:()=>{this.bypass=this.bypassInput.checked;this.invalidate()}});const bypass=$('label',{},'Bypass Chain ');bypass.append(this.bypassInput);add.append(bypass);fxControls.append(add);this.chainElement=$('div',{class:'xwe-chain'});fxControls.append(this.chainElement);this.parametersElement=$('div',{class:'xwe-parameters'});fxControls.append(this.parametersElement);const laneHead=$('div',{class:'xwe-lane-head'});this.laneHead=laneHead;
 this.laneSelect=$('select',{'aria-label':'Automation Parameter',onchange:()=>{this.activeParam=this.laneSelect.value;this.requestMorphRefresh()}});
 this.interpolation=$('select',{'aria-label':'Interpolation',onchange:()=>{const lane=this.activeLane();if(lane){lane.interpolation=this.interpolation.value;this.invalidate();this.requestMorphRefresh()}}});
 this.interpolation.append($('option',{value:'linear'},'Linear'),$('option',{value:'hold'},'Steps'));
 laneHead.append(this.laneSelect,this.interpolation,
  button('Copy Curve',()=>{laneClipboard=this.activeLane()?JSON.parse(JSON.stringify(this.activeLane())):null;this.setStatus('Automation curve copied.')}),
  button('Paste Curve',()=>this.lanePaste()));
 this.morphArea=$('div',{class:'xwe-morph-area','data-xwe-morph-area':'true'});this.morphArea.append(laneHead);
 this.morphArea.addEventListener('click',event=>{
  if(this.fxFocus==='morph'||event.target.closest('button,input,select,textarea,.xwe-morph-mount,.xwe-offline-eq-host'))return;
  this.setFxFocus('morph');
 });
 this.nativeMorphHost=$('div',{class:'xwe-morph-mount','data-xwe-morph-host':'true'});
 this.nativeMorphHost.addEventListener('click',event=>{
  const target=event.target;
  if(target?.nodeType===1&&target.matches?.('div.font-semibold.text-pink-100')&&/· Morph\s*$/.test(target.textContent||''))this.setFxFocus('morph');
 });
 this.morphArea.append(this.nativeMorphHost);
 this.offlineEQHost=$('div',{class:'xwe-offline-eq-host','data-xwe-offline-eq-host':'true'});
 this.morphArea.append(this.offlineEQHost);
 this.curveHint=$('div',{class:'xwe-hint xwe-small'},'XenSonar Morph tools directly control the selected effect parameter.');
 this.morphArea.append(this.curveHint);fxControls.append(this.morphArea);fx.append(fxControls);

 this.scratchRoot=$('section',{class:'xwe-scratchpad','data-xwe-scratchpad':'true','data-active':String(this.activeWorkspace==='scratch'),'data-has-audio':String(!!this.scratchContext)});
 const scratchHeader=$('div',{class:'xwe-scratch-head'});
 this.scratchFocusButton=button('Audio Scratchpad',()=>{
  if(this.scratchContext&&this.activeWorkspace!=='scratch')this.changeWorkspace('scratch');
  this.setFxFocus('scratch');
 },{'aria-label':'Audio Scratchpad','aria-pressed':String(this.fxFocus==='scratch'),class:'xwe-fx-focus-button xwe-scratch-focus-button',title:'Expand the Audio Scratchpad and fold Frequency Morph'});
 scratchHeader.append(this.scratchFocusButton);
 this.scratchModeLabel=$('span',{class:'xwe-scratch-active'},'Editing: '+(this.activeWorkspace==='scratch'?'Scratchpad':'Project'));
 this.scratchInfo=$('span',{class:'xwe-scratch-info'},'Empty');
 scratchHeader.prepend(this.scratchModeLabel,this.scratchInfo);
 const scratchWorkspace=$('div',{class:'xwe-scratch-workspace'});
 const scratchActions=$('div',{class:'xwe-scratch-actions'});
 scratchActions.append(
  button('Copy',()=>this.copyFromScratchpad(),{'aria-label':'Copy',title:'Copy selected scratch audio; select entire pad when no range exists'}),
  button('Paste',()=>this.pasteToScratchpad(),{'aria-label':'Paste',title:'Paste shared clipboard into scratch; replace entire pad when no range is selected'}),
  button('Reverse',()=>this.scratchAction('reverse'),{'aria-label':'Reverse',title:'Reverse audio · selected range, or entire pad'}),
  button('Fade In',()=>this.scratchAction('fadeIn'),{'aria-label':'Fade In',title:'Fade from silence · selected range, or entire pad'}),
  button('Fade Out',()=>this.scratchAction('fadeOut'),{'aria-label':'Fade Out',title:'Fade to silence · selected range, or entire pad'})
 );
 this.scratchCanvas=$('canvas',{width:850,height:220,'aria-label':'Scratchpad waveform · left-click to select, right-click for all project editing and effects','data-xwe-scratch-wave':'true'});
 this.scratchCanvas.addEventListener('pointerdown',e=>this.beginScratchPointer(e),true);
 this.scratchCanvas.addEventListener('contextmenu',e=>this.contextMenu(e));
 this.scratchCanvas.addEventListener('pointermove',e=>this.onScratchPointerMove(e));
 scratchWorkspace.append(scratchActions,this.scratchCanvas);
 fxHeader.append(scratchHeader);
 this.scratchRoot.append(scratchWorkspace);
 fx.append(this.scratchRoot);
 this.tailSelect=$('select',{'aria-label':'Effect Tail',onchange:()=>this.invalidate()});for(const [v,l] of [['extend','Tail · Overlay and extend project if needed (default)'],['overlay','Tail · Overlay existing project, truncate at its end'],['truncate','Tail · Truncate at selection end (intentional)']])this.tailSelect.append($('option',{value:v},l));const tail=$('div',{class:'xwe-field'});tail.append($('label',{},'Delay / Reverb'),this.tailSelect);this.tailSelect.style.maxWidth='260px';fx.append(tail);const presets=$('div',{class:'xwe-toolbar',style:'padding:8px 0;border:0'});presets.append(button('Save Chain',()=>this.savePreset()),button('Load Chain',()=>this.loadPreset()));this.presetInput=$('input',{type:'file',accept:'.json,application/json',class:'xwe-hidden',onchange:e=>this.readPreset(e.target.files[0])});presets.append(this.presetInput,button('Save Project',()=>this.saveProject()),button('Load Project',()=>this.projectInput.click()));this.projectInput=$('input',{type:'file',accept:'.xwe,application/x-xensonar-wave-project',class:'xwe-hidden',onchange:e=>this.readProject(e.target.files[0])});presets.append(this.projectInput);/* ROOM4-03: Send to Multitrack sits in the editor's bottom-right corner; the toolbar reserves its width. */this.multitrackButton=button('Send to Multitrack',()=>this.sendToMultitrack(),{class:'xwe-primary','data-xwe-send-multitrack':'true',title:'Create a new track in Room V from this Wave Editor document (existing behavior).'});
  this.roundTripButton=button('✓ Apply & Return to Multitrack',()=>this.applyAndReturnToMultitrack(),{class:'xwe-primary','data-xwe-apply-return':'true',title:'Bake pending FX, then replace ONLY the selected originating Multitrack clip at the same start position.'});
  const handoffActions=$('div',{class:'xwe-roundtrip-actions',style:'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;padding:6px 0'});
  this.roundTripLabel=$('span',{class:'xwe-roundtrip-label','data-xwe-roundtrip-label':'true',style:'margin-right:auto;align-self:center;font-size:12px;opacity:.85'});handoffActions.append(this.roundTripLabel,this.multitrackButton,this.roundTripButton);fx.style.position='relative';fx.append(presets,handoffActions);this.refreshRoundTripButton();body.append(fx);dialog.append(body);
}
 field(parent,label,type,value,attrs={}){const row=$('label',{class:'xwe-field'},label),input=$('input',{type,'aria-label':label,...attrs});if(type==='checkbox')input.checked=value;else input.value=value;row.append(input);parent.append(row);return input}
 refresh(rebuild=true){if(!this.overlay)return;this.drawScratchpad();
  if(this.channelConvertButton){const mono=this.doc?.channels?.length===1;this.channelConvertButton.textContent=mono?'Mono':'Stereo';this.channelConvertButton.disabled=!mono;this.channelConvertButton.setAttribute('aria-label',mono?'Convert Mono to Stereo':'Stereo source');this.channelConvertButton.title=mono?'Click to convert Mono to Stereo (copy channel; preserve amplitude; Undo supported)':'Already stereo (two original or edited channels)';}
 this.channelModes?.querySelectorAll('[data-xwe-channel-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.xweChannelMode===this.channel)));if(this.undoApplyButton)this.undoApplyButton.disabled=!this.canUndoDocument();if(this.redoButton)this.redoButton.disabled=!this.doc?.history?.future?.length;this.startInput.value=fmt(this.doc.selection.start/this.doc.sampleRate,6);this.endInput.value=fmt(this.doc.selection.end/this.doc.sampleRate,6);this.startInput.max=this.endInput.max=this.doc.frames/this.doc.sampleRate;this.startFrameInput.value=this.doc.selection.start;this.endFrameInput.value=this.doc.selection.end;this.startFrameInput.max=this.endFrameInput.max=this.doc.frames;if(rebuild){this.drawChain();this.drawParameters();this.requestMorphRefresh()}this.syncMixPaneTarget();this.setStatus(this.status);this.scheduleFxLayout()}
 applySelection(){
  this.syncFxTargetsToSelection();
  const selection=this.doc.selection;
  if(selection.start===selection.end){this.options.onViewChange?.();return}
  if(this.activeWorkspace==='scratch'){this.drawScratchpad();return}
  const update={fineLoopRange:{startSec:selection.start/this.doc.sampleRate,durationSec:(selection.end-selection.start)/this.doc.sampleRate},detailViewport:{startSec:this.doc.viewport.start/this.doc.sampleRate,durationSec:(this.doc.viewport.end-this.doc.viewport.start)/this.doc.sampleRate}};
  // Only a real range may update the pre-existing donor selection.
  this.pendingOutgoingRange={...update.fineLoopRange};
  this.options.onSelection?.(update);
  this.drawParameters();
  this.options.onViewChange?.();
 }


 // W30: pure blue-viewport navigation. Never edits purple selection, FX range or PCM.
 navigatorOwner(){return this.activeWorkspace==='scratch'&&this.projectContext?this.projectContext:this}
 navigatorDocument(){return this.navigatorOwner()?.doc||null}
 navigateView(start,end){
  const owner=this.navigatorOwner(),doc=owner?.doc;
  if(!doc)return false;
  const next=core().setViewport(doc,start,end);
  if(next===doc)return false;
  owner.doc=next;
  const v=next.viewport,sr=next.sampleRate,viewport={startSec:v.start/sr,durationSec:(v.end-v.start)/sr};
  this.incomingViewport={...viewport};
  if(this.options.selection?.fineLoopRange)this.options.onSelection?.({...this.options.selection,detailViewport:viewport});
  this.options.onViewChange?.();
  this.refresh(false);
  return true;
 }
 zoomBlueViewport(direction){
  const doc=this.navigatorDocument();if(!doc||doc.frames<=1)return false;
  const {start,end}=doc.viewport,span=end-start,minimum=Math.min(doc.frames,Math.max(2,Math.round(doc.sampleRate*.002)));
  const nextSpan=Math.max(minimum,Math.min(doc.frames,Math.round(span*(direction>0?.8:1.25))));
  if(nextSpan===span)return false;
  const center=(start+end)/2;
  const nextStart=clamp(Math.round(center-nextSpan/2),0,doc.frames-nextSpan);
  return this.navigateView(nextStart,nextStart+nextSpan);
 }
 panBlueViewport(direction,fraction=.012){
  const doc=this.navigatorDocument();if(!doc||doc.frames<=1)return false;
  const {start,end}=doc.viewport,span=end-start;
  const frames=Math.max(1,Math.round(span*fraction));
  const nextStart=clamp(start+(direction<0?-frames:frames),0,doc.frames-span);
  return this.navigateView(nextStart,nextStart+span);
 }
 stopBluePan(){
  if(this.bluePanFrame!=null){root.cancelAnimationFrame(this.bluePanFrame);this.bluePanFrame=null}
  this.bluePanHeld=null;
  this.dialog?.querySelectorAll('[data-xwe-nav-held]').forEach(b=>delete b.dataset.xweNavHeld);
 }
 startBluePan(direction,control,event){
  if(event.button!==0)return;
  event.preventDefault();this.stopBluePan();
  const doc=this.navigatorDocument();if(!doc||!doc.frames)return;
  this.panBlueViewport(direction,.012);
  this.bluePanHeld={direction,control,pointerId:event.pointerId,last:0,lastCommit:0,elapsed:0,remainder:0,initial:true};
  control.dataset.xweNavHeld='true';
  try{control.setPointerCapture(event.pointerId)}catch{}
  const tick=(now)=>{
   const state=this.bluePanHeld;if(!state||state.control!==control)return;
   if(!state.last){state.last=now;this.bluePanFrame=root.requestAnimationFrame(tick);return}
   const dt=Math.max(0,Math.min(.05,(now-state.last)/1000));state.last=now;state.elapsed+=dt;
   // Very slow start; acceleration is capped at 0.28 viewport widths/second.
   const ramp=Math.min(1,state.elapsed/1.8),speed=.065+.215*ramp*ramp*(3-2*ramp);
   const active=this.navigatorDocument();if(!active)return this.stopBluePan();
   state.remainder+=(active.viewport.end-active.viewport.start)*speed*dt;
   const delta=Math.floor(state.remainder);
   if(delta>0&&now-state.lastCommit>=36){state.lastCommit=now;state.remainder-=delta;const start=active.viewport.start+(direction<0?-delta:delta);this.navigateView(start,start+active.viewport.end-active.viewport.start)}
   this.bluePanFrame=root.requestAnimationFrame(tick);
  };
  this.bluePanFrame=root.requestAnimationFrame(tick);
 }
 buildBlueViewControls(){
  const group=$('div',{class:'xwe-view-controls',role:'group','aria-label':'Blue overview viewport · fine zoom and movement','data-xwe-view-controls':'true'});
  const icon=(kind)=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
   svg.innerHTML=kind.startsWith('zoom')?'<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/>'+(kind==='zoom-in'?'<path d="M10 7v6M7 10h6"/>':'<path d="M7 10h6"/>'):(kind==='pan-left'?'<path d="m15 5-8 7 8 7"/>':'<path d="m9 5 8 7-8 7"/>');
   return svg;
  };
  for(const [kind,label,callback] of [
   ['zoom-in','Zoom in blue viewport · magnifier +',()=>this.zoomBlueViewport(1)],
   ['zoom-out','Zoom out blue viewport · magnifier −',()=>this.zoomBlueViewport(-1)],
   ['pan-left','Move blue viewport left · hold for gentle acceleration',()=>this.panBlueViewport(-1)],
   ['pan-right','Move blue viewport right · hold for gentle acceleration',()=>this.panBlueViewport(1)]
  ]){
   const control=button('',()=>{if(kind.startsWith('zoom'))callback();else if(!control.__navPointerClick)callback();control.__navPointerClick=false},{type:'button',class:'xwe-view-control','data-xwe-view':kind,'aria-label':label,title:label});
   control.append(icon(kind));
   if(kind.startsWith('pan')){
    control.addEventListener('pointerdown',event=>{if(event.button!==0)return;control.__navPointerClick=true;this.startBluePan(kind==='pan-left'?-1:1,control,event)});
    const release=event=>{if(this.bluePanHeld?.pointerId===event.pointerId)this.stopBluePan()};
    control.addEventListener('pointerup',release);control.addEventListener('pointercancel',release);control.addEventListener('lostpointercapture',release);
   }
   group.append(control);
  }
  return group;
 }
 setEditorViewport(start,end){
  this.doc=core().setViewport(this.doc,start,end);
  const v=this.doc.viewport,sr=this.doc.sampleRate;
  const viewport={startSec:v.start/sr,durationSec:(v.end-v.start)/sr};
  if(this.activeWorkspace==='scratch'){this.refresh(false);this.drawScratchpad();return}
  this.incomingViewport={...viewport};
  const fineLoopRange=this.options.selection?.fineLoopRange;
  if(fineLoopRange)this.options.onSelection?.({...this.options.selection,detailViewport:viewport});
  this.options.onViewChange?.();this.refresh(false);
 }

 setCursor(frame){this.invalidate();this.doc=core().setSelection(this.doc,frame,frame);this.applySelection();this.refresh(false);if(this.nodes.length&&this.curveHint)this.curveHint.textContent='No active time range · choose a purple selection before Preview FX or Apply. Existing automation is retained but not rendered.';this.setStatus(`Insertion caret · Frame ${frame} · ${fmt(frame/this.doc.sampleRate,6)} s. Ctrl+V = Insert · Ctrl+Alt+V = Overwrite · Ctrl+Shift+V = Mix.`)}
 setRangeFromFields(){const sr=this.doc.sampleRate,a=clamp(Math.round(Number(this.startInput.value)*sr),0,this.doc.frames),b=clamp(Math.round(Number(this.endInput.value)*sr),0,this.doc.frames);this.invalidate();this.doc=core().setSelection(this.doc,a,b);this.applySelection();this.refresh(false)}
 setRangeFromFrames(){this.invalidate();this.doc=core().setSelection(this.doc,Number(this.startFrameInput.value),Number(this.endFrameInput.value));this.applySelection();this.refresh(false)}
 addNode(type){this.ensureScratchSelection();this.ensureEffectSelection();const effect=registry().find(x=>x.type===type);if(!effect)return;const params=Object.fromEntries(definitions(effect).map(([k,m])=>[k,m.default??m.defaultValue??0]));const node={id:'fx-'+(++serial),type,enabled:true,params,automation:{},targetRange:this.range(),channels:this.target(),version:1};this.nodes.push(node);this.activeNode=node.id;this.activeParam=null;this.eqVisible=false;this.invalidate();this.refresh();this.setStatus(displayEffect(effect)+' added to FX chain · follows visible selection and channel.')}
 addOfflineEQ(){this.ensureScratchSelection();this.ensureEffectSelection();
  const id='eq-'+(++serial),key='waveOffline:'+this.doc.id+':'+id;
  const node={id,type:'liveRoomEQ',enabled:true,eqSourceKey:key,targetRange:this.range(),channels:this.target(),params:{},automation:{},version:1};
  root.__XenWaveOfflineEQ?.registerRate(key,this.doc.sampleRate);
  this.nodes.push(node);this.activeNode=id;this.activeParam=null;this.eqVisible=true;
  this.invalidate();this.refresh();this.setStatus('Live-Room EQ · native EQ UI and Filter Planner, processing offline PCM only.');
 }
 offlineEqBinding(){
  const node=this.currentNode();
  if(!this.overlay||!this.offlineEQHost||!this.eqVisible||node?.type!=='liveRoomEQ')return null;
  return {host:this.offlineEQHost,key:node.eqSourceKey,close:()=>{this.eqVisible=false;this.requestMorphRefresh()}};
 }
 // The __XenEQ planner owns the filter-bank geometry and gain curve. The
 // existing W01 worker owns the PCM bake. This adapter just converts the
 // shared bank into its already-registered peaking and gain effect types.
 offlineDSPNodes(){
  const bridge=root.__XenWaveOfflineEQ;
  return this.nodes.flatMap(node=>{
   if(node.type!=='liveRoomEQ')return [node];
   if(!node.enabled||!bridge)return [];
   const cfg=bridge.get(node.eqSourceKey);
   if(!cfg.enabled)return [];
   const plan=bridge.plan(cfg,this.doc.sampleRate);
   if(!plan||!Array.isArray(plan.filters))throw Error('Live-Room EQ: no valid filter plan.');
   const base={targetRange:node.targetRange,channels:node.channels,enabled:true,automation:{}};
   const expanded=[];
   if(Math.abs(plan.base||0)>1e-8)expanded.push({...base,id:node.id+':gain',type:'gain',params:{gainDb:clamp(plan.base,-96,36)}});
   for(let i=0;i<plan.filters.length;i++){
    const f=plan.filters[i];
    if(f.type!=='peaking')throw Error('Live-Room EQ: unsupported filter type '+f.type);
    if(!Number.isFinite(f.frequency)||!Number.isFinite(f.q)||!Number.isFinite(f.gain))throw Error('Live-Room EQ: non-finite filter parameter.');
    if(Math.abs(f.gain)<1e-8)continue;
    expanded.push({...base,id:node.id+':band'+i,type:'peaking',params:{frequency:clamp(f.frequency,20,20000),q:clamp(f.q,.1,30),gainDb:clamp(f.gain,-36,36)}});
   }
   return expanded;
  });
 }
 releaseOfflineEQState(){for(const n of this.nodes){if(n.type!=='liveRoomEQ')continue;this.eqLastConfigs?.delete(n.eqSourceKey);root.__XenWaveOfflineEQ?.drop(n.eqSourceKey)}this.eqVisible=false}
 currentNode(){return this.nodes.find(x=>x.id===this.activeNode)}
 invalidate(){this.lastResult=null;this.lastResultScope=null;this.abort('choice')}
 // A PCM revision alone does not identify a rendered selection. Keep the
 // target, channel, tail policy, active workspace and render generation together
 // so even a delayed response from an already-invalidated job is rejected.
 renderScope(){const r=this.range();return {documentId:this.doc.id,revision:this.doc.revision,
  workspace:this.activeWorkspace,start:r.start,end:r.end,channel:this.target(),
  tailMode:this.tailSelect?.value||'extend',bypass:!!this.bypass,token:this.renderToken}}
 scopeMatches(scope){if(!scope||!this.doc)return false;const now=this.renderScope();return Object.keys(now).every(key=>Object.is(now[key],scope[key]))}
 cachedRender(){return this.lastResult&&this.scopeMatches(this.lastResultScope)?this.lastResult:null}
 openVolumeEnvelope(){this.open();this.ensureScratchSelection();this.addNode('gain');this.activeParam='gainDb';this.refresh()}
 drawChain(){this.retainExpandedScratchHeight();this.chainElement.replaceChildren();if(!this.nodes.length){this.chainElement.append($('div',{class:'xwe-small'},'No active effect stages. '+(this.activeWorkspace==='scratch'?'Scratchpad unchanged.':'Project unchanged.')));return}for(const [index,node] of this.nodes.entries()){const effect=registry().find(x=>x.type===node.type)||{label:node.type==='liveRoomEQ'?'Live-Room EQ · Offline':node.type},slot=$('div',{class:'xwe-node','data-active':String(node.id===this.activeNode)}),enabled=$('input',{type:'checkbox','aria-label':displayEffect(effect)+' enabled',onchange:()=>{node.enabled=enabled.checked;this.invalidate()}});enabled.checked=node.enabled;slot.append(enabled,button(displayEffect(effect),()=>{this.activeNode=node.id;this.activeParam=null;this.eqVisible=node.type==='liveRoomEQ';this.invalidate();this.refresh()}),button('‹',()=>{if(index){[this.nodes[index-1],this.nodes[index]]=[node,this.nodes[index-1]];this.invalidate();this.refresh() }},{title:'Move effect earlier'}),button('›',()=>{if(index<this.nodes.length-1){[this.nodes[index+1],this.nodes[index]]=[node,this.nodes[index+1]];this.invalidate();this.refresh()}},{title:'Move effect later'}),button('×',()=>{this.nodes.splice(index,1);if(node.type==='liveRoomEQ'){this.eqLastConfigs?.delete(node.eqSourceKey);root.__XenWaveOfflineEQ?.drop(node.eqSourceKey)}this.activeNode=this.nodes[Math.max(0,index-1)]?.id;this.eqVisible=this.currentNode()?.type==='liveRoomEQ';this.invalidate();this.refresh()},{title:'Remove effect'}));this.chainElement.append(slot)}}
 drawParameters(){this.parametersElement.replaceChildren();this.laneSelect.replaceChildren();const node=this.currentNode();if(this.laneHead)this.laneHead.hidden=node?.type==='liveRoomEQ';if(!node)return;if(node.type==='liveRoomEQ'){this.curveHint.textContent='Original XenSonar Live-Room EQ · Offline. Paint in the EQ panel, then Preview FX or Apply / Bake.';return}const effect=registry().find(x=>x.type===node.type);for(const [key,meta] of definitions(effect)){const label=displayText(meta.label||key),row=$('label',{class:'xwe-field'}),input=$('input',{type:'number',min:meta.min,max:meta.max,step:meta.step||(meta.max-meta.min>100?1:.01),'aria-label':label,onchange:()=>{node.params[key]=clamp(Number(input.value),meta.min??-Infinity,meta.max??Infinity);input.value=node.params[key];this.invalidate();this.requestMorphRefresh()}});input.value=node.params[key];row.append($('span',{},label),input,$('span',{class:'xwe-small'},meta.unit||''));this.parametersElement.append(row);if(meta.automatable!==false&&meta.automateAllowed!==false)this.laneSelect.append($('option',{value:key},label+(meta.unit?' · '+meta.unit:'')))}this.activeParam=this.activeParam||this.laneSelect.options[0]?.value;this.laneSelect.value=this.activeParam;this.curveHint.textContent=`Target: ${fmt(node.targetRange.start/this.doc.sampleRate)}–${fmt(node.targetRange.end/this.doc.sampleRate)} s · ${node.channels==='all'?'L/R linked':node.channels} · Drag points; double-click to delete. Untouched automation uses the constant value.`}
 paramMeta(){const node=this.currentNode(),effect=registry().find(x=>x.type===node?.type);return definitions(effect).find(([key])=>key===this.activeParam)?.[1]||{min:0,max:1,default:0}}
 activeLane(create=false){const node=this.currentNode();if(!node||!this.activeParam)return null;if(create&&!node.automation[this.activeParam])node.automation[this.activeParam]={points:[],interpolation:'linear'};return node.automation[this.activeParam]}
 laneHistory(){const node=this.currentNode();if(!node)return;this.curveHistory||=[];this.curveHistory.push({id:node.id,param:this.activeParam,lane:this.activeLane()?JSON.parse(JSON.stringify(this.activeLane())):null});if(this.curveHistory.length>40)this.curveHistory.shift()}
 laneUndo(){const item=this.curveHistory?.pop();if(!item)return;const node=this.nodes.find(x=>x.id===item.id);if(!node)return;if(item.lane)node.automation[item.param]=item.lane;else delete node.automation[item.param];this.activeNode=node.id;this.activeParam=item.param;this.invalidate();this.refresh()}
 lanePaste(){if(!laneClipboard||!this.currentNode())return;this.laneHistory();const node=this.currentNode(),points=laneClipboard.points||[],lo=points[0]?.frame??node.targetRange.start,hi=points[points.length-1]?.frame??node.targetRange.end,meta=this.paramMeta();node.automation[this.activeParam]={interpolation:laneClipboard.interpolation,points:points.map(p=>({frame:Math.round(node.targetRange.start+(p.frame-lo)/Math.max(1,hi-lo)*(node.targetRange.end-node.targetRange.start-1)),value:clamp(p.value,meta.min,meta.max)}))};this.invalidate();this.requestMorphRefresh()}
 normalized(value,meta){const lo=meta.min??0,hi=meta.max??1;return (meta.scale==='log'||meta.log===true)&&lo>0?Math.log(clamp(value,lo,hi)/lo)/Math.log(hi/lo):(value-lo)/Math.max(1e-12,hi-lo)}
 denormalized(value,meta){const lo=meta.min??0,hi=meta.max??1;return (meta.scale==='log'||meta.log===true)&&lo>0?lo*Math.pow(hi/lo,value):lo+(hi-lo)*value}
 requestMorphRefresh(){this.options.onViewChange?.()}
 // W04: small data adapter only. G$ (shared MWCM) owns every curve gesture, brush,
 // warp, visual and undo button. W01 remains the owner of offline PCM automation.
 nativeMorphBinding(){
  const node=this.currentNode(),key=this.activeParam,host=this.nativeMorphHost;
  if(!this.overlay||!host||!node||!key||!this.doc)return null;
  const meta=this.paramMeta(),range=node.targetRange;
  if(range.end<=range.start)return null;
  const base=Number(node.params[key]),center=clamp(this.normalized(base,meta),0,1);
  const min=Math.max(0,Number.isFinite(meta.min)?meta.min:0),max=Number.isFinite(meta.max)?meta.max:1;
  const toSigned=value=>{const n=clamp(this.normalized(value,meta),0,1);return clamp(n>=center?(n-center)/Math.max(1e-7,1-center):(n-center)/Math.max(1e-7,center),-1,1)};
  const toValue=value=>this.denormalized(clamp(center+(value>=0?(1-center)*value:center*value),0,1),meta);
  const lane=node.automation[key],points=lane?.points?.slice().sort((a,b)=>a.frame-b.frame)||[];
  const read=count=>{
   if(!points.length)return new Array(count).fill(0);
   let index=0;
   return Array.from({length:count},(_,j)=>{
    const frame=range.start+(range.end-range.start-1)*j/Math.max(1,count-1);
    while(index+1<points.length&&points[index+1].frame<=frame)index++;
    const a=points[index],b=points[index+1];
    if(frame<=points[0].frame)return toSigned(points[0].value);
    if(!b||lane.interpolation==='hold')return toSigned(a.value);
    const t=clamp((frame-a.frame)/Math.max(1,b.frame-a.frame),0,1);
    return toSigned(this.denormalized(this.normalized(a.value,meta)*(1-t)+this.normalized(b.value,meta)*t,meta));
   });
  };
  return {host,key:this.doc.id+':'+node.id+':'+key,title:(displayText(meta.label||key))+' · Morph',expand:()=>this.setFxFocus('morph'),read,
   capture:()=>this.laneHistory(),undo:()=>this.laneUndo(),canUndo:!!this.curveHistory?.length,
   commit:(signed,message)=>{
    if(!this.nodes.includes(node)||!this.overlay)return;
    const values=Array.from(signed||[]);
    if(values.length<2)return;
    const steps=new Map();
    for(let j=0;j<values.length;j++){
     const frame=Math.round(range.start+(range.end-range.start-1)*j/(values.length-1));
     steps.set(frame,{frame,value:clamp(toValue(clamp(Number(values[j])||0,-1,1)),meta.min,meta.max)});
    }
    if(values.every(v=>Math.abs(Number(v)||0)<1e-7))delete node.automation[key];
    else node.automation[key]={interpolation:lane?.interpolation||'linear',points:[...steps.values()]};
    this.invalidate();this.setStatus('MWCM · '+(message||`${displayText(meta.label||key)} painted`));this.requestMorphRefresh();
   }};
 }
 async render(){
  // A caret is not a purple selection; never render an invisible old target.
  if(this.doc.selection.end<=this.doc.selection.start)throw Error('No active time range · select a purple region before Preview FX or Apply.');
  this.syncFxTargetsToSelection();
  this.abort('replace');
  const token=++this.renderToken,controller=new AbortController();this.controller=controller;
  const doc=this.doc,scope=this.renderScope(),nodes=this.bypass?[]:this.offlineDSPNodes();
  this.beginComputeFeedback(token);this.setStatus('Offline rendering…');
  try{
   const result=await dsp().render({jobId:'w01-'+(++serial),documentId:doc.id,revision:doc.revision,sampleRate:doc.sampleRate,channels:doc.channels,range:this.range(),nodes:JSON.parse(JSON.stringify(nodes)),tailMode:this.tailSelect?.value||'extend'},{signal:controller.signal,onProgress:p=>{
    if(token!==this.renderToken||!this.progressElement||this.computeJob?.token!==token)return;
    const n=typeof p==='number'?p:(p.progress||0);
    this.progressElement.value=Math.max(0,Math.min(1,n));
   }});
   if(controller.signal.aborted||!this.scopeMatches(scope))throw new DOMException('Outdated render discarded.','AbortError');
   this.lastResult=result;this.lastResultScope=scope;this.setStatus('Offline render ready · '+result.frames+' frames.');return result;
  }finally{
   if(this.controller===controller)this.controller=null;
   this.finishComputeFeedback(token);
  }
 }
 canUndoDocument(){return !!this.doc?.history?.past?.length}
 async undoDocument(){if(this.canUndoDocument())await this.runEdit('undo');else this.setStatus('Nothing to undo.')}
 async applyChain(){try{
  const result=this.cachedRender()||await this.render();
  if(!this.cachedRender()||this.cachedRender()!==result)throw new DOMException('Selection or FX changed during rendering.','AbortError');
  const next=core().commitRender(this.doc,result);
  await this.publish(next,this.activeWorkspace==='scratch'?'Effect chain applied to scratchpad':'Effect chain applied to project',{consumeChain:true});
 }catch(error){if(error.name!=='AbortError')this.setStatus(error.message)}}

 ensurePlayheads(){
  const canvases=this.activeWorkspace==='scratch'?[this.scratchCanvas]:[this.options.overviewCanvas,this.options.detailCanvas];
  if(this.playheadElements?.length===canvases.length&&this.playheadElements.every((entry,i)=>entry.canvas===canvases[i]))return;
  for(const entry of this.playheadElements||[])entry.el.remove();
  this.playheadElements=[];
  for(const canvas of canvases){
   if(!canvas?.parentElement)continue;
   const parent=canvas.parentElement;
   if(!parent.classList.contains('xwe-playhead-owner'))parent.classList.add('xwe-playhead-owner');
   const el=$('div',{class:'xwe-playhead','data-active':'false','aria-hidden':'true'});
   const time=canvas===this.options.detailCanvas?$('span',{class:'xwe-playhead-time'}):null;if(time)el.append(time);
   parent.append(el);this.playheadElements.push({canvas,parent,el,time});
  }
 }
 clearPlayheads(){
  if(this.transportRaf!=null){root.cancelAnimationFrame(this.transportRaf);this.transportRaf=null}
  this.transport=null;
  for(const entry of this.playheadElements||[])entry.el.remove();
  this.playheadElements=[];
  if(this.playButton){this.playButton.textContent='▶ Play';this.playButton.setAttribute('aria-pressed','false')}
 }
 updatePlayheads(){
  const t=this.transport;
  if(!t||!this.audioNode||!this.overlay)return;
  const clock=Math.max(0,this.audioContext.currentTime-t.startAudioTime);
  const at=Math.min(t.endFrame,t.startFrame+clock*t.sampleRate);
  const owner=this.doc;
  if(!owner)return;
  for(const entry of this.playheadElements||[]){
   const {canvas,parent,el,time}=entry;
   const c=canvas.getBoundingClientRect(),p=parent.getBoundingClientRect();
   if(!c.width||!c.height)continue;
   // Upper wave is the entire source; lower wave is the currently zoomed viewport.
   const overview=canvas===this.options.overviewCanvas;
   const scratch=canvas===this.scratchCanvas;
   /* PLAYHEAD-SCALE-01: the upper (overview) and the Scratchpad canvas show the DOCUMENT (0 .. doc.frames). t.sourceFrames is the length of what is playing: with an effect chain whose
      echo / reverb tail extends the render it is LONGER than the document, so the playhead ran too early on these canvases (the lower, viewport based one was right). Only the A · Original
      comparison plays a buffer of another length and keeps its own length. */
   const docFrames=t.mode==='original'?t.sourceFrames:Math.max(1,owner.frames);
   const min=scratch?0:overview?0:owner.viewport.start,max=scratch?docFrames:overview?docFrames:owner.viewport.end;
   const ratio=(at-min)/Math.max(1,max-min);
   const visible=ratio>=0&&ratio<=1;
   el.dataset.active=String(visible);el.style.display=visible?'block':'none';
   el.style.left=(c.left-p.left+parent.scrollLeft+c.width*Math.max(0,Math.min(1,ratio)))+'px';
   if(time&&visible)time.textContent=clockLabel(at/t.sampleRate);
   el.style.top=(c.top-p.top+parent.scrollTop)+'px';el.style.height=c.height+'px';
  }
  this.transportRaf=root.requestAnimationFrame(()=>this.updatePlayheads());
 }
 startPlayhead(mode,range,sr,frames){
  this.ensurePlayheads();
  this.transport={mode,startAudioTime:this.audioContext.currentTime,startFrame:range.start,endFrame:range.end,sampleRate:sr,sourceFrames:frames};
  if(this.playButton){this.playButton.textContent='■ Stop';this.playButton.setAttribute('aria-pressed','true')}
  this.updatePlayheads();
 }
 stopAudio(){if(this.audioNode){try{this.audioNode.stop()}catch{}this.audioNode.disconnect();this.audioNode=null}this.clearPlayheads();this.audioContext?.suspend?.()}
 /* PLAYHEAD-CLOCK: the running time above the Forge loop playhead (drawn on the canvas) as the same floating label the editor playhead carries */
 setLoopClock(sec){
  const canvas=this.options.detailCanvas,doc=this.doc;let el=this.loopClockEl;
  if(sec==null||!Number.isFinite(sec)||!canvas?.parentElement||!doc?.viewport){if(el){el.remove();this.loopClockEl=null}return}
  const parent=canvas.parentElement,view=doc.viewport,ratio=(sec*doc.sampleRate-view.start)/Math.max(1,view.end-view.start);
  if(ratio<0||ratio>1){if(el)el.style.display='none';return}
  if(!el||!el.isConnected){el=this.loopClockEl=$('span',{class:'xwe-playhead-time xwe-loop-clock','aria-hidden':'true'});parent.classList.add('xwe-playhead-owner');parent.append(el)}
  /* SEEK-JANK-02: this runs on every animation frame while a loop plays. Reading getBoundingClientRect right after writing styles forced a layout each frame (a click in the
     Taktometer made it visible as stutter of the whole page). The canvas position inside its parent is measured at most every 400 ms (and when the canvas size changes). */
  const now=performance.now(),geo=this.loopClockGeo;let g=geo;
  if(!g||now-g.at>400||g.cw!==canvas.clientWidth||g.ch!==canvas.clientHeight||g.parent!==parent){const c=canvas.getBoundingClientRect(),pr=parent.getBoundingClientRect();g=this.loopClockGeo={at:now,cw:canvas.clientWidth,ch:canvas.clientHeight,parent,dx:c.left-pr.left,dy:c.top-pr.top,w:c.width,h:c.height}}
  const tx=g.dx+parent.scrollLeft+g.w*ratio,ty=g.dy+parent.scrollTop-22;
  if(el.style.display!=='block')el.style.display='block';
  const label=clockLabel(sec);if(el.textContent!==label)el.textContent=label;
  el.style.left=tx+'px';el.style.top=ty+'px';if(this.loopClockH!==g.h){this.loopClockH=g.h;el.style.setProperty('--xwe-ph',(g.h+8)+'px')}
 }
 setLoopPlaying(on){if(this.loopButton){this.loopButton.textContent=on?'■ Stop':'▶ Loop';this.loopButton.setAttribute('aria-pressed',String(!!on))}}
 playSelection(){if(this.audioNode){this.stopAudio();this.setStatus('Playback stopped.');return}return this.preview('document')}
 /* TAKT-SEEK: restart the running preview at another point (same mode, same end) */
 seekToSec(sec){const t=this.transport;if(!this.audioNode||!t||!Number.isFinite(sec))return false;const from=clamp(Math.round(sec*t.sampleRate),0,Math.max(0,t.sourceFrames-1));void this.preview(t.mode,{from,to:t.endFrame});return true}
 async preview(mode,opts){try{if(mode!=='chain'&&this.controller)this.abort('choice');const token=this.renderToken;this.stopAudio();let cs=this.doc.channels,sr=this.doc.sampleRate,range=this.range();if(range.start===range.end){range=range.start>=this.doc.frames?{start:0,end:this.doc.frames}:{start:range.start,end:this.doc.frames}}if(mode==='chain'){
   const result=this.cachedRender()||await this.render();
   if(this.cachedRender()!==result)throw new DOMException('Selection changed while preparing preview.','AbortError');
   range=this.range();cs=result.channels;
   // The selection names the DRY target, not the end of its wet echo/reverb.
   // Preview all rendered tails without changing the persistent selection.
   const tailEnd=Math.max(range.end,...(result.metrics?.effects||[]).map(effect=>(effect.end??range.end)+(effect.tailFrames||0)));
   range={start:range.start,end:Math.min(result.frames,tailEnd)};
  }else if(mode==='original'){cs=this.doc.original.channels;sr=this.doc.original.sampleRate||sr;range={start:Math.min(range.start,cs[0].length-1),end:Math.min(range.end,cs[0].length)}}if(opts&&Number.isFinite(opts.from)){const total=cs[0].length,from=clamp(Math.round(opts.from),0,Math.max(0,total-1));range={start:from,end:clamp(Math.round(opts.to??range.end),from+1,total)}}this.options.stopSourcePreview?.();const AC=root.AudioContext||root.webkitAudioContext;this.audioContext||=new AC();await this.audioContext.resume();if(!this.overlay)return;const buffer=this.audioContext.createBuffer(cs.length,cs[0].length,sr);cs.forEach((c,i)=>buffer.copyToChannel(c,i));const node=this.audioContext.createBufferSource();node.buffer=buffer;node.connect(this.audioContext.destination);const start=clamp(range.start/sr,0,buffer.duration-.00001),duration=Math.max(1/sr,Math.min(range.end/sr,buffer.duration)-start);node.start(0,start,duration);this.audioNode=node;this.startPlayhead(mode,range,sr,cs[0].length);node.onended=()=>{if(this.audioNode===node){this.audioNode=null;this.clearPlayheads();this.setStatus('Preview finished.')}};this.setStatus((mode==='original'?'A · Original':mode==='document'?(this.activeWorkspace==='scratch'?'B · Scratchpad':'B · Edited Project'):'Effect Chain')+' · real '+cs.length+'-channel preview (original floating-point level).')}catch(error){if(error.name!=='AbortError')this.setStatus(error.message)}}
  refreshRoundTripButton(){if(this.roundTripButton){const linked=!!globalThis.__XenMultitrackRoundTrip?.bound(this);
   this.roundTripButton.hidden=!linked;this.roundTripButton.style.display=linked?'':'none';
   if(this.roundTripLabel){this.roundTripLabel.textContent=linked?(globalThis.__XenMultitrackRoundTrip.status().label||'\u2702 Multitrack Clip'):'';this.roundTripLabel.hidden=!linked}}}
  hasUnsavedWork(){return !!(this.doc&&((this.nodes&&this.nodes.length)||(this.doc.history?.past?.length&&this.cleanRevision!==this.doc.revision)))}
  async applyAndReturnToMultitrack(){const flow=globalThis.__XenMultitrackRoundTrip;
   if(!flow?.bound(this)){this.setStatus('This Wave document is not linked to a Multitrack clip.');return}
   const btn=this.roundTripButton;if(btn)btn.disabled=true;
   this.setStatus('Applying effects and returning to the original Multitrack clip…');
   try{const result=await flow.apply(this);this.setStatus('Clip '+result.clipId+' updated. Returning to Multitrack.');this.close();}
   catch(error){this.setStatus('Return failed: '+String(error?.message||error));}
   finally{if(btn)btn.disabled=false;this.refreshRoundTripButton()}}
 async sendToMultitrack(){const inbox=globalThis.__XenMultitrackInbox;if(!inbox){this.setStatus('Multitrack is not available in this build.');return}if(!this.doc?.frames){this.setStatus('No audio to send.');return}const btn=this.multitrackButton;if(btn)btn.disabled=true;this.setStatus('Sending to Multitrack…');try{const name=(this.activeWorkspace==='scratch'?'Scratchpad':(this.source?.label||'Wave Editor'));/* MT-SONGPARTS-01: the song parts of the strip travel along (not for the scratchpad, not when the length was edited) */const songParts=this.activeWorkspace==='scratch'?null:(globalThis.__xenSongPartsExport?.(this.source?.sourceAsset,this.doc.frames/this.doc.sampleRate)??null);const r=await inbox.send({channels:this.doc.channels,sampleRate:this.doc.sampleRate,name,origin:'wave-editor',songParts});this.setStatus('Sent to Multitrack as a new track'+(songParts?' with its '+songParts.parts.length+' song parts':'')+(r.sourceBpm?' · '+r.sourceBpm+' BPM detected':' · original speed')+'. Open Room V to see it.'+(this.nodes.length?' Unapplied FX chain was not included: use Apply / Bake first.':''))}catch(error){this.setStatus('Send to Multitrack failed: '+error.message)}finally{if(btn)btn.disabled=false}}
 downloadWav(){try{const format=this.formatSelect?.value||'float32',data=core().encodeWav(this.doc,{format,dither:format==='pcm16'}),blob=data instanceof Blob?data:new Blob([data],{type:'audio/wav'});this.download(blob,(this.activeWorkspace==='scratch'?'XenSonar_Scratchpad':(this.source.label||'XenSonar')).replace(/[^\p{L}\p{N}_.-]/gu,'_')+'_W01_'+format+'.wav');this.setStatus('Edited project exported as '+format+' WAV. '+(this.nodes.length?'Unapplied FX chain: use Apply / Bake first.':''))}catch(error){this.setStatus(error.message)}}
 download(blob,name){const url=URL.createObjectURL(blob),a=$('a',{href:url,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 /* MTW-03 Pitch / Time for the selection (or the whole file): the SAME offline pitch engine as the Material Track and Room IV (granular, windowed sinc, transient guard), so a
    material sounds the same wherever it is retuned. Pitch as a ratio or in cents (microtonal: any value); length as a factor, pitch kept. Order as in Room IV, so no band is lost:
    longer = lengthen by resampling first, then shift up; shorter = shift down first, then shorten by resampling. Resampling uses the browser's own decoder (the audio is declared
    at another sample rate and decoded at the project rate). One undoable edit; unselected audio stays bit-identical, the seams are blended over 5 ms. */
 async pitchTime(){if(!this.doc?.frames)return;if(this.warnUnappliedFx('Pitch / Time'))return;const engine=root.__XenOfflinePCM,doc=this.doc,sr=doc.sampleRate;
  const p=parseInterval(this.pitchInput?.value,'pitch'),s=parseInterval(this.timeInput?.value,'time');
  if(!Number.isFinite(p)||!Number.isFinite(s)){this.setNotice('Pitch: a ratio (3/2, 7:4) or cents (50, -1200). Length: a factor (2, 0.5) or a ratio (3/2).');return}
  if(Math.abs(p-1)<1e-6&&Math.abs(s-1)<1e-6){this.setNotice('Pitch 0 cents and length × 1: nothing to do.');return}
  if(s<.25||s>4||p<.25||p>4||p*s<.25||p*s>4){this.setNotice('Out of range: pitch and length each between ¼ and 4, and pitch × length between ¼ and 4 (two octaves of granular shift).');return}
  if(!engine?.render){this.setNotice('The pitch engine is not available in this build.');return}
  const {range,whole}=this.measureRange(),a=range.start,b=range.end,L=b-a;if(L<Math.round(.05*sr)){this.setNotice('Select at least 50 ms for Pitch / Time.');return}
  const picked=this.channel==='all'||doc.channels.length<2?doc.channels.map((_,i)=>i):[this.channel==='R'?1:0];
  if(Math.abs(s-1)>=1e-6&&picked.length!==doc.channels.length){this.setNotice('A new length applies to both channels: choose L+R first.');return}
  const PAD=Math.round(.3*sr),total=L+2*PAD,most=Math.max(total,Math.round(total*s));
  if(2*(2*most*picked.length*4)+1048576>48*1024*1024){const sec=Math.floor(47e6/(16*picked.length)/sr/Math.max(1,s)-.6);this.setNotice('Pitch / Time takes up to about '+sec+' s of '+(picked.length>1?'stereo':'one channel')+' at this length factor in one pass: select a shorter range.');return}
  const button=this.pitchButton;if(button)button.disabled=true;this.setNotice('Rendering pitch / time …');
  try{
   /* The engine renders cyclically and guards transients, so the piece gets a margin of 0.3 s on both sides that falls away afterwards: the real neighbouring audio, at the ends of
      the file the audio mirrored (a silent margin would look like a hard attack and switch the phase alignment off), fading out over its outer 0.12 s towards the cyclic seam. */
   const N=doc.frames,taper=Math.round(.12*sr),mirror=i=>{if(N<2)return 0;const period=2*(N-1);i%=period;if(i<0)i+=period;return i<N?i:period-i};
   let data=picked.map(c=>{const x=doc.channels[c],o=new Float32Array(total);o.set(x.subarray(a,b),PAD);for(let d=1;d<=PAD;d++){const w=d>PAD-taper?.5+.5*Math.cos(Math.PI*(d-(PAD-taper))/taper):1;o[PAD-d]=x[mirror(a-d)]*w;o[PAD+L-1+d]=x[mirror(b-1+d)]*w}return o});
   const resample=async chs=>{const want=Math.max(1,Math.round(chs[0].length*s)),fake=Math.round(sr/s),Offline=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    const bytes=core().encodeWav({channels:chs,sampleRate:fake,frames:chs[0].length},{format:'float32'}),buf=await new Offline(chs.length,1,sr).decodeAudioData(bytes);
    return chs.map((_,i)=>{const d=buf.getChannelData(Math.min(i,buf.numberOfChannels-1)),o=new Float32Array(want);o.set(d.subarray(0,Math.min(want,d.length)));return o})};
   const shift=p*s;if(s>1+1e-6)data=await resample(data);
   if(Math.abs(shift-1)>=1e-6){let r;for(let attempt=0;;attempt++){try{r=await engine.render({loop:true,rate:sr,sourceRate:sr,frames:data[0].length,pitch:shift,channels:data.map(c=>c.slice())});break}catch(e){if(attempt<8&&/capacity busy/i.test(String(e?.message||e))){await new Promise(ok=>setTimeout(ok,600));continue}throw e}}
    try{data=r.channels.map(c=>c.slice())}finally{r.release?.()}}
   if(s<1-1e-6)data=await resample(data);
   if(this.doc!==doc)throw Error('the audio changed while rendering; nothing was applied');
   const newLen=Math.max(1,Math.round(L*s)),off=Math.round(PAD*s),F=Math.min(Math.round(.005*sr),newLen>>2,L>>2);
   const channels=doc.channels.map((orig,c)=>{const k=picked.indexOf(c);if(k<0)return orig;const out=new Float32Array(doc.frames-L+newLen),part=data[k].subarray(off,off+newLen);out.set(orig.subarray(0,a));out.set(part,a);out.set(orig.subarray(b),a+newLen);
    if(a>0)for(let i=0;i<F;i++){const u=(i+.5)/F;out[a+i]=orig[a+i]*(1-u)+out[a+i]*u}
    if(b<doc.frames)for(let i=0;i<F;i++){const u=(i+.5)/F,at=a+newLen-F+i;out[at]=out[at]*(1-u)+orig[b-F+i]*u}
    return out});
   const edited=core().commitRender(doc,{documentId:doc.id,revision:doc.revision,channels,sampleRate:sr,selection:{start:a,end:a+newLen}},{label:'pitch / time'});
   const cents=1200*Math.log2(p),what=(Math.abs(p-1)>=1e-6?'pitch '+(cents>=0?'+':'')+fmt(cents,1)+' cents (× '+fmt(p,4)+')':'')+(Math.abs(p-1)>=1e-6&&Math.abs(s-1)>=1e-6?', ':'')+(Math.abs(s-1)>=1e-6?'length × '+fmt(s,4)+' ('+fmt(L/sr,2)+' → '+fmt(newLen/sr,2)+' s, pitch kept)':'');
   await this.publish(edited,'Pitch / Time: '+what);this.setNotice((whole?'Whole file: ':'Selection: ')+what+'. Undo brings the original back.')}
  catch(error){this.setNotice('Pitch / Time failed, nothing was changed: '+(error?.message||error))}
  finally{if(button)button.disabled=false}}
 /* a short visible line under the Pitch / Time controls (the editor status itself is for screen readers) */
 setNotice(text){this.setStatus(text);if(this.pitchNotice)this.pitchNotice.textContent=text}
 /* MTW-03: move the caret or both ends of the selection to the nearest zero crossing (within 5 ms), so that cuts, mutes and pastes do not click */
 snapZero(){const d=this.doc;if(!d?.frames)return;const win=Math.max(8,Math.round(d.sampleRate*.005)),chs=this.channel==='all'||d.channels.length<2?d.channels:[d.channels[this.channel==='R'?1:0]],sel=d.selection;
  const s=core().zeroCrossing(chs,sel.start,win),e=sel.end>sel.start?Math.max(s,core().zeroCrossing(chs,sel.end,win)):s;
  this.doc=core().setSelection(d,s,e);this.applySelection();this.refresh(false);this.setStatus(s===sel.start&&e===sel.end?'The selection already sits on zero crossings.':'Selection moved to zero crossings ('+(s-sel.start)+' / '+(e-sel.end)+' frames).')}
 /* MTW-01: what is measured. A caret without a range means the whole file. */
 measureRange(){const r=this.range();return r.end>r.start?{range:r,whole:r.start===0&&r.end===this.doc.frames}:{range:{start:0,end:this.doc.frames},whole:true}}
 analyze(){const {range,whole}=this.measureRange(),rows=[];for(const [index,samples] of this.doc.channels.entries()){let peak=0,sum=0,dc=0,clips=0;for(let f=range.start;f<range.end;f++){const v=samples[f];peak=Math.max(peak,Math.abs(v));sum+=v*v;dc+=v;if(Math.abs(v)>1)clips++}const count=Math.max(1,range.end-range.start);rows.push(`${this.doc.channels.length>1?index?'R':'L':'Mono'}  Peak ${peak?fmt(20*Math.log10(peak),2):'−∞'} dBFS · RMS ${sum?fmt(10*Math.log10(sum/count),2):'−∞'} dBFS\nDC ${fmt(dc/count,6)} · >0 dBFS ${clips} Frames`)}
  const m=core().loudness(this.doc.channels,this.doc.sampleRate,range),db=(v,unit)=>Number.isFinite(v)?fmt(v,1)+' '+unit:'−∞ '+unit;
  const programme=`Loudness ${db(m.integrated,'LUFS')} integrated${m.gated?'':' (shorter than 0.4 s: ungated)'}`+(m.shortTermMax!==null?` · range ${fmt(m.range,1)} LU · max short-term ${db(m.shortTermMax,'LUFS')}`:` · max momentary ${db(m.momentaryMax,'LUFS')}`)+`\nTrue peak ${db(m.truePeakDb,'dBTP')}`+(Number.isFinite(m.truePeakDb)&&Number.isFinite(m.integrated)?` · peak to loudness ${fmt(m.truePeakDb-m.integrated,1)} dB`:'')+(m.correlation!==null?` · L/R correlation ${m.correlation>=0?'+':''}${fmt(m.correlation,2)}`:'')+(m.truePeakDb>0?'\nTrue peak is above 0 dBTP: it will clip in PCM16 / PCM24 and after lossy encoding.':'');
  this.lastMeasure={revision:this.doc.revision,range,loudness:m};this.analysisElement.classList.remove('xwe-hidden');this.analysisElement.textContent=`${whole?'Whole file':'Selection'}: ${range.end-range.start} Frames · ${fmt((range.end-range.start)/this.doc.sampleRate,2)} s\n`+rows.join('\n\n')+'\n\n'+programme;this.setStatus('Analysis of the edited '+(whole?'file.':'selection.'));this.analysisElement.scrollIntoView({block:'nearest'});return m}
 /* AUDIO-ANALYSE-01: tempo, root, tuning and scale of the selection (caret only = whole file), at most the first 2 minutes. Reads only: no edit, no history entry.
    The work runs in one Worker built on the first press (KALT); a second press cancels. */
 async analyseTonal(){
  if(!this.doc?.frames||!this.tonalButton)return;
  if(this.tonalAbort){this.tonalAbort.abort();return}
  const wa=root.__XenLazyLoader.loadChunk('wave-analysis');
  const doc=this.doc,sr=doc.sampleRate,{range,whole}=this.measureRange(),a=range.start,b=Math.min(range.end,a+Math.round(wa.MAX_SEC*sr)),out=this.tonalElement,show=text=>{out.classList.remove('xwe-hidden');out.textContent=text};
  if(b-a<4*sr){show('Select at least 4 seconds for the analysis, or place the caret to analyse the whole file.');this.setStatus('Analysis: select at least 4 seconds.');return}
  const picked=this.channel==='all'||doc.channels.length<2?doc.channels:[doc.channels[this.channel==='R'?1:0]],mono=new Float32Array(b-a);
  for(const channel of picked)for(let i=0;i<mono.length;i++)mono[i]+=channel[a+i]/picked.length;
  const abort=new AbortController(),button=this.tonalButton,name=button.querySelector('.xwe-chromatic-label'),label=name.textContent;this.tonalAbort=abort;
  const set=(fraction)=>{name.textContent='Cancel · '+Math.round(fraction*100)+' %';show('Analysing tempo, tuning and scale in the background … '+Math.round(fraction*100)+' %')};set(0);
  try{
    const result=await wa.run(mono,sr,{signal:abort.signal,onProgress:set});
    if(this.doc?.revision!==doc.revision){show('The audio was edited during the analysis. Press the button again.');return}
    result.sections=(result.sections||[]).map(s=>({...s,startSec:s.startSec+a/sr,endSec:s.endSec+a/sr}));
    const span=wa.time(a/sr)+'–'+wa.time(b/sr),cut=range.end>b?' · the first '+wa.time((b-a)/sr)+' of the '+wa.time((range.end-a)/sr)+' range (the limit is 2:00 per analysis)':'';
    show((whole?'Whole file ':'Selection ')+span+cut+'\n'+wa.text(result)+'\nEstimates from detected pitch lines; dense chords, drums and effects can blur them. Accuracy = how clearly the audio decides the value, not a measured error.');
    this.setStatus('Analysis done: '+(result.bpm?result.bpm.bpm.toFixed(1)+' BPM':'no steady pulse')+(result.tonal&&!result.tonal.none&&result.tonal.tuning.length?', root '+result.tonal.root.hz+' Hz, '+result.tonal.tuning[0].label:'')+'.');
    out.scrollIntoView({block:'nearest'});
  }catch(error){if(error?.name==='AbortError')show('Analysis canceled.');else{show('Analysis failed: '+(error?.message||error));this.setStatus('Analysis failed.')}}
  finally{if(this.tonalAbort===abort)this.tonalAbort=null;name.textContent=label}}
 /* MTW-01: bring the selection (or the whole file) to a loudness target with ONE gain step (the existing Gain edit: undo, channels and history as usual).
    The true peak stays at or below the ceiling: if the target would push it higher, the gain is reduced and the status says what was reached. */
 async normalizeLoudness(){if(!this.doc?.frames)return;if(this.warnUnappliedFx('Normalize Loudness'))return;const target=clamp(Number(this.lufsInput?.value),-70,-5),ceiling=-1;if(!Number.isFinite(target)){this.setStatus('Enter a loudness target in LUFS (for example -14).');return}
  const {range,whole}=this.measureRange(),picked=this.channel==='all'||this.doc.channels.length<2?this.doc.channels:[this.doc.channels[this.channel==='R'?1:0]],m=core().loudness(picked,this.doc.sampleRate,range);if(!Number.isFinite(m.integrated)){this.setStatus('Nothing to normalize: the '+(whole?'file':'selection')+' is silent.');return}
  let gain=target-m.integrated;const limited=m.truePeakDb+gain>ceiling;if(limited)gain=ceiling-m.truePeakDb;if(Math.abs(gain)<.005){this.setStatus(`Already at ${fmt(m.integrated,1)} LUFS.`);return}
  if(this.doc.selection.end<=this.doc.selection.start)this.doc=core().setSelection(this.doc,range.start,range.end);
  await this.runEdit('gain',{db:gain});
  const reached=m.integrated+gain,note=`Loudness ${fmt(m.integrated,1)} → ${fmt(reached,1)} LUFS (${gain>=0?'+':''}${fmt(gain,2)} dB), true peak ${fmt(m.truePeakDb+gain,1)} dBTP`+(limited?` · the target ${fmt(target,1)} LUFS was not reached: the true peak is held at ${ceiling} dBTP. Use the limiter or compressor first to go louder.`:'.');
  if(this.nodes.length)return;/* the edit was refused (unapplied effects): its own notice stays */
  if(this.analysisElement){this.analyze();this.analysisElement.textContent=note+'\n\n'+this.analysisElement.textContent}this.setStatus(note)}
 saveProject(){try{this.download(core().exportProject(this.doc),'XenSonar_W01_Project.xwe');this.setStatus('Lossless project exported with original audio and bounded undo history. Save unapplied FX separately as a chain preset.')}catch(error){this.setStatus(error.message)}}
 async readProject(file){if(!file)return;if(this.warnUnappliedFx('Load Project'))return;try{const next=core().decodeProject(await file.arrayBuffer());await this.publish(next,'Project file loaded')}catch(error){this.setStatus(error.message)}}
 savePreset(){if(this.nodes.some(n=>n.type==='liveRoomEQ')){this.setStatus('Live-Room EQ: Apply / Bake before saving the chain preset. Offline curves must not be silently omitted.');return}const preset={version:'xen-wave-chain-w01',sampleRate:this.doc.sampleRate,origin:this.doc.selection.start,nodes:this.nodes};this.download(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),'XenSonar_W01_Effect Chain.json');this.setStatus('Effect chain saved with absolute automation frames.')}
 loadPreset(){this.presetInput.click()}
 async readPreset(file){if(!file)return;if(this.warnUnappliedFx('Load Chain Preset'))return;try{const p=JSON.parse(await file.text());if(p.version!=='xen-wave-chain-w01'||!Array.isArray(p.nodes))throw Error('Not a W01 effect-chain preset.');const rate=this.doc.sampleRate/(p.sampleRate||this.doc.sampleRate),offset=this.doc.selection.start-(p.origin||0)*rate,allowed=new Set(registry().map(x=>x.type));this.releaseOfflineEQState();this.nodes=p.nodes.filter(n=>allowed.has(n.type)).map(n=>({...n,id:'fx-'+(++serial),targetRange:{start:clamp(Math.round(n.targetRange.start*rate+offset),0,this.doc.frames-1),end:clamp(Math.round(n.targetRange.end*rate+offset),1,this.doc.frames)},automation:Object.fromEntries(Object.entries(n.automation||{}).map(([key,lane])=>[key,{...lane,points:lane.points.map(q=>({...q,frame:Math.round(q.frame*rate+offset)}))}]))}));this.activeNode=this.nodes[0]?.id;this.invalidate();this.refresh();this.setStatus('Chain preset aligned to the current selection.')}catch(error){this.setStatus(error.message)}}
}
/* PLAYHEAD-CLOCK: the running time above a playhead, e.g. 2:33.4; one formatter for the editor's own playhead and the Forge loop playhead (m:ss.t) */
function clockLabel(sec){const t=Math.max(0,Number(sec)||0),m=Math.floor(t/60),s=t-m*60,x=s.toFixed(1);return (x==='60.0'?(m+1)+':00.0':m+':'+(s<10?'0':'')+x)}
root.__XenWaveUIW01=Object.freeze({attach,setAwake(on){forgeAwake=!!on;for(const e of liveEditors)e.setAwake(forgeAwake)},drawStereo,clockLabel,parseInterval,enabled(canvas){const e=instances.get(canvas);return !!(e?.enabled&&e?.overlay)},open(canvas){instances.get(canvas)?.open()},getEditor(canvas){return instances.get(canvas)},drawEditSelection(ctx,canvas,view,width,height){instances.get(canvas)?.drawEditOverlay(ctx,view,width,height)},version:'W15-mixpaste-perchannel-percent'});
})(globalThis);
globalThis.__XenWaveUIW01;
