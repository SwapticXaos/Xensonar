/* Standalone recorder FLAC encoder: 16-bit PCM, 2 independent channels.
   Native FLAC bitstream per RFC 9639; fixed predictors / Rice coding.
   No network, dynamic import, external WASM, or access to the live audio engine. */
function f319FlacWorkerEntry() {
  'use strict';
  let rate = 48000, frames = 0, offset = 0, frameIndex = 0, byteOffset = 0;
  let minFrame = Infinity, maxFrame = 0, nextSeek = 0, seekPoints = [], md5, rateCode = 10, rateExtra = [];
  const BLOCK = 4096;
  function crc8(b) { let c = 0; for (const v of b) { c ^= v; for(let j=0;j<8;j++) c = c & 128 ? ((c<<1)^7)&255 : (c<<1)&255; } return c; }
  function crc16(b) {let c=0; for(const v of b){c ^= v<<8; for(let j=0;j<8;j++)c=c&32768?((c<<1)^0x8005)&65535:(c<<1)&65535;}return c;}
  function numberBytes(n) {
    if(n < 128)return [n];
    let len = 2;
    while(n >= 2**(5*len+1) && len < 6)len++;
    const arr = new Array(len);
    for(let i=len-1;i>0;i--){arr[i]=0x80|(n&63);n=Math.floor(n/64);}
    arr[0]=((0xff<<(8-len))&255)|n;
    return arr;
  }
  class Bits {
    constructor(){this.o=[];this.acc=0;this.n=0;}
    put(v,n){for(let j=n-1;j>=0;j--){this.acc=(this.acc<<1)|((v>>>j)&1);if(++this.n===8){this.o.push(this.acc);this.acc=0;this.n=0;}}}
    zero(n){while(n-- > 0){this.acc<<=1;if(++this.n===8){this.o.push(this.acc);this.acc=0;this.n=0;}}}
    finish(){if(this.n){this.o.push(this.acc<<(8-this.n));this.acc=0;this.n=0;}return Uint8Array.from(this.o);}
  }
  const zig=v=>v<0 ? -2*v-1:2*v;
  function residual(data,i,order){
    const a=data[i], b=data[i-1], c=data[i-2], d=data[i-3], e=data[i-4];
    if(order===0)return a;
    if(order===1)return a-b;
    if(order===2)return a-2*b+c;
    if(order===3)return a-3*b+3*c-d;
    return a-4*b+6*c-4*d+e;
  }
  function describe(data) {
    const length=data.length, first=data[0];
    let constant=true;for(let i=1;i<length;i++){if(data[i]!==first){constant=false;break;}}
    if(constant)return {kind:'const',value:first};
    let best={kind:'verbatim',bits:8+length*16};
    // Estimate Rice cost and reject predictors that do not beat verbatim.
    for(let order=0;order<=4 && order<length;order++){
      const count=length-order;
      let sum=0;
      for(let i=order;i<length;i++)sum+=zig(residual(data,i,order));
      const mean=sum/count;
      const ideal=Math.max(0,Math.min(14,Math.floor(Math.log2(mean+1))-1));
      for(const k of [Math.max(0,ideal-1),ideal,Math.min(14,ideal+1)]){
        let bits=8+order*16+2+4+4+count*(1+k);
        const denom=2**k;
        for(let i=order;i<length;i++){bits+=Math.floor(zig(residual(data,i,order))/denom);if(bits>=best.bits)break;}
        if(bits<best.bits)best={kind:'fixed',order,k,bits};
      }
    }
    return best;
  }
  function subframe(writer,data) {
    const best=describe(data);
    if(best.kind==='const'){
      writer.put(0,1);writer.put(0,6);writer.put(0,1);writer.put(best.value&65535,16);return;
    }
    if(best.kind==='verbatim'){
      writer.put(0,1);writer.put(1,6);writer.put(0,1);
      for(const v of data)writer.put(v&65535,16);
      return;
    }
    writer.put(0,1);writer.put(8+best.order,6);writer.put(0,1);
    for(let i=0;i<best.order;i++)writer.put(data[i]&65535,16);
    writer.put(0,2);writer.put(0,4);writer.put(best.k,4);
    for(let i=best.order;i<data.length;i++){
      const folded=zig(residual(data,i,best.order));
      const q=Math.floor(folded/2**best.k);
      writer.zero(q);writer.put(1,1);
      if(best.k)writer.put(folded%(2**best.k),best.k);
    }
  }
  // Incremental MD5 of signed, interleaved little-endian PCM as required by STREAMINFO.
  const md5K=Int32Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296));
  const md5Shifts=[[7,12,17,22],[5,9,14,20],[4,11,16,23],[6,10,15,21]];
  class PCMHash {
    constructor(){this.state=new Int32Array([0x67452301,0xefcdab89,0x98badcfe,0x10325476]);this.tail=new Uint8Array(64);this.word=new Int32Array(16);this.used=0;this.bytes=0;}
    block(bytes){
      const word=this.word;
      for(let i=0;i<16;i++){const j=i*4;word[i]=bytes[j]|(bytes[j+1]<<8)|(bytes[j+2]<<16)|(bytes[j+3]<<24);}
      let [a,b,c,d]=this.state;
      for(let i=0;i<64;i++){
        const phase=i>>4;let f,g;
        if(phase===0){f=(b&c)|(~b&d);g=i;}
        else if(phase===1){f=(d&b)|(~d&c);g=(5*i+1)%16;}
        else if(phase===2){f=b^c^d;g=(3*i+5)%16;}
        else{f=c^(b|~d);g=(7*i)%16;}
        const x=(a+f+md5K[i]+word[g])|0,shift=md5Shifts[phase][i%4];
        const old=d;d=c;c=b;b=(b+((x<<shift)|(x>>>(32-shift))))|0;a=old;
      }
      this.state[0]=(this.state[0]+a)|0;this.state[1]=(this.state[1]+b)|0;
      this.state[2]=(this.state[2]+c)|0;this.state[3]=(this.state[3]+d)|0;
    }
    update(bytes){
      this.bytes+=bytes.length;let at=0;
      while(at<bytes.length){const n=Math.min(64-this.used,bytes.length-at);this.tail.set(bytes.subarray(at,at+n),this.used);this.used+=n;at+=n;if(this.used===64){this.block(this.tail);this.used=0;}}
    }
    finish(){
      const count=this.bytes,rest=new Uint8Array(this.used<56?64:128);rest.set(this.tail.subarray(0,this.used));rest[this.used]=128;
      new DataView(rest.buffer).setBigUint64(rest.length-8,BigInt(count)*8n,true);
      for(let i=0;i<rest.length;i+=64)this.block(rest.subarray(i,i+64));
      const digest=new Uint8Array(16),view=new DataView(digest.buffer);
      for(let i=0;i<4;i++)view.setInt32(i*4,this.state[i],true);
      return digest;
    }
  }
  function configureRate(value){
    const common={88200:1,176400:2,192000:3,8000:4,16000:5,22050:6,24000:7,32000:8,44100:9,48000:10,96000:11};
    if(common[value]){rateCode=common[value];rateExtra=[];}
    else if(value<=65535){rateCode=13;rateExtra=[value>>8,value&255];}
    else if(value%10===0&&value/10<=65535){rateCode=14;rateExtra=[(value/10)>>8,(value/10)&255];}
    else throw Error("Sample rate not supported for compatible FLAC export.");
  }
  function frame(left,right) {
    const len=left.length,blockCode=len===BLOCK?12:len<=256?6:7;
    const blockExtra=blockCode===12?[]:blockCode===6?[len-1]:[((len-1)>>8)&255,(len-1)&255];
    const head=[255,248,(blockCode<<4)|rateCode,0x18,...numberBytes(frameIndex++),...blockExtra,...rateExtra];
    head.push(crc8(head));
    const bw=new Bits();subframe(bw,left);subframe(bw,right);
    const audio=bw.finish();
    const out=new Uint8Array(head.length+audio.length+2);
    out.set(head);out.set(audio,head.length);
    const check=crc16(out.subarray(0,out.length-2));
    out[out.length-2]=check>>8;out[out.length-1]=check&255;
    return out;
  }
  function header(){
    const vendor=new TextEncoder().encode('XenSonar Recorder F3.19.1');
    const comments=new Uint8Array(8+vendor.length),cv=new DataView(comments.buffer);
    cv.setUint32(0,vendor.length,true);comments.set(vendor,4);cv.setUint32(4+vendor.length,0,true);
    // STREAMINFO -> SEEKTABLE -> VORBIS_COMMENT (only this final block has the last flag).
    const seekBytes=seekPoints.length*18;
    const out=new Uint8Array(42+4+seekBytes+4+comments.length),v=new DataView(out.buffer);
    out.set([0x66,0x4c,0x61,0x43,0,0,0,34]);
    const size=Math.min(BLOCK,frames);v.setUint16(8,size,false);v.setUint16(10,size,false);
    out[12]=minFrame>>16;out[13]=minFrame>>8;out[14]=minFrame;
    out[15]=maxFrame>>16;out[16]=maxFrame>>8;out[17]=maxFrame;
    const packed=(BigInt(rate)<<44n)|(1n<<41n)|(15n<<36n)|BigInt(frames);
    v.setBigUint64(18,packed,false);out.set(md5.finish(),26);
    out.set([3,(seekBytes>>16)&255,(seekBytes>>8)&255,seekBytes&255],42);
    let at=46;
    for(const point of seekPoints){v.setBigUint64(at,BigInt(point.sample),false);v.setBigUint64(at+8,BigInt(point.byte),false);v.setUint16(at+16,point.size,false);at+=18;}
    out.set([0x84,0,0,comments.length],at);out.set(comments,at+4);
    return out;
  }
  function send(bytes){self.postMessage({type:'encoded',data:bytes.buffer},[bytes.buffer]);}
  self.onmessage=function({data:m}){
    try {
      if(m.type==='init'){
        rate=m.sampleRate;frames=m.frames;offset=0;frameIndex=0;byteOffset=0;minFrame=Infinity;maxFrame=0;nextSeek=0;seekPoints=[];md5=new PCMHash();
        if(!Number.isInteger(rate)||rate<1||rate>655350||!Number.isSafeInteger(frames)||frames<16||frames>2**36-1)throw Error("Invalid sample count/sample rate for FLAC");
        configureRate(rate);self.postMessage({type:'need',offset,frames:Math.min(65536,frames-offset)});
      } else if(m.type==='pcm'){
        const len=m.left.length;
        if(m.offset!==offset||len!==Math.min(65536,frames-offset)||len!==m.right.length)throw Error("FLAC PCM transfer incomplete or out of order.");
        for(let start=0;start<len;start+=BLOCK){
          const size=Math.min(BLOCK,len-start);
          const l=new Int16Array(size),r=new Int16Array(size);
          for(let i=0;i<size;i++){
            let a=m.left[start+i],b=m.right[start+i];
            a=Math.max(-1,Math.min(1,Number.isFinite(a)?a:0));
            b=Math.max(-1,Math.min(1,Number.isFinite(b)?b:0));
            l[i]=a<0?Math.round(a*32768):Math.round(a*32767);
            r[i]=b<0?Math.round(b*32768):Math.round(b*32767);
          }
          const pcm=new Uint8Array(size*4),pv=new DataView(pcm.buffer);
          for(let i=0;i<size;i++){pv.setInt16(i*4,l[i],true);pv.setInt16(i*4+2,r[i],true);}
          md5.update(pcm);
          const encoded=frame(l,r),sample=offset+start;
          if(sample>=nextSeek){seekPoints.push({sample,byte:byteOffset,size});nextSeek=sample+rate*10;}
          minFrame=Math.min(minFrame,encoded.length);maxFrame=Math.max(maxFrame,encoded.length);byteOffset+=encoded.length;
          send(encoded);
        }
        offset+=len;
        if(offset<frames)self.postMessage({type:'need',offset,frames:Math.min(65536,frames-offset)});
        else {const metadata=header();self.postMessage({type:'done',header:metadata.buffer,frames:offset,bytes:byteOffset},[metadata.buffer]);}
      }
    }catch(e){self.postMessage({type:'error',message:String(e && e.message || e)});}
  };
}

