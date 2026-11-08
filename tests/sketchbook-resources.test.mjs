import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookResources} from '../v3/js/sketchbook/resources.js';

const descriptor={manifest:'/book/manifest.json.gz'};
const manifest={parts:[
  ...Array.from({length:4},(_,i)=>({name:`pages ${i}`,material:{texture:`page${i}.webp`}})),
  {name:'stickers / art',material:{texture:'sticker.webp'}},
  {name:'cover / notebook',material:{texture:'cover.webp'}}
],poseChunks:{chunks:[{file:'pose0.bin'},{file:'pose1.bin'}]}};

test('selected book warm-up prioritizes its first view, limits concurrency, and shares downloads with activation',async()=>{
  const calls=[];let pending=0,peak=0;
  const resources=createBookResources(descriptor,{fetcher:async url=>{
    calls.push(url);peak=Math.max(peak,++pending);
    await new Promise(resolve=>setTimeout(resolve,5));pending--;
    return new Response(url===descriptor.manifest?JSON.stringify(manifest):'asset',{headers:{'content-encoding':'gzip'}});
  }});
  try {
    await Promise.all([resources.warm(),resources.fetch(descriptor.manifest)]);
    assert.equal(calls.filter(url=>url===descriptor.manifest).length,1);
    assert.deepEqual(calls.slice(1,5),['/book/cover.webp','/book/pose0.bin','/book/page0.webp','/book/page1.webp']);
    assert.ok(peak<=2);
    assert.ok(!calls.includes('/book/pose1.bin'),'later animation remains streamed');
    const before=calls.length;
    const response=await resources.fetch('/book/page0.webp');
    assert.equal(response.headers.get('content-encoding'),null,'already decoded bytes are not marked gzip');
    assert.equal(await response.text(),'asset');
    assert.equal(calls.length,before,'opening reuses the warmed image');
  } finally {resources.destroy();}
});

test('changing products aborts old downloads and rejects access to the discarded cache',async()=>{
  let aborted=false;
  const resources=createBookResources(descriptor,{fetcher:(_url,{signal})=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));},{once:true});
  })});
  const pending=resources.warm();
  resources.destroy();
  await assert.rejects(pending,{name:'AbortError'});
  assert.equal(aborted,true);
  await assert.rejects(resources.fetch(descriptor.manifest),{name:'AbortError'});
});

test('a failed prefetch can retry and the encoded cache has a finite size',async()=>{
  let requests=0;
  const resources=createBookResources(descriptor,{maxBytes:5,fetcher:async()=>{
    requests++;
    return requests===1?new Response('',{status:503}):new Response('1234');
  }});
  try {
    await assert.rejects(resources.fetch('/a'));
    assert.equal(await (await resources.fetch('/a')).text(),'1234');
    await resources.fetch('/b');
    await resources.fetch('/a');
    assert.equal(requests,4,'evicted blobs can be fetched again');
  } finally {resources.destroy();}
});
