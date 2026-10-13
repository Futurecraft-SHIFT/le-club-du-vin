import type {AudienceProfile} from './audience-types';
import {RESEARCH_VERSION} from './audience-types';
export const MIN_AUDIENCE=5;
export type AudienceRow={owner:string;style:string;date:string;price:number|null;currency:string;context:string;purchase_country:string;purchase_city:string;country:string;city:string;age_band:string;gender:string};
export type ResearchMember={id:string;profile:AudienceProfile};
const clean=(v:string)=>v.trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
const label=(v:string)=>v||'Not provided';
export function priceBand(p:number|null){return p===null?'Unknown':p<10?'Under 10':p<20?'10–19.99':p<35?'20–34.99':p<60?'35–59.99':p<100?'60–99.99':'100+'}
export function makeAudienceReport(members:ResearchMember[],rows:AudienceRow[],f:Record<string,string>){
 const allowed=members.filter(m=>m.profile.allowed&&m.profile.version===RESEARCH_VERSION),ids=new Set(allowed.map(m=>m.id));
 const eligible=rows.filter(r=>ids.has(r.owner));
 const keys=['country','city','age_band','gender','style','context','purchase_country','purchase_city'] as const;
 const options=Object.fromEntries(keys.map(k=>{const groups=new Map<string,Set<string>>();for(const r of eligible){const v=r[k];if(!v)continue;const normalized=clean(v);if(!groups.has(normalized))groups.set(normalized,new Set());groups.get(normalized)!.add(r.owner)}return [k,[...groups].filter(([,s])=>s.size>=MIN_AUDIENCE).map(([v])=>v).sort()]}));
 const selected=eligible.filter(r=>keys.every(k=>!f[k]||clean(r[k])===clean(f[k]))&&(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&r.currency===(f.currency||'EUR')&&(!f.min||r.price!==null&&r.price>=Number(f.min))&&(!f.max||r.price!==null&&r.price<=Number(f.max)));
 const people=new Set(selected.map(r=>r.owner)).size;
 const base={minimum:MIN_AUDIENCE,consentingMembers:allowed.length,options,currency:f.currency||'EUR',generatedAt:new Date().toISOString()};
 if(people<MIN_AUDIENCE)return {...base,suppressed:true,summary:null,charts:[],segments:[]};
 function groups(key:(r:AudienceRow)=>string){const map=new Map<string,AudienceRow[]>();for(const r of selected){const k=key(r);if(!map.has(k))map.set(k,[]);map.get(k)!.push(r)}return [...map].filter(([,v])=>new Set(v.map(r=>r.owner)).size>=MIN_AUDIENCE).map(([name,v])=>({name,bottles:v.length,members:new Set(v.map(r=>r.owner)).size})).sort((a,b)=>b.bottles-a.bottles||a.name.localeCompare(b.name))}
 const prices=selected.filter(r=>r.price!==null).map(r=>r.price!).sort((a,b)=>a-b),median=new Set(selected.filter(r=>r.price!==null).map(r=>r.owner)).size>=MIN_AUDIENCE?(prices[Math.floor((prices.length-1)/2)]+prices[Math.floor(prices.length/2)])/2:null;
 return {...base,suppressed:false,summary:{members:people,bottles:selected.length,knownPrices:prices.length,medianPrice:median},charts:[
  {title:'Wine styles',rows:groups(r=>r.style)},
  {title:'Price per bottle · '+base.currency,rows:groups(r=>priceBand(r.price))},
  {title:'Where members live',rows:groups(r=>label(clean(r.country)))},
  {title:'Age ranges',rows:groups(r=>label(r.age_band))},
  {title:'Gender',rows:groups(r=>label(r.gender))},
  {title:'Purchase setting',rows:groups(r=>r.context)},
  {title:'Purchase city',rows:groups(r=>[r.purchase_city,r.purchase_country].filter(Boolean).map(clean).join(', ')||'Not provided')},
  {title:'Purchase / registration month',rows:groups(r=>r.date.slice(0,7))}],
 segments:groups(r=>[label(clean(r.country)),label(r.age_band),label(r.gender),r.style,r.context,priceBand(r.price)].join(' · ')).slice(0,100)};
}
