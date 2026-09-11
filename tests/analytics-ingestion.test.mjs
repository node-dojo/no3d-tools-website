import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createAnalyticsHandler } from '../api/lib/analytics-ingestion.js';
import { publicPage, publicProperties } from '../v3/js/analytics-contract.js';
const input = () => ({ event: 'page_view', event_id: randomUUID(), session_id: randomUUID(), page: '/v3/' });
async function call(body, { limit = true, limitError = null, insertError = null, environment = 'production', host = 'no3dtools.com' } = {}) {
  let inserted, rpc;
  const client = { rpc: async (name,args) => { rpc={name,args}; return {data:limit,error:limitError}; }, from: () => ({ insert: async row => { inserted=row; return {error:insertError}; } }) };
  const res = { code:200, headers:{}, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;}, json(b){this.body=b;return this;}, end(){return this;} };
  await createAnalyticsHandler({ client, environment, logger:{error(){} } })({ method:'POST', headers:{host}, body }, res);
  return {res,inserted,rpc};
}
test('analytics has an independent rate policy and server-owned provenance', async () => {
  const {res,inserted,rpc}=await call({...input(),properties:{handle:'chrome-crayon',environment:'preview',synthetic:false,email:'secret@example.com',source_kind:'server'}});
  assert.equal(res.code,200); assert.equal(rpc.name,'no3d_consume_analytics_rate_limit'); assert.deepEqual(Object.keys(rpc.args),['p_bucket_key']);
  assert.equal(inserted.properties.environment,'production'); assert.equal(inserted.properties.source_kind,'browser'); assert.equal(inserted.properties.email,undefined);
});
test('policy faults are unavailable; genuine quota exhaustion is 429',async()=>{
  assert.equal((await call(input(),{limitError:{message:'invalid policy'}})).res.code,503);
  const {res,inserted}=await call(input(),{limit:false});assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'60');assert.equal(inserted,undefined);
});
test('duplicate IDs acknowledge without creating another event',async()=>{
  const {res}=await call(input(),{insertError:{code:'23505'}});assert.equal(res.code,200);assert.equal(res.body.duplicate,true);
});
test('public clients cannot assert sales or send oversized/freeform payloads',async()=>{
  assert.equal((await call({...input(),event:'checkout_complete'})).res.code,400);
  assert.equal((await call({...input(),properties:{title:'x'.repeat(5000)}})).res.code,413);
  assert.equal((await call({...input(),event_id:'bad'})).res.code,400);
  assert.deepEqual(publicProperties({handle:'good-handle',email:'private@example.com',source:'private@example.com',nested:{secret:'x'}}),{handle:'good-handle'});
});
test('private URL paths and credentials never survive normalization',()=>{
  assert.equal(publicPage('/v3/account/orders/private-uuid?token=secret'),'/v3/account/');
  assert.equal(publicPage('/v3/product/?handle=chrome-crayon&code=secret'),'/v3/product/?handle=chrome-crayon');
  assert.equal(publicPage('/v3/auth/continue/?code=secret'),'/v3/auth/');
});
test('preview host excluded unless explicitly synthetic',async()=>{
  assert.equal((await call(input(),{host:'preview.vercel.app'})).res.code,204);
  const {inserted}=await call({...input(),synthetic:true},{host:'preview.vercel.app'});assert.equal(inserted.properties.synthetic,true);
});
