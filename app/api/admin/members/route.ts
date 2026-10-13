import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isAdmin} from '../../../admin-auth';
import {flavor,winePalette} from '../../../flavor';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){try{
 const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in.'},401);
 if(!await isAdmin(user))return reply({error:'Admin access required.'},403);
 const db=env.DB!,params=new URL(req.url).searchParams,id=params.get('member');
 const raw=Number(params.get('page')||0),page=Number.isSafeInteger(raw)&&raw>=0?Math.min(raw,100000):0,limit=20;
 if(id){
  const profile=await db.prepare('SELECT id,name,is_public FROM profiles WHERE id=?').bind(id).first<{id:string;name:string;is_public:number}>();
  if(!profile)return reply({error:'Member not found.'},404);
  const [bottles,total]=await Promise.all([
   db.prepare('SELECT b.id,b.name,b.producer,b.vintage,b.style,b.count,b.created_at,(SELECT COUNT(*) FROM tastings t WHERE t.bottle_id=b.id AND t.user_id=?) AS tastings FROM bottles b WHERE b.owner=? ORDER BY b.created_at DESC,b.id LIMIT ? OFFSET ?').bind(id,id,limit,page*limit).all(),
   db.prepare('SELECT COUNT(*) AS count FROM bottles WHERE owner=?').bind(id).first<{count:number}>()
  ]);
  const canView=profile.id===user.userId||profile.is_public===1;
  let portrait=null;
  if(canView){const rows=await db.prepare('SELECT t.axes,t.score,t.notes,b.style FROM tastings t JOIN bottles b ON b.id=t.bottle_id WHERE t.user_id=?').bind(id).all();portrait={values:flavor(rows.results as any),palette:winePalette(rows.results as any),count:rows.results.length}}
  return reply({name:profile.name,bottles:bottles.results,total:total?.count||0,page,limit,portrait});
 }
 const query=(params.get('q')||'').trim().slice(0,80),pattern='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
 const [members,total]=await Promise.all([
  db.prepare(`SELECT p.id,p.name,p.created_at,p.last_seen_at,p.is_public,
   (SELECT COUNT(*) FROM bottles b WHERE b.owner=p.id) AS bottles,
   (SELECT COALESCE(SUM(b.count),0) FROM bottles b WHERE b.owner=p.id) AS reserves,
   (SELECT COUNT(*) FROM tastings t WHERE t.user_id=p.id) AS tastings,
   EXISTS(SELECT 1 FROM admins a WHERE a.user_id=p.id) AS is_admin
   FROM profiles p WHERE p.name LIKE ? ESCAPE '\\' ORDER BY p.created_at DESC,p.id LIMIT ? OFFSET ?`).bind(pattern,limit,page*limit).all(),
  db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE name LIKE ? ESCAPE '\\'").bind(pattern).first<{count:number}>()
 ]);
 return reply({members:members.results.map((m:any)=>({...m,canViewFlavor:m.id===user.userId||m.is_public===1})),total:total?.count||0,page,limit});
 }catch(e){console.error('Member directory failed',e);return reply({error:'Could not load members. Please retry.'},503)}}
