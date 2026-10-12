import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { z } from 'zod';
import {isAdmin} from '../../admin-auth';
import { flavor, winePalette } from '../../flavor';
import {personalDiscoveries} from '../../personal-ranking';
import seedCatalog from '../../../data/discoveries.json';
export const dynamic = 'force-dynamic';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const short = z.string().trim().min(1).max(150);
const axis = z.array(z.number().min(0).max(10)).length(6);
const action = z.discriminatedUnion('action', [
 z.object({action:z.literal('bottle'),grapes:z.string().trim().max(150).default(''),comments:z.string().max(5000).default(''),name:short,producer:z.string().trim().max(150),vintage:z.string().regex(/^(\d{4}|NV)$/),style:z.enum(['Red','White','Orange','Rosé','Sparkling']),region:z.string().trim().max(150),count:z.number().int().min(0).max(9999),drink_from:z.string().regex(/^\d{4}$/).optional(),drink_to:z.string().regex(/^\d{4}$/).optional(),session_id:z.string().max(100).nullable()}),
 z.object({action:z.literal('count'),id:short,count:z.number().int().min(0).max(9999)}),
 z.object({action:z.literal('taste'),bottle_id:short,date,score:z.number().min(1).max(5),notes:z.string().max(5000),axes:axis}),
 z.object({action:z.literal('session'),name:short,date}),
 z.object({action:z.literal('join'),code:z.string().trim().min(6).max(64)}),
 z.object({action:z.literal('profile'),name:short,is_public:z.boolean()}),
]);
function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function GET(req:Request){
 try{
 const db=env.DB!; const url=new URL(req.url);
 if(url.searchParams.has('profile')){
  const p=await db.prepare('SELECT name,share_id FROM profiles WHERE share_id=? AND is_public=1').bind(url.searchParams.get('profile')).first();
  if(!p)return reply({error:'This profile is private or unavailable.'},404);
  const rows=await db.prepare('SELECT t.axes,t.score,t.notes,b.style,b.name,b.producer,b.grapes FROM tastings t JOIN profiles p ON p.id=t.user_id JOIN bottles b ON b.id=t.bottle_id WHERE p.share_id=? AND p.is_public=1').bind(url.searchParams.get('profile')).all();
  const live=await db.prepare('SELECT data FROM catalog_entries').all<{data:string}>();
  const merged=new Map(seedCatalog.map(w=>[w.id,w]));for(const row of live.results){const w=JSON.parse(row.data);merged.set(w.id,w)}
  const suggestions=personalDiscoveries(rows.results as any,[...merged.values()]).map(w=>({id:w.id,name:w.name,producer:w.producer,style:w.style,grapes:w.grapes}));
  return reply({profile:p,recommendations:suggestions,values:flavor(rows.results as {score:number;axes:string}[]),palette:winePalette(rows.results as {score:number;style:string}[]),count:rows.results.length});
 }
 const user=await getChatGPTUser(); if(!user)return reply({user:null});
 await db.prepare('INSERT OR IGNORE INTO profiles (id,name,share_id,is_public,created_at) VALUES (?,?,?,0,?)').bind(user.userId,user.displayName,crypto.randomUUID(),new Date().toISOString()).run();
 const admin=await isAdmin(user);
 await db.prepare('UPDATE profiles SET last_seen_at=? WHERE id=?').bind(new Date().toISOString(),user.userId).run();
 const [profile,bottles,tastings,sessions]=await Promise.all([
 db.prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first(),
 db.prepare('SELECT b.id,b.owner,b.session_id,b.name,b.producer,b.vintage,b.style,b.region,b.count,b.drink_from,b.drink_to,b.photo_key,b.grapes,CASE WHEN b.owner=? THEN b.comments ELSE NULL END AS comments FROM bottles b WHERE b.owner=? OR b.session_id IN (SELECT session_id FROM members WHERE user_id=?) ORDER BY b.created_at DESC').bind(user.userId,user.userId,user.userId).all(),
 db.prepare('SELECT t.*,b.name,b.style,b.vintage,b.producer,b.photo_key,b.grapes FROM tastings t JOIN bottles b ON b.id=t.bottle_id WHERE t.user_id=? ORDER BY t.date DESC,t.created_at DESC').bind(user.userId).all(),
 db.prepare('SELECT s.*, (SELECT COUNT(*) FROM members m WHERE m.session_id=s.id) AS member_count FROM sessions s JOIN members m ON s.id=m.session_id WHERE m.user_id=? ORDER BY s.date DESC').bind(user.userId).all(),
 ]);
 return reply({user:{id:user.userId,email:user.email,is_admin:admin},profile,bottles:bottles.results,tastings:tastings.results,sessions:sessions.results});
 }catch(e){console.error('Club read failed',e);return reply({error:'Could not load your cellar. Please retry.'},503)}
}
export async function POST(req:Request){
 try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Invalid origin'},403);
 const user=await getChatGPTUser();if(!user)return reply({error:'Please sign in to save your wine history.'},401);
 if(Number(req.headers.get('content-length')||0)>20000)return reply({error:'Request too large'},413);
 const body=await req.text();if(body.length>20000)return reply({error:'Request too large'},413);
 const parsed=action.safeParse(JSON.parse(body));if(!parsed.success)return reply({error:'Please check the form values.'},400);
 const a=parsed.data,db=env.DB!,uid=user.userId,id=crypto.randomUUID(),now=new Date().toISOString();
 if(a.action==='profile')await db.prepare('UPDATE profiles SET name=?,is_public=? WHERE id=?').bind(a.name,a.is_public?1:0,uid).run();
 if(a.action==='session')await db.batch([
  db.prepare('INSERT INTO sessions (id,owner,name,code,date) VALUES (?,?,?,?,?)').bind(id,uid,a.name,crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),a.date),
  db.prepare('INSERT INTO members (id,session_id,user_id) VALUES (?,?,?)').bind(crypto.randomUUID(),id,uid),
 ]);
 if(a.action==='join'){
  const s=await db.prepare('SELECT id FROM sessions WHERE code=?').bind(a.code.toUpperCase()).first<{id:string}>();
  if(!s)return reply({error:'No tasting found with that invitation code.'},404);
  await db.prepare('INSERT OR IGNORE INTO members (id,session_id,user_id) VALUES (?,?,?)').bind(id,s.id,uid).run();
 }
 if(a.action==='bottle'){
  if(a.drink_from&&a.drink_to&&a.drink_to<a.drink_from)return reply({error:'The drinking window must end after it starts.'},400);
  if(a.session_id&&!await db.prepare('SELECT id FROM members WHERE session_id=? AND user_id=?').bind(a.session_id,uid).first())return reply({error:'Join this tasting before adding a bottle.'},403);
  await db.prepare('INSERT INTO bottles (id,owner,session_id,name,producer,vintage,style,region,count,drink_from,drink_to,created_at,grapes,comments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,uid,a.session_id,a.name,a.producer,a.vintage,a.style,a.region,a.count,a.drink_from??'',a.drink_to??'',now,a.grapes,a.comments).run();
 }
 if(a.action==='count'){
  const r=await db.prepare('UPDATE bottles SET count=? WHERE id=? AND owner=?').bind(a.count,a.id,uid).run();
  if(!r.meta.changes)return reply({error:'Only the bottle owner can change its stock.'},403);
 }
 if(a.action==='taste'){
  const allowed=await db.prepare('SELECT id FROM bottles WHERE id=? AND (owner=? OR session_id IN (SELECT session_id FROM members WHERE user_id=?))').bind(a.bottle_id,uid,uid).first();
  if(!allowed)return reply({error:'This bottle is not in your cellar or a tasting you joined.'},403);
  await db.prepare('INSERT INTO tastings (id,user_id,bottle_id,date,score,notes,axes,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,uid,a.bottle_id,a.date,a.score,a.notes,JSON.stringify(a.axes),now).run();
 }
 return reply({ok:true,id});
 }catch(e){console.error('Club write failed',e);return reply({error:'Your changes were not saved. Please retry.'},500)}
}
