import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const base='https://staging.no3dtools.com';
assert.equal(process.env.SITE_URL,base);assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));assert.ok(process.argv.includes('--apply'));
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'eydsnjawjhahtlbzwvlo.supabase.co');
assert.ok(process.env.NO3D_E2E_EMAIL&&process.env.RESEND_API_KEY);
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const products=JSON.parse(await readFile(new URL('../api/prints/lib/delivery.json',import.meta.url)));
const report={target:base,startedAt:new Date().toISOString(),products:[],boundaries:['Real hosted Stripe test payments. No live charges.','Email content read from Resend; last provider event recorded separately. Sent is provider acceptance, not proof of inbox delivery. Recipient inbox UI is not inspected.','Fresh browser contexts; no auth user, injected login cookies or administrative sign-in links.']};
const browser=await puppeteer.launch({headless:true});const cleanup=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(check,label){for(let i=0;i<120;i++){const v=await check();if(v)return v;await sleep(2000);}throw Error(label);}
async function api(page,body){return page.evaluate(async body=>{const r=await fetch('/api/prints/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};},body);}
async function emailForOrder(orderId,excludeId){
  const r=await fetch('https://api.resend.com/emails',{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`}});
  if(!r.ok)throw Error(`Email readback unavailable (${r.status})`);
  const list=await r.json();
  for(const item of list.data||[]){
    if(item.id===excludeId||!item.to?.includes(process.env.NO3D_E2E_EMAIL)||new Date(item.created_at)<new Date(report.startedAt))continue;
    await sleep(550);
    const response=await fetch(`https://api.resend.com/emails/${item.id}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`}});
    if(!response.ok)continue;const email=await response.json();
    const link=email.text?.match(/https:\/\/staging\.no3dtools\.com\/v3\/prints\/download\/#grant=([A-Za-z0-9_.-]+)/);
    if(!link)continue;
    const claim=JSON.parse(Buffer.from(link[1].split('.')[0],'base64url').toString());
    if(claim.id===orderId&&['sent','delivered','opened','clicked'].includes(email.last_event))return{link:link[0],id:email.id,event:email.last_event,text:email.text};
  }
  return null;
}
async function fillCheckout(page){
  await page.waitForSelector('input[name=email]');
  await page.type('input[name=email]',process.env.NO3D_E2E_EMAIL);
  const card=await page.$('button[aria-label="Pay with card"]');if(card)await card.evaluate(el=>el.click());
  await page.waitForSelector('input[name=cardNumber]',{visible:true});
  for(const[name,value]of Object.entries({cardNumber:'4242424242424242',cardExpiry:'1234',cardCvc:'123',billingName:'NO3D Prints Sandbox',billingPostalCode:'80202'})){
    const input=await page.$(`input[name=${name}]`);if(!input||!await input.boundingBox())continue;
    await input.focus();await input.evaluate(el=>el.select());await input.press('Backspace');await input.type(value,{delay:10});
  }
  await page.$$eval('input[type=checkbox]',boxes=>{for(const box of boxes){if(box.id==='enableStripePass'&&box.checked)box.click();const label=box.closest('label')?.textContent||document.querySelector(`label[for="${CSS.escape(box.id)}"]`)?.textContent||'';if(/terms|privacy/i.test(label)&&!box.checked)box.click();}});
}
try{
  const usersBefore=await db.auth.admin.listUsers({page:1,perPage:1000});assert.equal(usersBefore.error,null);report.authUsersBefore=usersBefore.data.users.length;
  const config=await(await fetch(`${base}/api/commerce/config`)).json();assert.equal(config.printsAccountFreeEnabled,true);assert.equal(config.membershipExpectedEnvironment,'test');
  for(const[index,product]of products.entries()){
    const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width:1280,height:1000});
    const entry={handle:product.handle};report.products.push(entry);
    let resolveCheckout;
    const checkoutReady=new Promise(resolve=>{resolveCheckout=resolve;});
    await page.exposeFunction('printCheckoutResponse', result=>resolveCheckout(result));
    await page.evaluateOnNewDocument(()=>{
      const original=window.fetch;
      window.fetch=async(...args)=>{
        const response=await original(...args);
        if(new URL(response.url).pathname==='/api/commerce/checkout')await window.printCheckoutResponse({status:response.status,body:await response.clone().json()});
        return response;
      };
    });
    await page.goto(`${base}/p/${product.handle}`,{waitUntil:'networkidle2'});
    await page.waitForSelector('[data-acquire]:not([disabled])',{timeout:30000});
    await page.click('[data-acquire]');
    const handoff=await checkoutReady;entry.checkoutStatus=handoff.status;assert.equal(handoff.status,200);const checkout=handoff.body;entry.orderId=checkout.orderId;
    const sessionId=new URL(checkout.checkoutUrl).pathname.split('/').at(-1);cleanup.push({sessionId,entry});
    const before=await stripe.checkout.sessions.retrieve(sessionId);assert.equal(before.livemode,false);assert.equal(before.metadata.no3d_print_delivery,'v1');assert.ok(before.success_url.startsWith(`${base}/v3/prints/download/`));
    await page.waitForFunction(()=>location.hostname==='checkout.stripe.com');console.log('Hosted sandbox checkout opened',product.handle);
    await fillCheckout(page);
    if(index===0){await page.setRequestInterception(true);page.on('request',req=>{if(req.isNavigationRequest()&&req.url().startsWith(`${base}/v3/prints/download/`))void req.abort();else void req.continue();});}
    await page.click('button[type=submit]');
    const paid=await wait(async()=>{const s=await stripe.checkout.sessions.retrieve(sessionId);return s.payment_status==='paid'&&s;},'Sandbox payment did not complete');
    entry.paymentIntent=typeof paid.payment_intent==='string'?paid.payment_intent:paid.payment_intent.id;entry.paid=true;
    if(index===0){entry.returnBlocked=true;await page.goto('about:blank');}
    else{await page.waitForSelector('[data-print-download]:not([hidden])',{timeout:120000});assert.ok(page.url().startsWith(`${base}/v3/prints/download/`));entry.immediateDownloadPage=true;}
    console.log('Payment confirmed; waiting for automatic email',product.handle);
    const email=await wait(()=>emailForOrder(entry.orderId),'Automatic delivery email missing');entry.mailId=email.id;entry.emailEvent=email.event;
    const fresh=await browser.createBrowserContext();const reader=await fresh.newPage();await reader.goto(email.link,{waitUntil:'networkidle2'});
    await reader.waitForSelector('[data-print-download]:not([hidden])',{timeout:30000});assert.equal(new URL(reader.url()).hash,'');entry.freshBrowserLink=true;
    const downloadResponse=reader.waitForResponse(r=>r.url().endsWith('/api/prints/purchase')&&r.request().postData()?.includes('"download":true'));
    await reader.click('[data-print-download]');const response=await downloadResponse;assert.equal(response.status(),200);const download=await response.json();
    const bytes=Buffer.from(await(await fetch(download.url)).arrayBuffer());assert.equal(bytes.length,product.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),product.checksum);entry.downloadChecksum=true;
    await reader.goto(email.link,{waitUntil:'networkidle2'});await reader.waitForSelector('[data-print-download]:not([hidden])');
    await reader.click('summary');await reader.$eval('input[name=promotions]',el=>{if(!el.checked)el.click();});await reader.click('[data-print-preferences-form] button');await reader.waitForFunction(()=>document.querySelector('[data-preference-status]').textContent.includes('saved'));
    await reader.$eval('input[name=promotions]',el=>{if(el.checked)el.click();});await reader.click('[data-print-preferences-form] button');await reader.waitForFunction(()=>!document.querySelector('[data-print-preferences-form] button').disabled);entry.preferencesSaved=true;
    if(index===0){
      await reader.goto(`${base}/v3/prints/download/`,{waitUntil:'networkidle2'});
      await reader.type('[data-print-recovery] input[name=email]',process.env.NO3D_E2E_EMAIL);
      await reader.click('[data-print-recovery] button');
      await reader.waitForFunction(()=>document.querySelector('[data-print-status]').textContent.includes('If that address'));
      const resent=await wait(()=>emailForOrder(entry.orderId,email.id),'Recovery email missing');
      entry.recoveryMailId=resent.id;entry.recoveryEmailEvent=resent.event;
      await reader.goto(resent.link,{waitUntil:'networkidle2'});await reader.waitForSelector('[data-print-download]:not([hidden])');entry.recoveryLink=true;
    }
    const refund=await stripe.refunds.create({payment_intent:entry.paymentIntent});entry.refundId=refund.id;
    await wait(async()=>{const r=await api(reader,{action:'access',grant:download.grant,download:true});return r.status===403;},'Refund did not revoke email-link download');entry.refundRevoked=true;
    await fresh.close();await context.close();console.log('Guest purchase, email, files and refund passed',product.handle);
  }
  const usersAfter=await db.auth.admin.listUsers({page:1,perPage:1000});assert.equal(usersAfter.error,null);report.authUsersAfter=usersAfter.data.users.length;assert.equal(report.authUsersAfter,report.authUsersBefore);
  report.status='passed';
}catch(error){report.status='failed';report.failure='Staging acceptance failed';report.location=error.stack?.split('\n').find(line=>line.includes('staging-acceptance.mjs'))?.trim();console.error('Staging acceptance failed at',report.location||'provider boundary');process.exitCode=1;
}finally{
  for(const{sessionId,entry}of cleanup){const session=await stripe.checkout.sessions.retrieve(sessionId);if(session.payment_status==='paid'&&!entry.refundId){const payment=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(payment)entry.refundId=(await stripe.refunds.create({payment_intent:payment})).id;}else if(session.status==='open')await stripe.checkout.sessions.expire(sessionId);}
  await browser.close();report.completedAt=new Date().toISOString();await writeFile('/tmp/no3d-print-delivery-staging.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,receipt:'/tmp/no3d-print-delivery-staging.json'}));
}
