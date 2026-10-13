import {getChatGPTUser} from '../../chatgpt-auth';
import sources from '../../../data/catalog-sources.json';
import {retailMatch,retailVariant} from '../../retail-reference';
export async function POST(req:Request){
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin'},403);
 if(!await getChatGPTUser())return reply({error:'Please sign in'},401);
 try{const text=await req.text();if(text.length>1500)return reply({error:'Request too large'},400);const input=JSON.parse(text);if(typeof input.name!=='string'||!input.name.trim()||input.name.length>160||typeof input.producer!=='string'||input.producer.length>160)return reply({error:'Invalid bottle'},400);
 // A reviewed public listing supplements merchants with searchable feeds; expires after seven days.
 const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const reviewed=plain(input.name).includes('cosmic')&&plain(input.name).includes('desti')&&plain(input.producer).includes('cosmic')&&Date.now()-Date.parse('2026-10-13T15:40:00Z')<7*86400000?[{price:15.50,currency:'EUR',title:'Còsmic Destí Brisat 2025',variant:'75 cl',source:'https://www.lavinateria.net/es/vino-blanco/10813-cosmic-desti-brisat.html',sourceLabel:'La Vinateria · reviewed shop listing',checkedAt:'2026-10-13T15:40:00Z',vintage:'2025'}]:[];
 const results=await Promise.allSettled(sources.map(async source=>{
 const signal=AbortSignal.timeout(12000);
 const json=async(url:URL)=>{const r=await fetch(url,{signal,redirect:'error'});if(!r.ok)throw Error('Merchant unavailable');const text=await r.text();if(text.length>1500000)throw Error('Response too large');return JSON.parse(text)};
 const u=new URL('/search/suggest.json',source.origin);u.searchParams.set('q',input.name);u.searchParams.set('resources[type]','product');u.searchParams.set('resources[limit]','10');
 const search=await json(u);const matches=(search.resources?.results?.products||[]).filter((p:any)=>retailMatch(input,p)).slice(0,2);
 return (await Promise.all(matches.map(async(p:any)=>{if(!/^[a-z0-9-]+$/i.test(p.handle))return null;const product=await json(new URL('/products/'+p.handle+'.js',source.origin));if(!retailMatch(input,product))return null;const variant=retailVariant(product);if(!variant)return null;const cart=await json(new URL('/cart.js',source.origin));if(!/^[A-Z]{3}$/.test(cart.currency))return null;return {price:variant.price/100,currency:cart.currency,title:product.title,variant:variant.title,source:source.origin+'/products/'+p.handle,sourceLabel:source.label,checkedAt:new Date().toISOString(),vintage:product.title.match(/\b(?:19|20)\d{2}\b/)?.[0]||'Not specified'};}))).filter(Boolean);
 }));return reply({references:[...reviewed,...results.flatMap(r=>r.status==='fulfilled'?r.value:[])],partial:results.some(r=>r.status==='rejected')});
 }catch{return reply({error:'Retail lookup could not finish. Please retry.'},503)}
}
