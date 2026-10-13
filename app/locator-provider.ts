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
