import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {readAudience,audienceKey} from '../../audience-store';
import {AGE_BANDS,GENDERS,EMPTY_AUDIENCE,RESEARCH_VERSION} from '../../audience-types';
import {z} from 'zod';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const schema=z.object({allowed:z.boolean(),country:z.string().trim().max(80),city:z.string().trim().max(80),age_band:z.union([z.literal(''),z.enum(AGE_BANDS)]),gender:z.union([z.literal(''),z.enum(GENDERS)])});
export async function GET(){const user=await getChatGPTUser();if(!user)return reply({error:'Sign in required.'},401);return reply(await readAudience(user.userId))}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin.'},403);
 const user=await getChatGPTUser();if(!user)return reply({error:'Sign in required.'},401);
 const body=await req.text();if(body.length>2000)return reply({error:'Request too large.'},413);
 const parsed=schema.safeParse(JSON.parse(body));if(!parsed.success)return reply({error:'Please check your optional profile details.'},400);
 const old=await readAudience(user.userId),now=new Date().toISOString(),v=parsed.data;
 const next={...(v.allowed?v:EMPTY_AUDIENCE),updatedAt:now,consentAt:v.allowed?(old.allowed&&old.version===RESEARCH_VERSION?old.consentAt:now):null,version:RESEARCH_VERSION};
 await env.BUCKET!.put(audienceKey(user.userId),JSON.stringify(next),{httpMetadata:{contentType:'application/json'}});
 return reply(next);
 }catch{return reply({error:'Audience preferences were not saved. Please retry.'},500)}}
