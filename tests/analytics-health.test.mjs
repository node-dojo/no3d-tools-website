import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionHealth, isProductionObservation, probeCollector, fetchVercelAnalytics } from '../scripts/lib/analytics-health.mjs';
const now=new Date('2026-09-11T18:00:00Z');
const row={event:'page_view',created_at:now.toISOString(),properties:{schema_version:2,source_kind:'browser',environment:'production',synthetic:false}};
test('server activity and synthetic events cannot conceal missing browser collection',()=>{
  assert.equal(collectionHealth([{...row,event:'document_request'},{...row,properties:{...row.properties,synthetic:true}}],now).status,'stale');
  assert.equal(collectionHealth([row],now).status,'current');
  assert.equal(isProductionObservation({...row,properties:{}}),false);
});
test('collector probe must read back exactly one excluded synthetic event',async()=>{
  const query={eq(){return this},gte(){return this},limit:async()=>({data:[{id:1}]})};const client={from:()=>({select:()=>query})};
  let payload; const good=await probeCollector(client,'https://no3dtools.com',async(u,o)=>{payload=JSON.parse(o.body);return {ok:true,status:200};});
  assert.equal(good.status,'current');assert.equal(payload.synthetic,true);
  assert.equal((await probeCollector(client,undefined,async()=>({ok:false,status:503}))).status,'unavailable');
  query.limit=async()=>({data:[]});assert.equal((await probeCollector(client,undefined,async()=>({ok:true,status:200}))).status,'unavailable');
});
test('Vercel report preserves query bounds, production filter, and provider uniques',async()=>{
  let url;const result=await fetchVercelAnalytics({token:'test',projectId:'p',teamId:'t',now,windows:[{key:'7d',milliseconds:604800000}],fetcher:async u=>{url=u;return {ok:true,json:async()=>({query:{groupBy:['environment'],filter:"environment eq 'production'"},data:[{environment:'production',pageviews:17,visitors:6}]})};}});
  assert.equal(url.searchParams.get('by'),'environment');assert.equal(url.searchParams.get('since'),'2026-09-04T18:00:00.000Z');assert.equal(result.windows['7d'].visitors,6);
});
test('provider errors never become zero audience',async()=>{
  const result=await fetchVercelAnalytics({token:'test',projectId:'p',windows:[{key:'7d',milliseconds:604800000}],fetcher:async()=>({ok:false,status:403})});assert.equal(result.status,'unavailable');assert.deepEqual(result.windows,{});
});


test('expired CLI OAuth credentials are refreshed before scheduled reporting', async () => {
  const { localVercelToken } = await import('../scripts/lib/analytics-health.mjs');
  let auth = { token: 'expired', expiresAt: 1, refreshToken: 'refresh' }; let refreshes = 0;
  const token = await localVercelToken({ env: {}, readAuth: () => auth, refresh: async () => {
    refreshes++; auth = { token: 'renewed', expiresAt: Math.floor(Date.now()/1000)+3600 };
  }});
  assert.equal(token, 'renewed'); assert.equal(refreshes, 1);
});
test('explicit reporting token wins and refresh failure fails closed', async () => {
  const { localVercelToken } = await import('../scripts/lib/analytics-health.mjs');
  assert.equal(await localVercelToken({ env: { VERCEL_ANALYTICS_TOKEN: 'scoped' }, readAuth: () => { throw Error('unused'); }}), 'scoped');
  assert.equal(await localVercelToken({ env: {}, readAuth: () => ({ token:'old', expiresAt:1, refreshToken:'r' }), refresh: async () => { throw Error('offline'); }}), null);
});
