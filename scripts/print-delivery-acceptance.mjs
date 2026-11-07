import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { createPrintsPreviewServer } from './prints-preview-server.mjs';

const output='/tmp/no3d-print-delivery-acceptance';await mkdir(output,{recursive:true});
let revoked=false,pending=0;const requests=[];
const server=createPrintsPreviewServer({purchaseFixture:async body=>{
  requests.push(body);
  if(body.action==='recover')return{status:202,body:{accepted:true}};
  if(body.action==='preferences')return{body:{updates:body.updates??true,promotions:body.promotions??false}};
  if(body.grant==='expired'||revoked)return{status:403,body:{error:'unavailable'}};
  if(body.action==='order'&&pending++===0)return{body:{state:'pending'}};
  return{body:{state:'ready',title:'The Lighter Keeper 01',handle:'mace-and-chain',grant:'test-purchase',preferenceGrant:'test-preferences',updates:true,promotions:false,...(body.download?{url:'https://files.example.test/print.zip'}:{})}};
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true});const errors=[];
try{
  for(const [width,height] of [[390,844],[1440,1100]]){
    const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width,height});
    page.on('pageerror',e=>errors.push(e.message));let authRequests=0;page.on('request',r=>{if(r.url().includes('/api/auth/'))authRequests++;});
    await page.goto(`${base}/v3/prints/download/?order=22222222-2222-4222-8222-222222222222`,{waitUntil:'networkidle0'});
    await page.waitForSelector('[data-print-download]:not([hidden])');assert.equal(authRequests,0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`${output}/ready-${width}.png`,fullPage:true});
    await page.click('[data-promotion-optin]');
    await page.waitForFunction(()=>document.querySelector('[data-promotion-status]').textContent.includes('You’re subscribed'));
    assert.equal(requests.at(-1).promotions,true);assert.equal('updates' in requests.at(-1),false);
    await page.click('[data-promotion-optin]');
    await page.waitForFunction(()=>document.querySelector('[data-promotion-status]').textContent.includes('You’re unsubscribed'));
    assert.equal(requests.at(-1).promotions,false);
    await page.click('summary');await page.click('input[name=updates]');await page.click('[data-print-preferences-form] button');
    await page.waitForFunction(()=>document.querySelector('[data-preference-status]').textContent.includes('saved'));
    assert.equal(requests.at(-1).updates,false);assert.equal(requests.at(-1).promotions,false);
    await page.goto(`${base}/v3/prints/download/#grant=test-purchase`,{waitUntil:'networkidle0'});
    await page.waitForSelector('[data-print-download]:not([hidden])');assert.equal(await page.evaluate(()=>location.hash),'');
    revoked=true;await page.click('[data-print-download]');await page.waitForFunction(()=>document.querySelector('[data-print-status]').textContent.includes('couldn’t'));revoked=false;
    await page.goto(`${base}/v3/prints/download/#preferences=test-preferences`,{waitUntil:'networkidle0'});
    await page.waitForSelector('[data-print-preferences]:not([hidden])');assert.equal(await page.$eval('input[name=promotions]',x=>x.checked),false);
    await page.screenshot({path:`${output}/preferences-${width}.png`,fullPage:true});
    await page.goto(`${base}/v3/prints/download/#grant=expired`,{waitUntil:'networkidle0'});
    await page.waitForSelector('[data-print-recovery]:not([hidden])');await page.type('input[name=email]','buyer@example.test');await page.click('[data-print-recovery] button');
    await page.waitForFunction(()=>document.querySelector('[data-print-status]').textContent.includes('If that address'));
    await page.screenshot({path:`${output}/recovery-${width}.png`,fullPage:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/result.json`,JSON.stringify({passed:true,viewports:[390,1440],boundaries:['Local API fixtures; no real payment or email delivery'],checks:['guest success','pending payment','fresh-browser email link','fragment removal','refund denial','preferences','expired link recovery','no auth requests','no horizontal overflow']},null,2));
  console.log(`Prints browser acceptance passed: ${output}`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
