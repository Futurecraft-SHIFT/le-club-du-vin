import {env} from 'cloudflare:workers';
import sources from '../data/catalog-sources.json';
import {normalizeProduct} from './catalog-import';
import {wineKey} from './shared-catalog';
export function sameProducer(requested:string,candidate:string){const a=wineKey(requested),b=wineKey(candidate);return a.length>=4&&a===b}
export async function discoverProducer(producer:string){
 const db=env.DB!,key='producer:'+wineKey(producer),now=new Date().toISOString();
 if(wineKey(producer).length<4)return {status:'skipped',added:0};
 const prior=await db.prepare('SELECT last_checked_at,complete FROM catalog_sync WHERE origin=?').bind(key).first<{last_checked_at:string;complete:number}>();
 if(prior&&Date.now()-Date.parse(prior.last_checked_at)<(prior.complete?86400000:300000))return {status:prior.complete?'cached':'retry_later',added:0};
 // Claim first to bound repeated requests; failed lookups can be retried after five minutes.
 await db.prepare('INSERT INTO catalog_sync (origin,last_checked_at,last_page,complete) VALUES (?,?,0,0) ON CONFLICT(origin) DO UPDATE SET last_checked_at=excluded.last_checked_at,complete=0').bind(key,now).run();
 const results=await Promise.allSettled(sources.map(async source=>{
  const signal=AbortSignal.timeout(10000);
  const json=async(url:URL)=>{const r=await fetch(url,{signal,redirect:'error',headers:{'Accept':'application/json','User-Agent':'LeClubDuVin/1.0 (wine catalogue lookup)'}});if(!r.ok)throw Error('HTTP '+r.status);const text=await r.text();if(text.length>2000000)throw Error('Source too large');return JSON.parse(text)};
  const url=new URL('/search/suggest.json',source.origin);url.searchParams.set('q',producer);url.searchParams.set('resources[type]','product');url.searchParams.set('resources[limit]','10');url.searchParams.set('resources[options][unavailable_products]','show');
  const search=await json(url),products=search.resources?.results?.products;
  if(!Array.isArray(products))throw Error('Invalid source response');
  const detailResults=await Promise.allSettled(products.slice(0,10).map(async(p:any)=>{
   if(!/^[a-z0-9-]+$/i.test(p.handle||''))return null;
   const raw=await json(new URL('/products/'+p.handle+'.json',source.origin));const product=raw.product;
   if(!product)return null;product.tags=Array.isArray(product.tags)?product.tags:String(product.tags||'').split(',').map((s:string)=>s.trim());
   const w=normalizeProduct(product,source);return w&&sameProducer(producer,w.producer)?w:null;
  }));
  return {wines:detailResults.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]),partial:detailResults.some(r=>r.status==='rejected')};
 }));
 const wines=results.flatMap(r=>r.status==='fulfilled'?r.value.wines:[]),partial=results.some(r=>r.status==='rejected'||r.value.partial);
 for(const w of wines)await db.prepare('INSERT INTO catalog_entries (id,data,first_seen_at,last_seen_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,last_seen_at=excluded.last_seen_at').bind(w!.id,JSON.stringify(w),now,now).run();
 await db.prepare('UPDATE catalog_sync SET complete=? WHERE origin=?').bind(partial?0:1,key).run();
 return {status:partial?'partial':'checked',added:wines.length,checkedAt:now,sources:results.map((r,i)=>({source:sources[i].label,status:r.status==='fulfilled'?(r.value.partial?'partial':'checked'):(r.reason instanceof Error?r.reason.message.slice(0,100):'unavailable')}))};
}
