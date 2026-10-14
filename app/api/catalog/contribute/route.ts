import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {publishWine} from '../../../shared-catalog';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in'},{status:401});
 try{const rows=await env.DB!.prepare('SELECT name,producer,style,region,grapes FROM bottles WHERE owner=?').bind(user.userId).all<any>();let count=0;for(const w of rows.results)if(await publishWine(w))count++;
 return Response.json({ok:true,count});}catch{return Response.json({error:'Catalogue contribution could not finish. Your bottles are safe; retry.'},{status:503})}
}
