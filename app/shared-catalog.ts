import methods from '../data/catalog-methods.json';
import {env} from 'cloudflare:workers';
import seed from '../data/discoveries.json';
export const wineKey=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:19|20)\d{2}\b|\b(?:nv|n\.v\.)\b/g,'').replace(/[^a-z0-9]/g,'');
export const catalogKey=(w:{name:string;producer:string})=>wineKey(w.producer+' '+w.name);
// Explicit public metadata allowlist. Never copy the source bottle object.
export function memberWine(w:{name:string;producer:string;style:string;region:string;grapes?:string}){
 return {id:catalogKey(w),name:w.name,producer:w.producer,style:w.style,region:w.region||'Origin not specified',grapes:w.grapes||'Grapes not specified',vintage:'NV',photo:'',source:'',sourceLabel:'Club catalogue · member contributed',abv:null,body:null,memberContributed:true};
}
export async function publishWine(w:Parameters<typeof memberWine>[0]){
 if(!w.producer.trim())return null;
 const entry=memberWine(w),db=env.DB!,now=new Date().toISOString();
 const existing=seed.find(s=>catalogKey(s)===entry.id);
 const saved=await db.prepare('SELECT data FROM catalog_entries WHERE id=?').bind(entry.id).first<{data:string}>();
 if(saved)return JSON.parse(saved.data);
 const chosen=existing||entry;
 await db.prepare('INSERT OR IGNORE INTO catalog_entries (id,data,first_seen_at,last_seen_at) VALUES (?,?,?,?)').bind(entry.id,JSON.stringify({...chosen,id:entry.id}),now,now).run();
 return chosen;
}
export async function catalogWine(id:string){const row=await env.DB!.prepare('SELECT data FROM catalog_entries WHERE id=?').bind(id).first<{data:string}>();const w=row?JSON.parse(row.data):seed.find(w=>w.id===id);return w?{...(methods as any)[w.source],...w}:undefined}
