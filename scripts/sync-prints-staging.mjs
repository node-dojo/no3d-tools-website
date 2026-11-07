// Only the existing isolated staging projects. Values travel through stdin.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const commerce=process.argv.includes('--commerce');
assert.ok(process.argv.includes('--apply'),'Pass --apply to update staging configuration.');
assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'),'Sandbox Stripe required.');
assert.equal(new URL(process.env.SUPABASE_URL).hostname,commerce?'lqidrljskdpjlshtwfbv.supabase.co':'eydsnjawjhahtlbzwvlo.supabase.co');
const project=commerce?'prj_iFqgMazB0jnUmQWpon7ar6Y4voa8':'prj_jgaEifbw4TmCJ6T0daarECzwNHEV';
const env={...process.env,VERCEL_PROJECT_ID:project,VERCEL_ORG_ID:'team_L9uKDHc687Ib743Z6V5Y8zAj'};
const names=commerce?['COMMERCE_ENV','COMMERCE_SITES_JSON','CRON_SECRET','OPERATIONS_SECRET','STRIPE_ACCOUNT_ID','STRIPE_API_VERSION','STRIPE_AUTOMATIC_TAX','STRIPE_QUEUE_BATCH_SIZE','STRIPE_QUEUE_VISIBILITY_SECONDS','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','COMMERCE_NOTIFICATION_SECRET','COMMERCE_NOTIFICATION_URL']
  :['COMMERCE_API_URL','COMMERCE_COLLECTIONS_ENABLED','COMMERCE_IDENTITY_ASSERTION_KID','COMMERCE_IDENTITY_ASSERTION_SECRET','COMMERCE_INDIVIDUAL_PRODUCTS_ENABLED','COMMERCE_SITE_BACKEND_SECRET','COMMERCE_SITE_KEY','FROM_EMAIL','NO3D_AUTH_COOKIE_SECURE','NO3D_AUTH_ISSUER','NO3D_AUTH_STATE_SECRET','NO3D_SITE_URL','R2_ACCESS_KEY_ID','R2_BUCKET_NAME','R2_ENDPOINT','R2_SECRET_ACCESS_KEY','RESEND_API_KEY','SITE_URL','STRIPE_PRICE_ID','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_URL','V3_ACCESS_MODE','V3_OWNER_EMAILS'];
const values=Object.fromEntries(names.filter(name=>process.env[name]).map(name=>[name,process.env[name]]));
values.PRINTS_ACCOUNT_FREE_ENABLED='true';
if(commerce){
  assert.equal(process.env.COMMERCE_ENV,'sandbox');
  const sites=JSON.parse(values.COMMERCE_SITES_JSON);
  assert.equal(sites.length,1);assert.equal(sites[0].siteKey,'no3dtools-v3-staging');
  sites[0].issuer='https://staging.no3dtools.com';
  for(const target of sites[0].returnTargets)for(const key of ['successUrl','cancelUrl','portalUrl']){
    const url=new URL(target[key]);target[key]=`https://staging.no3dtools.com${url.pathname}${url.search}`.replaceAll('%7B','{').replaceAll('%7D','}');
  }
  values.COMMERCE_SITES_JSON=JSON.stringify(sites);
}else{
  assert.equal(values.SITE_URL,'https://staging.no3dtools.com');
  assert.equal(values.COMMERCE_API_URL,'https://commerce-staging.no3dtools.com');
  values.USE_SUPABASE='true';
}
for(const [name,value]of Object.entries(values)){
  const result=spawnSync('vercel',['env','add',name,'production','--force','--sensitive'],{env,input:value,encoding:'utf8'});
  if(result.status!==0)throw Error(`Staging variable update failed: ${name} (exit ${result.status}).`);
  console.log(`Updated staging ${name}`);
}
// Keep the source of staging configuration consistent with its deployment.
for(const name of commerce?['PRINTS_ACCOUNT_FREE_ENABLED','COMMERCE_SITES_JSON']:['PRINTS_ACCOUNT_FREE_ENABLED']){
  const result=spawnSync('doppler',['secrets','set',name,'--project',commerce?'no3d-commerce':'no3dtools','--config','stg','--silent','--no-interactive'],{input:values[name],encoding:'utf8'});
  if(result.status!==0)throw Error(`Staging source update failed: ${name}`);
}
console.log(`Staging configuration ready: ${commerce?'Commerce':'website'}`);