function f319RecorderFlacEncode(buffer, range, onProgress) {
  if(!buffer) return Promise.reject(new Error('No recording available.'));
  const {left,right}=TW(buffer,range);
  if(left.length!==right.length||left.length<16) return Promise.reject(new Error("FLAC requires at least 16 samples."));
  let worker, workerURL;
  try {
    workerURL=URL.createObjectURL(new Blob(['('+f319FlacWorkerEntry.toString()+')()'],{type:'text/javascript'}));
    worker=new Worker(workerURL);
  } catch(error){if(workerURL) URL.revokeObjectURL(workerURL);return Promise.reject(error);}
  return new Promise((resolve,reject)=>{
    const chunks=[];
    let closed=false, receivedBytes=0;
    function finish(error,blob){
      if(closed)return;
      closed=true;
      worker.terminate();URL.revokeObjectURL(workerURL);
      if(error)reject(error);else resolve(blob);
    }
    worker.onerror=error=>finish(new Error(error.message||'FLAC-Worker fehlgeschlagen.'));
    worker.onmessage=event=>{
      if(closed)return;
      const m=event.data;
      try {
        if(m.type==='encoded'){if(!(m.data instanceof ArrayBuffer)||!m.data.byteLength)throw Error('Leerer FLAC-Audioblock.');chunks.push(m.data);receivedBytes+=m.data.byteLength;}
        else if(m.type==='need'){
          const a=new Float32Array(left.subarray(m.offset,m.offset+m.frames));
          const b=new Float32Array(right.subarray(m.offset,m.offset+m.frames));
          worker.postMessage({type:'pcm',offset:m.offset,left:a,right:b},[a.buffer,b.buffer]);
          if(onProgress)onProgress((m.offset+m.frames)/left.length);
        } else if(m.type==='done'){
          if(m.frames!==left.length||m.bytes!==receivedBytes||!(m.header instanceof ArrayBuffer)||m.header.byteLength<42)throw Error("FLAC output incomplete.");
          const magic=new Uint8Array(m.header,0,4);
          if(magic[0]!==102||magic[1]!==76||magic[2]!==97||magic[3]!==67)throw Error("Invalid FLAC file header.");
          finish(null,new Blob([m.header,...chunks],{type:'audio/flac'}));
        }
        else if(m.type==='error')finish(new Error(m.message||'FLAC-Encoderfehler'));
      }catch(error){finish(error);}
    };
    worker.postMessage({type:'init',sampleRate:Math.round(buffer.sampleRate),frames:left.length});
  });
}

