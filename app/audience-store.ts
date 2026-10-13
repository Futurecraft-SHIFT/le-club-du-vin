import {env} from 'cloudflare:workers';
import {EMPTY_AUDIENCE,type AudienceProfile} from './audience-types';
export const audienceKey=(id:string)=>'private-audience/'+encodeURIComponent(id)+'.json';
export async function readAudience(id:string):Promise<AudienceProfile>{const value=await env.BUCKET!.get(audienceKey(id));return value?await value.json<AudienceProfile>():{...EMPTY_AUDIENCE}}
