import {env} from 'cloudflare:workers';
export type BottlePrice={price:number|null;currency:string;purchase_context:string};
const key=(owner:string,id:string)=>'private-bottle-prices/'+encodeURIComponent(owner)+'/'+encodeURIComponent(id)+'.json';
export async function readBottlePrice(owner:string,id:string):Promise<Partial<BottlePrice>>{const object=await env.BUCKET!.get(key(owner,id));return object?await object.json<BottlePrice>():{}}
export async function saveBottlePrice(owner:string,id:string,value:BottlePrice){await env.BUCKET!.put(key(owner,id),JSON.stringify({...value,updatedAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}})}
