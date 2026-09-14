import crypto from 'node:crypto';
import { probeCollector, fetchVercelAnalytics } from '../../scripts/lib/analytics-health.mjs';
import { deliverNotifications } from './visit-notifications.js';
export function cronAuthorized(header,secret) {
  if(!secret || typeof header!=='string')return false;
  const a=Buffer.from(header),b=Buffer.from(`Bearer ${secret}`);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
export async function runAnalyticsMonitor(client,{env=process.env,fetcher=fetch}={}) {
  const id=crypto.randomUUID();
  let result=await client.from('analytics_monitor_runs').insert({id});
  if(result.error)throw Error('monitor_start_failed');
  try {
    const [collector,vercel]=await Promise.all([
      probeCollector(client,'https://no3dtools.com',fetcher),
      fetchVercelAnalytics({token:env.VERCEL_ANALYTICS_TOKEN,projectId:env.ANALYTICS_VERCEL_PROJECT_ID,teamId:env.ANALYTICS_VERCEL_TEAM_ID,windows:[{key:'24h',milliseconds:86400000}],fetcher})
    ]);
    const delivery=await client.from('analytics_notifications').select('id',{count:'exact',head:true}).in('status',['failed','uncertain']).gte('created_at',new Date(Date.now()-86400000).toISOString());
    const checks=[{source:'collector',...collector},{source:'vercel_reporting',...vercel},
      {source:'notification_delivery',status:delivery.error || delivery.count>0?'unavailable':'current',detail:delivery.error?'Delivery records unavailable':`${delivery.count || 0} failed or unconfirmed sends in the last 24 hours`}];
    for(const check of checks){
      const {error}=await client.rpc('no3d_record_monitor_check',{p_source:check.source,p_status:check.status==='current'?'current':'unavailable',p_detail:check.detail});
      if(error)throw Error('monitor_state_failed');
    }
    const notifications=await deliverNotifications(client,{env,fetcher});
    const sources=Object.fromEntries(checks.map(c=>[c.source,{status:c.status,detail:c.detail}]));
    result=await client.from('analytics_monitor_runs').update({status:'complete',finished_at:new Date().toISOString(),sources}).eq('id',id);
    if(result.error)throw Error('monitor_receipt_failed');
    return {ok:true,id,sources,notifications:notifications.length};
  }catch(error){
    await client.from('analytics_monitor_runs').update({status:'failed',finished_at:new Date().toISOString(),sources:{error:'monitor_execution_failed'}}).eq('id',id);
    throw error;
  }
}
