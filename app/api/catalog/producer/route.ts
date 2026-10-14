import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {discoverProducer} from '../../../producer-discovery';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in'},{status:401});
 try{const text=await req.text();if(text.length>500)return Response.json({error:'Request too large'},{status:400});const {bottleId}=JSON.parse(text);
 const bottle=await env.DB!.prepare('SELECT producer FROM bottles WHERE id=? AND owner=?').bind(String(bottleId),user.userId).first<{producer:string}>();if(!bottle)return Response.json({error:'Bottle not found'},{status:404});
 return Response.json(await discoverProducer(bottle.producer));}catch{return Response.json({status:'unavailable',added:0},{status:503})}
}
