import {decodePoses} from './pose-codec.js';
// Three nearby chunks retain the exact exported samples; no geometry resampling.
export function createPoseStore(manifest,base,{onChange=()=>{},onError=()=>{},fetcher=fetch}={}){
  const config=manifest.poseChunks,cache=new Map(),pending=new Map(),failed=new Map(),waiters=new Map();
  let center=0,destroyed=false;
  const chunkFor=frame=>Math.min(config.chunks.length-1,Math.floor(frame/config.interval));
  const desired=()=>[center,center+1,center-1].filter(i=>i>=0&&i<config.chunks.length);
  function trim(){
    while(cache.size>3){
      const farthest=[...cache.keys()].sort((a,b)=>Math.abs(b-center)-Math.abs(a-center))[0];cache.delete(farthest);
    }
  }
  function pump(){
    if(destroyed)return;
    for(const index of desired()){
      if(pending.size>=2)break;
      if(cache.has(index)||pending.has(index)||failed.has(index))continue;
      const controller=new AbortController(),chunk=config.chunks[index];pending.set(index,controller);
      const timeout=setTimeout(()=>controller.abort(),30000);
      (async()=>{
        const response=await fetcher(base+chunk.file,{signal:controller.signal});
        if(!response.ok)throw new Error(`Animation download failed (${response.status}).`);
        let buffer=await response.arrayBuffer();
        if(buffer.byteLength!==chunk.bytes){
          const header=new Uint8Array(buffer,0,Math.min(2,buffer.byteLength));
          if(header[0]===31 && header[1]===139){
            const stream=new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
            buffer=await new Response(stream).arrayBuffer();
          }
        }
        if(buffer.byteLength!==chunk.bytes)throw new Error('Animation download was incomplete.');
        if(destroyed)return;
        cache.set(index,config.encoding==='delta-u16-planes-v1'?decodePoses(buffer,manifest.parts,chunk.count):new Uint16Array(buffer));trim();
        waiters.get(index)?.resolve();waiters.delete(index);onChange();
      })().catch(error=>{
        if(destroyed)return;
        const failure=error.name==='AbortError'?new Error('Animation download timed out. Tap Retry.'):error;
        failed.set(index,failure);waiters.get(index)?.reject(failure);waiters.delete(index);
        if(index===center)onError(failure);
      }).finally(()=>{clearTimeout(timeout);pending.delete(index);pump();});
    }
  }
  function select(frame){center=chunkFor(frame);trim();pump();return center;}
  return {
    async ready(frame){
      const index=select(frame);
      if(cache.has(index))return;
      if(failed.has(index))throw failed.get(index);
      return new Promise((resolve,reject)=>waiters.set(index,{resolve,reject}));
    },
    get(frame){
      const index=select(frame),data=cache.get(index),chunk=config.chunks[index];
      if(!data){if(failed.has(index))onError(failed.get(index));return null;}
      return {data,count:chunk.count,a:Math.floor(frame)-chunk.start,b:Math.min(chunk.count-1,Math.floor(frame)-chunk.start+1),mix:frame-Math.floor(frame)};
    },
    getStats(){return {poseChunks:cache.size,pendingPoseChunks:pending.size,poseMemoryMB:[...cache.values()].reduce((n,data)=>n+data.byteLength,0)/1048576};},
    destroy(){destroyed=true;for(const controller of pending.values())controller.abort();cache.clear();for(const waiter of waiters.values())waiter.reject(new Error('Viewer closed.'));waiters.clear();}
  };
}
