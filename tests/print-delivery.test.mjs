import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrintPurchaseHandler } from '../api/prints/lib/purchase.js';
import { createPrintMailHandler } from '../api/prints/lib/mail.js';

const response = () => ({ headers: {}, setHeader(key,value) { this.headers[key]=value; }, status(code) { this.code=code;return this; }, json(body) { this.body=body;return this; } });
const orderId='22222222-2222-4222-8222-222222222222';
test('Existing delivery survives checkout rollback and rechecks authority on every file request', async () => {
  const old=process.env.PRINTS_ACCOUNT_FREE_ENABLED;process.env.PRINTS_ACCOUNT_FREE_ENABLED='false';
  let entitled=true, checks=0, signs=0;
  const handler=createPrintPurchaseHandler({ commerceBackendFetch:async(path,options)=>{
    checks++;assert.deepEqual(JSON.parse(options.body),{action:'access',grant:'test-only-link'});
    return {response:{ok:entitled,status:entitled?200:403},payload:{state:'ready',handle:'mace-and-chain',grant:'test-only-link',preferenceGrant:'test-preference'}};
  },ready:()=>true,sign:async()=>{signs++;return 'https://files.example.test/download';} });
  try {
    const res=response();await handler({method:'POST',headers:{},body:{action:'access',grant:'test-only-link',download:true,handle:'forged-product',file_url:'other-file'}},res);
    assert.equal(res.code,200);assert.equal(res.body.handle,'mace-and-chain');assert.equal(res.body.expiresIn,900);
    entitled=false;const revoked=response();await handler({method:'POST',headers:{},body:{action:'access',grant:'test-only-link',download:true}},revoked);
    assert.equal(revoked.code,403);assert.equal(checks,2);assert.equal(signs,1);
  } finally { if(old===undefined)delete process.env.PRINTS_ACCOUNT_FREE_ENABLED;else process.env.PRINTS_ACCOUNT_FREE_ENABLED=old; }
});
test('Guest success uses ownership lookup and pending never produces a download', async()=>{
  const old=process.env.PRINTS_ACCOUNT_FREE_ENABLED;process.env.PRINTS_ACCOUNT_FREE_ENABLED='true';
  let ownedLookup=false;
  const handler=createPrintPurchaseHandler({commerceFetch:async(req,res,path,options)=>{ownedLookup=true;assert.equal(JSON.parse(options.body).orderId,orderId);return {response:{ok:true},payload:{state:'pending'}};},sign:()=>assert.fail('Pending purchase signed')});
  try {const res=response();await handler({method:'POST',headers:{},body:{action:'order',orderId,download:true}},res);assert.equal(ownedLookup,true);assert.deepEqual(res.body,{state:'pending'});}finally{if(old===undefined)delete process.env.PRINTS_ACCOUNT_FREE_ENABLED;else process.env.PRINTS_ACCOUNT_FREE_ENABLED=old;}
});
test('Recovery has a generic result and a rate limit before queuing mail',async()=>{
  const old=process.env.PRINTS_ACCOUNT_FREE_ENABLED;process.env.PRINTS_ACCOUNT_FREE_ENABLED='true';
  let allow=true,calls=0;
  const handler=createPrintPurchaseHandler({allowRequest:async()=>allow,commerceBackendFetch:async()=>{calls++;return{response:{ok:true},payload:{private:'must not escape'}};}});
  try{
    for(const email of ['known@example.test','unknown@example.test']){const res=response();await handler({method:'POST',headers:{},body:{action:'recover',email}},res);assert.equal(res.code,202);assert.deepEqual(res.body,{accepted:true});}
    allow=false;const res=response();await handler({method:'POST',headers:{},body:{action:'recover',email:'known@example.test'}},res);assert.equal(res.code,429);assert.equal(calls,2);
  }finally{if(old===undefined)delete process.env.PRINTS_ACCOUNT_FREE_ENABLED;else process.env.PRINTS_ACCOUNT_FREE_ENABLED=old;}
});
test('Mail adapter requires trusted backend and keeps the provider idempotency key stable',async()=>{
  const names=['COMMERCE_SITE_BACKEND_SECRET','RESEND_API_KEY','FROM_EMAIL','SITE_URL'];const before=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{COMMERCE_SITE_BACKEND_SECRET:'test-only-backend',RESEND_API_KEY:'test-only-email',FROM_EMAIL:'test@example.test',SITE_URL:'https://site.example.test'});
  const deliveries=[];const handler=createPrintMailHandler({send:async(url,options)=>{deliveries.push(options);return new Response(JSON.stringify({id:'test-mail-id'}));}});
  const req={method:'POST',headers:{authorization:'Bearer test-only-backend'},body:{id:orderId,email:'buyer@example.test',handle:'mace-and-chain',kind:'delivery',downloadUrl:'https://site.example.test/v3/prints/download/#grant=test',preferencesUrl:'https://site.example.test/v3/prints/download/#preferences=test'}};
  try{
    const denied=response();await handler({...req,headers:{}},denied);assert.equal(denied.code,401);assert.equal(deliveries.length,0);
    for(let n=0;n<2;n++){const res=response();await handler(req,res);assert.equal(res.code,200);}
    assert.equal(deliveries[0].headers['Idempotency-Key'],deliveries[1].headers['Idempotency-Key']);assert.equal(deliveries[0].body,deliveries[1].body);
    const wrong=response();await handler({...req,body:{...req.body,downloadUrl:'https://evil.example/v3/prints/download/#grant=test'}},wrong);assert.equal(wrong.code,503);assert.equal(deliveries.length,2);
  }finally{for(const k of names)if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}
});
