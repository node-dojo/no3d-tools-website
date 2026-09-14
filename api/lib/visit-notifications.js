import crypto from 'node:crypto';
import { publicPage, publicReferrer } from '../../v3/js/analytics-contract.js';
const humanize = value => value.split(/[-_/]+/).filter(Boolean).map(s=>s[0].toUpperCase()+s.slice(1)).join(' ');
export function visitLabel(page) {
  const url = new URL(publicPage(page),'https://no3dtools.com');
  if (url.searchParams.get('handle')) return humanize(url.searchParams.get('handle'));
  const fixed = {'/v3/':'Home','/v3/account/':'My Folder','/v3/auth/':'Sign In','/v3/membership/':'Full Library','/v3/onboarding/create-account/':'Create Account'};
  return fixed[url.pathname] || humanize(url.pathname.replace(/^\/v3\//,''));
}
export function referralLabel(referrer) {
  const safe = publicReferrer(referrer);
  if (!safe) return 'Direct';
  const host = new URL(safe).hostname.replace(/^www\./,'');
  if (['no3dtools.com','v3.no3dtools.com'].includes(host)) return 'On-site';
  for (const [domain,label] of [['instagram.com','Instagram'],['facebook.com','Facebook'],['reddit.com','Reddit'],['youtube.com','YouTube'],['bing.com','Bing'],['duckduckgo.com','DuckDuckGo']]) {
    if (host===domain || host.endsWith('.'+domain)) return label;
  }
  if (/^google\.[a-z.]+$/.test(host)) return 'Google';
  if (['t.co','x.com','twitter.com'].includes(host)) return 'X';
  return host;
}
function geo(value) {
  try { return decodeURIComponent(String(value || '')).replace(/[^\p{L}\p{N}\s.,'-]/gu,'').slice(0,80); } catch { return ''; }
}
export function quietHours(env, now = new Date()) {
  if (![env.QUIET_HOURS_START,env.QUIET_HOURS_END,env.QUIET_HOURS_TZ_OFFSET].every(v=>v!==undefined && /^-?\d+$/.test(v))) return false;
  const [start,end,offset]=[env.QUIET_HOURS_START,env.QUIET_HOURS_END,env.QUIET_HOURS_TZ_OFFSET].map(Number);
  const hour=(now.getUTCHours()+offset+24)%24;
  return start<=end ? hour>=start && hour<end : hour>=start || hour<end;
}
export function notificationForVisit(req,row,{env=process.env,now=new Date()}={}) {
  const p=row.properties;
  if (!env.NTFY_VISITS_TOPIC || env.KILL_SWITCH==='on' || quietHours(env,now) || p.environment!=='production' || p.synthetic!==false || row.event!=='page_view') return null;
  if (!['no3dtools.com','www.no3dtools.com','v3.no3dtools.com'].includes(String(req.headers.host).split(':')[0])) return null;
  if (/bot|crawl|spider|preview|headless|facebookexternalhit/i.test(String(req.headers['user-agent'] || ''))) return null;
  const ip=String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if ((env.EXCLUDE_IPS || '').split(',').map(s=>s.trim()).filter(Boolean).includes(ip)) return null;
  const page=publicPage(row.page);
  if (page==='/other') return null;
  const location=['x-vercel-ip-city','x-vercel-ip-country-region','x-vercel-ip-country'].map(h=>geo(req.headers[h])).filter(Boolean).join(', ');
  // Deduplicate rapid duplicate navigations without collapsing a visitor's entire journey.
  const key=crypto.createHash('sha256').update(`${row.session_id}:${page}:${Math.floor(now.getTime()/20000)}`).digest('hex');
  return {dedupe_key:`visit:${key}`,payload:{title:`Visit • ${visitLabel(page)}`,message:[referralLabel(row.referrer),location].filter(Boolean).join(' · '),tags:['eyes'],click:`https://no3dtools.com${page}`}};
}
export async function deliverNotifications(client,{id=null,env=process.env,fetcher=fetch}={}) {
  const {data:rows,error}=await client.rpc('no3d_claim_notifications',{p_id:id});
  if(error) throw Error('notification_claim_failed');
  const results=await Promise.all((rows || []).map(async row=>{
    let status='failed',errorCode=null,receipt=null,availableAt=new Date().toISOString();
    const topic=row.channel==='visits'?env.NTFY_VISITS_TOPIC:env.BUSINESS_DASHBOARD_NTFY_TOPIC;
    if (!topic) errorCode='topic_not_configured';
    else try {
      const headers={'content-type':'application/json'};
      const token=row.channel==='visits'?env.NTFY_TOKEN:env.BUSINESS_DASHBOARD_NTFY_TOKEN;
      if(token)headers.authorization=`Bearer ${token}`;
      const response=await fetcher((row.channel==='health' ? env.BUSINESS_DASHBOARD_NTFY_BASE_URL : env.NTFY_BASE_URL) || 'https://ntfy.sh',{method:'POST',headers,body:JSON.stringify({...row.payload,topic,priority:3}),signal:AbortSignal.timeout(8000)});
      if(response.ok){const data=await response.json();if(typeof data.id!=='string')throw Error('unknown_receipt');status='sent';receipt=data.id;}
      else {errorCode=`http_${response.status}`;if(response.status===429 && row.attempts<3){status='pending';availableAt=new Date(Date.now()+60000*row.attempts).toISOString();}}
    } catch {status='uncertain';errorCode='delivery_unconfirmed';}
    const {error:updateError}=await client.from('analytics_notifications').update({status,error_code:errorCode,provider_receipt:receipt,available_at:availableAt,updated_at:new Date().toISOString()}).eq('id',row.id).eq('status','sending');
    if(updateError)throw Error('notification_receipt_failed');
    return {id:row.id,status};
  }));
  return results;
}
