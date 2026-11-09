// P0 control plane only. Physical packet credits and full coalesced safety state.
export const P0_PROTOCOL = 'p0-w/325-audit1';
export class P0BoundedClient {
  constructor(port,onMessage,scope) {
    this.port=port;this.onMessage=onMessage;this.scope=Object.freeze({...scope});this.sequence=0;
    this.normalQueue=[];this.inFlight=new Map();this.statePending=null;this.stateRevision=0;
    this.safetyPending=false;this.safetyRevision=0;this.closed=false;
    this.safety={closedThroughGenerationBySlot:Array(128).fill(0),reconcileGates:null,stopProgram:false,ownerEpochClosed:false};
    port.onmessage=ev=>this.handle(ev.data);
  }
  matches(m) { return m?.sessionId===this.scope.sessionId&&m?.engineEpoch===this.scope.engineEpoch&&m?.ownerEpoch===this.scope.ownerEpoch; }
  handle(m) {
    if (!this.matches(m)) return;
    if(m.kind==='render-proof'&&m.armedOwnerEpoch===this.scope.ownerEpoch&&m.ownerClosed===1) {
      this.closed=true;this.normalQueue.length=0;this.statePending=null;
    }
    if (m.kind==='receipt') {
      const pending=this.inFlight.get(m.packetSequence);
      if (!pending || pending.channel!==m.channel) return;
      this.inFlight.delete(m.packetSequence);
      this.flush();
    }
    this.onMessage?.(m);
  }
  count(channel) { let n=0;for(const v of this.inFlight.values())if(v.channel===channel)n++;return n; }
  send(channel,message) {
    const packet={...message,...this.scope,protocol:P0_PROTOCOL,channel,packetSequence:++this.sequence};
    // Only bounded, validated fixture objects reach this control-plane serializer.
    if (JSON.stringify(packet).length>8192) return false;
    this.inFlight.set(packet.packetSequence,{channel});
    try { this.port.postMessage(packet); } catch(error) {this.inFlight.delete(packet.packetSequence);throw error;}
    return true;
  }
  postNormal(m) {
    if(this.closed || this.normalQueue.length>=64)return false;
    let notes=m.notes?.length??0;
    for(const q of this.normalQueue)notes+=q.notes?.length??0;
    if(notes>64||JSON.stringify(m).length>7600)return false;
    this.normalQueue.push(m);this.flush();return true;
  }
  postState(m) {
    if(this.closed||!Number.isSafeInteger(m.revision)||m.revision<=this.stateRevision)return false;
    this.stateRevision=m.revision;this.statePending=m;this.flush();return true;
  }
  postSafety(m) {
    if(m.kind==='release') {
      if(!Number.isInteger(m.tokenSlot)||m.tokenSlot<0||m.tokenSlot>=128||!Number.isInteger(m.tokenGeneration)||m.tokenGeneration<1||m.tokenGeneration>0xffffffff)return false;
      this.safety.closedThroughGenerationBySlot[m.tokenSlot]=Math.max(this.safety.closedThroughGenerationBySlot[m.tokenSlot],m.tokenGeneration);
    } else if(m.kind==='panic') {
      this.safety.ownerEpochClosed=true;this.closed=true;this.normalQueue.length=0;this.statePending=null;
    } else if(m.kind==='gate-reconcile') {
      if(!Number.isSafeInteger(m.observedInputSequence)||m.observedInputSequence<0||!Array.isArray(m.held)||m.held.length>16)return false;
      if(m.observedInputSequence<(this.safety.reconcileGates?.observedInputSequence??-1))return false;
      this.safety.reconcileGates={observedInputSequence:m.observedInputSequence,held:m.held.map(x=>({...x}))};
    } else if(m.kind==='program-stop')this.safety.stopProgram=true;
    else return false;
    this.safetyRevision++;this.safetyPending=true;this.flush();return true;
  }
  flush() {
    // Reserved safety slot; every replacement retains all terminal watermarks.
    if(this.safetyPending&&this.count('safety')===0) {
      const state={...this.safety,revision:this.safetyRevision,closedThroughGenerationBySlot:this.safety.closedThroughGenerationBySlot.slice()};
      this.safetyPending=false;
      this.send('safety',{kind:'safety-state',state});
    }
    if(this.closed)return;
    if(this.statePending&&this.count('state')===0) {
      const m=this.statePending;this.statePending=null;this.send('state',m);
    }
    while(this.count('normal')<2&&this.normalQueue.length)this.send('normal',this.normalQueue.shift());
  }
}
