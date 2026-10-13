export const LOCATOR_HEADERS={'User-Agent':'LeClubDuVin/1.0 (https://le-club-du-vin.alexandre-bersia.chatgpt.site)'};
export async function limitedText(r:Response,max=500000){
 if(!r.ok||!r.body){await r.body?.cancel();throw Error('Source HTTP '+r.status)}
 const reader=r.body.getReader(),parts:Uint8Array[]=[];let n=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;n+=value.length;if(n>max)throw Error('Source too large');parts.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const bytes=new Uint8Array(n);let p=0;for(const b of parts){bytes.set(b,p);p+=b.length}return new TextDecoder().decode(bytes);
}
export async function discoverVenues(query:string,configured?:string,request:typeof fetch=fetch){
 const endpoints=[...new Set([configured,'https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'].filter(Boolean) as string[])].slice(0,3);
 for(const endpoint of endpoints){try{
  const r=await request(endpoint,{method:'POST',headers:{...LOCATOR_HEADERS,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(10000)});
  const data=JSON.parse(await limitedText(r,2000000));
  // Overpass can return HTTP 200 with a runtime-error remark and incomplete data.
  if(!Array.isArray(data.elements)||data.remark)throw Error('Incomplete map response');
  return data.elements;
 }catch(e){console.warn('Locator map provider unavailable',{provider:new URL(endpoint).hostname,reason:e instanceof Error?e.name:'Error'})}}
 throw Error('MAP_PROVIDERS_UNAVAILABLE');
}
export async function photonVenues(lat:number,lon:number,base='https://photon.komoot.io/api/',request:typeof fetch=fetch){
 const dy=2.52/111,dx=2.52/(111*Math.max(.001,Math.cos(lat*Math.PI/180)));
 const bbox=[Math.max(-180,lon-dx),Math.max(-90,lat-dy),Math.min(180,lon+dx),Math.min(90,lat+dy)].join(',');
 const groups=await Promise.allSettled([['shop.wine','shop.alcohol','shop.beverages'],['amenity.bar','amenity.pub','amenity.restaurant']].map(async categories=>{
  const u=new URL(base);u.search=new URLSearchParams({lat:lat.toFixed(4),lon:lon.toFixed(4),bbox,limit:'20',location_bias_scale:'0'}).toString();
  u.searchParams.set('include',categories.map(c=>'osm.'+c).join(','));
  const r=await request(u,{headers:LOCATOR_HEADERS,signal:AbortSignal.timeout(10000)}),data=JSON.parse(await limitedText(r));
  if(!Array.isArray(data.features))throw Error('Invalid place response');
  return data.features.flatMap((f:any)=>{const p=f.properties||{},key=p.osm_key,value=p.osm_value;
   if(!categories.includes(key+'.'+value))return [];
   return [{id:p.osm_id,type:({N:'node',W:'way',R:'relation'} as Record<string,string>)[p.osm_type]||'node',lat:f.geometry?.coordinates?.[1],lon:f.geometry?.coordinates?.[0],tags:{name:p.name,[key]:value,'addr:street':p.street,'addr:housenumber':p.housenumber,'addr:postcode':p.postcode,'addr:city':p.city,website:p.extra?.website}}];
  });
 }));
 if(groups.every(g=>g.status==='rejected'))throw Error('MAP_PROVIDERS_UNAVAILABLE');
 return {elements:groups.flatMap(g=>g.status==='fulfilled'?g.value:[]),partial:groups.some(g=>g.status==='rejected')};
}
