#!/usr/bin/env node
// Browser acceptance uses an isolated browser profile. It never signs in or checks out.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer';
const root = path.resolve(import.meta.dirname, '..');
const live = process.env.ANALYTICS_ACCEPTANCE_ORIGIN;
let server;
let mode = 'ok';
const accepted = [];
if (!live) {
  server = http.createServer(async (req,res) => {
    if (req.url === '/api/track') {
      let body='';for await(const chunk of req)body+=chunk;
      if (mode==='ok') accepted.push(JSON.parse(body));
      res.writeHead(mode==='ok'?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:mode==='ok'}));return;
    }
    const file = path.join(root,new URL(req.url,'http://local').pathname);
    try {
      const body=await fs.readFile(file.endsWith('/')?`${file}index.html`:file);
      res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(body);
    } catch {res.statusCode=404;res.end('not found');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
}
const origin=live || `http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
const results=[];
try {
  const page=await browser.newPage();
  const requests=[];const responses=[];
  page.on('request',r=>{if(new URL(r.url()).pathname==='/api/track')requests.push(JSON.parse(r.postData()));});
  page.on('response',r=>{if(new URL(r.url()).pathname==='/api/track')responses.push(r.status());});
  await page.evaluateOnNewDocument(()=>sessionStorage.setItem('no3d_analytics_synthetic','1'));
  for (const route of ['/v3/','/v3/product/?handle=chrome-crayon','/v3/collections/no3d-chrome-tools/','/v3/onboarding/create-account/']) {
    const before=requests.length;
    await page.goto(origin+route,{waitUntil:'networkidle0'});
    await page.waitForFunction(()=>window.__no3dAnalytics?.lastAcceptedAt,{timeout:15000});
    const rows=requests.slice(before);
    assert.equal(rows.filter(r=>r.event==='page_view').length,1,`${route}: ${JSON.stringify(rows.map(r=>({event:r.event,page:r.page})))}`);
    assert.ok(rows.every(r=>r.synthetic===true));
    // Imports with old query strings must not initialize a second tracker.
    await page.evaluate(async()=>{const m=await import('/v3/js/analytics.js?v=old');m.initializeAnalytics();});
    assert.equal(requests.slice(before).filter(r=>r.event==='page_view').length,1);
    results.push({route,pageViews:1,events:rows.map(r=>r.event)});
  }
  assert.ok(responses.every(s=>s===200));
  const before=requests.length;
  await page.evaluate(async()=>{const m=await import('/v3/js/analytics.js');await Promise.all([m.trackOnce('account_start'),m.trackOnce('account_start')]);});
  assert.equal(requests.length-before,1);
  if (!live) {
    mode='fail';
    await page.reload({waitUntil:'networkidle0'});
    assert.equal(await page.evaluate(()=>window.__no3dAnalytics.lastError),'http_503');
    assert.ok(await page.$('body'));
    const normal=await browser.newPage();await normal.goto(origin+'/v3/',{waitUntil:'networkidle0'});
    assert.equal(await normal.evaluate(()=>window.__no3dAnalytics.lastAcceptedAt),undefined);
    await normal.close();
    // Test real product event identity without requiring an external catalog in local CI.
    mode='ok';await page.goto(origin+'/v3/',{waitUntil:'networkidle0'});
    await page.evaluate(async()=>{const m=await import('/v3/js/analytics.js');await m.track('product_view',{handle:'chrome-crayon',email:'private@example.com'});});
    assert.equal(accepted.at(-1).properties.handle,'chrome-crayon');assert.equal(accepted.at(-1).properties.email,undefined);
  } else {
    const payload={event:'page_view',event_id:randomUUID(),session_id:randomUUID(),page:'/v3/',synthetic:true};
    const send=()=>fetch(origin+'/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    assert.equal((await send()).ok,true);assert.equal((await send()).duplicate,true);
    results.push({deduplication:true,eventId:payload.event_id});
  }
  console.log(JSON.stringify({ok:true,origin,synthetic:true,results},null,2));
} finally {await browser.close();if(server)await new Promise(r=>server.close(r));}
