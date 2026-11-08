// Package exact exported samples with the existing lossless pose codec.
// Usage: node scripts/package-sketchbook.mjs RAW_EXPORT NEW_VERSION_DIRECTORY
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {encodePoses,decodePoses} from '../v3/js/sketchbook/pose-codec.js';

const [input,output]=process.argv.slice(2);
assert.ok(input && output && path.resolve(input)!==path.resolve(output));
await assert.rejects(fs.access(path.join(output,'manifest.json.gz')), 'Choose a new version directory; published packages are immutable.');
const manifest=JSON.parse(await fs.readFile(path.join(input,'manifest.json')));
await fs.mkdir(path.join(output,'textures'),{recursive:true});
await fs.mkdir(path.join(output,'poses'),{recursive:true});
for (const part of manifest.parts) {
  const material=part.material;
  if (!material.texture) continue;
  const source=path.join(input,material.texture), filename=path.basename(source,'.png')+'.webp';
  const target=path.join(output,'textures',filename);
  try { await fs.access(target); }
  catch { execFileSync('cwebp',['-quiet','-q','94','-alpha_q','100','-m','6',source,'-o',target]); }
  material.texture='textures/'+filename;
}
const sources=await Promise.all(manifest.parts.map(p=>fs.readFile(path.join(input,p.file))));
const interval=8,chunks=[];
for(let start=0;start<manifest.sampleCount;start+=interval){
  const count=Math.min(interval+1,manifest.sampleCount-start);
  const buffer=Buffer.concat(sources.map((source,i)=>{
    const stride=manifest.parts[i].vertexCount*3*2;
    return source.subarray(start*stride,(start+count)*stride);
  }));
  const data=new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);
  const encoded=encodePoses(data,manifest.parts,count);
  assert.deepEqual(decodePoses(encoded.buffer,manifest.parts,count),data);
  const hash=createHash('sha256').update(encoded).digest('hex').slice(0,12);
  const file=`poses/${String(chunks.length).padStart(3,'0')}.${hash}.bin`;
  const compressed=gzipSync(encoded,{level:9});
  await fs.writeFile(path.join(output,file),compressed);
  chunks.push({file,start,count,bytes:buffer.length,transferBytes:compressed.length});
}
manifest.poseChunks={interval,encoding:'delta-u16-planes-v1',chunks};
for(const part of manifest.parts){delete part.file;delete part.bytes;}
await fs.writeFile(path.join(output,'manifest.json.gz'),gzipSync(JSON.stringify(manifest),{level:9}));
console.log(JSON.stringify({pageCount:manifest.pageCount,parts:manifest.parts.length,chunks:chunks.length,geometryMB:chunks.reduce((n,c)=>n+c.transferBytes,0)/1048576,roundTrip:'exact'}));
