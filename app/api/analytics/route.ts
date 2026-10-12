import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {z} from 'zod';
const input=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('consent'),allowed:z.boolean()}),
 z.object({kind:z.enum(['visit','discovery','section']),id:z.string().uuid(),consent:z.literal(true),section:z.enum(['The club','My cellar','Wine calendar','Flavor profile','Tasting table','Sommelier','Surprise bottle']).optional()}),
]);
export async function POST(req:Request){
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin'},403);
 const body=await req.text();if(body.length>2000)return reply({error:'Request too large'},413);
 const parsed=input.safeParse(JSON.parse(body));if(!parsed.success)return reply({error:'Invalid event'},400);
 const e=parsed.data;
 if(e.kind==='consent'){const user=await getChatGPTUser();if(user)await env.DB!.prepare('UPDATE profiles SET analytics_consent=?,consent_updated_at=? WHERE id=?').bind(e.allowed?1:0,new Date().toISOString(),user.userId).run();return reply({ok:true})}
 const day=new Date().toISOString().slice(0,10);
 await env.DB!.prepare('INSERT OR IGNORE INTO analytics_events (id,kind,day,section) VALUES (?,?,?,?)').bind(e.id,e.kind,day,e.section||null).run();
 return reply({ok:true});
 }catch{return reply({error:'Event was not recorded.'},400)}
}
