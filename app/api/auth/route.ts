import {authClient,authConfig} from '../../auth-server';
import {z} from 'zod';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){return response({configured:!!authConfig()})}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Invalid origin.'},403);
 const client=await authClient();if(!client)return response({error:'Email sign-up is not activated yet. The authentication provider must be connected before accounts can be created.'},503);
 const raw=await req.text();if(raw.length>5000)return response({error:'Request too large.'},413);const input=JSON.parse(raw),origin=new URL(req.url).origin;
 if(input.action==='logout'){await client.auth.signOut();return response({ok:true})}
 if(input.action==='update_password'){
  const password=z.string().min(12).max(128).safeParse(input.password);if(!password.success)return response({error:'Use a password with 12–128 characters.'},400);
  const {data}=await client.auth.getUser();if(!data.user)return response({error:'Open the password-reset link from your email first.'},401);
  const {error}=await client.auth.updateUser({password:password.data});if(error)return response({error:'Password could not be updated. Request a fresh reset link and retry.'},400);return response({ok:true,message:'Password updated. You can now log in.'});
 }
 const email=z.string().email().max(254).safeParse(input.email);if(!email.success)return response({error:'Enter a valid email address.'},400);
 if(input.action==='change_email'){const {data}=await client.auth.getUser();if(!data.user)return response({error:'Please sign in again.'},401);const {error}=await client.auth.updateUser({email:email.data},{emailRedirectTo:origin+'/auth/confirm'});if(error)return response({error:'Email change could not be started. Please retry or sign in again.'},400);return response({ok:true,message:'Confirm the change using the verification emails sent by the sign-in service. Your existing sign-in address stays active until verification finishes.'})}
 if(input.action==='reset'){await client.auth.resetPasswordForEmail(email.data,{redirectTo:origin+'/auth/confirm?next=/login?mode=update'});return response({ok:true,message:'If an account exists, a password-reset email is on its way.'})}
 if(input.action==='resend'){await client.auth.resend({type:'signup',email:email.data,options:{emailRedirectTo:origin+'/auth/confirm'}});return response({ok:true,message:'If verification is needed, a new email is on its way.'})}
 const password=z.string().min(input.action==='signup'?12:1).max(128).safeParse(input.password);if(!password.success)return response({error:'Use a password with 12–128 characters.'},400);
 if(input.action==='signup'){
  const username=z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/).safeParse(input.username);if(!username.success)return response({error:'Username: 3–30 letters, numbers, dots, underscores or hyphens.'},400);
  const {error}=await client.auth.signUp({email:email.data,password:password.data,options:{emailRedirectTo:origin+'/auth/confirm',data:{username:username.data,weekly_recommendations:input.weekly===true,weekly_consent_at:input.weekly===true?new Date().toISOString():null}}});
  if(error)return response({error:'Sign-up could not be completed. Check the details or try again later.'},400);return response({ok:true,message:'Check your email to verify your account, then log in. Weekly emails are not sending yet.'});
 }
 if(input.action==='login'){const {data,error}=await client.auth.signInWithPassword({email:email.data,password:password.data});if(error||!data.user?.email_confirmed_at)return response({error:'Could not sign in. Check your email, password and email verification.'},401);return response({ok:true,signedIn:true})}
 return response({error:'Invalid request.'},400);
 }catch{return response({error:'The sign-in service is unavailable. Please retry.'},503)}}
