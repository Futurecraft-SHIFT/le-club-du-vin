import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isAdmin} from '../../admin-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const headers={'Cache-Control':'private, no-store'};
 try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in required.'},{status:401,headers});
 if(!await isAdmin(user))return Response.json({error:'Admin access required.'},{status:403,headers});
 const raw=Number(new URL(req.url).searchParams.get('days')||30),days=[7,30,90].includes(raw)?raw:30;
 const cutoff=new Date(Date.now()-days*86400000).toISOString(),day=cutoff.slice(0,10),db=env.DB!;
 const [totals,activity,styles,daily,sections,consents]=await Promise.all([
 db.prepare(`SELECT (SELECT COUNT(*) FROM profiles) AS members,(SELECT COUNT(*) FROM bottles) AS bottles,(SELECT COALESCE(SUM(count),0) FROM bottles) AS bottles_in_reserve,(SELECT COUNT(*) FROM tastings) AS tastings,(SELECT COUNT(*) FROM sessions) AS tables,(SELECT COUNT(*) FROM bottles WHERE photo_key IS NOT NULL) AS photos,(SELECT COUNT(*) FROM profiles WHERE is_public=1) AS shared_profiles`).first(),
 db.prepare(`SELECT (SELECT COUNT(*) FROM profiles WHERE last_seen_at>=?) AS active_members,(SELECT COUNT(*) FROM profiles WHERE created_at>=?) AS new_members,(SELECT COUNT(*) FROM bottles WHERE created_at>=?) AS new_bottles,(SELECT COUNT(*) FROM tastings WHERE created_at>=?) AS new_tastings,(SELECT COUNT(*) FROM analytics_events WHERE kind='visit' AND day>=?) AS visits,(SELECT COUNT(*) FROM analytics_events WHERE kind='discovery' AND day>=?) AS discoveries`).bind(cutoff,cutoff,cutoff,cutoff,day,day).first(),
 db.prepare('SELECT style,COUNT(*) AS count FROM bottles GROUP BY style ORDER BY count DESC').all(),
 db.prepare("SELECT day,SUM(kind='visit') AS visits,SUM(kind='discovery') AS discoveries FROM analytics_events WHERE day>=? GROUP BY day ORDER BY day").bind(day).all(),
 db.prepare("SELECT section,COUNT(*) AS count FROM analytics_events WHERE kind='section' AND day>=? GROUP BY section ORDER BY count DESC").bind(day).all(),
 db.prepare('SELECT analytics_consent AS choice,COUNT(*) AS count FROM profiles GROUP BY analytics_consent').all(),
 ]);
 return Response.json({days,generatedAt:new Date().toISOString(),totals,activity,styles:styles.results,daily:daily.results,sections:sections.results,consents:consents.results,notes:'Visits and section/discovery usage include only opted-in browsers. Active members are signed-in accounts seen in the selected period. No IP addresses, emails, private notes or precise locations are included.'},{headers});
 }catch(e){console.error('Admin metrics failed',e);return Response.json({error:'Could not load admin metrics.'},{status:503,headers})}
}
