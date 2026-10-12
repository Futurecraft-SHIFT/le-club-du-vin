import {authClient} from '../../auth-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){const url=new URL(req.url);try{const client=await authClient();if(!client)throw Error();const code=url.searchParams.get('code'),hash=url.searchParams.get('token_hash'),type=url.searchParams.get('type');let error:unknown=true;
 if(code)({error}=await client.auth.exchangeCodeForSession(code));
 else if(hash&&(type==='signup'||type==='recovery'||type==='email'))({error}=await client.auth.verifyOtp({token_hash:hash,type}));
 if(error)throw Error();const target=type==='recovery'||url.searchParams.get('next')==='/login?mode=update'?'/login?mode=update':'/';return Response.redirect(new URL(target,url.origin),303);
 }catch{return Response.redirect(new URL('/login?error=verification',url.origin),303)}}
