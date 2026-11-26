/* XenSonar Wave Editor W01: deterministic offline DSP. No live-audio hooks. */
(function installWaveDSP(global) {
  'use strict';
  function makeRegistry() {
    const p = (label, unit, min, max, value, neutral, log) => ({type:'number', label, unit, min, max, default:value, neutral:neutral === undefined ? null : neutral, log:!!log, scale:log?'log':'linear', automateAllowed:true, smoothingMs:5});
    const frequency = () => p('Frequenz','Hz',20,20000,1000,null,true);
    const q = () => p('Resonanz Q','',0.1,30,0.70710678118);
    const wet = (value) => p('Effektanteil','',0,1,value,0);
    const rate = () => p('LFO-Frequenz','Hz',0.01,20,0.5,null,true);
    const effect = (label, category, params, description) => ({label,category,params,description,version:1,available:true});
    return {
      gain:effect('Verstärkung','Lautstärke & Dynamik',{gainDb:p('Verstärkung','dB',-96,36,0,0)},'Pegelautomation in dB; 0 dB ist bitidentisch.'),
      fadeIn:effect('Einblenden','Lautstärke & Dynamik',{curve:p('Kurvenexponent','',0.1,8,1)},'Auswahl von null bis zum ursprünglichen Pegel.'),
      fadeOut:effect('Ausblenden','Lautstärke & Dynamik',{curve:p('Kurvenexponent','',0.1,8,1)},'Auswahl vom ursprünglichen Pegel bis null.'),
      lowpass:effect('Tiefpass','Filter & EQ',{frequency:frequency(),q:q()},'Zweipoliger RBJ-Biquad.'),
      highpass:effect('Hochpass','Filter & EQ',{frequency:frequency(),q:q()},'Zweipoliger RBJ-Biquad.'),
      bandpass:effect('Bandpass','Filter & EQ',{frequency:frequency(),q:q()},'Bandpass mit konstantem Spitzenpegel.'),
      notch:effect('Kerbfilter','Filter & EQ',{frequency:frequency(),q:q()},'Zweipolige Bandsperre.'),
      peaking:effect('Parametrischer EQ','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Parametrisches Bell-Band; 0 dB ist bitidentisch.'),
      lowshelf:effect('Low Shelf','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Tiefen-Shelving; Q steuert den Übergang.'),
      highshelf:effect('High Shelf','Filter & EQ',{frequency:frequency(),q:q(),gainDb:p('Bandverstärkung','dB',-36,36,0,0)},'Höhen-Shelving; Q steuert den Übergang.'),
      compressor:effect('Kompressor','Lautstärke & Dynamik',{thresholdDb:p('Schwelle','dB',-72,0,-18),ratio:p('Verhältnis',':1',1,30,4,1),kneeDb:p('Knie','dB',0,24,6),attackMs:p('Attack','ms',0.1,200,10,null,true),releaseMs:p('Release','ms',5,3000,150,null,true),makeupDb:p('Aufholverstärkung','dB',-24,24,0,0)},'Stereo-gekoppelter Peak-Kompressor mit weichem Knie.'),
      limiter:effect('Lookahead-Limiter','Lautstärke & Dynamik',{ceilingDb:p('Ceiling','dB',-24,0,-1),releaseMs:p('Release','ms',5,2000,80,null,true),lookaheadMs:Object.assign(p('Vorausschau','ms',0,20,3),{automateAllowed:false})},'Stereo-gekoppelte Peak-Begrenzung mit vorausberechnetem Fenster; keine Zeitverschiebung. Vorausschau ist pro Render fest.'),
      gate:effect('Gate / Expander','Lautstärke & Dynamik',{thresholdDb:p('Schwelle','dB',-96,-3,-45),ratio:p('Expansionsverhältnis',':1',1,20,4,1),attackMs:p('Attack','ms',0.1,200,2,null,true),releaseMs:p('Release','ms',5,3000,120,null,true)},'Stereo-gekoppelte Abwärts-Expansion mit geglätteter Verstärkung.'),
      delay:effect('Delay / Echo','Delay & Raum',{delayMs:p('Delayzeit','ms',1,2000,250,null,true),feedback:p('Rückkopplung','',-0.95,0.95,0.35),wet:wet(0.3)},'Fraktionales Stereo-Delay, Dry = 1 − Wet; explizite Tail-Behandlung.'),
      reverb:effect('Algorithmischer Hall','Delay & Raum',{roomSize:p('Raumgröße','',0,1,0.65),damping:p('Höhendämpfung','',0,0.95,0.45),wet:wet(0.25)},'Vier gedämpfte parallele Kammfilter plus zwei Allpässe pro Kanal.'),
      phaser:effect('Phaser','Modulation',{rateHz:rate(),depth:p('Modulationstiefe','',0,1,0.65),feedback:p('Rückkopplung','',-0.9,0.9,0.25),wet:wet(0.5)},'Sechs zeitvariable Allpass-Stufen mit Rückkopplung.'),
      flanger:effect('Flanger','Modulation',{rateHz:rate(),depthMs:p('Modulationstiefe','ms',0,8,2),delayMs:p('Basisdelay','ms',0.2,15,3),feedback:p('Rückkopplung','',-0.9,0.9,0.4),wet:wet(0.5)},'Fraktionales moduliertes Delay mit Stereo-LFO-Offset.'),
      chorus:effect('Chorus','Modulation',{rateHz:rate(),depthMs:p('Modulationstiefe','ms',0,15,5),delayMs:p('Basisdelay','ms',5,40,18),feedback:p('Rückkopplung','',-0.7,0.7,0.1),wet:wet(0.35)},'Zwei fraktionale modulierte Stimmen je Kanal.'),
      tremolo:effect('Tremolo','Modulation',{rateHz:rate(),depth:p('Modulationstiefe','',0,1,0.5,0)},'Sinusförmige, kanalgekoppelte Amplitudenmodulation.'),
      pan:effect('Stereo-Balance','Stereo & Kanäle',{pan:p('Balance','',-1,1,0,0)},'Mitte ist unverändert; Links/Rechts dämpft den gegenüberliegenden Kanal. Mono bleibt mono.'),
      width:effect('Stereobreite','Stereo & Kanäle',{width:p('Stereobreite','',0,3,1,1)},'Mid bleibt konstant, Side wird skaliert; 1 ist bitidentisch. Mono bleibt mono.'),
      distortion:effect('Sättigung / Distortion','Lautstärke & Dynamik',{driveDb:p('Drive','dB',0,36,0,0),wet:wet(0.5)},'tanh-Sättigung mit Drive-Überblendung und zweifach abgetasteter Differenzkorrektur; keine aliasfreie Mastering-Sättigung.'),
      overdrive:effect('Overdrive · Soft Diode','Verzerrung & Amp',{driveDb:p('Drive','dB',0,40,14,0),tone:p('Tone','',0,1,0.5),outputDb:p('Output','dB',-24,12,0,0),wet:wet(1)},'Frequenzgeformter asymmetrischer Softclip: warm, anschlagdynamisch, 4× Oversampling plus FIR-Rückfilterung.'),
      hardDistortion:effect('Distortion · Hard Clip','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,19,0),tone:p('Tone','',0,1,0.6),outputDb:p('Output','dB',-24,12,-3,0),wet:wet(1)},'Asymmetrische harte Begrenzung mit dichter Obertonstruktur, Pre-/Postfilter und 8×-Antialiasing.'),
      fuzz:effect('Fuzz · Dynamic Bias','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,24,0),tone:p('Tone','',0,1,0.65),gate:p('Gate','',0,1,0.16,0),outputDb:p('Output','dB',-24,12,-3,0),wet:wet(1)},'Dynamischer Arbeitspunkt, hochverstärkte Begrenzung und einstellbares Gate: rauer Transistor-Fuzz-Charakter.'),
      ampCrunch:effect('Amp Crunch · Cascaded','Verzerrung & Amp',{driveDb:p('Drive','dB',0,42,16,0),tone:p('Tone','',0,1,0.50),bias:p('Bias','',-1,1,0.22,0),outputDb:p('Output','dB',-24,12,-1,0),wet:wet(1)},'Kaskadierte asymmetrische Sättigungsstufen, Eingangshochpass und Ausgangstonfilter, mit 4×-Antialiasing.'),
      /* FX-PALETTE-01 (from the Live Room's Collective Memory and Schwarmdeuter, rebuilt as offline DSP; see docs/REVIEW_LIVE_FX_2026-11-25.md) */
      tuningResonator:effect('Tuning Resonator · Harmonic Memory','Resonance & Material',{memorySec:p('Memory (ring time)','s',0.05,12,1.6,null,true),set:Object.assign(p('Pitch set','',0,4,2),{automateAllowed:false,step:1,options:['Harmonics','JI 5-limit','JI 7-limit','EDO','Bohlen–Pierce']}),edo:Object.assign(p('EDO steps (set 3)','',5,72,31),{automateAllowed:false,step:1}),rootHz:Object.assign(p('Root (0 = from the audio)','Hz',0,2000,0,null,false),{automateAllowed:false}),lowHz:Object.assign(p('Lowest resonance','Hz',30,2000,60,null,true),{automateAllowed:false}),highHz:Object.assign(p('Highest resonance','Hz',400,16000,5000,null,true),{automateAllowed:false}),excite:p('Excite (saturation)','',0,1,0.2),spreadCents:Object.assign(p('Stereo detune','ct',0,40,7),{automateAllowed:false}),wet:wet(0.45)},'A bank of resonators on a pitch set: the harmonics or a just / EDO / Bohlen–Pierce scale over a root that is found in the audio itself ("harmonic memory") or typed. Memory = how long each tone rings. The resonance is level-matched to the input; Excite drives it.'),
      materialResonator:effect('Material Resonator · Swarm Materials','Resonance & Material',{material:Object.assign(p('Material','',0,5,0),{automateAllowed:false,step:1,options:['Glass','Metal','Resin','Fungus','Dust','Plasma']}),crystal:p('Crystal (resonance)','',0,1,0.5),fracture:p('Fracture (cracks on attacks)','',0,1,0.5),weave:p('Weave (stereo braid echo)','',0,1,0.4),undercurrent:p('Undercurrent (low bed)','',0,1,0.5),follow:p('Follow the audio','',0,1,0.7),wet:wet(0.55)},'Four material voices from the Swarm Interpreter – resonance (resin), cracks (fracture), a crossed stereo echo (braid) and a low undercurrent – shaped by six material profiles and steered by the loudness, attacks and brightness of the audio itself.'),
      wavefolder:effect('Wavefolder · Spiral Fold','Distortion & Amp',{driveDb:p('Fold drive','dB',0,36,12,0),shape:p('Shape sine ↔ triangle','',0,1,0.3),symmetry:p('Symmetry (even harmonics)','',-1,1,0,0),wet:wet(1)},'From the Psychedelic Spiral: instead of clipping, the wave folds back on itself – bell-like, metallic overtones that grow with the drive. 4× oversampled, DC-free.'),
      /* FX-NET-01: devices of other rooms as Wave Editor effects (engine 'graph': rendered offline through their own Web Audio / AudioWorklet code) */
      psyLabFx:Object.assign(effect('Psy Lab FX · patch chain','Room Devices',{patch:Object.assign(p('Psy Lab patch','',0,127,0),{automateAllowed:false,step:1,optionsFrom:'psylabPatches'}),wet:Object.assign(wet(1),{automateAllowed:false})},'The effect chain of a Psy Lab patch on this audio: filter, crystal resonators, frequency shifter, spiral echo, space cloud, chaos and drive – the same engine as the Psy Lab room (your own patches included).'),{engine:'graph'}),
      spiralFx:Object.assign(effect('Spiral · Multitrack bus','Room Devices',{drive:Object.assign(p('Fold','',0,1,.42),{automateAllowed:false}),color:Object.assign(p('Color','',0,1,.55),{automateAllowed:false}),motion:Object.assign(p('Motion','',0,1,.58),{automateAllowed:false}),feedback:Object.assign(p('Regen','',0,.9,.34),{automateAllowed:false}),wet:Object.assign(wet(.4),{automateAllowed:false})},'The Psychedelic Spiral send bus of the Multitrack on this audio: wavefolder, circling phasers, crossed stereo echo.'),{engine:'graph'}),
      masterStripFx:Object.assign(effect('Master Strip · Glue Tape Air Limit','Room Devices',{glue:Object.assign(p('Glue','',0,1,.35),{automateAllowed:false}),tape:Object.assign(p('Tape','',0,1,0),{automateAllowed:false}),air:Object.assign(p('Air','dB',-6,9,0),{automateAllowed:false}),ceil:Object.assign(p('Limit ceiling','dB',-12,-.1,-1),{automateAllowed:false})},'The master strip of the Multitrack on this audio: bus compressor, tape saturation, air shelf and a soft limiter that never passes the ceiling.'),{engine:'graph'}),
    };
  }

  /* This function is serialized into the Blob worker. It deliberately closes over nothing. */
  function workerEngine(registry) {
    'use strict';
    const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
    const db = value => Math.pow(10,value/20);
    const TAU = Math.PI*2;
    const MAX_TAIL_SECONDS = 20;
    let sampleRate = 48000;
    function fail(message) { throw new Error(message); }
    function selectedIndices(node, count) {
      if (node.channels === 'L') return [0];
      if (node.channels === 'R') { if (count < 2) fail('Rechter Kanal ist in dieser Monoquelle nicht vorhanden.'); return [1]; }
      return Array.from({length:count},(_,i)=>i);
    }
    function prepare(node) {
      const spec=registry[node.type];
      if (!spec) fail('Unbekannter Effekt: '+node.type);
      const params={}, automation={};
      Object.keys(node.params||{}).forEach(k=>{if (!spec.params[k]) fail('Unbekannter Parameter: '+node.type+'.'+k);});
      Object.keys(node.automation||{}).forEach(k=>{if (!spec.params[k]) fail('Unbekannte Automationsspur: '+node.type+'.'+k);});
      for (const key of Object.keys(spec.params)) {
        const desc=spec.params[key], raw=node.params && node.params[key];
        if (raw !== undefined && !Number.isFinite(raw)) fail('Nicht endlicher Effektparameter: '+key);
        params[key]=clamp(raw===undefined?desc.default:raw,desc.min,desc.max);
        const lane=node.automation && node.automation[key];
        if (!lane) continue;
        if (!desc.automateAllowed && lane.points && lane.points.length) fail('Parameter ist pro Render fest: '+key);
        if (!Array.isArray(lane.points)) fail('Automation benötigt points: '+key);
        if (lane.interpolation && !['linear','hold'].includes(lane.interpolation)) fail('Unbekannte Automationsinterpolation.');
        const sorted=lane.points.map(point=>{
          if (!Number.isSafeInteger(point.frame)||point.frame<0||!Number.isFinite(point.value)) fail('Ungültiger Automationspunkt: '+key);
          return {frame:point.frame,value:clamp(point.value,desc.min,desc.max)};
        }).sort((a,b)=>a.frame-b.frame);
        const points=[];
        for (const point of sorted) {if(points.length&&points[points.length-1].frame===point.frame) points[points.length-1]=point;else points.push(point);}
        if(points.length) automation[key]={points,interpolation:lane.interpolation||'linear'};
      }
      return Object.assign({},node,{params,automation});
    }
    function isConstant(node,key,value) {
      const lane=node.automation[key];
      return lane ? lane.points.every(p=>p.value===value) : node.params[key]===value;
    }
    function neutral(node,count) {
      if(node.enabled===false||node.bypass===true) return true;
      switch(node.type) {
        case 'gain':return isConstant(node,'gainDb',0);
        case 'peaking':case 'lowshelf':case 'highshelf':return isConstant(node,'gainDb',0);
        case 'compressor':return isConstant(node,'ratio',1)&&isConstant(node,'makeupDb',0);
        case 'gate':return isConstant(node,'ratio',1);
        case 'delay':case 'reverb':case 'phaser':case 'flanger':case 'chorus':case 'tuningResonator':case 'materialResonator':return isConstant(node,'wet',0);
        case 'tremolo':return isConstant(node,'depth',0);
        case 'pan':return count<2||isConstant(node,'pan',0);
        case 'width':return count<2||isConstant(node,'width',1);
        case 'distortion':case 'overdrive':case 'hardDistortion':case 'fuzz':case 'ampCrunch':return isConstant(node,'driveDb',0)||isConstant(node,'wet',0);
        case 'wavefolder':return isConstant(node,'wet',0);
        default:return false;
      }
    }
    function evaluators(node,start) {
      const result={};
      for (const key of Object.keys(registry[node.type].params)) {
        const lane=node.automation[key], desc=registry[node.type].params[key];
        if (!lane) {const value=node.params[key];result[key]=()=>value;continue;}
        const points=lane.points;
        let index=0, lastFrame=start, smooth;
        const alpha=1-Math.exp(-1/(sampleRate*desc.smoothingMs/1000));
        result[key]=frame=>{
          if(frame<lastFrame) index=0;
          while(index+1<points.length&&points[index+1].frame<=frame) index++;
          const a=points[index], b=points[index+1];
          let value;
          if(frame<=points[0].frame) value=points[0].value;
          else if(!b||lane.interpolation==='hold') value=a.value;
          else {const t=clamp((frame-a.frame)/(b.frame-a.frame),0,1);value=desc.log&&a.value>0&&b.value>0?Math.exp(Math.log(a.value)+(Math.log(b.value)-Math.log(a.value))*t):a.value+(b.value-a.value)*t;}
          if(lane.interpolation==='hold'&&smooth!==undefined) smooth+= (value-smooth)*(1-Math.pow(1-alpha,Math.max(1,frame-lastFrame)));
          else smooth=value;
          lastFrame=frame;return smooth;
        };
      }
      return result;
    }
    function bounds(node,key) {
      const lane=node.automation[key];
      return lane?lane.points.reduce((b,p)=>[Math.min(b[0],p.value),Math.max(b[1],p.value)],[Infinity,-Infinity]):[node.params[key],node.params[key]];
    }
    function tailFrames(node) {
      let seconds=0;
      if(node.type==='delay'||node.type==='flanger'||node.type==='chorus') {
        const feedback=Math.max(...bounds(node,'feedback').map(Math.abs));
        const repeats=feedback>0?Math.max(1,Math.ceil(Math.log(0.00001)/Math.log(feedback))):1;
        const maxMs=bounds(node,'delayMs')[1]+(node.type==='delay'?0:bounds(node,'depthMs')[1]);
        seconds=maxMs/1000*(repeats+1);
      } else if(node.type==='reverb') seconds=1.5+8*bounds(node,'roomSize')[1];
      else if(node.type==='tuningResonator') seconds=Math.min(12,bounds(node,'memorySec')[1]*1.2);
      else if(node.type==='materialResonator') seconds=2.5;
      // Phaser is a selection-bounded phase effect, not an echo/reverb.
      // Its internal all-pass feedback is processed within selection only.
      return Math.ceil(Math.min(MAX_TAIL_SECONDS,seconds)*sampleRate);
    }
    function biquad(type,frequency,q,gain) {
      const w=TAU*clamp(frequency,5,sampleRate*0.49)/sampleRate, c=Math.cos(w), s=Math.sin(w), alpha=s/(2*q), A=Math.pow(10,gain/40);
      let b0,b1,b2,a0,a1,a2;
      if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='bandpass'){b0=alpha;b1=0;b2=-alpha;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='notch'){b0=1;b1=-2*c;b2=1;a0=1+alpha;a1=-2*c;a2=1-alpha;}
      else if(type==='peaking'){b0=1+alpha*A;b1=-2*c;b2=1-alpha*A;a0=1+alpha/A;a1=-2*c;a2=1-alpha/A;}
      else {const z=2*Math.sqrt(A)*alpha;
        if(type==='lowshelf'){b0=A*((A+1)-(A-1)*c+z);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-z);a0=(A+1)+(A-1)*c+z;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-z;}
        else {b0=A*((A+1)+(A-1)*c+z);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-z);a0=(A+1)-(A-1)*c+z;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-z;}
      }
      return [b0/a0,b1/a0,b2/a0,a1/a0,a2/a0];
    }
    // State belongs to each processed channel; a warm-up pass may seed it
    // from untouched *preceding* audio. The warm-up audio is never committed.
    function processFilter(data,node,ev,start,initialStates) {
      const states=initialStates||data.map(()=>[0,0]);
      const n=data[0].length;
      let coeff=biquad(node.type,ev.frequency(start),ev.q(start),ev.gainDb?ev.gainDb(start):0);
      for(let i=0;i<n;) {
        const count=Math.min(16,n-i), at=start+i+count;
        const target=biquad(node.type,ev.frequency(at),ev.q(at),ev.gainDb?ev.gainDb(at):0);
        const step=target.map((v,k)=>(v-coeff[k])/count);
        for(let j=0;j<count;j++,i++) {
          for(let c=0;c<data.length;c++) {
            const x=data[c][i], state=states[c], y=coeff[0]*x+state[0];
            state[0]=coeff[1]*x-coeff[3]*y+state[1];state[1]=coeff[2]*x-coeff[4]*y;
            data[c][i]=y;
          }
          for(let k=0;k<5;k++) coeff[k]+=step[k];
        }
      }
      return states;
    }
    // The render buffer normally starts exactly at the purple range boundary.
    // Warm-up the seven stateful Biquads using a bounded preceding input window
    // (with absolute-frame automation) so they do not start at a false zero.
    function processSelectionFilter(data,node,ev,start,indices,channels,serialContext) {
      const length=data[0].length;
      const minFreq=Math.max(20,Math.min(...bounds(node,'frequency')));
      const maxQ=Math.max(.1,Math.max(...bounds(node,'q')));
      // High-Q resonances retain state far longer than a simple lowpass.
      // About five pole-decay time constants, capped at two seconds.
      const warmSeconds=Math.max(.05,Math.min(2,5*maxQ/(Math.PI*minFreq)));
      const warmFrames=serialContext&&!serialContext.first?0:Math.min(start,Math.ceil(sampleRate*warmSeconds));
      let initialStates;
      if(warmFrames>0) {
        const preStart=start-warmFrames;
        const previous=indices.map(c=>new Float32Array(channels[c].subarray(preStart,start)));
        initialStates=processFilter(previous,node,evaluators(node,preStart),preStart);
      }
      processFilter(data,node,ev,start,initialStates);
      // The input signal outside the purple range is immutable. Smooth only
      // the selected edge samples, crossfading *dry to wet*, never from zero.
      // Document edges have no neighboring sample and need no seam taper.
      if(length<4) {
        // A 1–3 frame selection cannot fit a click-safe filter transition.
        // Preserve the selected samples rather than introducing an impulse.
        for(let c=0;c<indices.length;c++)data[c].set(serialContext?serialContext.input[indices[c]].subarray(0,length):channels[indices[c]].subarray(start,start+length));
        return;
      }
      const transition=Math.max(2,Math.min(Math.round(sampleRate*.003),Math.floor(length/2)));
      const blendAt=(i,x)=>{
        const wet=.5-.5*Math.cos(Math.PI*x);
        for(let c=0;c<indices.length;c++) {
          const dry=serialContext?serialContext.input[indices[c]][i]:channels[indices[c]][start+i],processed=data[c][i];
          data[c][i]=dry+(processed-dry)*wet;
        }
      };
      // Process only the two short transition windows. No extra O(song length)
      // pass over the filtered selection is necessary.
      if(start>0)for(let i=0;i<transition;i++)blendAt(i,i/transition);
      if(start+length<channels[0].length&&(!serialContext||length===serialContext.selectionLength))for(let i=0;i<transition;i++){
        const at=length-1-i;
        blendAt(at,i/transition);
      }
    }
    function dynamics(data,node,ev,start) {
      const n=data[0].length;
      if(node.type==='limiter') {
        const look=Math.round(bounds(node,'lookaheadMs')[1]*sampleRate/1000);
        const peaks=new Float64Array(n), windowPeak=new Float64Array(n), queue=new Int32Array(n);
        for(let i=0;i<n;i++) for(let c=0;c<data.length;c++) peaks[i]=Math.max(peaks[i],Math.abs(data[c][i]));
        let head=0,tail=0;
        for(let i=n-1;i>=0;i--) {
          while(tail>head&&queue[head]>i+look) head++;
          while(tail>head&&peaks[queue[tail-1]]<=peaks[i]) tail--;
          queue[tail++]=i;windowPeak[i]=peaks[queue[head]];
        }
        let gain=1;
        for(let i=0;i<n;i++) {
          const ceiling=db(ev.ceilingDb(start+i));
          const target=Math.min(1,ceiling/Math.max(windowPeak[i],1e-30));
          const release=Math.exp(-1/(sampleRate*ev.releaseMs(start+i)/1000));
          gain=target<gain?target:target+(gain-target)*release;
          gain=Math.min(gain,ceiling/Math.max(peaks[i],1e-30));
          for(let c=0;c<data.length;c++) data[c][i]*=gain;
        }
        return;
      }
      let gain=1, envelope=0;
      for(let i=0;i<n;i++) {
        const frame=start+i, threshold=ev.thresholdDb(frame), ratio=ev.ratio(frame);
        let peak=0;for(let c=0;c<data.length;c++) peak=Math.max(peak,Math.abs(data[c][i]));
        // A peak follower avoids opening/closing repeatedly at every waveform zero crossing.
        const detectorRelease=Math.exp(-1/(sampleRate*Math.max(10,ev.releaseMs(frame))/1000));
        envelope=Math.max(peak,envelope*detectorRelease);
        const level=20*Math.log10(Math.max(envelope,1e-20)), over=level-threshold;
        let reduction=0;
        if(node.type==='gate') reduction=over<0?Math.max(-120,over*(ratio-1)):0;
        else {
          const knee=ev.kneeDb(frame), slope=1/ratio-1;
          if(knee>0&&Math.abs(over)<knee/2) reduction=slope*Math.pow(over+knee/2,2)/(2*knee);
          else if(over>=knee/2) reduction=slope*over;
        }
        const target=db(reduction);
        const opening=node.type==='gate'?target>gain:target<gain;
        const ms=opening?ev.attackMs(frame):ev.releaseMs(frame);
        const coeff=Math.exp(-1/(sampleRate*ms/1000));gain=target+(gain-target)*coeff;
        const makeup=node.type==='compressor'?db(ev.makeupDb(frame)):1;
        for(let c=0;c<data.length;c++) data[c][i]*=gain*makeup;
      }
    }
    function fractional(buffer,position) {
      const n=buffer.length;
      position=((position%n)+n)%n;
      const a=Math.floor(position), t=position-a;
      return buffer[a]*(1-t)+buffer[(a+1)%n]*t;
    }
    function delay(data,node,ev,start) {
      const n=data[0].length, mod=node.type!=='delay', chorus=node.type==='chorus';
      const maxMs=bounds(node,'delayMs')[1]+(mod?bounds(node,'depthMs')[1]:0);
      const buffers=data.map(()=>new Float64Array(Math.ceil(maxMs*sampleRate/1000)+4));
      let phase=0;
      for(let i=0;i<n;i++) {
        const frame=start+i, base=ev.delayMs(frame)*sampleRate/1000, depth=mod?ev.depthMs(frame)*sampleRate/1000:0, feedback=ev.feedback(frame),wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const ring=buffers[c], cursor=i%ring.length, x=data[c][i];
          const offset=c*0.7;
          const time=Math.max(1,base+depth*Math.sin(phase+offset));
          let y=fractional(ring,cursor-time);
          if(chorus) y=(y+fractional(ring,cursor-Math.max(1,base+depth*Math.sin(phase*1.13+2.1+offset))))*0.5;
          ring[cursor]=x+feedback*y;data[c][i]=x*(1-wet)+y*wet;
        }
        if(mod) phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;
      }
    }
    function reverb(data,node,ev,start) {
      const scale=sampleRate/44100, combTimes=[1116,1277,1422,1557], allTimes=[225,556];
      const state=data.map((_,c)=>({combs:combTimes.map(t=>({ring:new Float64Array(Math.max(2,Math.round((t+c*23)*scale))),pos:0,low:0})),all:allTimes.map(t=>({ring:new Float64Array(Math.max(2,Math.round((t+c*17)*scale))),pos:0}))}));
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i, room=0.65+0.31*ev.roomSize(frame), damp=ev.damping(frame), wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const x=data[c][i], s=state[c];let sum=0;
          for(const comb of s.combs) {const y=comb.ring[comb.pos];comb.low=y*(1-damp)+comb.low*damp;comb.ring[comb.pos]=x+comb.low*room;comb.pos=(comb.pos+1)%comb.ring.length;sum+=y*0.25;}
          for(const all of s.all) {const delayed=all.ring[all.pos], y=delayed-0.5*sum;all.ring[all.pos]=sum+0.5*y;all.pos=(all.pos+1)%all.ring.length;sum=y;}
          data[c][i]=x*(1-wet)+sum*wet;
        }
      }
    }
    function phaser(data,node,ev,start) {
      const state=data.map(()=>({x:new Float64Array(6),y:new Float64Array(6),feedback:0}));let phase=0;
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i, depth=ev.depth(frame), feedback=ev.feedback(frame), wet=ev.wet(frame);
        for(let c=0;c<data.length;c++) {
          const s=state[c], dry=data[c][i];let x=dry+feedback*s.feedback;
          for(let stage=0;stage<6;stage++) {
            const freq=clamp(350*Math.pow(1.7,stage)*Math.pow(6,depth*Math.sin(phase+c*0.15)),20,sampleRate*0.45);
            const tangent=Math.tan(Math.PI*freq/sampleRate), a=(tangent-1)/(tangent+1);
            const y=a*x+s.x[stage]-a*s.y[stage];s.x[stage]=x;s.y[stage]=y;x=y;
          }
          s.feedback=x;data[c][i]=dry*(1-wet)+x*wet;
        }
        phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;
      }
    }
    // W13 offline nonlinear pedals: prefilter -> nonlinear stage -> postfilter.
    // 4x/8x oversampling and matched 65/129-tap windowed-sinc FIR are kept
    // entirely in the existing Worker. This is alias REDUCTION, not an assertion
    // of alias-free clipping or an exact analog circuit emulation.
    const distortionFIR=(factor)=>{
      const count=factor===8?129:65,center=(count-1)/2,cutoff=0.42/factor,taps=new Float64Array(count);
      let total=0;
      for(let i=0;i<count;i++){
        const x=i-center;
        const sinc=x===0?2*cutoff:Math.sin(2*Math.PI*cutoff*x)/(Math.PI*x);
        const window=0.42+0.5*Math.cos(Math.PI*x/center)+0.08*Math.cos(2*Math.PI*x/center);
        taps[i]=sinc*window;total+=taps[i];
      }
      for(let i=0;i<count;i++)taps[i]/=total;
      return taps;
    };
    const distortionFIR4=distortionFIR(4),distortionFIR8=distortionFIR(8);
    function processGuitarDistortion(data,node,ev,start){
      const factor=(node.type==='hardDistortion'||node.type==='fuzz')?8:4;
      const taps=factor===8?distortionFIR8:distortionFIR4;
      const rate=sampleRate*factor,delay=(taps.length-1)/2,F=taps.length;
      // Polyphase windowed-sinc upsampling. A cubic interpolator is cheaper,
      // but leaves input images near 4× Nyquist which intermodulate in a hard
      // clipper and create low-frequency aliases. This 25-tap windowed-sinc
      // interpolation suppresses those images before the nonlinearity.
      const phases=[null];
      for(let q=1;q<factor;q++){
        const weights=new Float64Array(25),t=q/factor;
        let sum=0;
        for(let j=-12;j<=12;j++){
          const d=t-j,window=0.42+0.5*Math.cos(Math.PI*d/12.5)+0.08*Math.cos(2*Math.PI*d/12.5);
          const w=Math.abs(d)<1e-9?1:Math.sin(Math.PI*d)/(Math.PI*d);
          weights[j+12]=w*window;sum+=weights[j+12];
        }
        for(let j=0;j<25;j++)weights[j]/=sum;
        phases[q]=weights;
      }
      for(const channel of data){
        const length=channel.length,ring=new Float64Array(F);
        // The sinc input interpolation looks 12 frames into the past, while
        // the aligned decimator writes only 8 original frames behind. Keep
        // an O(1) circular archive of overwritten original input samples so
        // later interpolation never reads processed output as dry input.
        const originalArchive=new Float64Array(32);
        let lastWritten=-1;
        let hp=0,previousIn=0,post=0,post2=0,dc=0,envelope=0,sag=0;
        // The 32-highrate-frame FIR delay is compensated before writing to
        // the project frame. The input lookahead is safe: outIdx always trails
        // the samples used by the interpolator by at least 8 original frames.
        const raw=(idx)=>idx<0||idx>=length?0:idx<=lastWritten?originalArchive[idx%32]:channel[idx];
        const hpHz=node.type==='overdrive'?155:node.type==='fuzz'?35:node.type==='ampCrunch'?95:85;
        const hpCoeff=Math.exp(-2*Math.PI*hpHz/rate),dcAlpha=1-Math.exp(-2*Math.PI*12/rate);
        const base=node.type==='overdrive'?1900:node.type==='hardDistortion'?2400:node.type==='fuzz'?2600:1600;
        const bandwidth=node.type==='fuzz'?10300:node.type==='hardDistortion'?10200:8200;
        let cachedFrame=-1,drive=1,lpAlpha=1,gate=0,biasParameter=0;
        for(let high=0;high<length*factor+delay;high++){
          const i=Math.floor(high/factor),phase=high%factor,frame=start+Math.min(i,length-1);
          let sample;
          if(phase===0)sample=raw(i);
          else{
            sample=0;
            const weights=phases[phase];
            for(let j=-12;j<=12;j++)sample+=raw(i+j)*weights[j+12];
          }
          if(frame!==cachedFrame){
            cachedFrame=frame;
            drive=db(ev.driveDb(frame));
            const tone=ev.tone(frame);
            const fc=clamp(base+Math.pow(tone,1.15)*bandwidth,250,Math.min(15500,sampleRate*.47));
            lpAlpha=1-Math.exp(-2*Math.PI*fc/rate);
            if(node.type==='fuzz')gate=ev.gate(frame);
            if(node.type==='ampCrunch')biasParameter=ev.bias(frame);
          }
          hp=hpCoeff*(hp+sample-previousIn);previousIn=sample;
          let shaped=0;
          if(node.type==='overdrive'){
            const g=1.65*drive,b=0.075;
            shaped=(Math.tanh(hp*g+b)-Math.tanh(b))/Math.max(.4,Math.tanh(g));
          }else if(node.type==='hardDistortion'){
            const v=hp*drive*3.1;
            shaped=clamp(v,-.66,.54)*1.55;
          }else if(node.type==='fuzz'){
            const speed=Math.abs(hp)>envelope?0.00042:0.00006;
            envelope+=(Math.abs(hp)-envelope)*speed;
            const bias=clamp((envelope-.12)*.47,-.09,.17),g=5.2*drive;
            const u=clamp((hp*g+bias)*1.3,-1,1);
            const zero=clamp(bias*1.3,-1,1);
            shaped=Math.sign(u)*Math.pow(Math.abs(u),.76)-Math.sign(zero)*Math.pow(Math.abs(zero),.76);
            const threshold=gate*.05;
            const gateMultiplier=threshold>0?clamp((Math.abs(hp)-threshold)/Math.max(1e-6,threshold*2),0,1):1;
            shaped*=gateMultiplier;
          }else{ // ampCrunch: two dynamically coupled asymmetric gain stages
            const bias=biasParameter*.16,g=drive*.36;
            sag+=(Math.abs(hp)-sag)*0.00018;
            const compression=1/(1+1.5*sag);
            const stage1=Math.tanh(hp*g*compression+bias)-Math.tanh(bias);
            shaped=Math.tanh(stage1*1.34-bias*.7)+Math.tanh(bias*.7);
          }
          post+=lpAlpha*(shaped-post);
          if(node.type==='ampCrunch'||node.type==='hardDistortion'){
            post2+=lpAlpha*(post-post2);
          }else post2=post;
          // Preserve the original signal's DC-free silence and counteract
          // asymmetric clipping bias, without coupling stereo channel states.
          dc+=(post2-dc)*dcAlpha;
          const processed=(post2-dc);
          ring[high%F]=processed;
          if(high<delay||(high-delay)%factor!==0)continue;
          const index=(high-delay)/factor;
          if(index>=length)break;
          let filtered=0;
          for(let k=0;k<F;k++)filtered+=taps[k]*ring[(high-k+F*2)%F];
          const wet=ev.wet(start+index),outputGain=db(ev.outputDb(start+index)),dry=channel[index];
          originalArchive[index%32]=dry;lastWritten=index;
          // Aligned in-place overwrite; original lookbehind is now protected.
          channel[index]=wet<=0?dry:dry*(1-wet)+filtered*outputGain*wet;
        }
      }
    }
    /* FX-PALETTE-01 · Tuning Resonator / Harmonic Memory (from Collective Memory): resonators on a pitch set over a root that is found in the
       audio itself (harmonic-sum on an averaged spectrum) or typed. Offline: the "memory" is the whole selection, not a guess per second. */
    function fftMag(re){const n=re.length,im=new Float64Array(n);for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){const t=re[i];re[i]=re[j];re[j]=t}}
      for(let len=2;len<=n;len<<=1){const ang=-TAU/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let s0=0;s0<n;s0+=len){let ar=1,ai=0;for(let k=0;k<len/2;k++){const a=s0+k,b=a+len/2,br=re[b]*ar-im[b]*ai,bi=re[b]*ai+im[b]*ar;re[b]=re[a]-br;im[b]=im[a]-bi;re[a]+=br;im[a]+=bi;const nr=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=nr}}}
      const mag=new Float64Array(n/2);for(let k=0;k<n/2;k++)mag[k]=Math.hypot(re[k],im[k]);return mag}
    function detectRootHz(data,length){const N=8192;if(length<N/2)return 110;const frames=Math.max(1,Math.min(48,Math.floor(length/N))),hop=frames>1?Math.floor((length-N)/(frames-1)):0,avg=new Float64Array(N/2);
      for(let f=0;f<frames;f++){const re=new Float64Array(N),at=f*hop;for(let i=0;i<N&&at+i<length;i++){let x=0;for(const ch of data)x+=ch[at+i];re[i]=x/data.length*(0.5-0.5*Math.cos(TAU*i/(N-1)))}const m=fftMag(re);for(let k=0;k<avg.length;k++)avg[k]+=m[k]}
      const bin=sampleRate/N,at=hz=>{const k=hz/bin,a=Math.floor(k);return a+1<avg.length?avg[a]*(1-(k-a))+avg[a+1]*(k-a):0};let best=110,score=-1;
      for(let f0=40;f0<=500;f0*=Math.pow(2,1/48)){let sc=0;for(let h=1;h<=6;h++)sc+=at(f0*h)/h;if(sc>score){score=sc;best=f0}}return score>0?best:110}
    function pitchSet(set,root,edo,low,high){const out=[],add=f=>{if(f>=low&&f<=high&&f<sampleRate*0.45)out.push(f)};
      const lists=[null,[1,9/8,5/4,4/3,3/2,5/3,15/8],[1,8/7,7/6,5/4,4/3,7/5,3/2,8/5,7/4]];
      if(set===0){for(let k=1;root*k<=high&&k<=256;k++)add(root*k)}
      else if(set===3||set===4){const period=set===4?3:2,steps=set===4?13:Math.max(5,Math.round(edo));for(let k=-200;k<=400;k++){const f=root*Math.pow(period,k/steps);if(f>high)break;add(f)}}
      else{for(let o=-8;o<=10;o++)for(const r of lists[set])add(root*r*Math.pow(2,o))}
      out.sort((a,b)=>a-b);const MAX=96;if(out.length<=MAX)return out;const step=out.length/MAX,thin=[];for(let i=0;i<MAX;i++)thin.push(out[Math.floor(i*step)]);return thin}
    function tuningResonator(data,node,ev,start,length){
      const set=Math.round(clamp(node.params.set,0,4)),root=node.params.rootHz>0?node.params.rootHz:detectRootHz(data,length);
      const freqs=pitchSet(set,root,node.params.edo,node.params.lowHz,Math.max(node.params.lowHz*1.01,node.params.highHz)),K=freqs.length;if(!K)return {root,count:0};
      const n=data[0].length,B=64,spread=node.params.spreadCents;
      for(let c=0;c<data.length;c++){const x=data[c],res=new Float64Array(n),det=data.length>1?Math.pow(2,(c===0?-1:1)*spread/2400):1;
        const st=new Float64Array(K*4),co=new Float64Array(K*5),gain=new Float64Array(K);for(let k=0;k<K;k++)gain[k]=1/Math.sqrt(K)*Math.pow(freqs[k]/Math.max(30,freqs[0]),-0.25);
        let lastMem=-1;
        for(let b0=0;b0<n;b0+=B){const mem=ev.memorySec(start+b0);if(Math.abs(mem-lastMem)>1e-6){lastMem=mem;for(let k=0;k<K;k++){const f=freqs[k]*det,q=clamp(f*mem*0.4548,0.5,3000),cf=biquad('bandpass',f,q,0);for(let j=0;j<5;j++)co[k*5+j]=cf[j]}}
          const e=Math.min(n,b0+B);for(let i=b0;i<e;i++){const xi=x[i];let sum=0;for(let k=0;k<K;k++){const o=k*4,q=k*5,y=co[q]*xi+co[q+1]*st[o]+co[q+2]*st[o+1]-co[q+3]*st[o+2]-co[q+4]*st[o+3];st[o+1]=st[o];st[o]=xi;st[o+3]=st[o+2];st[o+2]=y;sum+=y*gain[k]}res[i]=sum}}
        /* level match: the resonance gets the RMS of the input over the selection (at most +30 dB), then Excite drives it */
        let ex=0,er=0;for(let i=0;i<Math.min(n,length);i++){ex+=x[i]*x[i];er+=res[i]*res[i]}const norm=er>1e-20?Math.min(31.6,Math.sqrt(ex/er)):0;
        for(let i=0;i<n;i++){const frame=start+i,dr=1+ev.excite(frame)*11,w=ev.wet(frame),r=res[i]*norm,y=dr>1.0001?Math.tanh(r*dr)/Math.tanh(dr):r;x[i]=x[i]*(1-w)+y*w}}
      return {root,count:K}}
    /* FX-PALETTE-01 · Material Resonator (from the Schwarmdeuter): resin resonance, fracture cracks, crossed stereo braid echo, low undercurrent;
       six material profiles; steered by the audio's own loudness (pressure), attacks (fracture) and brightness instead of particle states. */
    const MATERIALS=[{q:16,spread:1.45,shimmer:1.55,bright:1.18,fb:.34,stereo:.92,under:.24},{q:12,spread:1.7,shimmer:1.85,bright:1.08,fb:.42,stereo:.84,under:.28},{q:10,spread:1.18,shimmer:1.06,bright:.92,fb:.3,stereo:.68,under:.44},{q:8,spread:1.24,shimmer:.92,bright:.88,fb:.38,stereo:.78,under:.6},{q:6,spread:1.1,shimmer:.74,bright:.78,fb:.22,stereo:.56,under:.18},{q:14,spread:1.86,shimmer:2.15,bright:1.32,fb:.48,stereo:1,under:.38}];
    function materialResonator(data,node,ev,start,length){
      const M=MATERIALS[Math.round(clamp(node.params.material,0,5))],n=data[0].length,B=128,blocks=Math.ceil(n/B),C=data.length;
      /* analysis: per block RMS (pressure), its rise (fracture) and zero-crossing brightness, on the mono sum; normalised over the selection */
      const rms=new Float64Array(blocks),zc=new Float64Array(blocks);let peak=1e-9;
      for(let b=0;b<blocks;b++){let s2=0,z=0,prev=0;const e=Math.min(n,(b+1)*B);for(let i=b*B;i<e;i++){let v=0;for(const ch of data)v+=ch[i];v/=C;s2+=v*v;if((v>=0)!==(prev>=0))z++;prev=v}rms[b]=Math.sqrt(s2/Math.max(1,e-b*B));zc[b]=z/Math.max(1,e-b*B);if(rms[b]>peak)peak=rms[b]}
      const states=data.map(()=>({h:new Float64Array(16),rH:new Float64Array(4),rL:new Float64Array(4),u:new Float64Array(4)}));
      const dl=[Math.round(0.11*sampleRate*(1+(1-M.stereo)*.2)),Math.round(0.16*sampleRate)],ring=[new Float64Array(dl[1]+2),new Float64Array(dl[1]+2)],tone=[0,0];let pos=0;
      const mult=[1,1.5,2.05,2.8];let pS=.5,fS=0,cS=1000,prevR=0;
      const run=(co,s,o,x)=>{const y=co[0]*x+co[1]*s[o]+co[2]*s[o+1]-co[3]*s[o+2]-co[4]*s[o+3];s[o+1]=s[o];s[o]=x;s[o+3]=s[o+2];s[o+2]=y;return y};
      for(let b=0;b<blocks;b++){const frame=start+b*B,fol=ev.follow(frame),amount=ev.wet(frame),crystal=ev.crystal(frame),fr=ev.fracture(frame),weave=ev.weave(frame),uc=ev.undercurrent(frame);
        const p=rms[b]/peak,rise=Math.max(0,rms[b]-prevR)/Math.max(1e-6,rms[b]);prevR=rms[b];const cent=clamp(zc[b]*sampleRate*0.5,90,3800);
        pS+=((.5*(1-fol)+p*fol)-pS)*.3;fS+=((.3*(1-fol)+Math.min(1,rise*3)*fol)-fS)*.45;cS+=((1000*(1-fol)+cent*fol)-cS)*.2;
        const centroid=clamp(cS*M.bright,90,3800),hq=M.q+crystal*9,hv=(crystal*.6+.25)*(.4+pS*.35);
        const hco=mult.map((m,k)=>biquad('bandpass',clamp(centroid*m*(1+(k-1.5)*.04*M.spread),80,8000),hq,0));
        const fw=fS*fS*(3-2*fS),riss=fr*(fw*.74+pS*.18),rhp=biquad('highpass',180+fw*3200+pS*700,.7,0),rlp=biquad('lowpass',2200+(1-fS)*3200,.7,0),rdrive=1+riss*7*M.shimmer;
        const fb=Math.min(.82,M.fb*(.5+weave*.45)),toneA=Math.exp(-TAU*(1200+centroid*.7)/sampleRate),ulp=biquad('lowpass',120+pS*580,.7,0),ug=uc*M.under*(.3+pS*.5)*2,makeup=.88+amount*.18;
        const e=Math.min(n,(b+1)*B);
        for(let i=b*B;i<e;i++){const wetIn=[];
          for(let c=0;c<C;c++){const x=data[c][i],s=states[c];let h=0;for(let k=0;k<4;k++)h+=run(hco[k],s.h,k*4,x)*(k===0?.9:k===1?1:.72-k*.08);
            const r=run(rlp,s.rL,0,Math.tanh(run(rhp,s.rH,0,x)*rdrive))*riss,u=run(ulp,s.u,0,x)*ug;wetIn[c]=h*hv*3+r+u}
          /* braid: two delay lines, crossed feedback (L <- R, R <- L) through a one-pole tone filter */
          const rd=k=>ring[k][(pos-dl[k]+ring[k].length)%ring[k].length],yL=rd(0),yR=rd(1);tone[0]=yR+(tone[0]-yR)*toneA;tone[1]=yL+(tone[1]-yL)*toneA;
          const inL=data[0][i],inR=C>1?data[1][i]:inL;ring[0][pos]=inL*weave*.6+tone[0]*fb;ring[1][pos]=inR*weave*.6+tone[1]*fb;pos=(pos+1)%ring[0].length;
          for(let c=0;c<C;c++){const br=C>1?(c===0?yL:yR):(yL+yR)*.5;data[c][i]=data[c][i]*(1-amount*.34)+amount*.92*makeup*(wetIn[c]+br)}}}
      return {material:Math.round(node.params.material)}}
    /* FX-PALETTE-01 · Wavefolder (from the Psychedelic Spiral): sine/triangle fold, symmetry = bias (even harmonics), 4× oversampled (linear up, 4-tap box down), DC blocked */
    function wavefolder(data,node,ev,start){const OS=4;
      const fold=(x,shape)=>{const sn=Math.sin(x*Math.PI/2);let t=((x+1)%4+4)%4;t=t<2?t-1:3-t;return sn*(1-shape)+t*shape};
      for(const ch of data){let prev=0,dcx=0,dcy=0;const R=0.9995;
        for(let i=0;i<ch.length;i++){const frame=start+i,drive=db(ev.driveDb(frame)),shape=ev.shape(frame),bias=ev.symmetry(frame)*.5,w=ev.wet(frame),x=ch[i];let acc=0;
          for(let k=1;k<=OS;k++){const u=prev+(x-prev)*k/OS;acc+=fold(u*drive+bias,shape)-fold(bias,shape)}
          prev=x;const y=acc/OS,out=y-dcx+R*dcy;dcx=y;dcy=out;ch[i]=x*(1-w)+out*w}}}
    function processSimple(data,node,ev,start,originalLength,channelIndices,allChannels,channelOrigin=0) {
      let phase=0;
      const previous=data.map(()=>0);
      for(let i=0;i<data[0].length;i++) {
        const frame=start+i;
        if(node.type==='gain') {const gain=db(ev.gainDb(frame));for(const channel of data) channel[i]*=gain;}
        else if(node.type==='fadeIn'||node.type==='fadeOut') {const t=originalLength<=1?1:i/(originalLength-1);const gain=Math.pow(node.type==='fadeIn'?t:1-t,ev.curve(frame));for(const channel of data) channel[i]*=gain;}
        else if(node.type==='tremolo') {const gain=1-ev.depth(frame)*(0.5-0.5*Math.cos(phase));for(const channel of data) channel[i]*=gain;phase=(phase+TAU*ev.rateHz(frame)/sampleRate)%TAU;}
        else if(node.type==='pan') {const pan=ev.pan(frame);for(let c=0;c<data.length;c++) {const index=channelIndices[c];data[c][i]*=index===0&&pan>0?Math.cos(pan*Math.PI/2):index===1&&pan<0?Math.cos(pan*Math.PI/2):1;}}
        else if(node.type==='width') {const left=allChannels[0][frame-channelOrigin],right=allChannels[1][frame-channelOrigin],mid=(left+right)*0.5,side=(left-right)*0.5*ev.width(frame);for(let c=0;c<data.length;c++) data[c][i]=channelIndices[c]===0?mid+side:mid-side;}
        else if(node.type==='distortion') {
          const drive=db(ev.driveDb(frame)),wet=ev.wet(frame),normal=Math.tanh(drive),amount=1-1/drive;
          // Filter the nonlinear difference only: drive=0 dB is exactly neutral,
          // including inside an automation lane, without delaying the dry signal.
          for(let c=0;c<data.length;c++) {const x=data[c][i],prior=previous[c],middle=(x+prior)*0.5;const a=Math.tanh(prior*drive)/normal-prior,b=Math.tanh(middle*drive)/normal-middle,d=Math.tanh(x*drive)/normal-x;const delta=(a+2*b+d)*0.25*amount;previous[c]=x;data[c][i]=x+wet*delta;}
        }
      }
    }
    function metrics(channels) {
      return channels.map(channel=>{
        let peak=0,sum=0,clippedCount=0;
        for(let i=0;i<channel.length;i++) {const value=channel[i];if(!Number.isFinite(value)) fail('DSP erzeugte nicht endliche Samples; Ergebnis wird verworfen.');peak=Math.max(peak,Math.abs(value));sum+=value*value;if(Math.abs(value)>1) clippedCount++;}
        return {peak,rms:channel.length?Math.sqrt(sum/channel.length):0,clippedCount};
      });
    }
    // W27/P4: serial wet processing is deliberately enabled only for nodes
    // sharing one explicit source range. Distinct targets retain W26 semantics.
    // The purple selection is always the source; it is never expanded.
    function serialWetRange(job) {
      if(job.tailMode==='truncate'||job.nodes.length<2)return null;
      const active=job.nodes.filter(node=>node.enabled!==false&&node.bypass!==true);
      if(active.length<2)return null;
      const source=active[0].targetRange||job.range;
      if(!source||!Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end)||source.start<0||source.end<=source.start||source.end>job.channels[0].length)return null;
      for(const node of active){const range=node.targetRange||job.range;if(!range||range.start!==source.start||range.end!==source.end)return null;}
      // Only routes which can generate a tail need the separate wet lane.
      if(!active.some(node=>['delay','reverb','flanger','chorus','tuningResonator','materialResonator'].includes(node.type)))return null;
      return source;
    }
    function executeSerialWet(job,onProgress,source) {
      sampleRate=job.sampleRate;
      const original=job.channels,originalFrames=original[0].length;
      const start=source.start,selectionLength=source.end-start;
      let wet=original.map(ch=>new Float32Array(ch.subarray(start,source.end)));
      let wetFrames=selectionLength,processedStages=0;
      const reports=[];
      onProgress(0);
      for(let index=0;index<job.nodes.length;index++) {
        const raw=job.nodes[index];
        if(raw.enabled===false||raw.bypass===true){reports.push({id:raw.id,type:raw.type,bypassed:true});onProgress((index+1)/job.nodes.length);continue;}
        const node=prepare(raw),indices=selectedIndices(node,original.length);
        if(neutral(node,original.length)){reports.push({id:node.id,type:node.type,neutral:true});onProgress((index+1)/job.nodes.length);continue;}
        const tail=tailFrames(node),size=wetFrames+tail;
        // Bound the entire serial working set, not merely one node's scratch.
        const scratchBytes=(size+wetFrames)*original.length*4+(node.type==='limiter'?wetFrames*20:0);
        if(!Number.isSafeInteger(size)||scratchBytes>512*1024*1024||start+size>268435456)
          fail('Serielle Effektkette überschreitet das W01-Arbeitsspeicherlimit (512 MiB temporäre DSP-Daten). Bitte kleineren Bereich bearbeiten.');
        const data=indices.map(c=>{const result=new Float32Array(size);result.set(wet[c].subarray(0,wetFrames));return result;});
        const ev=evaluators(node,start);
        if(['lowpass','highpass','bandpass','notch','peaking','lowshelf','highshelf'].includes(node.type))
          processSelectionFilter(data,node,ev,start,indices,original,{input:wet,first:processedStages===0,selectionLength});
        else if(['compressor','limiter','gate'].includes(node.type)) dynamics(data,node,ev,start);
        else if(['delay','flanger','chorus'].includes(node.type)) delay(data,node,ev,start);
        else if(node.type==='reverb') reverb(data,node,ev,start);
        else if(node.type==='phaser') phaser(data,node,ev,start);
        else if(node.type==='wavefolder') wavefolder(data,node,ev,start);
        else if(node.type==='tuningResonator') node.__detail=tuningResonator(data,node,ev,start,selectionLength);
        else if(node.type==='materialResonator') node.__detail=materialResonator(data,node,ev,start,selectionLength);
        else if(['overdrive','hardDistortion','fuzz','ampCrunch'].includes(node.type)) processGuitarDistortion(data,node,ev,start);
        else processSimple(data,node,ev,start,wetFrames,indices,wet,start);
        if(tail) {
          const fade=Math.min(tail,Math.ceil(sampleRate*0.02));
          for(const channel of data)for(let i=0;i<fade;i++)channel[size-fade+i]*=(fade-1-i)/Math.max(1,fade-1);
        }
        const selected=new Map(indices.map((c,i)=>[c,data[i]]));
        wet=wet.map((channel,c)=>{
          if(selected.has(c))return selected.get(c);
          if(size===wetFrames)return channel;
          const expanded=new Float32Array(size);expanded.set(channel);return expanded;
        });
        wetFrames=size;processedStages++;
        reports.push({id:node.id,type:node.type,start,end:source.end,wetFrames,tailFrames:tail,tailCapped:tail>=MAX_TAIL_SECONDS*sampleRate,...(node.__detail?{detail:node.__detail}:{})});
        onProgress((index+1)/job.nodes.length);
      }
      // Only now mix the processed wet lane back with *original* outside dry.
      // This prevents downstream nonlinear processors touching unrelated audio.
      const outputFrames=job.tailMode==='extend'?Math.max(originalFrames,start+wetFrames):originalFrames;
      const channels=original.map((sourceChannel,c)=>{
        const output=outputFrames>originalFrames?new Float32Array(outputFrames):sourceChannel;
        if(output!==sourceChannel)output.set(sourceChannel);
        const copied=Math.min(selectionLength,outputFrames-start);
        if(copied>0)output.set(wet[c].subarray(0,copied),start);
        const available=Math.max(0,Math.min(wetFrames,outputFrames-start));
        for(let i=selectionLength;i<available;i++)output[start+i]+=wet[c][i];
        return output;
      });
      const channelMetrics=metrics(channels);
      onProgress(1);
      return {jobId:job.jobId,documentId:job.documentId,revision:job.revision,sampleRate,channels,frames:channels[0].length,metrics:{channels:channelMetrics,peak:Math.max(...channelMetrics.map(c=>c.peak)),clippedCount:channelMetrics.reduce((s,c)=>s+c.clippedCount,0),originalFrames,tailMode:job.tailMode,effects:reports}};
    }
    function execute(job,onProgress) {
      const serialRange=serialWetRange(job);
      if(serialRange)return executeSerialWet(job,onProgress,serialRange);
      sampleRate=job.sampleRate;
      let channels=job.channels;
      const originalFrames=channels[0].length, originalRange=job.range;
      const reports=[];
      onProgress(0);
      for(let index=0;index<job.nodes.length;index++) {
        const raw=job.nodes[index];
        if(raw.enabled===false||raw.bypass===true) {reports.push({id:raw.id,type:raw.type,bypassed:true});onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const node=prepare(raw), indices=selectedIndices(node,channels.length);
        if(neutral(node,channels.length)) {reports.push({id:node.id,type:node.type,neutral:true});onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const range=node.targetRange||originalRange;
        const start=clamp(range.start,0,channels[0].length), end=clamp(range.end,start,channels[0].length), length=end-start;
        if(!length) {onProgress((index+1)/Math.max(1,job.nodes.length));continue;}
        const tail=job.tailMode==='truncate'?0:tailFrames(node), size=length+tail;
        const scratchBytes=size*indices.length*4+(node.type==='limiter'?length*20:0);
        if(scratchBytes>512*1024*1024) fail('Effektauswahl überschreitet das W01-Arbeitsspeicherlimit (512 MiB temporäre DSP-Daten). Bitte kleineren Bereich bearbeiten.');
        const data=indices.map(c=>{const result=new Float32Array(size);result.set(channels[c].subarray(start,end));return result;});
        const ev=evaluators(node,start);
        if(['lowpass','highpass','bandpass','notch','peaking','lowshelf','highshelf'].includes(node.type)) processSelectionFilter(data,node,ev,start,indices,channels);
        else if(['compressor','limiter','gate'].includes(node.type)) dynamics(data,node,ev,start);
        else if(['delay','flanger','chorus'].includes(node.type)) delay(data,node,ev,start);
        else if(node.type==='reverb') reverb(data,node,ev,start);
        else if(node.type==='phaser') phaser(data,node,ev,start);
        else if(node.type==='wavefolder') wavefolder(data,node,ev,start);
        else if(node.type==='tuningResonator') node.__detail=tuningResonator(data,node,ev,start,length);
        else if(node.type==='materialResonator') node.__detail=materialResonator(data,node,ev,start,length);
        else if(['overdrive','hardDistortion','fuzz','ampCrunch'].includes(node.type))processGuitarDistortion(data,node,ev,start);
        else processSimple(data,node,ev,start,length,indices,channels);
        if(tail) {
          const fade=Math.min(tail,Math.ceil(sampleRate*0.02));
          for(const channel of data) for(let i=0;i<fade;i++) channel[size-fade+i]*=(fade-1-i)/Math.max(1,fade-1);
        }
        const resultFrames=job.tailMode==='extend'?Math.max(channels[0].length,start+size):channels[0].length;
        if(resultFrames>channels[0].length) channels=channels.map(channel=>{const expanded=new Float32Array(resultFrames);expanded.set(channel);return expanded;});
        for(let c=0;c<indices.length;c++) {
          const target=channels[indices[c]], processed=data[c];target.set(processed.subarray(0,length),start);
          for(let i=length;i<size&&start+i<target.length;i++) target[start+i]+=processed[i];
        }
        reports.push({id:node.id,type:node.type,start,end,tailFrames:tail,tailCapped:tail>=MAX_TAIL_SECONDS*sampleRate,...(node.__detail?{detail:node.__detail}:{})});
        onProgress((index+1)/Math.max(1,job.nodes.length));
      }
      const channelMetrics=metrics(channels);
      onProgress(1);
      return {jobId:job.jobId,documentId:job.documentId,revision:job.revision,sampleRate,channels,frames:channels[0].length,metrics:{channels:channelMetrics,peak:Math.max(...channelMetrics.map(c=>c.peak)),clippedCount:channelMetrics.reduce((s,c)=>s+c.clippedCount,0),originalFrames,tailMode:job.tailMode,effects:reports}};
    }
    return {execute};
  }

  const registry=makeRegistry();
  function deepFreeze(value) {Object.freeze(value);Object.values(value).forEach(item=>{if(item&&typeof item==='object'&&!Object.isFrozen(item)) deepFreeze(item);});return value;}
  deepFreeze(registry);
  const jobs=new Map();
  let workerURL=null,serial=0;
  function abortError(message) {const error=new Error(message||'Render abgebrochen.');error.name='AbortError';return error;}
  function validateRange(range,frames) {
    if(!range||!Number.isSafeInteger(range.start)||!Number.isSafeInteger(range.end)||range.start<0||range.end<range.start||range.end>frames) throw new RangeError('Ungültiger Framebereich.');
  }
  /* FX-NET-01 · graph effects: devices of other rooms (Psy Lab worklet, Multitrack Web Audio buses) rendered offline on the main thread with the SAME
     selection / tail / write-back rules as the worker effects (selection replaced, tail overlaid or extending the document, 20 ms tail fade). */
  const lazyRoom=name=>{try{return typeof __xenLoadDeferred==='function'?__xenLoadDeferred(name):null}catch{return null}};
  const OfflineCtx=()=>global.OfflineAudioContext||global.webkitOfflineAudioContext;
  async function renderNodeGraph(chs,sr,build){const Off=OfflineCtx();if(!Off)throw new Error('This browser has no OfflineAudioContext.');const n=chs[0].length,ctx=new Off(2,n,sr),buf=ctx.createBuffer(2,n,sr);
    buf.copyToChannel(chs[0],0);buf.copyToChannel(chs[1]||chs[0],1);const src=ctx.createBufferSource();src.buffer=buf;await build(ctx,src,ctx.destination);src.start(0);const out=await ctx.startRendering();
    return chs.map((_,c)=>new Float32Array(out.getChannelData(chs.length===1?0:c)))}
  const GRAPH=Object.freeze({
    psyLabFx:{tail:()=>8,options:{patch:()=>{const m=lazyRoom('psylab');return m?.fxPatches?m.fxPatches().map(x=>x.name):[]}},
      async run(chs,sr,v){const m=lazyRoom('psylab');if(!m?.fxRender)throw new Error('The Psy Lab engine is not available.');const list=m.fxPatches(),pat=list[Math.round(v.patch)]||list[0];return m.fxRender({channels:chs,sampleRate:sr,params:pat.params,mix:v.wet})}},
    spiralFx:{tail:v=>.31*(v.feedback>0?Math.min(40,Math.ceil(Math.log(.001)/Math.log(v.feedback))):1)+.5,
      run(chs,sr,v){const m=lazyRoom('multitrack')?.NodeFx;if(!m)throw new Error('The Multitrack devices are not available.');
        return renderNodeGraph(chs,sr,(ctx,src,dest)=>{const dry=ctx.createGain(),wet=ctx.createGain();dry.gain.value=1-v.wet;wet.gain.value=v.wet;src.connect(dry);dry.connect(dest);const bus=m.buildSpiralBus(ctx,v,wet);src.connect(bus.input);wet.connect(dest)})}},
    masterStripFx:{tail:()=>.05,
      run(chs,sr,v){const m=lazyRoom('multitrack')?.NodeFx;if(!m)throw new Error('The Multitrack devices are not available.');
        return renderNodeGraph(chs,sr,(ctx,src,dest)=>{const st=m.buildMasterStrip(ctx,{...v,on:true});src.connect(st.input);st.output.connect(dest)})}}});
  function graphOptions(type,key){const g=GRAPH[type];if(g?.options?.[key])try{return g.options[key]()}catch{return []}const d=registry[type]?.params?.[key];return d?.options||null}
  function graphParams(node){const spec=registry[node.type],v={};for(const k of Object.keys(spec.params)){const d=spec.params[k],raw=node.params?.[k];v[k]=Math.max(d.min,Math.min(d.max,Number.isFinite(raw)?raw:d.default))}return v}
  async function runGraphNode(channels,node,request){
    const v=graphParams(node),frames=channels[0].length,range=node.targetRange||request.range,start=Math.max(0,Math.min(range.start,frames)),end=Math.max(start,Math.min(range.end,frames)),length=end-start;
    if(!length||node.enabled===false||node.bypass===true||(v.wet!==undefined&&v.wet<=0))return {channels,report:{id:node.id,type:node.type,neutral:true}};
    const idx=channels.length===2&&node.channels==='L'?[0]:channels.length===2&&node.channels==='R'?[1]:channels.map((_,i)=>i);
    const mode=request.tailMode||'truncate',tail=mode==='truncate'?0:Math.ceil(Math.min(20,GRAPH[node.type].tail(v))*request.sampleRate),size=length+tail;
    const input=idx.map(c=>{const a=new Float32Array(size);a.set(channels[c].subarray(start,end));return a});
    const out=await GRAPH[node.type].run(input,request.sampleRate,v);
    if(tail){const fade=Math.min(tail,Math.ceil(request.sampleRate*.02));for(const ch of out)for(let i=0;i<fade;i++)ch[size-fade+i]*=(fade-1-i)/Math.max(1,fade-1)}
    const resultFrames=mode==='extend'?Math.max(frames,start+size):frames;let next=channels.map(c=>{const a=new Float32Array(resultFrames);a.set(c);return a});
    for(let k=0;k<idx.length;k++){const t=next[idx[k]],o=out[k];for(let i=0;i<length;i++)t[start+i]=Number.isFinite(o[i])?o[i]:0;for(let i=length;i<size&&start+i<t.length;i++)if(Number.isFinite(o[i]))t[start+i]+=o[i]}
    return {channels:next,report:{id:node.id,type:node.type,start,end,tailFrames:tail,engine:'graph'}}}
  /* the public render: worker nodes in runs, graph nodes in between; a final worker pass (also with no nodes) measures peaks and clips as before */
  async function renderStaged(request,options){options=options||{};const nodes=Array.isArray(request?.nodes)?request.nodes:[];
    if(!nodes.some(n=>registry[n?.type]?.engine==='graph'))return renderWorker(request,options);
    let channels=request.channels.map(c=>new Float32Array(c)),run=[];const effects=[],base=request.jobId===undefined?'w01-g'+(++serial):request.jobId;let step=0;
    const flush=async(last)=>{if(!run.length&&!last)return;const r=await renderWorker({...request,jobId:base+'-'+(step++),channels,nodes:run},options);run=[];channels=r.channels;effects.push(...(r.metrics?.effects||[]));return r};
    for(const node of nodes){if(registry[node?.type]?.engine!=='graph'){run.push(node);continue}
      await flush(false);if(options.signal?.aborted)throw abortError();const g=await runGraphNode(channels,node,request);channels=g.channels;effects.push(g.report);
      try{options.onProgress?.({jobId:base,documentId:request.documentId,revision:request.revision,progress:Math.min(.95,effects.length/nodes.length)})}catch{}}
    const r=await flush(true);r.metrics={...r.metrics,effects};r.jobId=base;return r}
  function renderWorker(request,options) {
    options=options||{};
    return new Promise((resolve,reject)=>{
      let job;
      try {
        if(!request||typeof request!=='object') throw new TypeError('Renderauftrag fehlt.');
        if(!Number.isFinite(request.sampleRate)||request.sampleRate<8000||request.sampleRate>384000) throw new RangeError('Sample-Rate außerhalb 8000–384000 Hz.');
        if(!Array.isArray(request.channels)||request.channels.length<1||request.channels.length>2) throw new TypeError('W01 benötigt ein oder zwei PCM-Kanäle.');
        const frames=request.channels[0].length;
        request.channels.forEach(channel=>{if(!(channel instanceof Float32Array)||channel.length!==frames) throw new TypeError('PCM-Kanäle müssen gleich lange Float32Arrays sein.');});
        if(frames*request.channels.length*4>512*1024*1024) throw new RangeError('Projekt überschreitet das W01-Renderlimit von 512 MiB PCM.');
        validateRange(request.range,frames);
        if(!Array.isArray(request.nodes)) throw new TypeError('Effektkette muss ein Array sein.');
        if(!['truncate','overlay','extend'].includes(request.tailMode||'truncate')) throw new TypeError('Unbekannter Tail-Modus.');
        request.nodes.forEach(node=>{if(!node||typeof node!=='object') throw new TypeError('Ungültiger Effektknoten.');if(node.targetRange)validateRange(node.targetRange,frames);if(node.channels!==undefined&&!['all','L','R'].includes(node.channels))throw new TypeError('Ungültige Kanalauswahl.');});
        if(options.signal&&options.signal.aborted) throw abortError();
        if(typeof Worker==='undefined'||typeof Blob==='undefined'||!global.URL||!global.URL.createObjectURL) throw new Error('Dieser Browser unterstützt keine lokalen Blob-Worker. DSP ist nicht im Audio-Hotpath verfügbar.');
        job={jobId:request.jobId===undefined?'w01-'+(++serial):request.jobId,documentId:request.documentId,revision:request.revision,sampleRate:request.sampleRate,range:{start:request.range.start,end:request.range.end},tailMode:request.tailMode||'truncate',nodes:request.nodes.map(node=>JSON.parse(JSON.stringify(node))),channels:request.channels.map(channel=>new Float32Array(channel))};
      } catch(error) {reject(error);return;}
      if(jobs.has(job.jobId)) jobs.get(job.jobId).cancel('Gleichnamiger Renderauftrag ersetzt.');
      if(!workerURL) {
        const source="'use strict';const registry=("+makeRegistry.toString()+")();const engine=("+workerEngine.toString()+")(registry);self.onmessage=function(event){try{const result=engine.execute(event.data,function(progress){self.postMessage({kind:'progress',progress:progress});});self.postMessage({kind:'result',result:result},result.channels.map(function(c){return c.buffer;}));}catch(error){self.postMessage({kind:'error',name:error.name,message:error.message,stack:error.stack});}};";
        workerURL=global.URL.createObjectURL(new Blob([source],{type:'application/javascript'}));
      }
      let worker;
      try {worker=new Worker(workerURL);}catch(error){reject(error);return;}
      let settled=false;
      function cleanup(){worker.terminate();jobs.delete(job.jobId);if(options.signal)options.signal.removeEventListener('abort',onAbort);}
      function finish(error,result){if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve(result);}
      function onAbort(){finish(abortError());}
      jobs.set(job.jobId,{documentId:job.documentId,revision:job.revision,cancel:message=>finish(abortError(message))});
      if(options.signal)options.signal.addEventListener('abort',onAbort,{once:true});
      worker.onmessage=event=>{
        if(settled)return;
        const message=event.data;
        if(message.kind==='progress'){if(options.onProgress){try{options.onProgress({jobId:job.jobId,documentId:job.documentId,revision:job.revision,progress:message.progress});}catch(error){/* Observer errors do not corrupt PCM work. */}}}
        else if(message.kind==='error'){const error=new Error(message.message);error.name=message.name||'Error';finish(error);}
        else if(message.kind==='result')finish(null,message.result);
      };
      worker.onerror=event=>finish(new Error(event.message||'DSP-Worker konnte nicht ausgeführt werden.'));
      try {worker.postMessage(job,job.channels.map(channel=>channel.buffer));}catch(error){finish(error);}
    });
  }
  function cancel(jobId){const job=jobs.get(jobId);if(job){job.cancel();return true;}return false;}
  function cancelDocument(documentId){for(const job of Array.from(jobs.values()))if(job.documentId===documentId)job.cancel();}
  function dispose(){for(const job of Array.from(jobs.values()))job.cancel();if(workerURL){global.URL.revokeObjectURL(workerURL);workerURL=null;}}
  global.__XenWaveDSPW01=Object.freeze({version:'W01.1',registry,getRegistry:()=>registry,render:renderStaged,graphOptions,cancel,cancelDocument,dispose,capabilities:Object.freeze({worker:true,stereo:true,automation:true,tailModes:['truncate','overlay','extend'],pitchShift:false,timeStretch:false,/* the effect CHAIN has neither; the editor's Pitch / Time edit (MTW-03) uses the shared offline pitch engine */noiseReduction:false,declip:false})});
})(typeof window!=='undefined'?window:globalThis);
globalThis.__XenWaveDSPW01;
