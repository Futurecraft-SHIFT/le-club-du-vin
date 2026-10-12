import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 const user=await getChatGPTUser();if(!user)return fail('Sign in to view this bottle photo.',401);
 const id=new URL(req.url).searchParams.get('id');
 const bottle=await env.DB!.prepare('SELECT photo_key FROM bottles WHERE id=? AND (owner=? OR session_id IN (SELECT session_id FROM members WHERE user_id=?))').bind(id,user.userId,user.userId).first<{photo_key:string|null}>();
 if(!bottle?.photo_key)return fail('Photo not found.',404);
 const image=await env.BUCKET!.get(bottle.photo_key);if(!image)return fail('Photo not found.',404);
 return new Response(image.body,{headers:{'Content-Type':image.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function POST(req:Request){
 try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return fail('Invalid origin.',403);
 const user=await getChatGPTUser();if(!user)return fail('Sign in to upload a photo.',401);
 if(Number(req.headers.get('content-length')||0)>9*1024*1024)return fail('Choose a photo smaller than 8 MB.',413);
 const form=await req.formData(),id=form.get('id'),file=form.get('photo');
 if(typeof id!=='string'||!(file instanceof File)||file.size===0)return fail('Select a photo and bottle.',400);
 if(file.size>8*1024*1024)return fail('Choose a photo smaller than 8 MB.',413);
 const bottle=await env.DB!.prepare('SELECT id FROM bottles WHERE id=? AND owner=?').bind(id,user.userId).first();
 if(!bottle)return fail('Only the bottle owner can change its photo.',403);
 const buffer=await file.arrayBuffer(),v=new Uint8Array(buffer);
 const jpeg=v[0]===255&&v[1]===216&&v[2]===255;
 const png=v[0]===137&&v[1]===80&&v[2]===78&&v[3]===71&&v[4]===13&&v[5]===10&&v[6]===26&&v[7]===10;
 const webp=String.fromCharCode(...v.slice(0,4))==='RIFF'&&String.fromCharCode(...v.slice(8,12))==='WEBP';
 if(!jpeg&&!png&&!webp)return fail('Use a JPEG, PNG or WebP photo.',400);
 const key='bottles/'+id+'/'+crypto.randomUUID();
 await env.BUCKET!.put(key,buffer,{httpMetadata:{contentType:jpeg?'image/jpeg':png?'image/png':'image/webp'}});
 await env.DB!.prepare('UPDATE bottles SET photo_key=? WHERE id=? AND owner=?').bind(key,id,user.userId).run();
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Photo upload failed',e);return fail('Photo was not saved. Please try again.',500)}
}
