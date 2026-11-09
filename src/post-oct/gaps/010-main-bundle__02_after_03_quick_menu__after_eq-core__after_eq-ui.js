/* XPERF-12 MQUOTA: lossless, opt-in-on-quota room snapshot packing.
   The canonical V2 JSON remains authoritative; packed room values are explicitly
   versioned and validated before session hydration. No deletion or sidecar I/O. */
function __xenMetaPackRoomSettings(room){
 if(room==null)return null;
 const raw=JSON.stringify(room),data=new TextEncoder().encode(raw);
 if(data.length>2200000)throw Error('Live Room snapshot exceeds the safe packing limit.');
 const dictionary=new Map(),bytes=[];
 let next=256,w='',buffer=0,bits=0;
 const write=code=>{buffer|=code<<bits;bits+=12;while(bits>=8){bytes.push(buffer&255);buffer>>>=8;bits-=8}};
 for(let i=0;i<data.length;i++){
  const c=String.fromCharCode(data[i]),wc=w+c;
  if(wc.length>1&&dictionary.has(wc)){w=wc;continue}
  if(w)write(w.length===1?w.charCodeAt(0):dictionary.get(w));
  if(w&&next<4096)dictionary.set(wc,next++);
  w=c;
 }
 if(w)write(w.length===1?w.charCodeAt(0):dictionary.get(w));
 if(bits)bytes.push(buffer&255);
 let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.slice(i,i+8192));
 const checksum=data.reduce((h,v)=>Math.imul(h^v,16777619)>>>0,2166136261);
 const packed={__xenPackedRoom:1,version:3,codec:'lzw12-utf8-v1',length:data.length,checksum,data:btoa(str)};
 return JSON.stringify(packed).length<raw.length?packed:room;
}
function __xenMetaUnpackRoomSettings(value){
 if(!value||value.__xenPackedRoom!==1)return value;
 if(value.version!==3||value.codec!=='lzw12-utf8-v1'||!Number.isInteger(value.length)||value.length<2||value.length>2200000||
    !Number.isInteger(value.checksum)||typeof value.data!=='string'||value.data.length>3200000)
  throw Error('Invalid packed Live Room snapshot; archive unchanged.');
 const bin=atob(value.data),codes=[],dict=new Array(4096);
 let buffer=0,bits=0;
 for(let i=0;i<bin.length;i++){buffer|=bin.charCodeAt(i)<<bits;bits+=8;if(bits>=12){codes.push(buffer&4095);buffer>>>=12;bits-=12}}
 if(!codes.length||codes[0]>=256)throw Error('Invalid packed Live Room data.');
 let prev=String.fromCharCode(codes[0]),next=256,count=0;
 const output=new Uint8Array(value.length);
 const append=s=>{if(count+s.length>output.length)throw Error('Packed Live Room data exceeds declared length.');for(let i=0;i<s.length;i++)output[count++]=s.charCodeAt(i)};
 append(prev);
 for(let i=1;i<codes.length;i++){
  const code=codes[i],entry=code<256?String.fromCharCode(code):(code<next?dict[code]:code===next?prev+prev[0]:null);
  if(!entry)throw Error('Invalid packed Live Room dictionary.');
  append(entry);
  if(next<4096)dict[next++]=prev+entry[0];
  prev=entry;
 }
 if(count!==value.length)throw Error('Packed Live Room data length mismatch.');
 const checksum=output.reduce((h,v)=>Math.imul(h^v,16777619)>>>0,2166136261);
 if(checksum!==value.checksum)throw Error('Packed Live Room checksum mismatch.');
 const room=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(output));
 if(!room||room.version!==1||!room.nParamsUI||typeof room.nParamsUI!=='object')throw Error('Invalid unpacked Live Room structure.');
 return room;
}

