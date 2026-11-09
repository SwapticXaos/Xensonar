// Recording-only protocol. The audited p0-w/325-audit1 control protocol is unchanged.
export const P0_TAP_PROTOCOL='p0-pcm-tap/326-audit1';
export const P0_TAP_POOL_BUFFERS=16;
export const P0_TAP_FRAMES_PER_BUFFER=4096;
export const P0_TAP_CHANNELS=2;
export const P0_TAP_BYTES=P0_TAP_FRAMES_PER_BUFFER*P0_TAP_CHANNELS*4;
export const P0_TAP_MAX_SECONDS=10;
export const safeInteger=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export const validRate=v=>safeInteger(v,8000,96000);
export const maxChunks=frames=>Math.ceil(frames/P0_TAP_FRAMES_PER_BUFFER)+P0_TAP_POOL_BUFFERS+2;
