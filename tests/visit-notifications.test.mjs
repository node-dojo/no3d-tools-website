import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationForVisit, deliverNotifications, quietHours, visitLabel } from '../api/lib/visit-notifications.js';
const env={NTFY_VISITS_TOPIC:'test-private-topic'};
const req={headers:{host:'no3dtools.com','user-agent':'Mozilla/5.0','x-vercel-ip-city':'Salt%20Lake%20City','x-vercel-ip-country-region':'UT','x-vercel-ip-country':'US'}};
const row={event:'page_view',page:'/v3/product/?handle=chrome-crayon&token=private',referrer:'https://www.google.com/search?q=private',session_id:'tab',properties:{environment:'production',synthetic:false}};
test('detailed V3 visit uses public product identity, source and original request geography',()=>{
 const n=notificationForVisit(req,row,{env});assert.equal(n.payload.title,'Visit • Chrome Crayon');assert.equal(n.payload.message,'Google · Salt Lake City, UT, US');assert.equal(n.payload.click,'https://no3dtools.com/v3/product/?handle=chrome-crayon');assert.ok(!JSON.stringify(n).includes('private'));
 assert.equal(visitLabel('/v3/account/orders/private?token=private'),'My Folder');
});
test('tests, bots, preview, disabled visits and unknown routes never enqueue',()=>{
 for(const item of [{...row,properties:{...row.properties,synthetic:true}},{...row,properties:{...row.properties,environment:'preview'}},{...row,event:'product_view'},{...row,page:'/unknown'}]) assert.equal(notificationForVisit(req,item,{env}),null);
 assert.equal(notificationForVisit({...req,headers:{...req.headers,'user-agent':'Googlebot'}},row,{env}),null);
 assert.equal(notificationForVisit(req,row,{env:{...env,KILL_SWITCH:'on'}}),null);
 assert.equal(notificationForVisit(req,row,{env:{}}),null);
});
test('duplicate navigation keys coalesce, later pages and visits remain distinct',()=>{
 const now=new Date('2026-09-14T12:00:01Z'); const a=notificationForVisit(req,row,{env,now});
 assert.equal(a.dedupe_key,notificationForVisit(req,row,{env,now:new Date(+now+1000)}).dedupe_key);
 assert.notEqual(a.dedupe_key,notificationForVisit(req,{...row,page:'/v3/'},{env,now}).dedupe_key);
 assert.notEqual(a.dedupe_key,notificationForVisit(req,row,{env,now:new Date(+now+60000)}).dedupe_key);
});
test('existing quiet hour configuration supports overnight windows',()=>{
 const e={QUIET_HOURS_START:'22',QUIET_HOURS_END:'7',QUIET_HOURS_TZ_OFFSET:'-6'};
 assert.equal(quietHours(e,new Date('2026-09-14T05:00:00Z')),true);
 assert.equal(quietHours(e,new Date('2026-09-14T18:00:00Z')),false);
});
async function deliver(fetcher,attempts=1){
 let update;const client={rpc:async()=>({data:[{id:'event',channel:'visits',payload:{title:'Visit test',message:'Direct'},attempts}]}),from:()=>({update:v=>{update=v;return {eq:()=>({eq:async()=>({error:null})})}}})};
 const results=await deliverNotifications(client,{env,fetcher});return {update,results};
}
test('successful provider receipt is saved without exposing topic',async()=>{
 const {update,results}=await deliver(async()=>({ok:true,json:async()=>({id:'receipt'})}));assert.equal(update.status,'sent');assert.equal(update.provider_receipt,'receipt');assert.ok(!JSON.stringify(results).includes(env.NTFY_VISITS_TOPIC));
});
test('rate-limit retries are bounded; ambiguous sends never blindly resend',async()=>{
 assert.equal((await deliver(async()=>({ok:false,status:429}))).update.status,'pending');
 assert.equal((await deliver(async()=>({ok:false,status:429}),3)).update.status,'failed');
 assert.equal((await deliver(async()=>{throw Error('timeout')})).update.status,'uncertain');
});

test('scheduled dispatch refuses missing and incorrect authorization',async()=>{
 const {cronAuthorized}=await import('../api/lib/analytics-monitor.js');
 assert.equal(cronAuthorized(undefined,undefined),false);
 assert.equal(cronAuthorized('Bearer wrong','secret'),false);
 assert.equal(cronAuthorized('Bearer secret','secret'),true);
});
