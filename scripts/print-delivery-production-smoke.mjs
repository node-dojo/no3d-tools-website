// Public production checkout handoff only: never submit payment or create mail.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import Stripe from 'stripe';

assert.equal(process.env.SITE_URL, 'https://no3dtools.com');
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'));
assert.ok(process.argv.includes('--apply'));
const base='https://no3dtools.com', output='/tmp/no3d-print-production-smoke';
await mkdir(output,{recursive:true});
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
const browser=await puppeteer.launch({headless:true});
const sessions=[];
const report={startedAt:new Date().toISOString(),target:base,products:[],assets:[],boundaries:['Creates and expires unpaid live Checkout sessions through public buttons. No card entered and no charge made.','Production payment, transactional email receipt and paid downloads rely on sandbox acceptance until a genuine customer purchase.']};
try {
  const config=await(await fetch(`${base}/api/commerce/config`)).json();
  assert.equal(config.printsAccountFreeEnabled,true);assert.equal(config.membershipExpectedEnvironment,'live');report.config=config;
  for(const file of ['v3/prints/download/index.html','v3/js/print-delivery.js','v3/js/print-delivery-links.js','v3/styles/print-delivery.css']){
    const response=await fetch(`${base}/${file}`);assert.equal(response.status,200);
    const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    const expected=createHash('sha256').update(await readFile(new URL(`../${file}`,import.meta.url))).digest('hex');assert.equal(actual,expected);report.assets.push({file,sha256:actual});
  }
  for(const handle of ['mace-and-chain','spike-planter-01']){
    const context=await browser.createBrowserContext();const page=await context.newPage();
    let resolveCheckout;const handoff=new Promise(resolve=>{resolveCheckout=resolve;});
    await page.exposeFunction('printCheckoutResponse',result=>resolveCheckout(result));
    await page.evaluateOnNewDocument(()=>{const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(new URL(response.url).pathname==='/api/commerce/checkout')await window.printCheckoutResponse({status:response.status,body:await response.clone().json()});return response;};});
    await page.goto(`${base}/p/${handle}`,{waitUntil:'networkidle2'});await page.waitForSelector('[data-acquire]:not([disabled])');await page.click('[data-acquire]');
    const result=await handoff;assert.equal(result.status,200);
    const id=new URL(result.body.checkoutUrl).pathname.split('/').at(-1);sessions.push(id);
    const session=await stripe.checkout.sessions.retrieve(id);
    assert.equal(session.livemode,true);assert.equal(session.payment_status,'unpaid');assert.equal(session.amount_total,1111);assert.equal(session.currency,'usd');
    assert.equal(session.metadata.no3d_print_delivery,'v1');assert.equal(session.metadata.no3d_order_id,result.body.orderId);
    assert.equal(session.success_url,`${base}/v3/prints/download/?order=${result.body.orderId}`);
    await page.waitForFunction(()=>location.hostname==='checkout.stripe.com');
    report.products.push({handle,orderId:result.body.orderId,checkoutSessionId:id,amount:session.amount_total,currency:session.currency,livemode:true,accountFreeReturn:true});
    await context.close();
  }
  for(const width of [390,1440]){
    const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width,height:1000});let authRequests=0;
    page.on('request',req=>{if(req.url().includes('/api/auth/'))authRequests++;});
    const response=await page.goto(`${base}/v3/prints/download/`,{waitUntil:'networkidle2'});assert.equal(response.status(),200);
    assert.equal(response.headers()['referrer-policy'],'no-referrer');await page.waitForSelector('[data-print-recovery]');assert.equal(authRequests,0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/recovery-${width}.png`,fullPage:true});
    const denied=await page.evaluate(async()=>{const r=await fetch('/api/prints/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'access',grant:'invalid'})});return {status:r.status,body:await r.json()};});assert.equal(denied.status,400);assert.equal('url' in denied.body,false);
    await context.close();
  }
  const mail=await fetch(`${base}/api/prints/mail`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(mail.status,401);
  report.status='passed';
}catch(error){report.status='failed';report.failure=error.name;report.location=error.stack?.split('\n').find(line=>line.includes('production-smoke.mjs'))?.trim();process.exitCode=1;}
finally{
  report.expired=[];
  for(const id of sessions){const session=await stripe.checkout.sessions.retrieve(id);assert.equal(session.payment_status,'unpaid');if(session.status==='open')await stripe.checkout.sessions.expire(id);report.expired.push(id);}
  await browser.close();report.completedAt=new Date().toISOString();await writeFile(`${output}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,products:report.products.length,receipt:`${output}/result.json`,location:report.location}));
}
