import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {createClient} from '@supabase/supabase-js';
const base='https://staging.no3dtools.com';
assert.equal(process.env.SITE_URL,base);assert.equal(new URL(process.env.SUPABASE_URL).hostname,'eydsnjawjhahtlbzwvlo.supabase.co');assert.ok(process.argv.includes('--apply'));
for(const name of ['NO3D_E2E_EMAIL','NO3D_E2E_PASSWORD','RESEND_API_KEY'])assert.ok(process.env[name],`Missing ${name}`);
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const browser=await puppeteer.launch({headless:true});
const password=crypto.randomBytes(28).toString('base64url')+'aA1!';
let accountId;
const report={target:base,startedAt:new Date().toISOString(),checks:{},boundaries:['Existing dedicated staging member account; no production password changes.','UI reset request and password change. Email link retrieved from transactional mail provider; delivery status checked independently.','Original staging password restored administratively after acceptance.']};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function api(page,path,body){return page.evaluate(async({path,body})=>{const r=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};},{path,body});}
async function mail(path){const r=await fetch('https://api.resend.com'+path,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`}});assert.equal(r.status,200,'Mail readback unavailable');return r.json();}
async function signIn(page,value){await page.goto(`${base}/v3/access/?mode=signin&next=%2Fv3%2Faccount%2F`,{waitUntil:'networkidle2'});await page.type('input[name=email]',process.env.NO3D_E2E_EMAIL);await page.type('input[name=password]',value);const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/password')&&r.request().method()==='POST');await page.click('[data-account-entry-form] button[type=submit]');return response;}
try{
 const listed=await db.auth.admin.listUsers({page:1,perPage:1000});assert.equal(listed.error,null);const account=listed.data.users.find(u=>u.email?.toLowerCase()===process.env.NO3D_E2E_EMAIL.toLowerCase());assert.ok(account,'Dedicated staging account missing');accountId=account.id;
 const beforeContext=await browser.createBrowserContext();const before=await beforeContext.newPage();assert.equal((await signIn(before,process.env.NO3D_E2E_PASSWORD)).status(),200);await before.waitForFunction(()=>location.pathname==='/v3/account/');
 const originalAccess=await api(before,'/api/prints/access?handle=spike-planter-01');assert.equal(originalAccess.body.entitlement,'member');report.checks.memberBefore=true;
 const ctx=await browser.createBrowserContext();const page=await ctx.newPage();await page.goto(`${base}/v3/onboarding/create-account/?mode=signin&next=%2Fv3%2Faccount%2F`,{waitUntil:'networkidle2'});await page.click('[data-forgot-password]');await page.type('input[name=email]',process.env.NO3D_E2E_EMAIL);
 const requested=Date.now();const sent=page.waitForResponse(r=>r.url().endsWith('/api/auth/reset-password')&&r.request().method()==='POST');await page.click('[data-account-entry-form] button[type=submit]');assert.equal((await sent).status(),202,'Reset request failed');console.log('staging_reset_requested');
 let entry;
 for(let attempt=0;attempt<12;attempt++){await pause(1000);const list=await mail('/emails?limit=20');entry=list.data?.find(e=>e.subject==='Reset your NO3D password'&&e.to?.some(to=>to.toLowerCase()===process.env.NO3D_E2E_EMAIL.toLowerCase())&&Date.parse(e.created_at)>=requested-5000);if(entry)break;}
 assert.ok(entry,'Reset email not found');await pause(700);let email=await mail('/emails/'+entry.id);
 const link=email.text?.match(/https:\/\/staging\.no3dtools\.com\/v3\/auth\/reset-password\/#grant=[A-Za-z0-9_.%-]+/)?.[0];assert.ok(link,'Expected reset link missing');
 report.emailId=entry.id;report.mailLinkSha256=crypto.createHash('sha256').update(link).digest('hex');report.checks.resetEmailCreated=true;
 const freshContext=await browser.createBrowserContext();const reset=await freshContext.newPage();await reset.goto(link,{waitUntil:'networkidle2'});assert.equal(new URL(reset.url()).hash,'');
 await reset.click('[data-reset-verify]');await reset.waitForSelector('[data-reset-form]:not([hidden])');const recoveryCookies=await freshContext.cookies(base);
 await reset.type('input[name=password]',password);await reset.type('input[name=confirmation]',password);
 const updated=reset.waitForResponse(r=>r.url().endsWith('/api/auth/reset-password')&&r.request().method()==='POST');await reset.click('[data-reset-form] button');const result=await updated;assert.equal(result.status(),200,'Password update failed');const update=await result.json();assert.equal(update.updated,true);
 await reset.waitForSelector('[data-reset-done]:not([hidden])');await reset.screenshot({path:'/tmp/no3d-password-reset-staging-success.png'});await Promise.all([reset.waitForNavigation({waitUntil:'networkidle2'}),reset.click('[data-reset-done]')]);assert.equal(new URL(reset.url()).pathname,'/v3/account/');
 const session=await api(reset,'/api/auth/session');assert.equal(session.body.authenticated,true);const access=await api(reset,'/api/prints/access?handle=spike-planter-01');assert.equal(access.body.entitlement,'member');report.checks.accountReturn=true;report.checks.memberAfter=true;
 const replayContext=await browser.createBrowserContext();const replay=await replayContext.newPage();await replay.goto(link,{waitUntil:'networkidle2'});await replay.click('[data-reset-verify]');await replay.waitForSelector('[data-reset-resend]:not([hidden])');report.checks.linkReplayRejected=true;
 await replayContext.setCookie(...recoveryCookies);const denied=await api(replay,'/api/auth/reset-password',{action:'update',password:crypto.randomBytes(28).toString('base64url')});assert.equal(denied.status,401);report.checks.recoveryCookieReplayRejected=true;
 const reloginContext=await browser.createBrowserContext();const relogin=await reloginContext.newPage();assert.equal((await signIn(relogin,process.env.NO3D_E2E_PASSWORD)).status(),400);report.checks.oldPasswordRejected=true;
 await relogin.reload({waitUntil:'networkidle2'});assert.equal((await signIn(relogin,password)).status(),200);report.checks.newPasswordSignIn=true;
 report.checks.passwordRecoveryLifecycle=true;
 // Synthetic fixture mailboxes may accept no mail. A separate, existing
 // staging account can verify delivery without changing its password.
 const deliveryEmail=process.env.NO3D_E2E_DELIVERY_EMAIL?.trim().toLowerCase();
 if(deliveryEmail&&deliveryEmail!==process.env.NO3D_E2E_EMAIL.toLowerCase()){
  assert.ok(listed.data.users.some(u=>u.email?.toLowerCase()===deliveryEmail),'Delivery account missing');
  const probeContext=await browser.createBrowserContext();const probe=await probeContext.newPage();
  await probe.goto(`${base}/v3/onboarding/create-account/?mode=recovery`,{waitUntil:'networkidle2'});await probe.type('input[name=email]',deliveryEmail);
  const since=Date.now();const sent=probe.waitForResponse(r=>r.url().endsWith('/api/auth/reset-password')&&r.request().method()==='POST');await probe.click('[data-account-entry-form] button[type=submit]');assert.equal((await sent).status(),202);
  entry=null;
  for(let attempt=0;attempt<12;attempt++){await pause(1000);const list=await mail('/emails?limit=20');entry=list.data?.find(e=>e.subject==='Reset your NO3D password'&&e.to?.some(to=>to.toLowerCase()===deliveryEmail)&&Date.parse(e.created_at)>=since-5000);if(entry)break;}
  assert.ok(entry,'Delivery probe email missing');report.deliveryEmailId=entry.id;report.boundaries.push('Delivery verified using a separate existing staging account; its password was not changed.');
 }
 for(let attempt=0;attempt<15;attempt++){await pause(1000);email=await mail('/emails/'+entry.id);if(['delivered','opened','clicked'].includes(email.last_event))break;}
 report.delivery=email.last_event;assert.ok(['delivered','opened','clicked'].includes(report.delivery),'Mail not confirmed delivered');report.checks.mailDelivered=true;
 report.passed=true;console.log('staging_password_recovery_passed');
} catch(error){report.passed=false;report.error=error instanceof assert.AssertionError||error.name==='TimeoutError'?error.message.replace(/\n[\s\S]*/,''):`Acceptance did not complete (${error.name})`;report.pages=(await browser.pages()).map(p=>new URL(p.url()).pathname);console.log('staging_password_recovery_failed',report.error);process.exitCode=1;}
finally{
 if(accountId){const restore=await db.auth.admin.updateUserById(accountId,{password:process.env.NO3D_E2E_PASSWORD});report.originalPasswordRestored=!restore.error;if(restore.error)process.exitCode=1;}
 await browser.close();await writeFile('/tmp/no3d-password-reset-staging.json',JSON.stringify(report,null,2));console.log('staging_fixture_restored',report.originalPasswordRestored===true);
}
