import {env} from 'cloudflare:workers';
import type {ChatGPTUser} from './chatgpt-auth';
export async function isAdmin(user:ChatGPTUser|null){
 if(!user)return false;
 const existing=await env.DB!.prepare('SELECT user_id FROM admins WHERE slot=?').bind('owner').first<{user_id:string}>();
 if(existing)return existing.user_id===user.userId;
 const bootstrap=env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
 const usesEmailAccounts=!!env.SUPABASE_URL||env.AUTH_MODE==='supabase';
 if(usesEmailAccounts?(!env.ADMIN_SUPABASE_USER_ID||user.userId!=='member:'+env.ADMIN_SUPABASE_USER_ID):(!bootstrap||user.email.toLowerCase()!==bootstrap))return false;
 await env.DB!.batch([
  env.DB!.prepare('INSERT OR IGNORE INTO admins (slot,user_id,created_at) VALUES (?,?,?)').bind('owner',user.userId,new Date().toISOString()),
  env.DB!.prepare('UPDATE profiles SET name=? WHERE id=? AND EXISTS (SELECT 1 FROM admins WHERE user_id=?)').bind('ALEX B',user.userId,user.userId),
 ]);
 return (await env.DB!.prepare('SELECT user_id FROM admins WHERE slot=?').bind('owner').first<{user_id:string}>())?.user_id===user.userId;
}
