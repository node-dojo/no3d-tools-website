import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
import puppeteer from 'puppeteer';
import resetHandler from '../api/auth/reset-password.js';
import {sealPayload} from '../api/auth/lib/session.js';
const root=new URL('../',import.meta.url).pathname;
const output='/tmp/no3d-password-reset-acceptance'; await mkdir(output,{recursive:true});
Object.assign(process.env,{NO3D_AUTH_STATE_SECRET:'fixture-auth-state',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',SUPABASE_ANON_KEY:'fixture-anon',RESEND_API_KEY:'fixture-resend',NO3D_AUTH_COOKIE_SECURE:'false',V3_ACCESS_MODE:'public'});
const user={id:'fixture-member',email:'member@example.test',email_confirmed_at:'2026-10-29'};
let mailLink, consumed=false, revoked=false, mutations=0, mails=0;
const originalFetch=global.fetch;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
global.fetch=async(url,options={})=>{
 if(String(url).includes('/rpc/')) return json(true);
 if(String(url).endsWith('/admin/generate_link')){consumed=false;revoked=false;return json({...user,hashed_token:'H'.repeat(64),verification_type:'recovery'});}
 if(url==='https://api.resend.com/emails'){mailLink=JSON.parse(options.body).text.split('\n').at(-1);mails++;return json({id:'fixture-email'});}
 if(String(url).endsWith('/verify')){if(consumed)return json({error:'expired'},403);consumed=true;return json({access_token:'fixture-access',refresh_token:'fixture-refresh',user});}
 if(String(url).includes('grant_type=refresh_token'))return revoked?json({error:'revoked'},400):json({access_token:'fixture-access',refresh_token:'fixture-refresh',user});
 if(String(url).endsWith('/user')&&options.method==='PUT'){mutations++;return json(user);}
 if(String(url).includes('/logout')){revoked=true;return json({});}
 if(String(url).includes('grant_type=password'))return json({access_token:'normal-access',refresh_token:'normal-refresh',user});
 throw Error('Unexpected upstream request');
};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://local');
 const respond=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(url.pathname==='/api/auth/reset-password'){
  let raw='';for await(const b of req)raw+=b;req.body=raw?JSON.parse(raw):{};
  res.status=x=>{res.statusCode=x;return res;};res.json=x=>respond(x,res.statusCode);return resetHandler(req,res);
 }
 if(url.pathname==='/api/auth/providers')return respond({google:false,github:false});
 if(url.pathname==='/api/auth/session')return respond({authenticated:false});
 if(url.pathname.startsWith('/api/'))return respond({products:[]});
 try{let p=url.pathname;if(p.endsWith('/'))p+='index.html';const file=join(root,p);if(!file.startsWith(root))return respond({},404);const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{respond({},404);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;process.env.NO3D_SITE_URL=origin;
const browser=await puppeteer.launch({headless:true});const errors=[];
try{
 for(const width of [1440,390]){
  const context=await browser.createBrowserContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height:width===390?844:1100});
  const next='/v3/prints/?product=spike-planter-01&details=1';
  await page.goto(`${origin}/v3/onboarding/create-account/?mode=signin&next=${encodeURIComponent(next)}`,{waitUntil:'networkidle0'});
  await page.click('[data-forgot-password]');await page.type('input[name=email]',user.email);
  assert.equal(await page.$eval('input[name=password]',e=>e.required),false);
  await page.click('[data-account-entry-form] button[type=submit]');
  await page.waitForFunction(()=>document.querySelector('[data-auth-message]').textContent.includes('If this email has an account'));
  await page.screenshot({path:`${output}/request-${width}.png`});assert.ok(mailLink);
  const fresh=await browser.createBrowserContext();const reset=await fresh.newPage();reset.on('pageerror',e=>errors.push(e.message));await reset.setViewport({width,height:width===390?844:1100});
  await reset.goto(mailLink,{waitUntil:'networkidle0'});assert.equal(consumed,false,'Opening email link must not consume proof');assert.equal(new URL(reset.url()).hash,'');
  await reset.click('[data-reset-verify]');await reset.waitForSelector('[data-reset-form]:not([hidden])');
  await reset.type('input[name=password]','fixture-new-password');await reset.type('input[name=confirmation]','not-matching-password');
  await reset.click('[data-reset-form] button');assert.equal(await reset.$eval('input[name=confirmation]',e=>e.validity.customError),true);
  await reset.$eval('input[name=confirmation]',e=>e.value='');await reset.type('input[name=confirmation]','fixture-new-password');
  await reset.screenshot({path:`${output}/choose-${width}.png`});
  await reset.click('[data-reset-form] button');await reset.waitForSelector('[data-reset-done]:not([hidden])');
  assert.equal(await reset.$eval('[data-reset-done]',e=>new URL(e.href).pathname+new URL(e.href).search),next);
  assert.equal(await reset.$eval('[data-reset-message]',e=>e.textContent),'Your password has been updated.');
  await reset.screenshot({path:`${output}/success-${width}.png`});
  await reset.goto(mailLink,{waitUntil:'networkidle0'});await reset.click('[data-reset-verify]');await reset.waitForSelector('[data-reset-resend]:not([hidden])');
  await fresh.close();await context.close();
 }
 assert.equal(mutations,2);assert.equal(mails,2);assert.deepEqual(errors,[]);
 const expired=await browser.newPage();const grant=sealPayload({kind:'password-reset',exp:Date.now()-1,tokenHash:'H'.repeat(64),userId:user.id,next:'/v3/account/'});
 await expired.goto(`${origin}/v3/auth/reset-password/#grant=${grant}`,{waitUntil:'networkidle0'});await expired.click('[data-reset-verify]');await expired.waitForSelector('[data-reset-resend]:not([hidden])');
 await writeFile(`${output}/result.json`,JSON.stringify({passed:true,viewports:[1440,390],mailRequests:mails,passwordChanges:mutations,crossBrowser:true,replayRejected:true,expiredRejected:true,errors},null,2));
 console.log('Password recovery desktop/mobile browser acceptance passed');
}finally{await browser.close();await new Promise(r=>server.close(r));global.fetch=originalFetch;}
