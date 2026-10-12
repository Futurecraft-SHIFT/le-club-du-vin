import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isAdmin} from '../../../admin-auth';
import {normalizeProduct} from '../../../catalog-import';
import sources from '../../../../data/catalog-sources.json';
// Service callers are authorized by the owner-private Sites dispatch boundary.
// Disable this route before widening the Site audience; see CATALOG-UPDATES.md.
export async function POST(req:Request){
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 try{
  if(env.PRIVATE_CATALOG_UPDATER!=='enabled')return reply({error:'Unattended updater disabled.'},403);
  if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin'},403);
  const user=await getChatGPTUser();if(user&&!await isAdmin(user))return reply({error:'Admin access required.'},403);
  const body=await req.text();if(body.length>2000000)return reply({error:'Request too large'},413);
  const input=JSON.parse(body),page=Number(input.page);const source=sources.find(s=>s.origin===input.origin);
  if(!source||!Number.isInteger(page)||page<1||page>100)return reply({error:'Invalid source or page'},400);
  const url=new URL('/products.json',source.origin);url.searchParams.set('limit','250');url.searchParams.set('page',String(page));
  let data:any;
  if(input.products!==undefined){data={products:input.products}}
  else {const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)return reply({error:'Catalog source returned HTTP '+r.status+'. Fetch the public feed in the authorized updater and submit its product metadata.'},502);data=await r.json()}
  if(!Array.isArray(data.products)||data.products.length>250)return reply({error:'Invalid product page'},400);
  const wines=data.products.map((p:any)=>normalizeProduct(p,source)).filter(Boolean),now=new Date().toISOString();
  for(let i=0;i<wines.length;i+=50)await env.DB!.batch(wines.slice(i,i+50).map((w:any)=>env.DB!.prepare('INSERT INTO catalog_entries (id,data,first_seen_at,last_seen_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,last_seen_at=excluded.last_seen_at').bind(w.id,JSON.stringify(w),now,now)));
  const done=data.products.length<250;
  await env.DB!.prepare('INSERT INTO catalog_sync (origin,last_checked_at,last_page,complete) VALUES (?,?,?,?) ON CONFLICT(origin) DO UPDATE SET last_checked_at=excluded.last_checked_at,last_page=excluded.last_page,complete=excluded.complete').bind(source.origin,now,page,done?1:0).run();
  return reply({origin:source.origin,page,imported:wines.length,done,nextPage:done?null:page+1,checkedAt:now});
 }catch{return reply({error:'Catalog page could not be refreshed. Saved wines have been preserved; retry this page.'},503)}
}
