import { getSupabaseServiceClient } from '../lib/supabaseAdmin.js';
import { cronAuthorized, runAnalyticsMonitor } from '../lib/analytics-monitor.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  if(!cronAuthorized(req.headers.authorization,process.env.CRON_SECRET))return res.status(401).json({error:'Unauthorized'});
  if(process.env.VERCEL_ENV!=='production')return res.status(409).json({error:'Production only'});
  const client=getSupabaseServiceClient();
  if(!client)return res.status(503).json({error:'Monitor unavailable'});
  try{return res.status(200).json(await runAnalyticsMonitor(client));}
  catch{console.error('analytics_monitor_failed');return res.status(503).json({error:'Monitor failed'});}
}
