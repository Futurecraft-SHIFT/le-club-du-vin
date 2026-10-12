import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
export function authConfig(){const url=env.SUPABASE_URL||process.env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;return url&&key?{url,key}:null}
export async function authClient(){const config=authConfig();if(!config)return null;const jar=await cookies();return createServerClient(config.url,config.key,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:config.url.startsWith('https://')&&process.env.NODE_ENV==='production',path:'/'},cookies:{getAll:()=>jar.getAll(),setAll:items=>{for(const {name,value,options} of items)jar.set(name,value,{...options,httpOnly:true,sameSite:'lax'})}}})}
export async function memberIdentity(){const client=await authClient();if(!client)return null;const {data,error}=await client.auth.getUser();const user=data.user;if(error||!user?.email_confirmed_at||!user.email)return null;
 let userId='member:'+user.id;
 // Bind the verified provider identity once so changing email cannot lose the owner's cellar.
 const bindingKey='private-auth/owner-provider.json';
 const stored=await env.BUCKET!.get(bindingKey);
 const binding=stored?await stored.json<{providerId:string;userId:string}>():null;
 if(binding?.providerId===user.id)userId=binding.userId;
 else if(!binding&&env.ADMIN_BOOTSTRAP_EMAIL&&user.email.toLowerCase()===env.ADMIN_BOOTSTRAP_EMAIL.trim().toLowerCase()){
  const owner=await env.DB!.prepare('SELECT user_id FROM admins WHERE slot=?').bind('owner').first<{user_id:string}>();
  if(owner)userId=owner.user_id;
  await env.BUCKET!.put(bindingKey,JSON.stringify({providerId:user.id,userId}),{httpMetadata:{contentType:'application/json'}});
 }

 return {userId,email:user.email,displayName:String(user.user_metadata?.username||user.email).slice(0,50),fullName:null,initialWeekly:user.user_metadata?.weekly_recommendations===true,initialWeeklyConsent:typeof user.user_metadata?.weekly_consent_at==='string'?user.user_metadata.weekly_consent_at:null};
}
