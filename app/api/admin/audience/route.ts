import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isAdmin} from '../../../admin-auth';
import {readAudience} from '../../../audience-store';
import {RESEARCH_VERSION} from '../../../audience-types';
import {readBottlePrice} from '../../../bottle-price';
import {makeAudienceReport,type AudienceRow} from '../../../audience-report';
import {CURRENCIES} from '../../../price-types';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function boundedMap<T,R>(values:T[],fn:(v:T)=>Promise<R>){const result:R[]=[];for(let i=0;i<values.length;i+=20)result.push(...await Promise.all(values.slice(i,i+20).map(fn)));return result}
export async function GET(req:Request){try{
 const user=await getChatGPTUser();if(!user)return reply({error:'Sign in required.'},401);if(!await isAdmin(user))return reply({error:'Admin access required.'},403);
 const params=new URL(req.url).searchParams,f:Record<string,string>=Object.fromEntries(params);
 if(Object.values(f).some(v=>v.length>100)||!CURRENCIES.includes((f.currency||'EUR') as any)||['from','to'].some(k=>f[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(f[k]))||['min','max'].some(k=>f[k]&&(!Number.isFinite(Number(f[k]))||Number(f[k])<0))||f.from&&f.to&&f.from>f.to||f.min&&f.max&&Number(f.min)>Number(f.max))return reply({error:'Check the report filters.'},400);
 const db=env.DB!,profiles=await db.prepare('SELECT id FROM profiles LIMIT 10001').all<{id:string}>();
 const bottles=await db.prepare('SELECT id,owner,style,created_at FROM bottles LIMIT 10001').all<{id:string;owner:string;style:string;created_at:string}>();
 if(profiles.results.length>10000||bottles.results.length>10000)return reply({error:'This report needs a larger reporting index. No partial totals are shown.'},503);
 const members=await boundedMap(profiles.results,async p=>({id:p.id,profile:await readAudience(p.id)}));
 const people=new Map(members.filter(m=>m.profile.allowed&&m.profile.version===RESEARCH_VERSION).map(m=>[m.id,m.profile]));
 const rows:AudienceRow[]=await boundedMap(bottles.results.filter(b=>people.has(b.owner)),async b=>{const p=people.get(b.owner)!,v=await readBottlePrice(b.owner,b.id);return {owner:b.owner,style:b.style,date:v.purchase_date||b.created_at.slice(0,10),price:typeof v.price==='number'&&Number.isFinite(v.price)?v.price:null,currency:v.currency||'EUR',context:v.purchase_context||'Other',purchase_country:v.purchase_country||'',purchase_city:v.purchase_city||'',country:p.country,city:p.city,age_band:p.age_band,gender:p.gender}});
 return reply(makeAudienceReport(members,rows,f));
 }catch(e){console.error('Audience report failed',e);return reply({error:'Audience report unavailable. Please retry.'},503)}}
