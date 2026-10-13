import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {discoverVenues,photonVenues,limitedText,LOCATOR_HEADERS} from '../../locator-provider';
import {nearbyPlaces,pageEvidence,publicWebsite,chooseVenues,type Place,type Evidence} from '../../nearby-wine';
const schema=z.object({name:z.string().trim().min(2).max(300),location:z.string().trim().min(2).max(180).optional(),lat:z.number().min(-90).max(90).optional(),lon:z.number().min(-180).max(180).optional()}).refine(v=>v.location||v.lat!==undefined&&v.lon!==undefined);
const cache=new Map<string,{until:number;value:unknown}>();
function remember(key:string,value:unknown){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{until:Date.now()+300000,value});return reply(value)}
const headers=LOCATOR_HEADERS;
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
async function publicHost(host:string,signal:AbortSignal){const r=await fetch('https://dns.google/resolve?type=A&name='+encodeURIComponent(host),{signal});if(!r.ok)return false;const d:any=await r.json();const addresses=(d.Answer||[]).filter((a:any)=>a.type===1).map((a:any)=>a.data);return addresses.length>0&&addresses.every((a:string)=>{const v=a.split('.').map(Number);return v.length===4&&v.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&![0,10,127].includes(v[0])&&v[0]<224&&!(v[0]===169&&v[1]===254)&&!(v[0]===172&&v[1]>=16&&v[1]<=31)&&!(v[0]===192&&v[1]===168)&&!(v[0]===100&&v[1]>=64&&v[1]<=127)})}
async function research(place:Place,name:string,signal:AbortSignal):Promise<Place&Evidence>{const empty:Evidence={status:'unconfirmed',checkedAt:new Date().toISOString(),detail:'Nearby venue; no verified listing for this bottle was found.'};if(!place.website||signal.aborted)return {...place,...empty};try{
 const url=new URL(place.website);if(!await publicHost(url.hostname,signal))return {...place,...empty};
 const read=async(u:string)=>{const r=await fetch(u,{headers,redirect:'manual',signal});if(!/text\/html/i.test(r.headers.get('content-type')||''))throw Error('Not an HTML listing');return limitedText(r)};
 const html=await read(url.href);let evidence=pageEvidence(html,name,url.href);
 const links=[...html.matchAll(/href=["']([^"']+)["']/gi)].flatMap(m=>{try{const u=new URL(m[1].replaceAll('&amp;','&'),url);return u.origin===url.origin&&/wine|wein|vin|menu|shop|product|carte/i.test(u.pathname)&&publicWebsite(u.href)?[u.href]:[]}catch{return []}});
 const terms=name.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>2);const relevance=(u:string)=>terms.filter(t=>u.toLowerCase().includes(t)).length;
 for(const link of [...new Set(links)].filter(u=>u!==url.href).sort((a,b)=>relevance(b)-relevance(a)).slice(0,1)){try{const found=pageEvidence(await read(link),name,link);if(found&&(!evidence||found.status==='online-stock'))evidence=found}catch{}if(evidence?.status==='online-stock')break}
 return {...place,...(evidence||empty)};
 }catch{return {...place,...empty}}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin.'},403);
 const body=await req.text();if(body.length>2000)return reply({error:'Request too large.'},413);const parsed=schema.safeParse(JSON.parse(body));if(!parsed.success)return reply({error:'Choose a bottle and a valid search location.'},400);const input=parsed.data;const cacheKey=JSON.stringify(input);const saved=cache.get(cacheKey);if(saved&&saved.until>Date.now())return reply(saved.value);
 let lat=input.lat,lon=input.lon,label='Your selected location';
 if(lat===undefined||lon===undefined){const base=(env as any).LOCATOR_GEOCODER_URL||'https://photon.komoot.io/api/';const u=new URL(base);u.searchParams.set('q',input.location!);u.searchParams.set('limit','3');const r=await fetch(u,{headers,signal:AbortSignal.timeout(12000)});const d=JSON.parse(await limitedText(r));const locations=(d.features||[]).map((f:any)=>({lat:f.geometry?.coordinates?.[1],lon:f.geometry?.coordinates?.[0],label:[f.properties?.name,f.properties?.street,f.properties?.city,f.properties?.state,f.properties?.country].filter(Boolean).join(', ')})).filter((v:any)=>Number.isFinite(v.lat)&&Number.isFinite(v.lon));return remember(cacheKey,{locations})}
 // Round only the outbound discovery query (~11 m); exact distance filtering still uses the selected center.
 const a=lat.toFixed(4),b=lon.toFixed(4);const query='[out:json][timeout:8];(nwr(around:2520,'+a+','+b+')[shop~"^(wine|alcohol|beverages)$"];nwr(around:2520,'+a+','+b+')[amenity~"^(bar|pub|restaurant)$"];);out center tags;';
 let elements:any[],fallback=false,partial=false;try{elements=await discoverVenues(query,(env as any).LOCATOR_OVERPASS_URL)}catch{const backup=await photonVenues(lat,lon,(env as any).LOCATOR_GEOCODER_URL);elements=backup.elements;fallback=true;partial=backup.partial}const places=nearbyPlaces(elements,lat,lon);
 const results:(Place&Evidence)[]=[];
 // Research a wider candidate set, then put stock evidence ahead of distance.
 // Twelve venues and two pages each keep total outbound requests below fifty.
 const selected=['shop','drink'].flatMap(kind=>places.filter(p=>p.kind===kind).sort((a,b)=>Number(!!b.website)-Number(!!a.website)||a.distance-b.distance).slice(0,6));
 const researchSignal=AbortSignal.timeout(8000);
 for(let i=0;i<selected.length;i+=6)results.push(...await Promise.all(selected.slice(i,i+6).map(p=>research(p,input.name,researchSignal))));

 return remember(cacheKey,{label,radius:2.5,checkedAt:new Date().toISOString(),shops:chooseVenues(results,'shop'),drinks:chooseVenues(results,'drink'),notice:(fallback?'Map services are busy, so these venues come from Photon’s place index. Merchant websites and bottle stock may be unavailable. '+(partial?'One venue category could not be loaded; retry to check it. ':''):'')+'We researched up to six venues per category, prioritizing bottle stock evidence before distance. Our target is at least one verified listing in each group of three, but we cannot guarantee it within this radius. Online stock does not confirm stock at this physical address. PDF-only, inaccessible or unpublished wine lists cannot be verified.'});
 }catch(e){console.error('Nearby lookup failed',{stage:e instanceof Error&&e.message==='MAP_PROVIDERS_UNAVAILABLE'?'map-discovery':'location-search',reason:e instanceof Error?e.name:'Error'});return reply({error:e instanceof Error&&e.message==='MAP_PROVIDERS_UNAVAILABLE'?'The nearby place services are busy. Your bottle is safe. Retry this location in a moment.':'Location search is unavailable right now. Retry, or use your location to search nearby venues.'},503)}}
