import {env} from 'cloudflare:workers';
export type BottlePrice={price:number|null;currency:string;purchase_context:string;purchase_country?:string;purchase_city?:string;purchase_date?:string};
const key=(owner:string,id:string)=>'private-bottle-prices/'+encodeURIComponent(owner)+'/'+encodeURIComponent(id)+'.json';
export async function readBottlePrice(owner:string,id:string):Promise<Partial<BottlePrice>>{const object=await env.BUCKET!.get(key(owner,id));return object?await object.json<BottlePrice>():{}}
export async function saveBottlePrice(owner:string,id:string,value:BottlePrice){const old=await readBottlePrice(owner,id);await env.BUCKET!.put(key(owner,id),JSON.stringify({...old,...Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined)),updatedAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}})}
