import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
export function authConfig(){const url=env.SUPABASE_URL||process.env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;return url&&key?{url,key}:null}
export function emailVerificationRequired(){return env.EMAIL_VERIFICATION_REQUIRED!=='false'}
export async function authClient(){const config=authConfig();if(!config)return null;const jar=await cookies();return createServerClient(config.url,config.key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:config.url.startsWith('https://')&&process.env.NODE_ENV==='production',path:'/'},cookies:{getAll:()=>jar.getAll(),setAll:items=>{for(const {name,value,options} of items)jar.set(name,value,{...options,httpOnly:true,sameSite:'lax'})}}})}
export async function memberIdentity(){const client=await authClient();if(!client)return null;const {data,error}=await client.auth.getUser();const user=data.user;if(error||!user?.email_confirmed_at||!user.email)return null;
 let userId='member:'+user.id;
 // Only an operator-pinned provider ID may claim the owner identity. Email alone is never proof of ownership.
 const bindingKey='private-auth/owner-provider.json';
 const stored=await env.BUCKET!.get(bindingKey);
 const binding=stored?await stored.json<{providerId:string;userId:string}>():null;
 if(binding?.providerId===user.id)userId=binding.userId;
 else if(!binding&&env.ADMIN_SUPABASE_USER_ID&&user.id===env.ADMIN_SUPABASE_USER_ID){
  const owner=await env.DB!.prepare('SELECT user_id FROM admins WHERE slot=?').bind('owner').first<{user_id:string}>();
  if(owner)userId=owner.user_id;
  await env.BUCKET!.put(bindingKey,JSON.stringify({providerId:user.id,userId}),{httpMetadata:{contentType:'application/json'}});
 }

 // Linking a login to the existing owner can leave an empty pre-link profile.
 // Archive only that authenticated, operator-pinned alias; never match by name or email.
 if(user.id===env.ADMIN_SUPABASE_USER_ID&&userId!=='member:'+user.id){
  const alias='member:'+user.id,db=env.DB!;
  const duplicate=await db.prepare('SELECT * FROM profiles WHERE id=?').bind(alias).first();
  if(duplicate){
   const occupied=await db.prepare('SELECT (SELECT COUNT(*) FROM bottles WHERE owner=?) + (SELECT COUNT(*) FROM tastings WHERE user_id=?) + (SELECT COUNT(*) FROM sessions WHERE owner=?) + (SELECT COUNT(*) FROM members WHERE user_id=?) + (SELECT COUNT(*) FROM admins WHERE user_id=?) AS count').bind(alias,alias,alias,alias,alias).first<{count:number}>();
   const friends=await env.BUCKET!.list({prefix:'friend-index/'+encodeURIComponent(alias)+'/',limit:1});
   if(occupied?.count===0&&friends.objects.length===0){
    const settings=await env.BUCKET!.get('private-accounts/'+encodeURIComponent(alias)+'.json');
    await env.BUCKET!.put('private-auth/archived-profiles/'+encodeURIComponent(alias)+'.json',JSON.stringify({profile:duplicate,account:settings?await settings.json():null,canonicalUserId:userId,archivedAt:new Date().toISOString()}),{httpMetadata:{contentType:'application/json'}});
    await db.prepare('DELETE FROM profiles WHERE id=? AND NOT EXISTS (SELECT 1 FROM bottles WHERE owner=?) AND NOT EXISTS (SELECT 1 FROM tastings WHERE user_id=?) AND NOT EXISTS (SELECT 1 FROM sessions WHERE owner=?) AND NOT EXISTS (SELECT 1 FROM members WHERE user_id=?) AND NOT EXISTS (SELECT 1 FROM admins WHERE user_id=?)').bind(alias,alias,alias,alias,alias,alias).run();
   }
  }
 }
 return {userId,email:user.email,displayName:String(user.user_metadata?.username||user.email).slice(0,50),fullName:null,initialWeekly:user.user_metadata?.weekly_recommendations===true,initialWeeklyConsent:typeof user.user_metadata?.weekly_consent_at==='string'?user.user_metadata.weekly_consent_at:null};
}
